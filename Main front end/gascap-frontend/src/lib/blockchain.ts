"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';
import { CONFIG, ABI, FACTORY_ABI } from './config';
import { fetchFTSOPrices } from './ftso-feeds';

// ═══════════════════════════════════════════════════════════════
// WALLET CONNECTION HOOK
// Connects MetaMask, switches to Coston2, tracks account changes
// ═══════════════════════════════════════════════════════════════
export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert("Please install MetaMask to use this application.");
      return;
    }

    try {
      const p = new BrowserProvider(window.ethereum);
      await p.send("eth_requestAccounts", []);
      const network = await p.getNetwork();

      // Switch to Coston2 if not already on it
      if (Number(network.chainId) !== CONFIG.CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x' + CONFIG.CHAIN_ID.toString(16) }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x' + CONFIG.CHAIN_ID.toString(16),
                chainName: 'Flare Coston2 Testnet',
                nativeCurrency: { name: 'Coston2 Flare', symbol: 'C2FLR', decimals: 18 },
                rpcUrls: [CONFIG.RPC_URL],
                blockExplorerUrls: [CONFIG.EXPLORER_URL],
              }],
            });
          }
        }
        // Re-create provider after chain switch
        const updatedProvider = new BrowserProvider(window.ethereum);
        const updatedAccounts = await updatedProvider.send("eth_requestAccounts", []);
        const updatedNetwork = await updatedProvider.getNetwork();
        setAddress(updatedAccounts[0]);
        setProvider(updatedProvider);
        setChainId(Number(updatedNetwork.chainId));
      } else {
        const accounts = await p.send("eth_requestAccounts", []);
        setAddress(accounts[0]);
        setProvider(p);
        setChainId(Number(network.chainId));
      }
    } catch (err) {
      console.error("Wallet connection failed", err);
    }
  }, []);

  // Listen for account and chain changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccounts = (accounts: string[]) => setAddress(accounts[0] || null);
      const handleChain = () => window.location.reload();

      window.ethereum.on('accountsChanged', handleAccounts);
      window.ethereum.on('chainChanged', handleChain);

      // Auto-connect if already connected
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          connect();
        }
      }).catch(() => {});

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccounts);
        window.ethereum.removeListener('chainChanged', handleChain);
      };
    }
  }, [connect]);

  return { address, provider, chainId, connect };
}

// ═══════════════════════════════════════════════════════════════
// GAS PRICE NORMALIZATION
// The contract's getCurrentGasPrice() computes a weighted index:
//   BTC last 2 digits (50%) + ETH last 2 digits (30%) + FLR (20%)
// This always produces 0-99. Values outside that range are raw
// FTSO numbers that need the same formula applied client-side.
// ═══════════════════════════════════════════════════════════════
function normalizeGasPrice(rawPrice: bigint): bigint {
  const raw = Number(rawPrice);

  if (raw <= 0) return 35n;

  // Already in the 1-99 gas index range — pass through
  if (raw >= 1 && raw <= 99) return rawPrice;

  // Raw FTSO value leaked through (e.g. a single feed price).
  // Apply the same last-2-digits extraction the contract uses.
  if (raw >= 100) {
    const component = raw % 100; // last 2 digits, 0-99
    return BigInt(Math.max(1, component));
  }

  return rawPrice;
}

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════
export type ContractState = {
  strikePriceGwei: bigint;
  expiryTimestamp: bigint;
  isSettled: boolean;
  settlementPriceGwei: bigint;
  totalLiquidityWei: bigint;
  participantCount: bigint;
};

export type UserPosition = {
  exists: boolean;
  isLong: boolean;
  quantity: bigint;
  collateralWei: bigint;
  leverage: bigint;
  marginMode: number;
  entryType: number;
  entryPrice: bigint;
  openTimestamp: bigint;
  isActive: boolean;
  isClaimed: boolean;
  notionalValue: bigint;
  margin: bigint;
};

export type OnChainTrade = {
  trader: string;
  isLong: boolean;
  quantity: bigint;
  collateral: bigint;
  leverage: bigint;
  timestamp: number;
  txHash: string;
};

export type MarketInfo = {
  address: string;
  name: string;
  strike: bigint;
  expiry: bigint;
  isSettled: boolean;
  participants: bigint;
};

// ═══════════════════════════════════════════════════════════════
// FACTORY DATA HOOK
// Fetches all deployed markets from SiheonLee's factory
// Uses getAllMarkets() + getMarketInfo() on each market
// ═══════════════════════════════════════════════════════════════
export function useFactoryData() {
  const [markets, setMarkets] = useState<MarketInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMarkets = useCallback(async () => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      const factory = new Contract(CONFIG.FACTORY_ADDRESS, FACTORY_ABI, rpcProvider);

      const addresses: string[] = await factory.getAllMarkets();

      const marketInfos = await Promise.all(
        addresses.map(async (addr) => {
          try {
            const market = new Contract(addr, ABI, rpcProvider);
            const info = await market.getMarketInfo();
            return {
              address: addr,
              name: info[0] as string,
              strike: BigInt(info[2]),
              expiry: BigInt(info[3]),
              isSettled: info[4] as boolean,
              participants: BigInt(info[5]),
            };
          } catch {
            // Fallback: try reading individual fields
            try {
              const market = new Contract(addr, ABI, rpcProvider);
              const [name, strike, expiry] = await Promise.all([
                market.marketName().catch(() => 'Unknown'),
                market.strikePrice().catch(() => 0n),
                market.expiryTimestamp().catch(() => 0n),
              ]);
              return {
                address: addr,
                name: name as string,
                strike: BigInt(strike),
                expiry: BigInt(expiry),
                isSettled: false,
                participants: 0n,
              };
            } catch {
              return {
                address: addr,
                name: 'Unknown Market',
                strike: 0n,
                expiry: 0n,
                isSettled: false,
                participants: 0n,
              };
            }
          }
        })
      );

      setMarkets(marketInfos);
    } catch (err) {
      console.warn("Factory fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 30000);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  return { markets, loading, refresh: fetchMarkets };
}

// ═══════════════════════════════════════════════════════════════
// CONTRACT DATA HOOK
// Polls the on-chain contract for state, gas price, positions,
// liquidity, and recent trade events.
// Accepts a dynamic contractAddress parameter.
// Normalizes gas price from raw FTSO index to sensible range.
// ═══════════════════════════════════════════════════════════════
export function useContractData(address: string | null, contractAddress?: string) {
  const activeContract = contractAddress || CONFIG.CONTRACT_ADDRESS;

  const [contractState, setContractState] = useState<ContractState | null>(null);
  const [currentGasPrice, setCurrentGasPrice] = useState<{ price: bigint; timestamp: bigint } | null>(null);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [userLiquidity, setUserLiquidity] = useState<bigint>(0n);
  const [recentTrades, setRecentTrades] = useState<OnChainTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const lastFetchedBlock = useRef<number>(0);

  // Reset state when contract address changes
  useEffect(() => {
    setContractState(null);
    setCurrentGasPrice(null);
    setUserPosition(null);
    setUserLiquidity(0n);
    setRecentTrades([]);
    setLoading(true);
    setConnectionError(null);
    lastFetchedBlock.current = 0;
  }, [activeContract]);

  const fetchData = useCallback(async () => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      const contract = new Contract(activeContract, ABI, rpcProvider);

      // ── Fetch contract state, contract gas price, and direct FTSO in parallel ──
      const [stateResult, gasResult, ftsoResult] = await Promise.allSettled([
        contract.getContractState(),
        contract.getCurrentGasPriceView().catch(() => contract.getCurrentGasPrice()),
        fetchFTSOPrices(['BTC/USD', 'ETH/USD', 'FLR/USD'])
      ]);

      if (stateResult.status === 'fulfilled' && stateResult.value) {
        const v = stateResult.value;
        setContractState({
          strikePriceGwei: BigInt(v[0]),
          expiryTimestamp: BigInt(v[1]),
          isSettled: v[2],
          settlementPriceGwei: BigInt(v[3]),
          totalLiquidityWei: BigInt(v[4]),
          participantCount: BigInt(v[5])
        });
        setConnectionError(null);
      } else if (stateResult.status === 'rejected') {
        console.warn("getContractState failed:", stateResult.reason?.message);
        setConnectionError("Contract not responding. Check if correct address is deployed.");
      }

      // ── Gas price: prefer direct FTSO, fall back to contract ──
      let gasSet = false;
      if (ftsoResult.status === 'fulfilled' && ftsoResult.value) {
        const prices = ftsoResult.value;
        const btc = prices.find(p => p.feedName === 'BTC/USD');
        const eth = prices.find(p => p.feedName === 'ETH/USD');
        const flr = prices.find(p => p.feedName === 'FLR/USD');

        if (btc && eth && flr) {
          // Replicate contract's gas index formula: BTC(50%) + ETH(30%) + FLR(20%)
          const btcInt = Math.floor(btc.value);    // e.g., 97342
          const ethInt = Math.floor(eth.value);    // e.g., 2835
          const flrScaled = Math.floor(flr.value * 10000); // scale up since FLR < $1

          const bComp = btcInt % 100;   // last 2 digits of BTC USD
          const eComp = ethInt % 100;   // last 2 digits of ETH USD
          const fComp = flrScaled % 100; // FLR scaled digits

          const gasIndex = Math.max(1, Math.floor((bComp * 50 + eComp * 30 + fComp * 20) / 100));
          const ts = btc.timestamp || Math.floor(Date.now() / 1000);

          console.log(`FTSO Direct → BTC=$${btcInt} (${bComp}) ETH=$${ethInt} (${eComp}) FLR=${flrScaled} (${fComp}) → Index=${gasIndex}`);

          setCurrentGasPrice({ price: BigInt(gasIndex), timestamp: BigInt(ts) });
          gasSet = true;
        }
      }

      // Fallback: use contract's getCurrentGasPrice + normalization
      if (!gasSet && gasResult.status === 'fulfilled' && gasResult.value) {
        const rawPrice = BigInt(gasResult.value[0]);
        console.log('RAW GAS PRICE FROM CONTRACT:', rawPrice.toString());
        const displayPrice = normalizeGasPrice(rawPrice);
        setCurrentGasPrice({
          price: displayPrice,
          timestamp: BigInt(gasResult.value[1])
        });
      }

      // ── Fetch recent trade events ──
      try {
        const currentBlock = await rpcProvider.getBlockNumber();
        if (lastFetchedBlock.current === 0) {
          lastFetchedBlock.current = Math.max(0, currentBlock - 50000);
        }

        const filter = contract.filters.FuturesMinted();
        const logs = await contract.queryFilter(filter, lastFetchedBlock.current, currentBlock);

        if (logs.length > 0) {
          const newTrades: OnChainTrade[] = await Promise.all(
            logs.slice(-20).map(async (log: any) => {
              const block = await log.getBlock();
              return {
                trader: log.args[0],
                isLong: log.args[1],
                quantity: BigInt(log.args[2]),
                collateral: BigInt(log.args[3]),
                leverage: BigInt(log.args[4]),
                timestamp: block.timestamp,
                txHash: log.transactionHash
              };
            })
          );

          setRecentTrades(prev => {
            const combined = [...newTrades, ...prev];
            return combined
              .filter((v, i, a) => a.findIndex(t => t.txHash === v.txHash) === i)
              .sort((a, b) => b.timestamp - a.timestamp)
              .slice(0, 50);
          });
          lastFetchedBlock.current = currentBlock;
        }
      } catch (err) {
        console.warn("Event fetch failed (non-critical):", err);
      }

      // ── Fetch user-specific data if wallet connected ──
      if (address) {
        const [posResult, liqResult] = await Promise.allSettled([
          contract.getPosition(address),
          contract.liquidityProvided(address)
        ]);

        if (posResult.status === 'fulfilled' && posResult.value) {
          const p = posResult.value;
          setUserPosition({
            exists: p[0],
            isLong: p[1],
            quantity: BigInt(p[2]),
            collateralWei: BigInt(p[3]),
            leverage: BigInt(p[4]),
            marginMode: Number(p[5]),
            entryType: Number(p[6]),
            entryPrice: BigInt(p[7]),
            openTimestamp: BigInt(p[8]),
            isActive: p[9],
            isClaimed: p[10],
            notionalValue: BigInt(p[11]),
            margin: BigInt(p[12])
          });
        }

        if (liqResult.status === 'fulfilled') {
          setUserLiquidity(BigInt(liqResult.value));
        }
      }
    } catch (err: any) {
      console.warn("Contract fetch error:", err?.message);
      setConnectionError(err?.message || "Failed to connect to contract");
    } finally {
      setLoading(false);
    }
  }, [address, activeContract]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, CONFIG.POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    contractState,
    currentGasPrice,
    userPosition,
    userLiquidity,
    recentTrades,
    loading,
    connectionError,
    refresh: fetchData
  };
}
