"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchPrice } from "@/lib/oracle";
import type { PriceResponse } from "@/types/oracle";

export function useOraclePrice(stablecoin: string, pollMs = 10000) {
  const [price, setPrice] = useState<PriceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!stablecoin || stablecoin === "UNKNOWN") return;
    try {
      const data = await fetchPrice(stablecoin);
      setPrice(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Price fetch failed");
    } finally {
      setLoading(false);
    }
  }, [stablecoin]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, pollMs);
    return () => clearInterval(interval);
  }, [fetch, pollMs]);

  return { price, loading, error, refetch: fetch };
}
