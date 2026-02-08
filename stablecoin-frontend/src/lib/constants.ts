import { keccak256, toUtf8Bytes } from "ethers";

export interface FeedInfo {
  symbol: string;
  name: string;
  feedId: string;
}

const KNOWN_FEEDS: { symbol: string; name: string }[] = [
  { symbol: "USDC-USD", name: "USD Coin" },
  { symbol: "USDT-USD", name: "Tether" },
  { symbol: "DAI-USD", name: "Dai" },
  { symbol: "FRAX-USD", name: "Frax" },
  { symbol: "TUSD-USD", name: "TrueUSD" },
  { symbol: "BUSD-USD", name: "Binance USD" },
  { symbol: "LUSD-USD", name: "Liquity USD" },
  { symbol: "GUSD-USD", name: "Gemini Dollar" },
];

const feedIdMap = new Map<string, FeedInfo>();

for (const f of KNOWN_FEEDS) {
  const id = keccak256(toUtf8Bytes(f.symbol));
  feedIdMap.set(id, { ...f, feedId: id });
}

export function getFeedInfo(feedId: string): FeedInfo {
  return (
    feedIdMap.get(feedId) || {
      symbol: "UNKNOWN",
      name: "Unknown",
      feedId,
    }
  );
}

export function getStablecoinFromFeedId(feedId: string): string {
  const info = feedIdMap.get(feedId);
  if (!info) return "UNKNOWN";
  return info.symbol.split("-")[0];
}

export const REVERT_MESSAGES: Record<string, string> = {
  CAPACITY: "Market capacity exceeded. Try a smaller notional.",
  PREMIUM: "Incorrect premium amount sent.",
  STALE_P: "Oracle quote is stale. Refreshing...",
  NO_LIQ: "No liquidity available in this market.",
  BAD_SIG: "Invalid oracle signature.",
  NOTIONAL: "Notional must be greater than zero.",
  BAL: "Insufficient LP balance.",
  WITHDRAW_LIMIT: "Exceeds maximum withdrawable amount.",
  NOT_BUYER: "You are not the policy owner.",
  CLAIMED: "Policy already claimed.",
  OUT_WINDOW: "Event outside policy window.",
  NO_SIGNER: "Oracle signer not configured.",
  AMOUNT: "Amount must be greater than zero.",
};

export function getUserFriendlyError(error: string): string {
  for (const [key, msg] of Object.entries(REVERT_MESSAGES)) {
    if (error.includes(key)) return msg;
  }
  return error;
}
