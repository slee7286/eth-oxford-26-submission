"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight, Zap } from 'lucide-react';
import NextLink from 'next/link';

export function HeroSection() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-indigo-500/10 bg-gradient-to-br from-indigo-950/40 via-[#0a0a0f] to-purple-950/20 p-8 md:p-12">
      {/* Background glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-4 max-w-xl">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-2xl tracking-tight text-white uppercase">Depeg Shield</h1>
                <Badge className="text-[7px] h-3.5 px-1 bg-indigo-500/15 text-indigo-400 border-indigo-500/20 font-black uppercase tracking-wider">Beta</Badge>
              </div>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">Stablecoin Depeg Protection on Flare</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Protect your stablecoin holdings against depeg events. Powered by
            <span className="text-indigo-400 font-semibold"> Flare FTSO v2</span> real-time price feeds
            with <span className="text-indigo-400 font-semibold">~1.8s block-latency</span> updates from 100+ data providers.
          </p>

          <div className="flex items-center gap-3">
            <NextLink href="/depeg/markets">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider h-10 px-6 rounded-sm gap-2 shadow-lg shadow-indigo-500/20">
                View Markets <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </NextLink>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
              <Zap className="w-3 h-3 text-indigo-400/60" />
              Free oracle queries — enshrined on Flare
            </div>
          </div>
        </div>

        {/* Key numbers */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 text-center min-w-[100px]">
            <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Oracle</div>
            <div className="text-lg font-bold text-indigo-400">FTSO v2</div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 text-center min-w-[100px]">
            <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Latency</div>
            <div className="text-lg font-bold text-emerald-400">~1.8s</div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 text-center min-w-[100px]">
            <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Providers</div>
            <div className="text-lg font-bold text-white">100+</div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 text-center min-w-[100px]">
            <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Cost</div>
            <div className="text-lg font-bold text-emerald-400">Free</div>
          </div>
        </div>
      </div>
    </div>
  );
}
