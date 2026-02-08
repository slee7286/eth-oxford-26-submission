"use client";

import { Badge } from "@/components/ui/Badge";
import type { PolicyStatus } from "@/types/market";

const STATUS_MAP: Record<PolicyStatus, { variant: "green" | "yellow" | "red" | "gray"; label: string }> = {
  active: { variant: "green", label: "Active" },
  expired: { variant: "gray", label: "Expired" },
  claimed: { variant: "blue" as "green", label: "Claimed" },
};

export function PolicyStatusBadge({ status }: { status: PolicyStatus }) {
  const { variant, label } = STATUS_MAP[status] || { variant: "gray" as const, label: status };
  return <Badge variant={variant}>{label}</Badge>;
}
