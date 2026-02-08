"use client";

import { useState, useEffect, useCallback } from "react";
import { isAddress } from "ethers";
import { getReadOnlyFactoryContract, getReadOnlyMarketContract } from "./useContract";
import { FACTORY_ADDRESS } from "@/lib/contracts";
import type { MarketConfig, MarketState } from "@/types/market";

export interface MarketSummary {
  address: string;
  config: MarketConfig;
  state: MarketState;
}

export function useMarkets() {
  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isAddress(FACTORY_ADDRESS)) {
        setMarkets([]);
        setLoading(false);
        return;
      }

      const factory = getReadOnlyFactoryContract();
      const addresses: string[] = await factory.getAllMarkets();

      const summaries = await Promise.all(
        addresses.map(async (addr) => {
          const market = getReadOnlyMarketContract(addr);
          const [config, totalLiq, exposure, util, lambda, nextId] =
            await Promise.all([
              market.getConfig(),
              market.totalLiquidity(),
              market.outstandingExposure(),
              market.utilizationBps(),
              market.currentLambdaBps(),
              market.nextPolicyId(),
            ]);

          return {
            address: addr,
            config: {
              feedId: config[0],
              barrierPpm: config[1],
              windowSec: config[2],
              horizonSec: config[3],
              lambdaMinBps: config[4],
              lambdaMaxBps: config[5],
              reserveFactorBps: config[6],
              maxPriceAgeSec: config[7],
              oracleSigner: config[8],
            },
            state: {
              address: addr,
              totalLiquidity: totalLiq,
              outstandingExposure: exposure,
              utilizationBps: util,
              currentLambdaBps: lambda,
              nextPolicyId: nextId,
            },
          } satisfies MarketSummary;
        })
      );

      setMarkets(summaries);
    } catch (e) {
      console.error("Failed to fetch markets:", e);
      setError(e instanceof Error ? e.message : "Failed to load markets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  return { markets, loading, error, refetch: fetchMarkets };
}
