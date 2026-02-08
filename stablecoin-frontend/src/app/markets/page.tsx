"use client";

import { useMarkets } from "@/hooks/useMarkets";
import { MarketList } from "@/components/markets/MarketList";

export default function MarketsPage() {
  const { markets, loading, error } = useMarkets();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100">Markets</h1>
        <p className="text-zinc-400 mt-1">
          Browse available stablecoin depeg protection markets
        </p>
      </div>

      <MarketList markets={markets} loading={loading} error={error} />
    </div>
  );
}
