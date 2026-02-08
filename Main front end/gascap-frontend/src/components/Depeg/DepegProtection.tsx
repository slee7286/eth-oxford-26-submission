"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { Shield, Info, Zap, Clock, Target, DollarSign } from 'lucide-react';

const STABLECOINS = [
  { id: 'usdc', name: 'USDC', barrier: 0.985, price: 0.9998 },
  { id: 'usdt', name: 'USDT', barrier: 0.985, price: 1.0001 },
  { id: 'basket', name: 'Basket', barrier: 0.990, price: 0.9999 },
];

export function DepegProtection() {
  const [selected, setSelected] = useState('usdc');
  const [amount, setAmount] = useState('10');
  const { toast } = useToast();

  const coin = STABLECOINS.find(c => c.id === selected)!;
  const amountNum = parseFloat(amount) || 0;
  const premiumRate = 0.016; // 1.6%
  const premium = amountNum * premiumRate;
  const maxPayout = amountNum; // 1:1 payout on depeg
  const duration = 7; // days

  const handleBuy = () => {
    toast({ title: "Contracts Deploying Soon", description: "Depeg protection contracts are being built by SiheonLee. Check back shortly!" });
  };

  return (
    <div className="flex flex-col gap-5 py-4 px-3 bg-[#080808]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-bold uppercase">
          Protection
        </Badge>
        <Badge className="text-[7px] h-3 px-1 bg-amber-500/15 text-amber-400 border-amber-500/20 font-black uppercase">
          Beta
        </Badge>
      </div>

      {/* Stablecoin Selector */}
      <Tabs value={selected} onValueChange={setSelected} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-9 bg-white/5 p-0.5 rounded-sm">
          {STABLECOINS.map(c => (
            <TabsTrigger key={c.id} value={c.id}
              className="rounded-sm font-black text-[9px] uppercase tracking-wider data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              {c.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Protection Amount */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Protection Amount</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger><Info className="w-3 h-3 text-muted-foreground/50" /></TooltipTrigger>
              <TooltipContent>Amount of C2FLR you want protected against stablecoin depeg.</TooltipContent>
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

      {/* Order Summary */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-4 space-y-3">
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Premium</span>
          <span className="text-indigo-400 font-code font-bold">{premium.toFixed(4)} C2FLR</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" /> Barrier</span>
          <span className="text-orange-400 font-code font-bold">${coin.barrier.toFixed(3)}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3" /> Max Payout</span>
          <span className="text-emerald-400 font-code font-bold">{maxPayout.toFixed(2)} C2FLR</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Duration</span>
          <span className="text-white font-code">{duration} days</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Stablecoin</span>
          <span className="text-white font-code font-bold">{coin.name}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Current Price</span>
          <span className="text-white font-code">${coin.price.toFixed(4)}</span>
        </div>
      </div>

      {/* Buy Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button
                className="w-full font-black h-14 uppercase tracking-[0.2em] rounded-sm text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
                disabled
                onClick={handleBuy}
              >
                <Shield className="w-4 h-4 mr-2" />
                Buy Protection
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>Contracts deploying soon — check back shortly!</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Powered By */}
      <div className="flex items-center justify-center gap-2 text-[9px] text-muted-foreground/40 italic">
        <Zap className="w-3 h-3" />
        Powered by Flare FDC cross-chain verification
      </div>
    </div>
  );
}
