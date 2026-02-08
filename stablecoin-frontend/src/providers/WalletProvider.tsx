"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { BrowserProvider, JsonRpcSigner, formatEther } from "ethers";
import { COSTON2_CHAIN_ID, switchToCoston2 } from "@/lib/network";

interface WalletState {
  address: string | null;
  signer: JsonRpcSigner | null;
  provider: BrowserProvider | null;
  chainId: number | null;
  balance: string | null;
  isConnecting: boolean;
  isCorrectChain: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState>({
  address: null,
  signer: null,
  provider: null,
  chainId: null,
  balance: null,
  isConnecting: false,
  isCorrectChain: false,
  connect: async () => {},
  disconnect: () => {},
});

export function useWalletContext() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const isCorrectChain = chainId === COSTON2_CHAIN_ID;

  const updateBalance = useCallback(async (prov: BrowserProvider, addr: string) => {
    try {
      const bal = await prov.getBalance(addr);
      setBalance(formatEther(bal));
    } catch {
      setBalance(null);
    }
  }, []);

  const setupProvider = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const prov = new BrowserProvider(window.ethereum);
    setProvider(prov);

    try {
      const network = await prov.getNetwork();
      setChainId(Number(network.chainId));
    } catch {
      /* no-op */
    }

    try {
      const accounts: string[] = await window.ethereum.request({
        method: "eth_accounts",
      });
      if (accounts.length > 0) {
        const s = await prov.getSigner();
        setAddress(accounts[0]);
        setSigner(s);
        await updateBalance(prov, accounts[0]);
      }
    } catch {
      /* no-op */
    }
  }, [updateBalance]);

  useEffect(() => {
    setupProvider();
  }, [setupProvider]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAddress(null);
        setSigner(null);
        setBalance(null);
      } else {
        setAddress(accounts[0]);
        setupProvider();
      }
    };

    const handleChainChanged = () => {
      setupProvider();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [setupProvider]);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Please install MetaMask");
      return;
    }
    setIsConnecting(true);
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await switchToCoston2();
      const prov = new BrowserProvider(window.ethereum);
      const s = await prov.getSigner();
      const addr = await s.getAddress();
      const network = await prov.getNetwork();

      setProvider(prov);
      setSigner(s);
      setAddress(addr);
      setChainId(Number(network.chainId));
      await updateBalance(prov, addr);
    } catch (e) {
      console.error("Connect failed:", e);
    } finally {
      setIsConnecting(false);
    }
  }, [updateBalance]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
    setBalance(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        signer,
        provider,
        chainId,
        balance,
        isConnecting,
        isCorrectChain,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
