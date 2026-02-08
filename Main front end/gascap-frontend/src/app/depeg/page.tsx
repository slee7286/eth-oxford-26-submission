"use client";

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HeroSection } from '@/components/Depeg/HeroSection';
import { PlatformStats } from '@/components/Depeg/PlatformStats';
import { FeaturedMarkets } from '@/components/Depeg/FeaturedMarkets';
import { HowItWorks } from '@/components/Depeg/HowItWorks';
import { OracleHealth } from '@/components/Depeg/OracleHealth';
import { RecentActivity } from '@/components/Depeg/RecentActivity';
import { DepegLP } from '@/components/Depeg/DepegLP';
import { BuyProtectionModal } from '@/components/Depeg/BuyProtectionModal';
import { AddLiquidityModal } from '@/components/Depeg/AddLiquidityModal';
import { fetchFTSOPrices, calculateBasketPrice, distanceToBarrier, FEED_IDS } from '@/lib/ftso-feeds';
import { MARKET_CONFIGS, DEPEG_DEFAULTS } from '@/lib/depeg-data';
import type { FTSOPrice } from '@/lib/ftso-feeds';
import type { DepegMarket } from '@/lib/depeg-data';
import { Shield, Zap, ArrowLeft, AlertTriangle, Globe } from 'lucide-react';
import NextLink from 'next/link';

export default function DepegPage() {
  const [markets, setMarkets] = useState<DepegMarket[]>([]);
  const [oraclePrices, setOraclePrices] = useState<FTSOPrice[]>([]);
  const [oracleLoading, setOracleLoading] = useState(true);
  const [oracleError, setOracleError] = useState<string | null>(null);
  const [buyModal, setBuyModal] = useState<DepegMarket | null>(null);
  const [liqModal, setLiqModal] = useState<DepegMarket | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      // LAYER 1: Real prices from Flare FTSO v2
      const prices = await fetchFTSOPrices(['USDC/USD', 'USDT/USD', 'FLR/USD', 'BTC/USD', 'ETH/USD']);
      setOraclePrices(prices);
      setOracleError(null);

      const usdc = prices.find(p => p.feedName === 'USDC/USD');
      const usdt = prices.find(p => p.feedName === 'USDT/USD');

      if (usdc && usdt) {
        const basketPrice = calculateBasketPrice(usdc.value, usdt.value);

        // Combine REAL FTSO prices + PLACEHOLDER contract data
        const updatedMarkets: DepegMarket[] = MARKET_CONFIGS.map(cfg => {
          let currentPrice: number;
          let feedId: string;

          if (cfg.id === 'usdc-depeg') {
            currentPrice = usdc.value;
            feedId = FEED_IDS['USDC/USD'];
          } else if (cfg.id === 'usdt-depeg') {
            currentPrice = usdt.value;
            feedId = FEED_IDS['USDT/USD'];
          } else {
            currentPrice = basketPrice;
            feedId = 'Composite: USDC + USDT';
          }

          return {
            ...DEPEG_DEFAULTS,
            id: cfg.id,
            stablecoin: cfg.stablecoin,
            name: cfg.name,
            // LAYER 2: Placeholder contract data (swap when deployed)
            barrier: cfg.barrier,           // FUTURE: market.barrierPpm() / 1_000_000
            premiumRate: cfg.premiumRate,    // FUTURE: market.currentLambdaBps() / 100
            lpApy: cfg.lpApy,               // FUTURE: calculated from utilization + lambda
            liquidity: cfg.liquidity,       // FUTURE: market.totalLiquidity()
            // LAYER 1: Real from FTSO
            currentPrice,
            distanceToBarrier: distanceToBarrier(currentPrice, cfg.barrier),
            lastUpdate: usdc.timestamp,
            oracleSource: 'Flare FTSO v2',
            feedId,
          };
        });

        setMarkets(updatedMarkets);
      }
    } catch (err: any) {
      console.error('FTSO fetch failed:', err);
      setOracleError(err?.message || 'Failed to fetch FTSO prices');

      // Fall back to defaults if no data yet
      if (markets.length === 0) {
        setMarkets(MARKET_CONFIGS.map(cfg => ({
          ...DEPEG_DEFAULTS,
          id: cfg.id,
          stablecoin: cfg.stablecoin,
          name: cfg.name,
          barrier: cfg.barrier,
          premiumRate: cfg.premiumRate,
          lpApy: cfg.lpApy,
          liquidity: cfg.liquidity,
          currentPrice: cfg.stablecoin === 'USDC' ? 0.9998 : cfg.stablecoin === 'USDT' ? 1.0001 : 0.9999,
          distanceToBarrier: distanceToBarrier(
            cfg.stablecoin === 'USDC' ? 0.9998 : cfg.stablecoin === 'USDT' ? 1.0001 : 0.9999,
            cfg.barrier
          ),
        })));
      }
    } finally {
      setOracleLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-foreground font-body">
      {/* Header */}
      <header className="h-16 bg-[#0a0a0a]/90 border-b border-white/5 flex items-center px-6 justify-between shrink-0 z-50 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-6">
          <NextLink href="/" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Futures</span>
          </NextLink>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.4)]">
              <Shield size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-lg tracking-tight text-white leading-none uppercase">DEPEG SHIELD</h1>
                <Badge className="text-[7px] h-3.5 px-1 bg-indigo-500/15 text-indigo-400 border-indigo-500/20 font-black uppercase tracking-wider">Beta</Badge>
              </div>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest leading-none mt-1">Stablecoin Depeg Protection on Flare</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NextLink href="/depeg/markets">
            <Button variant="outline" size="sm" className="text-[10px] h-7 px-3 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 font-bold uppercase tracking-wider rounded-sm">
              All Markets
            </Button>
          </NextLink>
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] text-indigo-400 font-bold uppercase tracking-tight">
            <Zap className="w-3.5 h-3.5" /> Flare FTSO v2
          </div>
          <NextLink href="/explore">
            <Button variant="outline" size="sm" className="text-[10px] h-7 px-3 border-violet-500/20 text-violet-400 hover:bg-violet-500/10 font-bold uppercase tracking-wider rounded-sm gap-1">
              <Globe className="w-3 h-3" /> Explore
            </Button>
          </NextLink>
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] text-blue-400 font-bold uppercase tracking-tight">
            Coston2
          </div>
        </div>
      </header>

      <main className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Main Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <HeroSection />
          <PlatformStats markets={markets} />
          <HowItWorks />
          <FeaturedMarkets
            markets={markets}
            onBuyProtection={setBuyModal}
            onAddLiquidity={setLiqModal}
          />
          <DepegLP />

          {/* Disclaimer */}
          <div className="flex items-start gap-3 text-[9px] text-muted-foreground/40 leading-relaxed italic border-t border-white/5 pt-4">
            <AlertTriangle className="w-4 h-4 shrink-0 text-orange-500/30 mt-0.5" />
            <p>
              Depeg Shield uses Flare FTSO v2 for real-time stablecoin price monitoring and FDC (Flare Data Connector)
              for cross-chain verification. Protection pays out when a stablecoin&apos;s price drops below the barrier level
              for a sustained window. This is a testnet demo for ETH Oxford 2026. No real funds at risk.
            </p>
          </div>
        </div>

        {/* Right: Oracle Health + Activity */}
        <div className="w-[340px] border-l border-white/5 shrink-0 overflow-y-auto bg-black/40 p-4 space-y-6">
          <OracleHealth
            prices={oraclePrices}
            loading={oracleLoading}
            error={oracleError}
          />
          <RecentActivity />
        </div>
      </main>

      {/* Modals */}
      {buyModal && <BuyProtectionModal market={buyModal} onClose={() => setBuyModal(null)} />}
      {liqModal && <AddLiquidityModal market={liqModal} onClose={() => setLiqModal(null)} />}
    </div>
  );
}
