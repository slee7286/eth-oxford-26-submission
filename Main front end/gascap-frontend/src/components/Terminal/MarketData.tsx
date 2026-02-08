"use client";

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Activity, ExternalLink, TrendingUp, TrendingDown, Clock, Droplets, Users, Target, Plus } from 'lucide-react';
import { CONFIG, FACTORY_ABI } from '@/lib/config';
import { formatUnits, Contract } from 'ethers';
import type { OnChainTrade } from '@/lib/blockchain';

interface MarketDataProps {
  currentPrice?: bigint;
  contractState?: {
    strikePriceGwei: bigint;
    expiryTimestamp: bigint;
    isSettled: boolean;
    settlementPriceGwei: bigint;
    totalLiquidityWei: bigint;
    participantCount: bigint;
  } | null;
  contractAddress?: string;
  recentTrades?: OnChainTrade[];
  provider?: any | null;
  onMarketCreated?: (address: string) => void;
}

const EXPIRY_OPTIONS = [
  { label: '1 Hour', seconds: 3600 },
  { label: '6 Hours', seconds: 21600 },
  { label: '24 Hours', seconds: 86400 },
  { label: '48 Hours', seconds: 172800 },
  { label: '1 Week', seconds: 604800 },
];

export function MarketData({ currentPrice, contractState, contractAddress, recentTrades = [], provider, onMarketCreated }: MarketDataProps) {
  const [tab, setTab] = useState("MARKET");
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const { toast } = useToast();

  // Create Market form state
  const [strikeInput, setStrikeInput] = useState('50');
  const [expiryIndex, setExpiryIndex] = useState(3); // 48h default
  const [marketName, setMarketName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const activeAddress = contractAddress || CONFIG.CONTRACT_ADDRESS;
  const price = currentPrice ? Number(currentPrice) : 0;
  const strike = contractState ? Number(contractState.strikePriceGwei) : 0;
  const expiry = contractState ? Number(contractState.expiryTimestamp) : 0;
  const remaining = expiry - now;
  const isExpired = remaining <= 0;
  const liquidity = contractState ? Number(formatUnits(contractState.totalLiquidityWei, 18)) : 0;
  const participants = contractState ? Number(contractState.participantCount) : 0;

  const getCountdown = () => {
    if (isExpired) return "EXPIRED";
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const priceDiff = price > 0 && strike > 0 ? price - strike : 0;
  const priceDiffPct = strike > 0 ? ((priceDiff / strike) * 100) : 0;
  const isAboveStrike = priceDiff > 0;

  const handleCreateMarket = async () => {
    if (!provider) {
      toast({ title: "Wallet not connected", description: "Connect your wallet first.", variant: "destructive" });
      return;
    }

    const strikeVal = parseInt(strikeInput);
    if (!strikeVal || strikeVal <= 0) {
      toast({ title: "Invalid strike", description: "Enter a valid strike price.", variant: "destructive" });
      return;
    }

    const name = marketName.trim() || `GCAP-${strikeVal}`;
    const expiryDuration = EXPIRY_OPTIONS[expiryIndex].seconds;

    setCreating(true);
    try {
      const signer = await provider.getSigner();
      const factory = new Contract(CONFIG.FACTORY_ADDRESS, FACTORY_ABI, signer);
      const tx = await factory.createMarket(
        strikeVal,
        expiryDuration,
        name,
        `Gas futures with strike ${strikeVal}, expiry ${EXPIRY_OPTIONS[expiryIndex].label}`
      );
      toast({ title: "Creating Market...", description: "Transaction submitted." });
      const receipt = await tx.wait();

      // Parse the FuturesCreated event to get the new address
      const createdEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog({ topics: log.topics, data: log.data });
          return parsed?.name === 'MarketCreated' || parsed?.name === 'FuturesCreated';
        } catch { return false; }
      });

      let newAddress = '';
      if (createdEvent) {
        const parsed = factory.interface.parseLog({ topics: createdEvent.topics, data: createdEvent.data });
        newAddress = parsed?.args[0] || '';
      }

      toast({
        title: "Market Created!",
        description: newAddress ? `${name} deployed at ${newAddress.slice(0, 8)}...` : `${name} created successfully.`
      });

      if (newAddress && onMarketCreated) {
        onMarketCreated(newAddress);
      }
    } catch (err: any) {
      toast({ title: "Creation Failed", description: err?.reason || err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (!mounted) return <div className="h-full bg-[#080808]" />;

  return (
    <div className="h-full flex flex-col bg-[#080808]">
      <div className="h-10 border-b border-white/5 flex items-center px-3 bg-white/[0.01]">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="bg-transparent h-8 p-0 gap-3">
            {["MARKET", "TRADES", "CREATE"].map((t) => (
              <TabsTrigger key={t} value={t}
                className="text-[10px] h-full px-0 min-w-0 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary transition-all font-bold uppercase tracking-widest">
                {t === "CREATE" ? <span className="flex items-center gap-0.5"><Plus className="w-2.5 h-2.5" />{t}</span> : t}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden p-3">
        {tab === "MARKET" ? (
          <div className="flex flex-col h-full font-code text-[11px] space-y-3 overflow-y-auto">
            {/* FTSO Index Price */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
              <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-emerald-500" />
                FTSO Gas Index (Live)
              </div>
              <div className="flex items-end justify-between">
                <span className={cn("text-2xl font-bold leading-none", price > 0 ? "text-emerald-400" : "text-muted-foreground")}>
                  {price > 0 ? price.toFixed(2) : '---'}
                </span>
                {price > 0 && (
                  <div className={cn("flex items-center gap-1 text-[10px] font-bold", isAboveStrike ? "text-emerald-400" : "text-rose-400")}>
                    {isAboveStrike ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(2)} ({priceDiffPct > 0 ? '+' : ''}{priceDiffPct.toFixed(1)}%)
                  </div>
                )}
              </div>
              <div className="text-[9px] text-muted-foreground mt-1">BTC(50%) + ETH(30%) + FLR(20%) weighted index</div>
            </div>

            {/* Strike & Settlement */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-2.5">
                <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1 mb-1">
                  <Target className="w-3 h-3 text-amber-500" />
                  Strike
                </div>
                <span className="text-white font-bold text-sm">{strike > 0 ? strike : '---'}</span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-2.5">
                <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1 mb-1">
                  <Clock className={cn("w-3 h-3", isExpired ? "text-red-400" : "text-blue-400")} />
                  Expiry
                </div>
                <span className={cn("font-bold text-sm", contractState?.isSettled ? "text-emerald-400" : isExpired ? "text-red-400" : "text-orange-400")}>
                  {contractState?.isSettled ? "SETTLED" : getCountdown()}
                </span>
              </div>
            </div>

            {/* Liquidity & Participants */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-2.5">
                <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1 mb-1">
                  <Droplets className="w-3 h-3 text-cyan-400" />
                  Pool
                </div>
                <span className="text-white font-bold text-sm">{liquidity.toFixed(4)}</span>
                <span className="text-[9px] text-muted-foreground ml-1">C2FLR</span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-2.5">
                <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1 mb-1">
                  <Users className="w-3 h-3 text-purple-400" />
                  Traders
                </div>
                <span className="text-white font-bold text-sm">{participants}</span>
              </div>
            </div>

            {/* Settlement Outlook */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
              <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-2">Settlement Outlook</div>
              {contractState?.isSettled ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Settlement Price</span>
                    <span className="text-emerald-400 font-bold">{Number(contractState.settlementPriceGwei)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Outcome</span>
                    <span className={cn("font-bold", Number(contractState.settlementPriceGwei) > strike ? "text-emerald-400" : "text-rose-400")}>
                      {Number(contractState.settlementPriceGwei) > strike ? "LONGS WIN" : "SHORTS WIN"}
                    </span>
                  </div>
                </div>
              ) : price > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">If settled now</span>
                    <span className={cn("font-bold", isAboveStrike ? "text-emerald-400" : "text-rose-400")}>
                      {isAboveStrike ? "LONGS win" : "SHORTS win"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Distance to strike</span>
                    <span className="text-white font-bold">{Math.abs(priceDiff).toFixed(2)} ({Math.abs(priceDiffPct).toFixed(1)}%)</span>
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground/50 italic">Awaiting FTSO feed...</span>
              )}
            </div>

            {/* Contract Link */}
            <div className="flex items-center justify-between text-[9px] pt-1 border-t border-white/[0.05]">
              <span className="text-muted-foreground">Contract</span>
              <a href={`${CONFIG.EXPLORER_URL}/address/${activeAddress}`} target="_blank" rel="noopener noreferrer"
                className="text-blue-400 hover:underline flex items-center gap-1">
                {activeAddress.slice(0, 8)}...{activeAddress.slice(-6)}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        ) : tab === "TRADES" ? (
          <div className="h-full flex flex-col font-code text-[10px] space-y-1 overflow-y-auto">
            {recentTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-20 italic">
                <Activity className="w-8 h-8 mb-2" />
                No On-Chain Trades Yet
              </div>
            ) : (
              recentTrades.map((trade) => (
                <div key={trade.txHash} className="flex flex-col border-b border-white/[0.03] py-2 px-1 hover:bg-white/[0.02]">
                  <div className="flex justify-between items-center mb-1">
                    <span className={cn("font-bold", trade.isLong ? "text-emerald-500" : "text-rose-500")}>
                      {trade.isLong ? "LONG" : "SHORT"}
                    </span>
                    <span className="text-white/80">{trade.quantity.toString()} @ {trade.leverage.toString()}x</span>
                  </div>
                  <div className="flex justify-between items-center opacity-40 text-[9px]">
                    <span>{trade.trader.slice(0, 6)}...{trade.trader.slice(-4)}</span>
                    <span>{new Date(trade.timestamp * 1000).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[8px] opacity-30 mt-0.5">
                    <a href={`${CONFIG.EXPLORER_URL}/tx/${trade.txHash}`} target="_blank" rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-0.5">
                      tx: {trade.txHash.slice(0, 6)}...{trade.txHash.slice(-4)}
                      <ExternalLink className="w-2 h-2" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* CREATE MARKET TAB */
          <div className="flex flex-col h-full font-code text-[11px] space-y-4 overflow-y-auto">
            <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
              Create New Futures Market
            </div>

            {/* Market Name */}
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase font-bold">Market Name</Label>
              <Input
                value={marketName}
                onChange={e => setMarketName(e.target.value)}
                placeholder="e.g. ETH Gas Bull"
                className="bg-white/5 border-white/5 text-white font-code h-9 rounded-sm text-sm"
              />
            </div>

            {/* Strike Price */}
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase font-bold">Strike Price (Index)</Label>
              <Input
                type="number"
                value={strikeInput}
                onChange={e => setStrikeInput(e.target.value)}
                placeholder="50"
                className="bg-white/5 border-white/5 text-white font-code h-9 rounded-sm text-sm"
              />
              <div className="text-[8px] text-muted-foreground/50">
                Current index: {price > 0 ? price.toFixed(2) : '---'} | Suggested: {price > 0 ? Math.round(price) : 50}
              </div>
            </div>

            {/* Expiry Duration */}
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase font-bold">Expiry Duration</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {EXPIRY_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.label}
                    onClick={() => setExpiryIndex(i)}
                    className={cn(
                      "text-[9px] py-1.5 rounded-sm border transition-all font-bold",
                      i === expiryIndex
                        ? "bg-primary/20 border-primary/40 text-primary"
                        : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3 space-y-2">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Strike</span>
                <span className="text-white font-bold">{strikeInput || '50'}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Duration</span>
                <span className="text-white font-bold">{EXPIRY_OPTIONS[expiryIndex].label}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Factory</span>
                <span className="text-blue-400 font-code text-[8px]">
                  {CONFIG.FACTORY_ADDRESS.slice(0, 8)}...{CONFIG.FACTORY_ADDRESS.slice(-6)}
                </span>
              </div>
            </div>

            {/* Create Button */}
            <Button
              onClick={handleCreateMarket}
              disabled={creating || !provider}
              className="w-full h-10 bg-primary hover:bg-primary/80 text-primary-foreground font-bold uppercase tracking-wider text-[10px] rounded-sm"
            >
              {creating ? "Creating..." : !provider ? "Connect Wallet" : "Create Market"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
