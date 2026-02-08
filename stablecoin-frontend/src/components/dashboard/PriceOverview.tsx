"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useOraclePrice } from "@/hooks/useOraclePrice";

function PriceRow({ stablecoin }: { stablecoin: string }) {
  const { price, loading } = useOraclePrice(stablecoin);

  if (loading) {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-zinc-300">{stablecoin}</span>
        <Spinner className="h-4 w-4" />
      </div>
    );
  }

  if (!price) return null;

  const ppm = price.pricePpm;
  const usd = ppm / 1_000_000;
  const distance = Math.abs(1 - usd) * 100;

  let variant: "green" | "yellow" | "red" = "green";
  if (distance > 1) variant = "red";
  else if (distance > 0.3) variant = "yellow";

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-zinc-800/50 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-zinc-100">{stablecoin}</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${
            variant === "green" ? "bg-emerald-400 animate-pulse" :
            variant === "yellow" ? "bg-amber-400 animate-pulse" :
            "bg-red-400 animate-pulse"
          }`} />
          <Badge variant={variant}>
            {distance < 0.1 ? "Pegged" : `${distance.toFixed(2)}% off`}
          </Badge>
        </div>
      </div>
      <span className="text-sm text-zinc-100 font-mono tabular-nums">
        ${usd.toFixed(4)}
      </span>
    </div>
  );
}

export function PriceOverview({ stablecoins }: { stablecoins: string[] }) {
  return (
    <Card variant="glass">
      <h3 className="text-lg font-semibold text-zinc-100 mb-4">
        Stablecoin Prices
      </h3>
      <div>
        {stablecoins.map((s) => (
          <PriceRow key={s} stablecoin={s} />
        ))}
      </div>
    </Card>
  );
}
