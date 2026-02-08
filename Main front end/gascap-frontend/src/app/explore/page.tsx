"use client";

import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import NextLink from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CONFIG, ABI, FACTORY_ABI } from '@/lib/config';
import { fetchFTSOPrices, calculateBasketPrice, distanceToBarrier } from '@/lib/ftso-feeds';
import type { FTSOPrice } from '@/lib/ftso-feeds';
import {
  Zap, Shield, Activity, TrendingUp, TrendingDown, Fuel,
  Wallet, ExternalLink, Clock, Droplets, ShieldCheck, BarChart3,
  Globe, Cpu, Radio, ArrowRight, RefreshCw, CheckCircle2, XCircle,
  Layers, Target, Users
} from 'lucide-react';

// ─── Types ───
type MarketSummary = {
  address: string;
  name: string;
  strike: number;
  expiry: number;
  isSettled: boolean;
  liquidity: number;
  participants: number;
};

// ─── Gas Index Calculation (mirrors contract logic) ───
function computeGasIndex(btcUsd: number, ethUsd: number, flrUsd: number): { index: number; bComp: number; eComp: number; fComp: number } {
  const bComp = Math.floor(btcUsd) % 100;
  const eComp = Math.floor(ethUsd) % 100;
  const flrScaled = Math.floor(flrUsd * 10000);
  const fComp = flrScaled % 100;
  const index = Math.max(1, Math.floor((bComp * 50 + eComp * 30 + fComp * 20) / 100));
  return { index, bComp, eComp, fComp };
}

export default function ExplorePage() {
  const [prices, setPrices] = useState<FTSOPrice[]>([]);
  const [gasIndex, setGasIndex] = useState<{ index: number; bComp: number; eComp: number; fComp: number } | null>(null);
  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [oracleOk, setOracleOk] = useState(false);
  const [rpcOk, setRpcOk] = useState(false);
  const [blockNumber, setBlockNumber] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(0);
  const [depegDistance, setDepegDistance] = useState<{ usdc: number; usdt: number } | null>(null);

  // ─── Fetch everything ───
  const fetchAll = useCallback(async () => {
    const now = Date.now();
    setLastRefresh(now);

    // 1) FTSO Prices
    try {
      const p = await fetchFTSOPrices(['BTC/USD', 'ETH/USD', 'FLR/USD', 'USDC/USD', 'USDT/USD']);
      setPrices(p);
      setOracleOk(true);

      const btc = p.find(x => x.feedName === 'BTC/USD');
      const eth = p.find(x => x.feedName === 'ETH/USD');
      const flr = p.find(x => x.feedName === 'FLR/USD');
      const usdc = p.find(x => x.feedName === 'USDC/USD');
      const usdt = p.find(x => x.feedName === 'USDT/USD');

      if (btc && eth && flr) {
        setGasIndex(computeGasIndex(btc.value, eth.value, flr.value));
      }
      if (usdc && usdt) {
        setDepegDistance({
          usdc: distanceToBarrier(usdc.value, 0.985),
          usdt: distanceToBarrier(usdt.value, 0.985),
        });
      }
    } catch {
      setOracleOk(false);
    }

    // 2) RPC + block number
    try {
      const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      const bn = await provider.getBlockNumber();
      setBlockNumber(bn);
      setRpcOk(true);
    } catch {
      setRpcOk(false);
    }

    // 3) Factory markets
    try {
      const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      const factory = new ethers.Contract(CONFIG.FACTORY_ADDRESS, FACTORY_ABI, provider);
      const addrs: string[] = await factory.getAllMarkets();

      const infos = await Promise.all(
        addrs.slice(0, 10).map(async (addr) => {
          try {
            const c = new ethers.Contract(addr, ABI, provider);
            const info = await c.getMarketInfo();
            const liq = await c.totalLiquidity().catch(() => 0n);
            return {
              address: addr,
              name: info[0] as string,
              strike: Number(info[2]),
              expiry: Number(info[3]),
              isSettled: info[4] as boolean,
              liquidity: Number(liq) / 1e18,
              participants: Number(info[5]),
            };
          } catch {
            return {
              address: addr,
              name: 'Unknown',
              strike: 0,
              expiry: 0,
              isSettled: false,
              liquidity: 0,
              participants: 0,
            };
          }
        })
      );
      setMarkets(infos);
    } catch {
      // Factory might not respond on first load
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 8000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const getPrice = (feed: string) => prices.find(p => p.feedName === feed);
  const fmt = (n: number, d: number = 2) => n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtUsd = (n: number) => '$' + fmt(n);
  const now = Math.floor(Date.now() / 1000);

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-foreground font-body">
      {/* ═══ HEADER ═══ */}
      <header className="h-16 bg-[#0a0a0a]/90 border-b border-white/5 flex items-center px-6 justify-between shrink-0 z-50 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-violet-500 to-cyan-500 rounded-lg shadow-[0_0_20px_rgba(139,92,246,0.4)]">
              <Globe size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight text-white leading-none uppercase">GasCap + Depeg</h1>
                <Badge className="text-[7px] h-3.5 px-1 bg-violet-500/15 text-violet-400 border-violet-500/20 font-black uppercase tracking-wider">Explorer</Badge>
              </div>
              <span className="text-[10px] text-violet-400 font-bold uppercase tracking-widest leading-none mt-1">ETH Oxford 2026 — Flare Network</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <nav className="hidden lg:flex items-center gap-4 mr-4">
            <NextLink href="/" className="text-[10px] font-bold text-muted-foreground hover:text-primary flex items-center gap-1 uppercase tracking-wider transition-colors">
              <Zap className="w-3.5 h-3.5" /> Trade
            </NextLink>
            <NextLink href="/liquidity" className="text-[10px] font-bold text-muted-foreground hover:text-primary flex items-center gap-1 uppercase tracking-wider transition-colors">
              <Droplets className="w-3.5 h-3.5" /> Pool
            </NextLink>
            <NextLink href="/depeg" className="text-[10px] font-bold text-indigo-400/70 hover:text-indigo-400 flex items-center gap-1 uppercase tracking-wider transition-colors">
              <Shield className="w-3.5 h-3.5" /> Depeg
            </NextLink>
          </nav>
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] text-blue-400 font-bold uppercase tracking-tight">
            <ShieldCheck className="w-3.5 h-3.5" /> Coston2
          </div>
          <button onClick={fetchAll} className="p-2 rounded-sm hover:bg-white/5 transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {/* ═══ HERO BANNER ═══ */}
        <div className="relative bg-gradient-to-b from-violet-950/30 via-[#050505] to-[#050505] border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="space-y-4 max-w-2xl">
                <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
                  DeFi Derivatives on <span className="text-violet-400">Flare Network</span>
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
                  Gas futures trading + stablecoin depeg insurance. Powered by FTSO v2 oracles, FDC cross-chain data, and on-chain parametric insurance.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <NextLink href="/">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider text-[10px] h-9 px-5 rounded-sm gap-2">
                      <Zap className="w-3.5 h-3.5" /> Trade Futures <ArrowRight className="w-3 h-3" />
                    </Button>
                  </NextLink>
                  <NextLink href="/depeg">
                    <Button variant="outline" className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 font-bold uppercase tracking-wider text-[10px] h-9 px-5 rounded-sm gap-2">
                      <Shield className="w-3.5 h-3.5" /> Depeg Shield <ArrowRight className="w-3 h-3" />
                    </Button>
                  </NextLink>
                </div>
              </div>

              {/* System Status */}
              <div className="bg-black/40 border border-white/5 rounded-sm p-4 min-w-[260px]">
                <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-3">System Status</div>
                <div className="space-y-2">
                  <StatusRow ok={oracleOk} label="FTSO v2 Oracle" detail={oracleOk ? 'Connected' : 'Connecting...'} />
                  <StatusRow ok={rpcOk} label="Coston2 RPC" detail={rpcOk ? `Block #${blockNumber.toLocaleString()}` : 'Connecting...'} />
                  <StatusRow ok={markets.length > 0} label="Factory Contract" detail={markets.length > 0 ? `${markets.length} markets` : 'Loading...'} />
                  <StatusRow ok={!!depegDistance} label="Depeg Monitor" detail={depegDistance ? 'Watching USDC/USDT' : 'Loading...'} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* ═══ LIVE ORACLE PRICES ═══ */}
          <section>
            <SectionHeader icon={<Radio className="w-4 h-4 text-emerald-400" />} title="Live FTSO v2 Prices" subtitle="Real-time oracle feeds from Flare Network" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
              <PriceCard feed="BTC/USD" price={getPrice('BTC/USD')} icon="orange" />
              <PriceCard feed="ETH/USD" price={getPrice('ETH/USD')} icon="blue" />
              <PriceCard feed="FLR/USD" price={getPrice('FLR/USD')} icon="pink" />
              <PriceCard feed="USDC/USD" price={getPrice('USDC/USD')} icon="green" isStable />
              <PriceCard feed="USDT/USD" price={getPrice('USDT/USD')} icon="teal" isStable />
            </div>
          </section>

          {/* ═══ GAS INDEX ═══ */}
          <section>
            <SectionHeader icon={<Fuel className="w-4 h-4 text-amber-400" />} title="Synthetic Gas Price Index" subtitle="Derived from BTC(50%) + ETH(30%) + FLR(20%) weighted FTSO feeds" />
            <div className="mt-4 bg-black/40 border border-white/5 rounded-sm overflow-hidden">
              <div className="p-6 flex flex-col lg:flex-row items-start lg:items-center gap-8">
                {/* Big index number */}
                <div className="flex flex-col items-center min-w-[180px]">
                  <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-2">Current Index</div>
                  <div className={`text-5xl font-bold font-code leading-none ${gasIndex ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]' : 'text-muted-foreground'}`}>
                    {gasIndex ? gasIndex.index.toString() : '---'}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className={`w-2 h-2 rounded-full ${gasIndex ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">{gasIndex ? 'Live' : 'Loading'}</span>
                  </div>
                </div>

                {/* Breakdown */}
                {gasIndex && (
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <IndexComponent
                      label="BTC Component"
                      weight="50%"
                      rawValue={getPrice('BTC/USD')?.value}
                      lastDigits={gasIndex.bComp}
                      color="text-orange-400"
                    />
                    <IndexComponent
                      label="ETH Component"
                      weight="30%"
                      rawValue={getPrice('ETH/USD')?.value}
                      lastDigits={gasIndex.eComp}
                      color="text-blue-400"
                    />
                    <IndexComponent
                      label="FLR Component"
                      weight="20%"
                      rawValue={getPrice('FLR/USD')?.value}
                      lastDigits={gasIndex.fComp}
                      color="text-pink-400"
                    />
                  </div>
                )}
              </div>

              {/* Formula bar */}
              {gasIndex && (
                <div className="border-t border-white/5 px-6 py-3 bg-white/[0.01] font-code text-[10px] text-muted-foreground">
                  <span className="text-white/60">Formula:</span>{' '}
                  ({gasIndex.bComp} x 50 + {gasIndex.eComp} x 30 + {gasIndex.fComp} x 20) / 100 = <span className="text-emerald-400 font-bold">{gasIndex.index}</span>
                </div>
              )}
            </div>
          </section>

          {/* ═══ TWO-COLUMN: FUTURES MARKETS + DEPEG SHIELD ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Futures Markets */}
            <section>
              <SectionHeader icon={<BarChart3 className="w-4 h-4 text-amber-400" />} title="Gas Futures Markets" subtitle="Active markets from the factory contract" />
              <div className="mt-4 space-y-3">
                {markets.length === 0 && !loading && (
                  <div className="bg-black/40 border border-white/5 rounded-sm p-6 text-center text-muted-foreground text-xs">
                    No markets found. Connect wallet to create one.
                  </div>
                )}
                {markets.map((m) => {
                  const timeLeft = m.expiry - now;
                  const isExpired = timeLeft <= 0;
                  return (
                    <div key={m.address} className="bg-black/40 border border-white/5 rounded-sm p-4 hover:border-white/10 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-sm font-bold text-white">{m.name || 'Unnamed Market'}</div>
                          <a href={`${CONFIG.EXPLORER_URL}/address/${m.address}`} target="_blank" rel="noopener noreferrer"
                            className="text-[9px] text-blue-400 hover:underline font-code flex items-center gap-1 mt-0.5">
                            {m.address.slice(0, 10)}...{m.address.slice(-6)} <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                        <Badge className={`text-[8px] h-4 px-1.5 font-bold uppercase ${m.isSettled ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : isExpired ? 'bg-red-500/15 text-red-400 border-red-500/20' : 'bg-amber-500/15 text-amber-400 border-amber-500/20'}`}>
                          {m.isSettled ? 'Settled' : isExpired ? 'Expired' : 'Active'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-3 text-[10px] font-code">
                        <div>
                          <div className="text-muted-foreground text-[8px] uppercase mb-0.5">Strike</div>
                          <div className="text-white font-bold">{m.strike}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-[8px] uppercase mb-0.5">Pool</div>
                          <div className="text-white font-bold">{m.liquidity.toFixed(3)} <span className="text-muted-foreground">C2FLR</span></div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-[8px] uppercase mb-0.5">Traders</div>
                          <div className="text-white font-bold">{m.participants}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-[8px] uppercase mb-0.5">Expiry</div>
                          <div className={`font-bold ${m.isSettled ? 'text-emerald-400' : isExpired ? 'text-red-400' : 'text-orange-400'}`}>
                            {m.isSettled ? 'Done' : isExpired ? 'Expired' : formatTimeLeft(timeLeft)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <NextLink href="/" className="block">
                  <Button variant="outline" className="w-full border-amber-500/20 text-amber-400 hover:bg-amber-500/10 font-bold uppercase tracking-wider text-[10px] h-9 rounded-sm gap-2">
                    <Zap className="w-3.5 h-3.5" /> Open Trading Terminal <ArrowRight className="w-3 h-3" />
                  </Button>
                </NextLink>
              </div>
            </section>

            {/* Depeg Shield */}
            <section>
              <SectionHeader icon={<Shield className="w-4 h-4 text-indigo-400" />} title="Depeg Shield Status" subtitle="Stablecoin depeg protection monitoring" />
              <div className="mt-4 space-y-3">
                {/* USDC Monitor */}
                <DepegMonitorCard
                  coin="USDC"
                  price={getPrice('USDC/USD')?.value}
                  barrier={0.985}
                  distance={depegDistance?.usdc}
                />
                {/* USDT Monitor */}
                <DepegMonitorCard
                  coin="USDT"
                  price={getPrice('USDT/USD')?.value}
                  barrier={0.985}
                  distance={depegDistance?.usdt}
                />

                {/* Protection Tiers */}
                <div className="bg-black/40 border border-white/5 rounded-sm p-4">
                  <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-3">Available Protection Tiers</div>
                  <div className="space-y-2">
                    {[
                      { name: '2-Min Shield', horizon: '120s', barrier: '$0.997', window: '1 min' },
                      { name: 'Daily Shield', horizon: '1 day', barrier: '$0.995', window: '5 min' },
                      { name: 'Weekly Shield', horizon: '7 days', barrier: '$0.990', window: '15 min' },
                      { name: 'Monthly Shield', horizon: '30 days', barrier: '$0.985', window: '15 min' },
                      { name: 'Yearly Shield', horizon: '365 days', barrier: '$0.980', window: '15 min' },
                    ].map(tier => (
                      <div key={tier.name} className="flex items-center justify-between text-[10px] font-code py-1 border-b border-white/[0.03] last:border-0">
                        <span className="text-white font-bold">{tier.name}</span>
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <span>{tier.horizon}</span>
                          <span>{tier.barrier}</span>
                          <span>{tier.window}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <NextLink href="/depeg" className="block">
                  <Button variant="outline" className="w-full border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 font-bold uppercase tracking-wider text-[10px] h-9 rounded-sm gap-2">
                    <Shield className="w-3.5 h-3.5" /> Open Depeg Shield <ArrowRight className="w-3 h-3" />
                  </Button>
                </NextLink>
              </div>
            </section>
          </div>

          {/* ═══ FLARE PROTOCOLS ═══ */}
          <section>
            <SectionHeader icon={<Layers className="w-4 h-4 text-violet-400" />} title="Flare Protocols Used" subtitle="Three native Flare protocols powering this platform" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <ProtocolCard
                name="FTSO v2"
                description="Decentralized oracle with 100+ data providers. 1.8s block-latency price feeds for BTC, ETH, FLR, USDC, USDT. Free on-chain queries."
                icon={<Radio className="w-5 h-5" />}
                color="emerald"
                status={oracleOk ? 'Connected' : 'Loading'}
              />
              <ProtocolCard
                name="FDC"
                description="Flare Data Connector brings Web2 data on-chain with decentralized attestation. Ethereum gas prices from Beaconcha.in verified via Merkle proofs."
                icon={<Cpu className="w-5 h-5" />}
                color="blue"
                status="Available"
              />
              <ProtocolCard
                name="Oracle Attestations"
                description="ECDSA-signed probability quotes and trigger proofs for depeg insurance. On-chain signature verification prevents unauthorized claims."
                icon={<ShieldCheck className="w-5 h-5" />}
                color="violet"
                status="Ready"
              />
            </div>
          </section>

          {/* ═══ QUICK DEPLOY ═══ */}
          <section className="pb-12">
            <SectionHeader icon={<Cpu className="w-4 h-4 text-cyan-400" />} title="Quick Deploy" subtitle="Get this running locally or on Vercel in minutes" />
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/40 border border-white/5 rounded-sm p-5 space-y-4">
                <div className="text-xs font-bold text-white uppercase tracking-wider">Local Development</div>
                <div className="font-code text-[11px] bg-black/60 border border-white/[0.05] rounded-sm p-4 space-y-1 text-muted-foreground leading-relaxed">
                  <div><span className="text-emerald-400">$</span> git clone &lt;repo&gt;</div>
                  <div><span className="text-emerald-400">$</span> cd gascap-frontend</div>
                  <div><span className="text-emerald-400">$</span> npm install</div>
                  <div><span className="text-emerald-400">$</span> npm run dev</div>
                  <div className="text-muted-foreground/50 pt-2">Opens on http://localhost:9003</div>
                </div>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-sm p-5 space-y-4">
                <div className="text-xs font-bold text-white uppercase tracking-wider">Vercel / Netlify</div>
                <div className="font-code text-[11px] bg-black/60 border border-white/[0.05] rounded-sm p-4 space-y-1 text-muted-foreground leading-relaxed">
                  <div>1. Push to GitHub</div>
                  <div>2. Import in Vercel</div>
                  <div>3. Root: <span className="text-white">gascap-frontend</span></div>
                  <div>4. Build: <span className="text-white">npm run build</span></div>
                  <div>5. Output: <span className="text-white">out/</span></div>
                  <div className="text-muted-foreground/50 pt-2">Static export, no server needed</div>
                </div>
              </div>
            </div>

            {/* Contract addresses reference */}
            <div className="mt-4 bg-black/40 border border-white/5 rounded-sm p-5">
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-3">Deployed Contracts (Coston2)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-code text-[10px]">
                <ContractRef label="Factory" address={CONFIG.FACTORY_ADDRESS} />
                <ContractRef label="Default Market" address={CONFIG.CONTRACT_ADDRESS} />
                <ContractRef label="30s Market" address={CONFIG.MARKETS.SIHEON_30S} />
                <ContractRef label="48h Market" address={CONFIG.MARKETS.ARON_48H} />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// ─── Helper Components ───

function StatusRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <div className="flex items-center gap-2">
        {ok ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-muted-foreground animate-pulse" />}
        <span className="text-white font-bold">{label}</span>
      </div>
      <span className={`font-code ${ok ? 'text-emerald-400' : 'text-muted-foreground'}`}>{detail}</span>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function PriceCard({ feed, price, icon, isStable }: { feed: string; price?: FTSOPrice; icon: string; isStable?: boolean }) {
  const colorMap: Record<string, string> = {
    orange: 'from-orange-500/20 to-orange-900/10 border-orange-500/20',
    blue: 'from-blue-500/20 to-blue-900/10 border-blue-500/20',
    pink: 'from-pink-500/20 to-pink-900/10 border-pink-500/20',
    green: 'from-emerald-500/20 to-emerald-900/10 border-emerald-500/20',
    teal: 'from-teal-500/20 to-teal-900/10 border-teal-500/20',
  };
  const textMap: Record<string, string> = {
    orange: 'text-orange-400',
    blue: 'text-blue-400',
    pink: 'text-pink-400',
    green: 'text-emerald-400',
    teal: 'text-teal-400',
  };

  const displayValue = price ? (isStable ? price.value.toFixed(4) : price.value < 1 ? price.value.toFixed(6) : price.value.toLocaleString(undefined, { maximumFractionDigits: 2 })) : '---';

  return (
    <div className={`bg-gradient-to-b ${colorMap[icon]} border rounded-sm p-4`}>
      <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-2">{feed}</div>
      <div className={`text-lg font-bold font-code leading-none ${price ? textMap[icon] : 'text-muted-foreground'}`}>
        ${displayValue}
      </div>
      {price && price.raw > 0n && (
        <div className="text-[8px] text-muted-foreground/50 font-code mt-1">
          raw: {price.raw.toString().slice(0, 12)}{price.raw.toString().length > 12 ? '...' : ''}
        </div>
      )}
    </div>
  );
}

function IndexComponent({ label, weight, rawValue, lastDigits, color }: { label: string; weight: string; rawValue?: number; lastDigits: number; color: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{label}</span>
        <Badge className="text-[7px] h-3.5 px-1 bg-white/5 text-muted-foreground border-white/10 font-bold">{weight}</Badge>
      </div>
      <div className="flex items-end justify-between">
        <span className={`text-xl font-bold font-code ${color}`}>{lastDigits}</span>
        {rawValue !== undefined && (
          <span className="text-[9px] text-muted-foreground font-code">
            from ${rawValue < 1 ? rawValue.toFixed(4) : rawValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        )}
      </div>
      {/* Visual bar */}
      <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color.replace('text-', 'bg-')}`} style={{ width: `${lastDigits}%` }} />
      </div>
    </div>
  );
}

function DepegMonitorCard({ coin, price, barrier, distance }: { coin: string; price?: number; barrier: number; distance?: number }) {
  const isSafe = price ? price >= barrier : true;
  return (
    <div className={`bg-black/40 border rounded-sm p-4 ${isSafe ? 'border-emerald-500/10' : 'border-red-500/30 bg-red-950/10'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className={`w-4 h-4 ${isSafe ? 'text-emerald-400' : 'text-red-400'}`} />
          <span className="text-sm font-bold text-white">{coin}/USD</span>
        </div>
        <Badge className={`text-[8px] h-4 px-1.5 font-bold uppercase ${isSafe ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-red-500/15 text-red-400 border-red-500/20'}`}>
          {isSafe ? 'Stable' : 'ALERT'}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-3 text-[10px] font-code">
        <div>
          <div className="text-muted-foreground text-[8px] uppercase mb-0.5">Price</div>
          <div className={`font-bold ${isSafe ? 'text-emerald-400' : 'text-red-400'}`}>
            {price ? `$${price.toFixed(4)}` : '---'}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground text-[8px] uppercase mb-0.5">Barrier</div>
          <div className="text-white font-bold">${barrier.toFixed(3)}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-[8px] uppercase mb-0.5">Distance</div>
          <div className={`font-bold ${isSafe ? 'text-emerald-400' : 'text-red-400'}`}>
            {distance !== undefined ? `${distance.toFixed(2)}%` : '---'}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProtocolCard({ name, description, icon, color, status }: { name: string; description: string; icon: React.ReactNode; color: string; status: string }) {
  const colorClasses: Record<string, string> = {
    emerald: 'from-emerald-500/20 to-emerald-900/5 border-emerald-500/20 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-900/5 border-blue-500/20 text-blue-400',
    violet: 'from-violet-500/20 to-violet-900/5 border-violet-500/20 text-violet-400',
  };
  return (
    <div className={`bg-gradient-to-b ${colorClasses[color]} border rounded-sm p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`${colorClasses[color].split(' ').pop()}`}>{icon}</div>
        <Badge className="text-[7px] h-3.5 px-1 bg-white/5 text-muted-foreground border-white/10 font-bold uppercase">{status}</Badge>
      </div>
      <div className="text-sm font-bold text-white mb-2">{name}</div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function ContractRef({ label, address }: { label: string; address: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 bg-white/[0.02] rounded-sm">
      <span className="text-muted-foreground">{label}</span>
      <a href={`${CONFIG.EXPLORER_URL}/address/${address}`} target="_blank" rel="noopener noreferrer"
        className="text-blue-400 hover:underline flex items-center gap-1">
        {address.slice(0, 8)}...{address.slice(-6)} <ExternalLink className="w-2.5 h-2.5" />
      </a>
    </div>
  );
}

function formatTimeLeft(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d`;
}
