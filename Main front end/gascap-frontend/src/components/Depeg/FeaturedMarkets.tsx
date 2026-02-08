"use client";

import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MarketCard } from './MarketCard';
import type { DepegMarket } from '@/lib/depeg-data';

interface FeaturedMarketsProps {
  markets: DepegMarket[];
  onBuyProtection: (market: DepegMarket) => void;
  onAddLiquidity: (market: DepegMarket) => void;
}

export function FeaturedMarkets({ markets, onBuyProtection, onAddLiquidity }: FeaturedMarketsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" />
          Protection Markets
        </h2>
        <Badge className="text-[7px] h-3.5 px-1.5 bg-emerald-500/15 text-emerald-400 border-emerald-500/20 font-black uppercase">
          Live FTSO Prices
        </Badge>
      </div>

      <div className="space-y-2">
        {markets.map((market) => (
          <MarketCard
            key={market.id}
            market={market}
            onBuyProtection={onBuyProtection}
            onAddLiquidity={onAddLiquidity}
          />
        ))}
      </div>

      <div className="text-[9px] text-muted-foreground/40 text-center italic">
        Prices queried from Flare FTSO v2 — enshrined oracle, 100+ data providers, ~1.8s updates
      </div>
    </div>
  );
}
