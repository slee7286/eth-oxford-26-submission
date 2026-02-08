"use client";

import { Badge } from "@/components/ui/Badge";

export function DepegIndicator({
  currentPpm,
  barrierPpm,
}: {
  currentPpm: number;
  barrierPpm: bigint;
}) {
  const barrier = Number(barrierPpm) / 1_000_000;
  const current = currentPpm / 1_000_000;
  const distance = ((current - barrier) / barrier) * 100;

  let variant: "green" | "yellow" | "red";
  let label: string;

  if (distance > 1) {
    variant = "green";
    label = "Safe";
  } else if (distance > 0.3) {
    variant = "yellow";
    label = "Watch";
  } else {
    variant = "red";
    label = "Danger";
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={variant}>{label}</Badge>
      <span className="text-sm text-zinc-400">
        {distance.toFixed(3)}% above barrier
      </span>
    </div>
  );
}
