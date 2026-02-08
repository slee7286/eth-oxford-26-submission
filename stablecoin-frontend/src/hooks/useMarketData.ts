"use client";

import { useState, useEffect, useCallback } from "react";
import { getReadOnlyMarketContract } from "./useContract";
import type { MarketConfig, MarketState } from "@/types/market";

export function useMarketData(address: string) {
  const [config, setConfig] = useState<MarketConfig | null>(null);
  const [state, setState] = useState<MarketState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const market = getReadOnlyMarketContract(address);

      const [cfg, totalLiq, exposure, util, lambda, nextId] = await Promise.all(
        [
          market.getConfig(),
          market.totalLiquidity(),
          market.outstandingExposure(),
          market.utilizationBps(),
          market.currentLambdaBps(),
          market.nextPolicyId(),
        ]
      );

      setConfig({
        feedId: cfg[0],
        barrierPpm: cfg[1],
        windowSec: cfg[2],
        horizonSec: cfg[3],
        lambdaMinBps: cfg[4],
        lambdaMaxBps: cfg[5],
        reserveFactorBps: cfg[6],
        maxPriceAgeSec: cfg[7],
        oracleSigner: cfg[8],
      });

      setState({
        address,
        totalLiquidity: totalLiq,
        outstandingExposure: exposure,
        utilizationBps: util,
        currentLambdaBps: lambda,
        nextPolicyId: nextId,
      });
    } catch (e) {
      console.error("Failed to fetch market data:", e);
      setError(e instanceof Error ? e.message : "Failed to load market");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { config, state, loading, error, refetch: fetch };
}
