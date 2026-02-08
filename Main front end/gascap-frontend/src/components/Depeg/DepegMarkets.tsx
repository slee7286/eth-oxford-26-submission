"use client";

import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Shield, TrendingDown, Activity, ExternalLink } from 'lucide-react';

const MOCK_MARKETS = [
  {
    id: 'usdc',
    name: 'USDC',
    icon: '🔵',
    price: 0.9998,
    barrier: 0.985,
    premium: 0.16,
    liquidity: 500,
    status: 'Active' as const,
    change24h: -0.02,
  },
  {
    id: 'usdt',
    name: 'USDT',
    icon: '🟢',
    price: 1.0001,
    barrier: 0.985,
    premium: 0.18,
    liquidity: 350,
    status: 'Active' as const,
    change24h: 0.01,
  },
  {
    id: 'basket',
    name: 'USDC/USDT Basket',
    icon: '🟣',
    price: 0.9999,
    barrier: 0.990,
    premium: 0.12,
    liquidity: 200,
    status: 'Active' as const,
    change24h: -0.01,
  },
];

export function DepegMarkets() {
  const { toast } = useToast();

  const handleClick = () => {
    toast({ title: "Coming Soon", description: "Individual market pages launching with contract deployment." });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" />
          Protection Markets
        </h2>
        <Badge className="text-[7px] h-3.5 px-1.5 bg-indigo-500/15 text-indigo-400 border-indigo-500/20 font-black uppercase">
          Phase 2
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px] font-code border-collapse">
          <thead className="text-muted-foreground uppercase font-bold border-b border-white/5 bg-white/[0.01]">
            <tr>
              <th className="text-left py-3 px-4 font-bold">Stablecoin</th>
              <th className="text-left py-3 px-4 font-bold">Price</th>
              <th className="text-left py-3 px-4 font-bold">Barrier</th>
              <th className="text-left py-3 px-4 font-bold">Premium</th>
              <th className="text-left py-3 px-4 font-bold">Liquidity</th>
              <th className="text-left py-3 px-4 font-bold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {MOCK_MARKETS.map((market) => (
              <tr
                key={market.id}
                onClick={handleClick}
                className="hover:bg-indigo-500/5 cursor-pointer transition-colors group"
              >
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{market.icon}</span>
                    <span className="font-bold text-white text-xs">{market.name}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex flex-col">
                    <span className="text-white font-bold">${market.price.toFixed(4)}</span>
                    <span className={cn("text-[9px]", market.change24h >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {market.change24h >= 0 ? '+' : ''}{market.change24h.toFixed(2)}%
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <span className="text-orange-400 font-bold">${market.barrier.toFixed(3)}</span>
                </td>
                <td className="py-3.5 px-4">
                  <span className="text-indigo-400 font-bold">{market.premium} C2FLR</span>
                </td>
                <td className="py-3.5 px-4">
                  <span className="text-white">{market.liquidity} C2FLR</span>
                </td>
                <td className="py-3.5 px-4">
                  <Badge className="text-[8px] h-4 bg-emerald-500/15 text-emerald-400 border-emerald-500/20 font-bold">
                    <Activity className="w-2.5 h-2.5 mr-0.5" />
                    {market.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-[9px] text-muted-foreground/40 text-center italic">
        Prices via Flare FTSO V2 oracle — cross-chain verified via FDC
      </div>
    </div>
  );
}
