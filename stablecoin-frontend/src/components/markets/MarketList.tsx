"use client";

import { MarketCard } from "./MarketCard";
import { Spinner } from "@/components/ui/Spinner";
import type { MarketSummary } from "@/hooks/useMarkets";

export function MarketList({
  markets,
  loading,
  error,
}: {
  markets: MarketSummary[];
  loading: boolean;
  error: string | null;
}) {
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
        <p className="text-red-400 mb-2">Failed to load markets</p>
        <p className="text-sm text-zinc-500">{error}</p>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400 text-lg mb-2">No markets found</p>
        <p className="text-sm text-zinc-500">
          Markets will appear here once created via the Factory contract.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {markets.map((m) => (
        <MarketCard key={m.address} market={m} />
      ))}
    </div>
  );
}
