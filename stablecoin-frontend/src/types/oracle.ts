export interface PriceResponse {
  stablecoin: string;
  pricePpm: number;
  priceUsd: number;
  sources: number;
  timestamp: number;
}

export interface ProtectionQuote {
  pBps: number;
  probability: number;
  currentPpm: number;
  distance: number;
  volatility: number;
  issuedAt: number;
  signature: string;
}

export interface TriggerAttestation {
  triggered: number;
  eventStart: number;
  eventEnd: number;
  duration: number;
  issuedAt: number;
  signature: string;
}
