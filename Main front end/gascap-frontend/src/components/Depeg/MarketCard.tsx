"use client";

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Activity, ChevronDown, ChevronUp, Shield, Copy, Check, TrendingDown } from 'lucide-react';
import { FEED_IDS } from '@/lib/ftso-feeds';
import type { DepegMarket } from '@/lib/depeg-data';

interface MarketCardProps {
  market: DepegMarket;
  onBuyProtection: (market: DepegMarket) => void;
  onAddLiquidity: (market: DepegMarket) => void;
}

export function MarketCard({ market, onBuyProtection, onAddLiquidity }: MarketCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const feedId = market.feedId || FEED_IDS[market.stablecoin === 'USDC/USDT' ? 'USDC/USD' : `${market.stablecoin}/USD`] || '';
  const secondsAgo = market.lastUpdate ? Math.floor(Date.now() / 1000) - market.lastUpdate : null;
  const freshnessColor = secondsAgo === null ? 'bg-gray-500' : secondsAgo < 10 ? 'bg-emerald-500' : secondsAgo < 60 ? 'bg-amber-500' : 'bg-red-500';
  const priceHealthy = market.currentPrice >= market.barrier;

  const handleCopyFeedId = () => {
    navigator.clipboard.writeText(feedId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg overflow-hidden hover:border-indigo-500/15 transition-colors">
      {/* Main row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Stablecoin info */}
        <div className="flex items-center gap-3 min-w-[160px]">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border",
            market.stablecoin === 'USDC' ? 'bg-blue-500/15 border-blue-500/20 text-blue-400' :
            market.stablecoin === 'USDT' ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400' :
            'bg-purple-500/15 border-purple-500/20 text-purple-400'
          )}>
            {market.stablecoin === 'USDC/USDT' ? 'B' : market.stablecoin[0]}
          </div>
          <div>
            <div className="text-xs font-bold text-white">{market.stablecoin}</div>
            <div className="text-[9px] text-muted-foreground">{market.name}</div>
          </div>
        </div>

        {/* Live Price */}
        <div className="flex-1 min-w-[100px]">
          <div className="text-[9px] text-muted-foreground font-bold uppercase mb-0.5 flex items-center gap-1">
            <span className={cn("w-1.5 h-1.5 rounded-full inline-block", freshnessColor)} />
            Live Price
          </div>
          <span className={cn(
            "text-sm font-bold font-code",
            priceHealthy ? 'text-emerald-400' : 'text-rose-400'
          )}>
            ${market.currentPrice.toFixed(4)}
          </span>
        </div>

        {/* Barrier */}
        <div className="min-w-[80px]">
          <div className="text-[9px] text-muted-foreground font-bold uppercase mb-0.5">Barrier</div>
          <span className="text-sm text-orange-400 font-bold font-code">${market.barrier.toFixed(3)}</span>
        </div>

        {/* Distance */}
        <div className="min-w-[80px]">
          <div className="text-[9px] text-muted-foreground font-bold uppercase mb-0.5">Distance</div>
          <span className={cn(
            "text-sm font-bold font-code",
            market.distanceToBarrier > 1 ? 'text-emerald-400' : market.distanceToBarrier > 0.5 ? 'text-amber-400' : 'text-rose-400'
          )}>
            {market.distanceToBarrier.toFixed(2)}%
          </span>
        </div>

        {/* Premium */}
        <div className="min-w-[80px]">
          <div className="text-[9px] text-muted-foreground font-bold uppercase mb-0.5">Premium</div>
          <span className="text-sm text-indigo-400 font-bold font-code">{market.premiumRate}%</span>
        </div>

        {/* LP APY */}
        <div className="min-w-[80px]">
          <div className="text-[9px] text-muted-foreground font-bold uppercase mb-0.5">LP APY</div>
          <span className="text-sm text-emerald-400 font-bold font-code">{market.lpApy}%</span>
        </div>

        {/* Status */}
        <div className="min-w-[70px]">
          <Badge className={cn(
            "text-[8px] h-4 font-bold",
            market.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
            market.status === 'triggered' ? 'bg-rose-500/15 text-rose-400 border-rose-500/20' :
            'bg-gray-500/15 text-gray-400 border-gray-500/20'
          )}>
            <Activity className="w-2.5 h-2.5 mr-0.5" />
            {market.status}
          </Badge>
        </div>

        {/* Expand */}
        <div className="text-muted-foreground/50">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-white/[0.05] p-4 space-y-4 bg-white/[0.01]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Price Chart Placeholder */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-4">
              <div className="text-[9px] text-muted-foreground font-bold uppercase mb-3">Price Chart</div>
              <div className="h-20 flex items-center justify-center border border-dashed border-white/10 rounded text-[10px] text-muted-foreground/40">
                <TrendingDown className="w-4 h-4 mr-1.5 text-indigo-400/40" />
                Price feed connecting...
              </div>
              {/* Barrier line */}
              <div className="mt-2 flex items-center gap-2 text-[9px]">
                <div className="flex-1 h-px bg-orange-500/30" />
                <span className="text-orange-400 font-code">Barrier: ${market.barrier}</span>
                <div className="flex-1 h-px bg-orange-500/30" />
              </div>
            </div>

            {/* Oracle Info */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-4 space-y-2.5">
              <div className="text-[9px] text-muted-foreground font-bold uppercase">Oracle Info</div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Source</span>
                  <span className="text-indigo-400 font-bold">Flare FTSO v2</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Update Freq</span>
                  <span className="text-white font-code">Every block (~1.8s)</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Data Providers</span>
                  <span className="text-white font-code">100+</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Cost</span>
                  <span className="text-emerald-400 font-bold">Free (enshrined)</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Last Update</span>
                  <span className="text-white font-code flex items-center gap-1">
                    <span className={cn("w-1.5 h-1.5 rounded-full inline-block", freshnessColor)} />
                    {secondsAgo !== null ? `${secondsAgo}s ago` : 'N/A'}
                  </span>
                </div>
                {feedId && (
                  <div className="flex justify-between text-[10px] items-center">
                    <span className="text-muted-foreground">Feed ID</span>
                    <button onClick={handleCopyFeedId} className="flex items-center gap-1 text-indigo-400/70 hover:text-indigo-400 font-code transition-colors">
                      {feedId.slice(0, 10)}...
                      {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Policy Terms */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-4 space-y-2.5">
              <div className="text-[9px] text-muted-foreground font-bold uppercase">Policy Terms</div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Horizon</span>
                  <span className="text-white font-code">{market.horizon}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Depeg Window</span>
                  <span className="text-white font-code">{market.window}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Premium Rate</span>
                  <span className="text-indigo-400 font-code">{market.premiumRate}%</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Payout</span>
                  <span className="text-emerald-400 font-code">1:1 on trigger</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Verification</span>
                  <span className="text-indigo-400 font-bold">FTSO + FDC</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => onBuyProtection(market)}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wider h-9 rounded-sm gap-1.5"
              disabled
            >
              <Shield className="w-3.5 h-3.5" /> Buy Protection
            </Button>
            <Button
              onClick={() => onAddLiquidity(market)}
              variant="outline"
              className="flex-1 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 font-bold text-[10px] uppercase tracking-wider h-9 rounded-sm gap-1.5"
              disabled
            >
              Add Liquidity
            </Button>
          </div>
          <p className="text-[9px] text-muted-foreground/40 text-center italic">
            Contract deployment in progress. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
}
