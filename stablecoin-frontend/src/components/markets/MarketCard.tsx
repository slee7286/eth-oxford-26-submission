"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UtilizationBar } from "./UtilizationBar";
import { getFeedInfo } from "@/lib/constants";
import { formatPpm, formatEther, formatDuration } from "@/lib/formatting";
import type { MarketSummary } from "@/hooks/useMarkets";

const AVATAR_COLORS: Record<string, string> = {
  USDC: "bg-blue-500",
  USDT: "bg-emerald-500",
  DAI: "bg-amber-500",
};

function isTestMarket(market: MarketSummary): boolean {
  return market.state.totalLiquidity === 0n && market.state.nextPolicyId <= 1n;
}

export function MarketCard({ market, dimmed }: { market: MarketSummary; dimmed?: boolean }) {
  const feed = getFeedInfo(market.config.feedId);
  const stablecoin = feed.symbol.split("-")[0];
  const capacity =
    market.config.reserveFactorBps > 0n
      ? (market.state.totalLiquidity * market.config.reserveFactorBps) / 10000n -
        market.state.outstandingExposure
      : 0n;

  const avatarColor = AVATAR_COLORS[stablecoin] || "bg-zinc-500";
  const test = isTestMarket(market);

  return (
    <Link href={`/markets/${market.address}`}>
      <Card
        hover
        className={`h-full group transition-all duration-200 hover:shadow-lg hover:shadow-emerald-900/10 ${
          dimmed || test ? "opacity-50" : ""
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md`}>
              {stablecoin.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-lg font-semibold text-zinc-100">
                  {stablecoin}
                </h3>
                <Badge variant="blue">{feed.name}</Badge>
              </div>
              <p className="text-sm text-zinc-400">
                Barrier: ${formatPpm(market.config.barrierPpm)}
              </p>
            </div>
          </div>
          <Badge variant="green">
            {formatDuration(market.config.horizonSec)}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <span className="text-zinc-500">Total Liquidity</span>
            <p className="text-zinc-100 font-medium tabular-nums">
              {formatEther(market.state.totalLiquidity)} C2FLR
            </p>
          </div>
          <div>
            <span className="text-zinc-500">Available Capacity</span>
            <p className="text-zinc-100 font-medium tabular-nums">
              {capacity > 0n ? formatEther(capacity) : "0"} C2FLR
            </p>
          </div>
        </div>

        <UtilizationBar bps={market.state.utilizationBps} />
      </Card>
    </Link>
  );
}
