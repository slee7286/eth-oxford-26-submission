"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Activity, Target, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONFIG } from '@/lib/config';
import type { MarketInfo } from '@/lib/blockchain';

interface MarketSelectorProps {
  markets: MarketInfo[];
  selectedAddress: string;
  onSelect: (address: string) => void;
  loading?: boolean;
}

export function MarketSelector({ markets, selectedAddress, onSelect, loading }: MarketSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = markets.find(m => m.address.toLowerCase() === selectedAddress.toLowerCase());
  const now = Math.floor(Date.now() / 1000);

  const getExpiry = (ts: bigint) => {
    const remaining = Number(ts) - now;
    if (remaining <= 0) return 'EXPIRED';
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    return `${h}h ${m}m`;
  };

  // Combine default contract + factory markets, deduplicating
  const allMarkets: MarketInfo[] = [];
  const seen = new Set<string>();

  // Add default contract if not already in factory list
  const defaultAddr = CONFIG.CONTRACT_ADDRESS.toLowerCase();
  if (!markets.some(m => m.address.toLowerCase() === defaultAddr)) {
    allMarkets.push({
      address: CONFIG.CONTRACT_ADDRESS,
      name: 'GasCap Default',
      strike: 0n,
      expiry: 0n,
      isSettled: false,
      participants: 0n,
    });
    seen.add(defaultAddr);
  }

  markets.forEach(m => {
    const key = m.address.toLowerCase();
    if (!seen.has(key)) {
      allMarkets.push(m);
      seen.add(key);
    }
  });

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="border-white/10 bg-white/5 hover:bg-white/10 font-code text-[10px] h-8 px-3 gap-1.5 rounded-sm"
      >
        <Activity className="w-3 h-3 text-primary" />
        {selected ? (
          <span className="max-w-[120px] truncate">{selected.name}</span>
        ) : (
          <span>Select Market</span>
        )}
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
        {allMarkets.length > 0 && (
          <Badge className="text-[7px] h-3 px-1 bg-primary/20 text-primary border-none ml-1">
            {allMarkets.length}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-[280px] bg-[#0c0c0c] border border-white/10 rounded-sm shadow-2xl z-[100] max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-[10px] text-muted-foreground">Loading markets...</div>
          ) : allMarkets.length === 0 ? (
            <div className="p-4 text-center text-[10px] text-muted-foreground">No markets found</div>
          ) : (
            allMarkets.map((market) => {
              const isActive = market.address.toLowerCase() === selectedAddress.toLowerCase();
              const isExpired = Number(market.expiry) > 0 && Number(market.expiry) <= now;
              return (
                <button
                  key={market.address}
                  onClick={() => { onSelect(market.address); setOpen(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors",
                    isActive && "bg-primary/10 border-l-2 border-l-primary"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-white truncate max-w-[160px]">
                      {market.name || 'Unnamed'}
                    </span>
                    {market.isSettled ? (
                      <Badge className="text-[7px] h-3 px-1 bg-emerald-500/20 text-emerald-400 border-none">SETTLED</Badge>
                    ) : isExpired ? (
                      <Badge className="text-[7px] h-3 px-1 bg-red-500/20 text-red-400 border-none">EXPIRED</Badge>
                    ) : (
                      <Badge className="text-[7px] h-3 px-1 bg-blue-500/20 text-blue-400 border-none">LIVE</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Target className="w-2.5 h-2.5" />
                      Strike: {market.strike > 0n ? market.strike.toString() : '?'}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {market.expiry > 0n ? getExpiry(market.expiry) : '--'}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Users className="w-2.5 h-2.5" />
                      {market.participants.toString()}
                    </span>
                  </div>
                  <div className="text-[8px] text-muted-foreground/40 mt-0.5 font-code">
                    {market.address.slice(0, 8)}...{market.address.slice(-6)}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
