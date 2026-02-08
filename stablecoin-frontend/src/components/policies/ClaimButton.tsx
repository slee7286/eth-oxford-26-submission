"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useMarketContract } from "@/hooks/useContract";
import { useMarketData } from "@/hooks/useMarketData";
import { useTransaction } from "@/hooks/useTransaction";
import { fetchTrigger } from "@/lib/oracle";
import { getStablecoinFromFeedId } from "@/lib/constants";
import { EXPLORER_URL } from "@/lib/network";
import type { Policy } from "@/types/market";

export function ClaimButton({
  policy,
  onSuccess,
}: {
  policy: Policy;
  onSuccess: () => void;
}) {
  const market = useMarketContract(policy.marketAddress);
  const { config } = useMarketData(policy.marketAddress);
  const tx = useTransaction();
  const [message, setMessage] = useState<string | null>(null);

  const handleClaim = async () => {
    if (!config) return;

    setMessage(null);
    const stablecoin = getStablecoinFromFeedId(config.feedId);

    try {
      const attestation = await fetchTrigger(
        stablecoin,
        policy.marketAddress,
        config.barrierPpm.toString(),
        config.windowSec.toString(),
        policy.start.toString(),
        policy.expiry.toString()
      );

      if (attestation.triggered === 0) {
        setMessage("No depeg event detected. No payout available.");
        return;
      }

      const receipt = await tx.execute(() =>
        market.claim(
          policy.id,
          attestation.eventStart,
          attestation.eventEnd,
          attestation.issuedAt,
          attestation.signature
        )
      );

      if (receipt) {
        onSuccess();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Claim failed");
    }
  };

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        onClick={handleClaim}
        loading={tx.status === "pending" || tx.status === "confirming"}
      >
        Claim Payout
      </Button>
      {message && <p className="text-xs text-yellow-400">{message}</p>}
      {tx.error && <p className="text-xs text-red-400">{tx.error}</p>}
      {tx.status === "success" && tx.txHash && (
        <a
          href={`${EXPLORER_URL}/tx/${tx.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-emerald-500 hover:underline"
        >
          Claimed! View on Explorer
        </a>
      )}
    </div>
  );
}
