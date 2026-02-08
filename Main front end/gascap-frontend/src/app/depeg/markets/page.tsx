"use client";

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { MarketCard } from '@/components/Depeg/MarketCard';
import { MarketFilters } from '@/components/Depeg/MarketFilters';
import { OracleHealth } from '@/components/Depeg/OracleHealth';
import { BuyProtectionModal } from '@/components/Depeg/BuyProtectionModal';
import { AddLiquidityModal } from '@/components/Depeg/AddLiquidityModal';
import { fetchFTSOPrices, calculateBasketPrice, distanceToBarrier, FEED_IDS } from '@/lib/ftso-feeds';
import { MARKET_CONFIGS, DEPEG_DEFAULTS } from '@/lib/depeg-data';
import type { FTSOPrice } from '@/lib/ftso-feeds';
import type { DepegMarket } from '@/lib/depeg-data';
import { Shield, Zap, ArrowLeft } from 'lucide-react';
import NextLink from 'next/link';

export default function MarketsPage() {
  const [markets, setMarkets] = useState<DepegMarket[]>([]);
  const [oraclePrices, setOraclePrices] = useState<FTSOPrice[]>([]);
  const [oracleLoading, setOracleLoading] = useState(true);
  const [oracleError, setOracleError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
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
            // LAYER 2: Placeholder contract data
            barrier: cfg.barrier,
            premiumRate: cfg.premiumRate,
            lpApy: cfg.lpApy,
            liquidity: cfg.liquidity,
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
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const filteredMarkets = markets.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'usdc') return m.stablecoin === 'USDC';
    if (filter === 'usdt') return m.stablecoin === 'USDT';
    if (filter === 'basket') return m.stablecoin === 'USDC/USDT';
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-foreground font-body">
      {/* Header */}
      <header className="h-16 bg-[#0a0a0a]/90 border-b border-white/5 flex items-center px-6 justify-between shrink-0 z-50 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-6">
          <NextLink href="/depeg" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Depeg Home</span>
          </NextLink>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h1 className="font-bold text-sm tracking-tight text-white leading-none uppercase">All Markets</h1>
            <Badge className="text-[7px] h-3.5 px-1 bg-emerald-500/15 text-emerald-400 border-emerald-500/20 font-black uppercase tracking-wider">
              Live
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] text-indigo-400 font-bold uppercase tracking-tight">
            <Zap className="w-3.5 h-3.5" /> FTSO v2 Live
          </div>
        </div>
      </header>

      <main className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Markets list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <MarketFilters filter={filter} onFilterChange={setFilter} />

          <div className="space-y-2">
            {filteredMarkets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                onBuyProtection={setBuyModal}
                onAddLiquidity={setLiqModal}
              />
            ))}
          </div>

          {filteredMarkets.length === 0 && (
            <div className="text-center py-12 text-muted-foreground/40 text-sm">
              No markets match the current filter.
            </div>
          )}
        </div>

        {/* Right: Oracle Health */}
        <div className="w-[320px] border-l border-white/5 shrink-0 overflow-y-auto bg-black/40 p-4">
          <OracleHealth
            prices={oraclePrices}
            loading={oracleLoading}
            error={oracleError}
          />
        </div>
      </main>

      {/* Modals */}
      {buyModal && <BuyProtectionModal market={buyModal} onClose={() => setBuyModal(null)} />}
      {liqModal && <AddLiquidityModal market={liqModal} onClose={() => setLiqModal(null)} />}
    </div>
  );
}
