"use client";

import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useOraclePrice } from "@/hooks/useOraclePrice";

export function PriceFeed({ stablecoin }: { stablecoin: string }) {
  const { price, loading, error } = useOraclePrice(stablecoin);

  return (
    <Card variant="glass">
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <h3 className="text-lg font-semibold text-zinc-100">
          Live Price Feed
        </h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Spinner />
        </div>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : price ? (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-100 font-mono tabular-nums">
              ${(price.pricePpm / 1_000_000).toFixed(4)}
            </span>
            <span className="text-sm text-zinc-400">{stablecoin}/USD</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span>Updated: {new Date(price.timestamp * 1000).toLocaleTimeString()}</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: price.sources }, (_, i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
              ))}
              <span className="ml-1">{price.sources} sources</span>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
