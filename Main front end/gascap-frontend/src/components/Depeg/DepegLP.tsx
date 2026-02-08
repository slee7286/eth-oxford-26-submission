"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Droplets, TrendingUp, Info } from 'lucide-react';

export function DepegLP() {
  const [amount, setAmount] = useState('');
  const { toast } = useToast();

  const handleAdd = () => {
    toast({ title: "Coming Soon", description: "LP contracts deploying soon. Stay tuned!" });
  };

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-white">Become a Liquidity Provider</h3>
        </div>
        <Badge className="text-[7px] h-3.5 px-1.5 bg-amber-500/15 text-amber-400 border-amber-500/20 font-black uppercase">
          Coming Soon
        </Badge>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Provide liquidity to earn premiums from protection buyers. Your capital backs depeg insurance policies
        and earns yield from protection premiums paid by hedgers.
      </p>

      {/* APY Display */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3 text-center">
          <div className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Est. APY</div>
          <div className="flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400 font-bold text-lg">12-18%</span>
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3 text-center">
          <div className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Total Pool</div>
          <span className="text-white font-bold text-lg">1,050</span>
          <span className="text-[9px] text-muted-foreground ml-1">C2FLR</span>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3 text-center">
          <div className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Utilization</div>
          <span className="text-indigo-400 font-bold text-lg">0%</span>
        </div>
      </div>

      {/* LP Input */}
      <div className="flex gap-3 items-end">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-1">
            <Label className="text-[10px] text-muted-foreground uppercase font-bold">Deposit Amount</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger><Info className="w-3 h-3 text-muted-foreground/50" /></TooltipTrigger>
                <TooltipContent>C2FLR deposited as liquidity backing depeg protection.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="relative">
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="bg-white/5 border-white/5 text-white font-code h-10 rounded-sm text-sm pr-16"
              placeholder="0.0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold uppercase pointer-events-none">C2FLR</span>
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  disabled
                  onClick={handleAdd}
                  className="h-10 px-6 bg-indigo-600/50 text-indigo-200 font-bold uppercase text-[10px] tracking-wider rounded-sm"
                >
                  Add Liquidity
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>Coming soon — contracts deploying</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
