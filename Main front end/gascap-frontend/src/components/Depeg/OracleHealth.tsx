"use client";

import { cn } from '@/lib/utils';
import { Activity, Zap, Radio } from 'lucide-react';
import type { FTSOPrice } from '@/lib/ftso-feeds';

interface OracleHealthProps {
  prices: FTSOPrice[];
  loading: boolean;
  error: string | null;
}

export function OracleHealth({ prices, loading, error }: OracleHealthProps) {
  const now = Math.floor(Date.now() / 1000);
  const latestTimestamp = prices.length > 0 ? Math.max(...prices.map(p => p.timestamp)) : 0;
  const secondsAgo = latestTimestamp > 0 ? now - latestTimestamp : null;
  const isLive = secondsAgo !== null && secondsAgo < 30;

  const formatPrice = (p: FTSOPrice) => {
    if (p.feedName.includes('BTC')) return `$${p.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (p.feedName.includes('ETH')) return `$${p.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (p.feedName.includes('FLR')) return `$${p.value.toFixed(4)}`;
    return `$${p.value.toFixed(4)}`;
  };

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className={cn("w-4 h-4", isLive ? "text-emerald-400" : error ? "text-red-400" : "text-amber-400")} />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white">Oracle Status</h3>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider",
          isLive ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" :
          error ? "bg-red-500/15 text-red-400 border border-red-500/20" :
          "bg-amber-500/15 text-amber-400 border border-amber-500/20"
        )}>
          <span className={cn(
            "w-1.5 h-1.5 rounded-full",
            isLive ? "bg-emerald-500 animate-pulse" : error ? "bg-red-500" : "bg-amber-500 animate-pulse"
          )} />
          {loading ? 'Connecting...' : error ? 'Error' : isLive ? 'Live' : 'Stale'}
        </div>
      </div>

      {/* Feed prices */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex justify-between items-center py-1.5">
              <div className="w-16 h-3 bg-white/5 rounded animate-pulse" />
              <div className="w-20 h-3 bg-white/5 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-[10px] text-red-400/70 py-2">{error}</div>
      ) : (
        <div className="space-y-1.5">
          {prices.map((price) => {
            const age = now - price.timestamp;
            const freshness = age < 10 ? 'bg-emerald-500' : age < 60 ? 'bg-amber-500' : 'bg-red-500';

            return (
              <div key={price.feedName} className="flex items-center justify-between py-1.5 px-2 bg-white/[0.01] rounded-sm hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-2">
                  <span className={cn("w-1.5 h-1.5 rounded-full", freshness)} />
                  <span className="text-[11px] text-muted-foreground font-code font-bold">{price.feedName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-white font-code font-bold">{formatPrice(price)}</span>
                  <span className="text-[9px] text-muted-foreground/50 font-code w-12 text-right">
                    {age < 60 ? `${age}s` : `${Math.floor(age / 60)}m`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Network info */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.05]">
        <div className="flex justify-between text-[9px]">
          <span className="text-muted-foreground/50">Network</span>
          <span className="text-blue-400 font-code">Coston2 (114)</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="text-muted-foreground/50">Update Freq</span>
          <span className="text-white font-code">~1.8s</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="text-muted-foreground/50">Providers</span>
          <span className="text-white font-code">100+</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="text-muted-foreground/50">Cost</span>
          <span className="text-emerald-400 font-code">Free</span>
        </div>
      </div>

      <div className="text-[8px] text-muted-foreground/30 text-center italic">
        Flare FTSO v2 — enshrined protocol-level oracle, weighted median from 100+ independent providers
      </div>
    </div>
  );
}
