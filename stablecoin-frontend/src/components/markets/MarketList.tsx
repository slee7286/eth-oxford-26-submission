"use client";

import { useState, useEffect } from "react";
import { MarketCard } from "./MarketCard";
import { Spinner } from "@/components/ui/Spinner";
import type { MarketSummary } from "@/hooks/useMarkets";

function isTestMarket(m: MarketSummary): boolean {
  return m.state.totalLiquidity === 0n && m.state.nextPolicyId <= 1n;
}

export function MarketList({
  markets,
  loading,
  error,
}: {
  markets: MarketSummary[];
  loading: boolean;
  error: string | null;
}) {
  const [hideTest, setHideTest] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("hideTestMarkets");
    if (stored !== null) setHideTest(stored === "true");
  }, []);

  const toggleHideTest = () => {
    setHideTest((prev) => {
      const next = !prev;
      localStorage.setItem("hideTestMarkets", String(next));
      return next;
    });
  };

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

  const activeMarkets = markets.filter((m) => !isTestMarket(m));
  const testCount = markets.length - activeMarkets.length;
  const displayed = hideTest ? activeMarkets : markets;

  return (
    <div>
      {testCount > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-zinc-400">
            Showing {displayed.length} of {markets.length} markets
          </p>
          <button
            onClick={toggleHideTest}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <span
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                hideTest ? "bg-zinc-700" : "bg-emerald-600"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  hideTest ? "translate-x-1" : "translate-x-[18px]"
                }`}
              />
            </span>
            Show test markets
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayed.map((m) => (
          <MarketCard
            key={m.address}
            market={m}
            dimmed={!hideTest && isTestMarket(m)}
          />
        ))}
      </div>
    </div>
  );
}
