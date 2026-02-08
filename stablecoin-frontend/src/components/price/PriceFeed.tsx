"use client";

import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useOraclePrice } from "@/hooks/useOraclePrice";

export function PriceFeed({ stablecoin }: { stablecoin: string }) {
  const { price, loading, error } = useOraclePrice(stablecoin);

  return (
    <Card>
      <h3 className="text-lg font-semibold text-zinc-100 mb-4">
        Live Price Feed
      </h3>
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Spinner />
        </div>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : price ? (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-100">
              ${(price.pricePpm / 1_000_000).toFixed(4)}
            </span>
            <span className="text-sm text-zinc-400">{stablecoin}/USD</span>
          </div>
          <p className="text-xs text-zinc-500">
            Sources: {price.sources} | Updated: {new Date(price.timestamp * 1000).toLocaleTimeString()}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
