"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMarketData } from "@/hooks/useMarketData";
import { MarketConfigTable } from "@/components/markets/MarketConfig";
import { PoolStats } from "@/components/markets/PoolStats";
import { PriceFeed } from "@/components/price/PriceFeed";
import { DepegIndicator } from "@/components/price/DepegIndicator";
import { BuyProtectionForm } from "@/components/protection/BuyProtectionForm";
import { AddLiquidityForm } from "@/components/liquidity/AddLiquidityForm";
import { RemoveLiquidityForm } from "@/components/liquidity/RemoveLiquidityForm";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { getFeedInfo, getStablecoinFromFeedId } from "@/lib/constants";
import { shortenAddress } from "@/lib/formatting";
import { EXPLORER_URL } from "@/lib/network";
import { useOraclePrice } from "@/hooks/useOraclePrice";

export default function MarketDetailPage() {
  const params = useParams();
  const address = params.address as string;
  const { config, state, loading, error, refetch } = useMarketData(address);

  const stablecoin = config ? getStablecoinFromFeedId(config.feedId) : "";
  const { price } = useOraclePrice(stablecoin);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !config || !state) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 text-lg">Failed to load market</p>
        <p className="text-sm text-zinc-500 mt-1">{error}</p>
      </div>
    );
  }

  const feed = getFeedInfo(config.feedId);

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/markets"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Markets
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-zinc-100">
            {feed.symbol.split("-")[0]} Protection
          </h1>
          <Badge variant="blue">{feed.name}</Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <a
            href={`${EXPLORER_URL}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs bg-zinc-800/60 px-2.5 py-1 rounded-full hover:text-emerald-400 transition-colors"
          >
            {shortenAddress(address)}
          </a>
          {price && (
            <DepegIndicator
              currentPpm={price.pricePpm}
              barrierPpm={config.barrierPpm}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <PriceFeed stablecoin={stablecoin} />
            <PoolStats state={state} />
          </div>
          <MarketConfigTable config={config} />
        </div>

        {/* Right column - Actions */}
        <div className="space-y-6">
          <BuyProtectionForm
            marketAddress={address}
            config={config}
            state={state}
            onSuccess={refetch}
          />
          <AddLiquidityForm marketAddress={address} onSuccess={refetch} />
          <RemoveLiquidityForm marketAddress={address} onSuccess={refetch} />
        </div>
      </div>
    </div>
  );
}
