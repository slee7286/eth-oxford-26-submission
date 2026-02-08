"use client";

import { useState, useCallback } from "react";
import { fetchQuote } from "@/lib/oracle";
import type { ProtectionQuote } from "@/types/oracle";

export function useOracleQuote() {
  const [quote, setQuote] = useState<ProtectionQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getQuote = useCallback(
    async (
      stablecoin: string,
      marketAddress: string,
      barrierPpm: string,
      horizonSec: string
    ) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchQuote(
          stablecoin,
          marketAddress,
          barrierPpm,
          horizonSec
        );
        setQuote(data);
        return data;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Quote fetch failed";
        setError(msg);
        setQuote(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { quote, loading, error, getQuote };
}
