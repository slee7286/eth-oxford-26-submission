"use client";

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Contract, formatUnits } from 'ethers';
import { CONFIG, ABI } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';
import { Activity, ExternalLink, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserPosition, ContractState, OnChainTrade } from '@/lib/blockchain';

interface ActivityPanelProps {
  position: UserPosition | null;
  address: string | null;
  contractState: ContractState | null;
  provider: any | null;
  refresh: () => void;
  currentPrice?: bigint;
  contractAddress?: string;
  recentTrades?: OnChainTrade[];
}

export function ActivityPanel({ position, address, contractState, provider, refresh, currentPrice, contractAddress, recentTrades = [] }: ActivityPanelProps) {
  const [activeTab, setActiveTab] = useState("POSITIONS");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClaim = async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const activeAddr = contractAddress || CONFIG.CONTRACT_ADDRESS;
      const contract = new Contract(activeAddr, ABI, signer);
      const tx = await contract.claimPayout();
      await tx.wait();
      toast({ title: "Payout Claimed", description: "Settlement payout received successfully." });
      refresh();
    } catch (err: any) {
      toast({ title: "Claim Failed", description: err?.reason || err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const hasPosition = position && position.exists && BigInt(position.quantity) > 0n;

  // P&L calculation
  const getPnl = () => {
    if (!hasPosition || !currentPrice || !position) return null;
    const current = Number(currentPrice);
    const entry = Number(position.entryPrice);
    const lev = Number(position.leverage);
    if (entry <= 0 || current <= 0) return null;
    const pnlPct = position.isLong
      ? ((current - entry) / entry) * lev * 100
      : ((entry - current) / entry) * lev * 100;
    return pnlPct;
  };

  const pnl = getPnl();

  // Estimated payout calculation (mirrors contract logic)
  const getEstimatedPayout = () => {
    if (!hasPosition || !position || !contractState) return null;
    const collateral = Number(formatUnits(position.collateralWei, 18));
    const lev = Number(position.leverage);
    const strike = Number(contractState.strikePriceGwei);
    // Use settlement price if settled, otherwise use current live price
    const priceToUse = contractState.isSettled
      ? Number(contractState.settlementPriceGwei)
      : (currentPrice ? Number(currentPrice) : 0);
    if (strike <= 0 || priceToUse <= 0 || collateral <= 0) return null;

    const wins = position.isLong ? priceToUse > strike : priceToUse < strike;
    if (!wins) return { payout: 0, profit: -collateral, gasFee: 0.001 };

    const priceDiff = position.isLong ? priceToUse - strike : strike - priceToUse;
    let profit = (collateral * lev * priceDiff) / strike;
    const maxProfit = collateral * (lev - 1);
    if (profit > maxProfit) profit = maxProfit;

    return { payout: collateral + profit, profit, gasFee: 0.001 };
  };

  const estimatedPayout = getEstimatedPayout();

  const getExpiryDate = () => {
    if (!contractState) return '---';
    const d = new Date(Number(contractState.expiryTimestamp) * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + ' UTC';
  };

  const activeAddr = contractAddress || CONFIG.CONTRACT_ADDRESS;

  const tabClass = "text-[10px] h-full px-0 min-w-0 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary transition-all font-bold uppercase tracking-wider";

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col bg-[#0a0a0a]">
      <div className="h-10 border-b border-white/5 flex items-center px-4 justify-between bg-white/[0.01]">
        <TabsList className="bg-transparent h-full p-0 gap-6">
          <TabsTrigger value="POSITIONS" className={tabClass}>Positions ({hasPosition ? 1 : 0})</TabsTrigger>
          <TabsTrigger value="CONTRACT" className={tabClass}>Contract Info</TabsTrigger>
          <TabsTrigger value="HISTORY" className={tabClass}>Tx History ({recentTrades.length})</TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-auto">
        <TabsContent value="POSITIONS" className="m-0 h-full">
          {!hasPosition ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground/30">
              <Activity className="w-8 h-8 opacity-20" />
              <span className="text-xs font-bold uppercase tracking-widest italic">No Open Positions</span>
              <span className="text-[10px] text-muted-foreground/20">Connect wallet and open a position to start trading</span>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-[11px] font-code border-collapse">
                <thead className="text-muted-foreground uppercase font-bold border-b border-white/5 bg-white/[0.01] sticky top-0 z-10">
                  <tr>
                    <th className="text-left py-3 px-3 font-bold">Market</th>
                    <th className="text-left py-3 px-3 font-bold">Side</th>
                    <th className="text-left py-3 px-3 font-bold">Size</th>
                    <th className="text-left py-3 px-3 font-bold">Entry</th>
                    <th className="text-left py-3 px-3 font-bold">Collateral</th>
                    <th className="text-left py-3 px-3 font-bold">P&L</th>
                    <th className="text-left py-3 px-3 font-bold">Status</th>
                    <th className="text-right py-3 px-3 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-bold text-white uppercase text-[10px]">GAS-FUT</td>
                    <td className="py-3 px-3">
                      <Badge className={cn("text-[9px] h-4 rounded-sm border-none font-black",
                        position.isLong ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                        {position.isLong ? "LONG" : "SHORT"} {position.leverage.toString()}x
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-white">{position.quantity.toString()}</td>
                    <td className="py-3 px-3 text-white/70">{Number(position.entryPrice) > 0 ? Number(position.entryPrice).toFixed(2) : '---'}</td>
                    <td className="py-3 px-3 text-white/70">{parseFloat(formatUnits(position.collateralWei, 18)).toFixed(4)} C2FLR</td>
                    <td className="py-3 px-3">
                      {pnl !== null ? (
                        <div className="flex flex-col">
                          <span className={cn("font-bold", pnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                          </span>
                          <span className={cn("text-[9px]", pnl >= 0 ? "text-emerald-400/60" : "text-rose-400/60")}>
                            {pnl >= 0 ? '+' : ''}{(Number(formatUnits(position.collateralWei, 18)) * pnl / 100).toFixed(4)} C2FLR
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50">---</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={cn("text-[10px] font-bold uppercase",
                        position.isClaimed ? "text-emerald-400" : contractState?.isSettled ? "text-orange-400" : "text-white/40")}>
                        {position.isClaimed ? "CLAIMED" : contractState?.isSettled ? "SETTLEABLE" : "OPEN"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {contractState?.isSettled && !position.isClaimed && (
                        <Button
                          size="sm"
                          className="h-7 px-3 bg-primary hover:bg-primary/80 text-primary-foreground text-[10px] uppercase font-bold"
                          onClick={handleClaim}
                          disabled={loading}
                        >
                          {loading ? "Claiming..." : "Claim"}
                        </Button>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
              {/* Estimated Payout Summary */}
              {hasPosition && estimatedPayout && (
                <div className="px-3 py-2 border-t border-white/5 bg-white/[0.01]">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground uppercase font-bold">
                      {contractState?.isSettled ? 'Settlement Payout' : 'Est. Payout'}
                    </span>
                    <div className="flex items-center gap-3">
                      {estimatedPayout.payout > 0 ? (
                        <span className="text-emerald-400 font-bold font-code">
                          {estimatedPayout.payout.toFixed(4)} C2FLR
                          <span className="text-emerald-400/50 ml-1">(~{estimatedPayout.gasFee.toFixed(3)} gas)</span>
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold font-code">0 C2FLR (lost collateral)</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Contract Info Tab */}
        <TabsContent value="CONTRACT" className="m-0 h-full p-4">
          <div className="space-y-3 font-code text-[11px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="text-amber-400 font-bold">Cash-Settled Futures (Expiry)</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Market Contract</span>
              <a href={`${CONFIG.EXPLORER_URL}/address/${activeAddr}`} target="_blank" rel="noopener noreferrer"
                className="text-blue-400 hover:underline flex items-center gap-1">
                {activeAddr.slice(0, 10)}...{activeAddr.slice(-8)} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Factory</span>
              <a href={`${CONFIG.EXPLORER_URL}/address/${CONFIG.FACTORY_ADDRESS}`} target="_blank" rel="noopener noreferrer"
                className="text-blue-400/60 hover:underline flex items-center gap-1 text-[10px]">
                {CONFIG.FACTORY_ADDRESS.slice(0, 10)}...{CONFIG.FACTORY_ADDRESS.slice(-8)} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Network</span><span className="text-white">Flare Coston2 (Chain {CONFIG.CHAIN_ID})</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Strike Price</span><span className="text-white">{contractState ? contractState.strikePriceGwei.toString() : '---'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Expiry Date</span><span className="text-white">{getExpiryDate()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Settled</span><span className={contractState?.isSettled ? "text-emerald-400" : "text-white"}>{contractState?.isSettled ? 'Yes' : 'No'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Participants</span><span className="text-white">{contractState?.participantCount.toString() || '0'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pool Liquidity</span><span className="text-white">{contractState ? (Number(contractState.totalLiquidityWei) / 1e18).toFixed(4) : '0'} C2FLR</span></div>

            {/* How it works explanation */}
            <div className="border-t border-white/5 pt-3 mt-3 space-y-2">
              <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">How Markets Work</div>
              <div className="text-[10px] text-muted-foreground/70 leading-relaxed">
                The <span className="text-blue-400">Factory</span> deploys independent <span className="text-amber-400">Market Contracts</span>. Each market is its own contract with its own strike, expiry, and liquidity pool. The market selector in the header picks which contract you interact with.
              </div>
            </div>

            <div className="border-t border-white/5 pt-3 mt-3 space-y-3">
              <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Settlement Details</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Oracle</span><span className="text-white">FTSO V2 (BTC 50% + ETH 30% + FLR 20%)</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Settlement</span><span className="text-white">Cash-settled in C2FLR</span></div>
              {contractState?.isSettled && (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Settlement Price</span><span className="text-emerald-400 font-bold">{contractState.settlementPriceGwei.toString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Outcome</span>
                    <span className={cn("font-bold", Number(contractState.settlementPriceGwei) > Number(contractState.strikePriceGwei) ? "text-emerald-400" : "text-rose-400")}>
                      {Number(contractState.settlementPriceGwei) > Number(contractState.strikePriceGwei) ? "Longs profit" : "Shorts profit"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Transaction History Tab */}
        <TabsContent value="HISTORY" className="m-0 h-full">
          {recentTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground/30">
              <ArrowUpRight className="w-8 h-8 opacity-20" />
              <span className="text-xs font-bold uppercase tracking-widest italic">No Transactions</span>
              <span className="text-[10px] text-muted-foreground/20">Trade activity will appear here with explorer links</span>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-[11px] font-code border-collapse">
                <thead className="text-muted-foreground uppercase font-bold border-b border-white/5 bg-white/[0.01] sticky top-0 z-10">
                  <tr>
                    <th className="text-left py-3 px-3 font-bold">Tx Hash</th>
                    <th className="text-left py-3 px-3 font-bold">Side</th>
                    <th className="text-left py-3 px-3 font-bold">Size</th>
                    <th className="text-left py-3 px-3 font-bold">Collateral</th>
                    <th className="text-left py-3 px-3 font-bold">Lev</th>
                    <th className="text-left py-3 px-3 font-bold">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {recentTrades.map((trade) => (
                    <tr key={trade.txHash} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 px-3">
                        <a
                          href={`${CONFIG.EXPLORER_URL}/tx/${trade.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline flex items-center gap-1"
                        >
                          {trade.txHash.slice(0, 10)}...{trade.txHash.slice(-6)}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>
                      <td className="py-2 px-3">
                        <Badge className={cn("text-[9px] h-4 rounded-sm border-none font-black",
                          trade.isLong ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                          {trade.isLong ? "LONG" : "SHORT"}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-white">{trade.quantity.toString()}</td>
                      <td className="py-2 px-3 text-white/70">{parseFloat(formatUnits(trade.collateral, 18)).toFixed(4)}</td>
                      <td className="py-2 px-3 text-white/70">{trade.leverage.toString()}x</td>
                      <td className="py-2 px-3 text-muted-foreground text-[10px]">
                        {new Date(trade.timestamp * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-2 border-t border-white/5 bg-white/[0.01]">
                <a
                  href={`${CONFIG.EXPLORER_URL}/address/${activeAddr}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-400/60 hover:text-blue-400 flex items-center gap-1"
                >
                  View all transactions on Explorer <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}
