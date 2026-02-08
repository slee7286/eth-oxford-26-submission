"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { Shield, Info, Zap, Clock, Target, DollarSign, X } from 'lucide-react';
import type { DepegMarket } from '@/lib/depeg-data';

interface BuyProtectionModalProps {
  market: DepegMarket | null;
  onClose: () => void;
}

export function BuyProtectionModal({ market, onClose }: BuyProtectionModalProps) {
  const [amount, setAmount] = useState('10');
  const { toast } = useToast();

  if (!market) return null;

  const amountNum = parseFloat(amount) || 0;
  const premium = amountNum * (market.premiumRate / 100);
  const maxPayout = amountNum;

  const handleBuy = () => {
    toast({ title: "Contracts Deploying", description: "Contract deployment in progress. Check back soon!" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0c0c10] border border-white/10 rounded-xl w-full max-w-md mx-4 shadow-2xl shadow-indigo-500/10" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase text-white tracking-wider">Buy {market.stablecoin} Protection</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Current price */}
          <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
            <span className="text-[10px] text-muted-foreground font-bold uppercase">Live {market.stablecoin} Price</span>
            <span className="text-emerald-400 font-bold font-code">${market.currentPrice.toFixed(4)}</span>
          </div>

          {/* Amount input */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Protection Amount</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><Info className="w-3 h-3 text-muted-foreground/50" /></TooltipTrigger>
                  <TooltipContent>Amount of C2FLR you want protected against {market.stablecoin} depeg.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="relative">
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="bg-white/5 border-white/5 text-white font-code h-11 rounded-sm text-sm pr-16"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold uppercase pointer-events-none">C2FLR</span>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-4 space-y-3">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Premium ({market.premiumRate}%)</span>
              <span className="text-indigo-400 font-code font-bold">{premium.toFixed(4)} C2FLR</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" /> Barrier</span>
              <span className="text-orange-400 font-code font-bold">${market.barrier.toFixed(3)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3" /> Max Payout</span>
              <span className="text-emerald-400 font-code font-bold">{maxPayout.toFixed(2)} C2FLR</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Duration</span>
              <span className="text-white font-code">{market.horizon}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Depeg Window</span>
              <span className="text-white font-code">{market.window}</span>
            </div>
          </div>

          {/* Buy button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    className="w-full font-black h-12 uppercase tracking-[0.2em] rounded-sm text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                    disabled
                    onClick={handleBuy}
                  >
                    <Shield className="w-4 h-4 mr-2" /> Buy Protection
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
