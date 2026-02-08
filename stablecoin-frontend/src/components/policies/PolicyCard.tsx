"use client";

import { Card } from "@/components/ui/Card";
import { PolicyStatusBadge } from "./PolicyStatusBadge";
import { ClaimButton } from "./ClaimButton";
import { formatEther, shortenAddress } from "@/lib/formatting";
import { getPolicyStatus, type Policy } from "@/types/market";

export function PolicyCard({
  policy,
  onClaim,
}: {
  policy: Policy;
  onClaim: () => void;
}) {
  const status = getPolicyStatus(policy);

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm text-zinc-400">
            Policy #{policy.id} on {shortenAddress(policy.marketAddress)}
          </p>
        </div>
        <PolicyStatusBadge status={status} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <span className="text-zinc-500">Notional</span>
          <p className="text-zinc-100 font-medium">
            {formatEther(policy.notional)} C2FLR
          </p>
        </div>
        <div>
          <span className="text-zinc-500">Premium Paid</span>
          <p className="text-zinc-100 font-medium">
            {formatEther(policy.premiumPaid)} C2FLR
          </p>
        </div>
        <div>
          <span className="text-zinc-500">Start</span>
          <p className="text-zinc-100">
            {new Date(Number(policy.start) * 1000).toLocaleDateString()}
          </p>
        </div>
        <div>
          <span className="text-zinc-500">Expiry</span>
          <p className="text-zinc-100">
            {new Date(Number(policy.expiry) * 1000).toLocaleDateString()}
          </p>
        </div>
      </div>

      {status === "active" && (
        <ClaimButton policy={policy} onSuccess={onClaim} />
      )}
    </Card>
  );
}
