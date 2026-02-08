"use client";

import { useMemo } from "react";
import { useWalletContext } from "@/providers/WalletProvider";
import { useMarkets } from "@/hooks/useMarkets";
import { usePolicies } from "@/hooks/usePolicies";
import { PolicyList } from "@/components/policies/PolicyList";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useLPPosition } from "@/hooks/useLPPosition";
import { formatEther, shortenAddress } from "@/lib/formatting";
import { getFeedInfo } from "@/lib/constants";
import Link from "next/link";
import type { MarketSummary } from "@/hooks/useMarkets";

function isTestMarket(m: MarketSummary): boolean {
  return m.state.totalLiquidity === 0n && m.state.nextPolicyId <= 1n;
}

function LPPositionRow({ marketAddress, feedId }: { marketAddress: string; feedId: string }) {
  const { lpBalance, maxWithdrawable } = useLPPosition(marketAddress);
  const feed = getFeedInfo(feedId);

  if (lpBalance === 0n) return null;

  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
      <div>
        <Link
          href={`/markets/${marketAddress}`}
          className="text-sm font-medium text-zinc-100 hover:text-emerald-400"
        >
          {feed.symbol.split("-")[0]} Market
        </Link>
        <p className="text-xs text-zinc-500">{shortenAddress(marketAddress)}</p>
      </div>
      <div className="text-right text-sm">
        <p className="text-zinc-100 tabular-nums">{formatEther(lpBalance)} C2FLR</p>
        <p className="text-xs text-zinc-500 tabular-nums">
          Max withdraw: {formatEther(maxWithdrawable)}
        </p>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const { address, connect, isConnecting } = useWalletContext();
  const { markets } = useMarkets();

  const activeMarkets = useMemo(
    () => markets.filter((m) => !isTestMarket(m)),
    [markets]
  );

  const marketAddresses = useMemo(
    () => activeMarkets.map((m) => m.address),
    [activeMarkets]
  );
  const { policies, loading, refetch } = usePolicies(marketAddresses);

  if (!address) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold text-zinc-100 mb-4">Portfolio</h1>
        <p className="text-zinc-400 mb-6">
          Connect your wallet to view your policies and LP positions.
        </p>
        <Button onClick={connect} loading={isConnecting}>
          Connect Wallet
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-100 mb-8">Portfolio</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-zinc-100 mb-4">
            My Policies
          </h2>
          <PolicyList policies={policies} loading={loading} onClaim={refetch} />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-100 mb-4">
            LP Positions
          </h2>
          {activeMarkets.length === 0 ? (
            <p className="text-zinc-400 text-sm">No markets available.</p>
          ) : (
            <Card>
              {activeMarkets.map((m) => (
                <LPPositionRow
                  key={m.address}
                  marketAddress={m.address}
                  feedId={m.config.feedId}
                />
              ))}
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
