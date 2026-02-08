"use client";

import { Shield, Droplets, FileCheck, DollarSign } from 'lucide-react';
import type { DepegMarket } from '@/lib/depeg-data';

interface PlatformStatsProps {
  markets: DepegMarket[];
}

export function PlatformStats({ markets }: PlatformStatsProps) {
  const totalLiquidity = markets.reduce((sum, m) => sum + m.liquidity, 0);
  const activeCount = markets.filter(m => m.status === 'active').length;

  const stats = [
    { label: 'Total Liquidity', value: `${totalLiquidity.toLocaleString()} C2FLR`, icon: Droplets, color: 'text-indigo-400' },
    { label: 'Active Markets', value: activeCount.toString(), icon: Shield, color: 'text-emerald-400' },
    { label: 'Active Policies', value: '0', icon: FileCheck, color: 'text-white' },
    { label: 'Oracle', value: 'Flare FTSO v2', icon: DollarSign, color: 'text-amber-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <stat.icon className="w-3.5 h-3.5 text-muted-foreground/50" />
            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{stat.label}</span>
          </div>
          <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
        </div>
      ))}
    </div>
  );
}
