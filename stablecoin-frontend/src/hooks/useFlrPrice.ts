"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchFlrUsd } from "@/lib/oracle";

export function useFlrPrice(pollMs = 30000) {
  const [price, setPrice] = useState<number | null>(null);

  const fetch = useCallback(async () => {
    try {
      const p = await fetchFlrUsd();
      setPrice(p);
    } catch {
      /* silent - conversion is optional */
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, pollMs);
    return () => clearInterval(interval);
  }, [fetch, pollMs]);

  return price;
}
