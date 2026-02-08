"use client";

import { useState, useEffect, useCallback } from "react";
import { useWalletContext } from "@/providers/WalletProvider";
import { getReadOnlyMarketContract } from "./useContract";

export function useLPPosition(marketAddress: string) {
  const { address } = useWalletContext();
  const [lpBalance, setLpBalance] = useState<bigint>(0n);
  const [maxWithdrawable, setMaxWithdrawable] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!address) {
      setLpBalance(0n);
      setMaxWithdrawable(0n);
      return;
    }

    setLoading(true);
    try {
      const market = getReadOnlyMarketContract(marketAddress);
      const [bal, totalLiq, exposure, reserveBps] = await Promise.all([
        market.lpBalances(address),
        market.totalLiquidity(),
        market.outstandingExposure(),
        market.reserveFactorBps(),
      ]);

      setLpBalance(bal);

      if (totalLiq === 0n || reserveBps === 0n) {
        setMaxWithdrawable(0n);
      } else {
        const minPool = (exposure * 10000n) / reserveBps;
        const excess = totalLiq > minPool ? totalLiq - minPool : 0n;
        const maxW = (bal * excess) / totalLiq;
        setMaxWithdrawable(maxW);
      }
    } catch (e) {
      console.error("Failed to fetch LP position:", e);
    } finally {
      setLoading(false);
    }
  }, [address, marketAddress]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { lpBalance, maxWithdrawable, loading, refetch: fetch };
}
