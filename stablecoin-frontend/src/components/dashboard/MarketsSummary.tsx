"use client";

import { Card } from "@/components/ui/Card";
import { formatEther } from "@/lib/formatting";
import type { MarketSummary } from "@/hooks/useMarkets";

export function MarketsSummary({ markets }: { markets: MarketSummary[] }) {
  const totalLiquidity = markets.reduce(
    (sum, m) => sum + m.state.totalLiquidity,
    0n
  );
  const avgUtil =
    markets.length > 0
      ? markets.reduce((sum, m) => sum + Number(m.state.utilizationBps), 0) /
        markets.length
      : 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <p className="text-sm text-zinc-400">Total Markets</p>
        <p className="text-2xl font-bold text-zinc-100 mt-1">
          {markets.length}
        </p>
      </Card>
      <Card>
        <p className="text-sm text-zinc-400">Total Liquidity</p>
        <p className="text-2xl font-bold text-zinc-100 mt-1">
          {formatEther(totalLiquidity)} C2FLR
        </p>
      </Card>
      <Card>
        <p className="text-sm text-zinc-400">Avg Utilization</p>
        <p className="text-2xl font-bold text-zinc-100 mt-1">
          {(avgUtil / 100).toFixed(1)}%
        </p>
      </Card>
    </div>
  );
}
