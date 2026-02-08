"use client";

import { PolicyCard } from "./PolicyCard";
import { Spinner } from "@/components/ui/Spinner";
import type { Policy } from "@/types/market";

export function PolicyList({
  policies,
  loading,
  onClaim,
}: {
  policies: Policy[];
  loading: boolean;
  onClaim: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (policies.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">No policies found</p>
        <p className="text-sm text-zinc-500 mt-1">
          Buy protection on a market to see your policies here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {policies.map((p) => (
        <PolicyCard
          key={`${p.marketAddress}-${p.id}`}
          policy={p}
          onClaim={onClaim}
        />
      ))}
    </div>
  );
}
