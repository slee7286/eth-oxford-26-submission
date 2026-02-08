"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Droplets, Info, TrendingUp, X } from 'lucide-react';
import type { DepegMarket } from '@/lib/depeg-data';

interface AddLiquidityModalProps {
  market: DepegMarket | null;
  onClose: () => void;
}

export function AddLiquidityModal({ market, onClose }: AddLiquidityModalProps) {
  const [amount, setAmount] = useState('');
  const { toast } = useToast();

  if (!market) return null;

  const handleAdd = () => {
    toast({ title: "Coming Soon", description: "Contract deployment in progress. Check back soon!" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0c0c10] border border-white/10 rounded-xl w-full max-w-md mx-4 shadow-2xl shadow-indigo-500/10" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase text-white tracking-wider">Add Liquidity — {market.stablecoin}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Pool stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3 text-center">
              <div className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Est. APY</div>
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-bold">{market.lpApy}%</span>
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3 text-center">
              <div className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Pool</div>
              <span className="text-white font-bold">{market.liquidity}</span>
              <span className="text-[9px] text-muted-foreground ml-1">C2FLR</span>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3 text-center">
              <div className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Utilization</div>
              <span className="text-indigo-400 font-bold">{market.utilization}%</span>
            </div>
          </div>

          {/* Amount input */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Deposit Amount</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><Info className="w-3 h-3 text-muted-foreground/50" /></TooltipTrigger>
                  <TooltipContent>C2FLR deposited as liquidity backing {market.stablecoin} depeg protection.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="relative">
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="bg-white/5 border-white/5 text-white font-code h-11 rounded-sm text-sm pr-16"
                placeholder="0.0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold uppercase pointer-events-none">C2FLR</span>
            </div>
          </div>

          {/* Add button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    className="w-full font-black h-12 uppercase tracking-[0.15em] rounded-sm text-xs bg-indigo-600/50 text-indigo-200"
                    disabled
                    onClick={handleAdd}
                  >
                    <Droplets className="w-4 h-4 mr-2" /> Add Liquidity
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>Contract deployment in progress. Check back soon!</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
