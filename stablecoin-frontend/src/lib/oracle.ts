import type { PriceResponse, ProtectionQuote, TriggerAttestation } from "@/types/oracle";

const ORACLE_URL =
  process.env.NEXT_PUBLIC_ORACLE_URL || "http://localhost:3000";

export async function fetchPrice(stablecoin: string): Promise<PriceResponse> {
  const res = await fetch(`${ORACLE_URL}/price/${stablecoin}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to fetch price");
  return json.data;
}

export async function fetchQuote(
  stablecoin: string,
  marketAddress: string,
  barrierPpm: string,
  horizonSec: string
): Promise<ProtectionQuote> {
  const res = await fetch(`${ORACLE_URL}/quote/protection`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stablecoin, marketAddress, barrierPpm, horizonSec }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to fetch quote");
  return json.data;
}

export async function fetchTrigger(
  stablecoin: string,
  marketAddress: string,
  barrierPpm: string,
  windowSec: string,
  startTime: string,
  endTime: string
): Promise<TriggerAttestation> {
  const res = await fetch(`${ORACLE_URL}/attestation/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stablecoin,
      marketAddress,
      barrierPpm,
      windowSec,
      startTime,
      endTime,
    }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to fetch trigger");
  return json.data;
}

export async function fetchFlrUsd(): Promise<number> {
  const res = await fetch(`${ORACLE_URL}/index/flr-usd`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Failed to fetch FLR price");
  return json.data.price;
}
