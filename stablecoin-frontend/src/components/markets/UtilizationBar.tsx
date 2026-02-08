"use client";

export function UtilizationBar({ bps }: { bps: bigint | number }) {
  const pct = Math.min(Number(bps) / 100, 100);
  const color =
    pct < 50 ? "bg-emerald-500" : pct < 80 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-zinc-400 mb-1">
        <span>Utilization</span>
        <span>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
