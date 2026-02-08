import { formatEther as ethersFormatEther } from "ethers";

export function formatPpm(ppm: bigint | number): string {
  return (Number(ppm) / 1_000_000).toFixed(4);
}

export function formatBps(bps: bigint | number): string {
  return (Number(bps) / 100).toFixed(2) + "%";
}

export function formatEther(wei: bigint): string {
  return parseFloat(ethersFormatEther(wei)).toFixed(4);
}

export function formatEtherFull(wei: bigint): string {
  return ethersFormatEther(wei);
}

export function formatDuration(seconds: bigint | number): string {
  const s = Number(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function formatDurationLong(seconds: bigint | number): string {
  const s = Number(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d} day${d > 1 ? "s" : ""}`);
  if (h) parts.push(`${h} hour${h > 1 ? "s" : ""}`);
  if (m) parts.push(`${m} min`);
  return parts.join(" ") || `${s}s`;
}

export function shortenAddress(addr: string): string {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}
