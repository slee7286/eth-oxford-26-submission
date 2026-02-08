"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UtilizationBar } from "./UtilizationBar";
import { getFeedInfo } from "@/lib/constants";
import { formatPpm, formatEther, formatDuration } from "@/lib/formatting";
import type { MarketSummary } from "@/hooks/useMarkets";

export function MarketCard({ market }: { market: MarketSummary }) {
  const feed = getFeedInfo(market.config.feedId);
  const stablecoin = feed.symbol.split("-")[0];
  const capacity =
    market.config.reserveFactorBps > 0n
      ? (market.state.totalLiquidity * market.config.reserveFactorBps) / 10000n -
        market.state.outstandingExposure
      : 0n;

  return (
    <Link href={`/markets/${market.address}`}>
      <Card hover className="h-full">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-zinc-100">
                {stablecoin}
              </h3>
              <Badge variant="blue">{feed.name}</Badge>
            </div>
            <p className="text-sm text-zinc-400">
              Barrier: ${formatPpm(market.config.barrierPpm)}
            </p>
          </div>
          <Badge variant="green">
            {formatDuration(market.config.horizonSec)}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <span className="text-zinc-500">Total Liquidity</span>
            <p className="text-zinc-100 font-medium">
              {formatEther(market.state.totalLiquidity)} C2FLR
            </p>
          </div>
          <div>
            <span className="text-zinc-500">Available Capacity</span>
            <p className="text-zinc-100 font-medium">
              {capacity > 0n ? formatEther(capacity) : "0"} C2FLR
            </p>
          </div>
        </div>

        <UtilizationBar bps={market.state.utilizationBps} />
      </Card>
    </Link>
  );
}
