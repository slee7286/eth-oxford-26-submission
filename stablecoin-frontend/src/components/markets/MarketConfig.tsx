"use client";

import { Card } from "@/components/ui/Card";
import {
  formatPpm,
  formatBps,
  formatDurationLong,
  shortenAddress,
} from "@/lib/formatting";
import { getFeedInfo } from "@/lib/constants";
import type { MarketConfig as MarketConfigType } from "@/types/market";

export function MarketConfigTable({ config }: { config: MarketConfigType }) {
  const feed = getFeedInfo(config.feedId);
  const rows = [
    { label: "Feed", value: `${feed.symbol} (${feed.name})` },
    { label: "Barrier Price", value: `$${formatPpm(config.barrierPpm)}` },
    { label: "Window", value: formatDurationLong(config.windowSec) },
    { label: "Horizon", value: formatDurationLong(config.horizonSec) },
    { label: "Lambda Min", value: formatBps(config.lambdaMinBps) },
    { label: "Lambda Max", value: formatBps(config.lambdaMaxBps) },
    { label: "Reserve Factor", value: formatBps(config.reserveFactorBps) },
    {
      label: "Max Quote Age",
      value: formatDurationLong(config.maxPriceAgeSec),
    },
    { label: "Oracle Signer", value: shortenAddress(config.oracleSigner) },
  ];

  return (
    <Card>
      <h3 className="text-lg font-semibold text-zinc-100 mb-4">
        Market Configuration
      </h3>
      <div className="space-y-0">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex justify-between text-sm py-2 px-2 rounded ${
              i % 2 === 0 ? "bg-zinc-800/30" : ""
            }`}
          >
            <span className="text-zinc-400">{row.label}</span>
            <span className="text-zinc-100 font-medium">{row.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
