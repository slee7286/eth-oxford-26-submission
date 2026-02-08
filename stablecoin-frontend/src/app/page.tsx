"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useMarkets } from "@/hooks/useMarkets";
import { MarketsSummary } from "@/components/dashboard/MarketsSummary";
import { PriceOverview } from "@/components/dashboard/PriceOverview";
import { MarketCard } from "@/components/markets/MarketCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { getStablecoinFromFeedId } from "@/lib/constants";
import type { MarketSummary } from "@/hooks/useMarkets";

function isTestMarket(m: MarketSummary): boolean {
  return m.state.totalLiquidity === 0n && m.state.nextPolicyId <= 1n;
}

export default function DashboardPage() {
  const { markets, loading, error } = useMarkets();

  const activeMarkets = useMemo(
    () => markets.filter((m) => !isTestMarket(m)),
    [markets]
  );

  const stablecoins = useMemo(() => {
    const set = new Set<string>();
    markets.forEach((m) => {
      const sc = getStablecoinFromFeedId(m.config.feedId);
      if (sc !== "UNKNOWN") set.add(sc);
    });
    return Array.from(set);
  }, [markets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-2">Failed to load data</p>
        <p className="text-sm text-zinc-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-zinc-400 mt-1">
          Stablecoin depeg protection powered by Flare
        </p>
      </div>

      <MarketsSummary markets={activeMarkets} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-zinc-100">
              Active Markets
            </h2>
            <Link href="/markets">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>
          {activeMarkets.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900 rounded-xl border border-zinc-800">
              <p className="text-zinc-400">No active markets yet</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeMarkets.slice(0, 4).map((m) => (
                <MarketCard key={m.address} market={m} />
              ))}
            </div>
          )}
        </div>

        <div>
          {stablecoins.length > 0 ? (
            <PriceOverview stablecoins={stablecoins} />
          ) : (
            <PriceOverview stablecoins={["USDC", "USDT", "DAI"]} />
          )}
        </div>
      </div>
    </div>
  );
}
