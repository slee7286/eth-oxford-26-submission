"use client";

import { Card } from "@/components/ui/Card";
import { UtilizationBar } from "./UtilizationBar";
import { formatEther, formatBps } from "@/lib/formatting";
import type { MarketState } from "@/types/market";

export function PoolStats({ state }: { state: MarketState }) {
  const capacity =
    state.totalLiquidity > 0n
      ? state.totalLiquidity - state.outstandingExposure
      : 0n;

  return (
    <Card variant="glass">
      <h3 className="text-lg font-semibold text-zinc-100 mb-4">Pool Stats</h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Total Liquidity</span>
          <span className="text-zinc-100 font-medium tabular-nums">
            {formatEther(state.totalLiquidity)} C2FLR
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Outstanding Exposure</span>
          <span className="text-zinc-100 font-medium tabular-nums">
            {formatEther(state.outstandingExposure)} C2FLR
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Available Capacity</span>
          <span className="text-zinc-100 font-medium tabular-nums">
            {capacity > 0n ? formatEther(capacity) : "0"} C2FLR
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Current Lambda</span>
          <span className="text-zinc-100 font-medium tabular-nums">
            {formatBps(state.currentLambdaBps)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Policies Issued</span>
          <span className="text-zinc-100 font-medium tabular-nums">
            {(Number(state.nextPolicyId) - 1).toString()}
          </span>
        </div>
        <div className="mt-4">
          <UtilizationBar bps={state.utilizationBps} />
        </div>
      </div>
    </Card>
  );
}
