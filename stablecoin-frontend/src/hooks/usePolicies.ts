"use client";

import { useState, useEffect, useCallback } from "react";
import { useWalletContext } from "@/providers/WalletProvider";
import { getReadOnlyMarketContract } from "./useContract";
import type { Policy } from "@/types/market";

export function usePolicies(marketAddresses: string[]) {
  const { address } = useWalletContext();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!address || marketAddresses.length === 0) {
      setPolicies([]);
      return;
    }

    setLoading(true);
    try {
      const allPolicies: Policy[] = [];

      for (const marketAddr of marketAddresses) {
        const market = getReadOnlyMarketContract(marketAddr);
        const nextId = Number(await market.nextPolicyId());

        for (let id = 1; id < nextId; id++) {
          try {
            const p = await market.policies(id);
            if (p.buyer.toLowerCase() === address.toLowerCase()) {
              allPolicies.push({
                id,
                marketAddress: marketAddr,
                buyer: p.buyer,
                notional: p.notional,
                premiumPaid: p.premiumPaid,
                start: p.start,
                expiry: p.expiry,
                claimed: p.claimed,
              });
            }
          } catch {
            break;
          }
        }
      }

      setPolicies(allPolicies);
    } catch (e) {
      console.error("Failed to fetch policies:", e);
    } finally {
      setLoading(false);
    }
  }, [address, marketAddresses]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { policies, loading, refetch: fetch };
}
