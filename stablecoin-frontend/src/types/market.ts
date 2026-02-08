export interface MarketConfig {
  feedId: string;
  barrierPpm: bigint;
  windowSec: bigint;
  horizonSec: bigint;
  lambdaMinBps: bigint;
  lambdaMaxBps: bigint;
  reserveFactorBps: bigint;
  maxPriceAgeSec: bigint;
  oracleSigner: string;
}

export interface MarketState {
  address: string;
  totalLiquidity: bigint;
  outstandingExposure: bigint;
  utilizationBps: bigint;
  currentLambdaBps: bigint;
  nextPolicyId: bigint;
}

export interface Policy {
  id: number;
  marketAddress: string;
  buyer: string;
  notional: bigint;
  premiumPaid: bigint;
  start: bigint;
  expiry: bigint;
  claimed: boolean;
}

export type PolicyStatus = "active" | "expired" | "claimed";

export function getPolicyStatus(policy: Policy): PolicyStatus {
  if (policy.claimed) return "claimed";
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now > policy.expiry) return "expired";
  return "active";
}
