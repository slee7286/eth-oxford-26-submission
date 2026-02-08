export interface DepegMarket {
  id: string;
  stablecoin: string;
  name: string;
  currentPrice: number;
  barrier: number;
  distanceToBarrier: number;
  premiumRate: number;
  lpApy: number;
  liquidity: number;
  utilization: number;
  horizon: string;
  window: string;
  status: 'active' | 'expired' | 'triggered';
  activePolicies: number;
  claimsPaid: number;
  lastUpdate?: number;
  oracleSource?: string;
  feedId?: string;
}

export const DEPEG_DEFAULTS: Omit<DepegMarket, 'id' | 'stablecoin' | 'name' | 'currentPrice' | 'barrier' | 'distanceToBarrier' | 'premiumRate' | 'lpApy' | 'liquidity' | 'feedId'> = {
  utilization: 0,
  horizon: '7 days',
  window: '15 minutes',
  status: 'active',
  activePolicies: 0,
  claimsPaid: 0,
  oracleSource: 'Flare FTSO v2',
};

export const MARKET_CONFIGS = [
  {
    id: 'usdc-depeg',
    stablecoin: 'USDC',
    name: 'USDC Depeg Protection',
    barrier: 0.985,
    premiumRate: 1.6,
    lpApy: 15.2,
    liquidity: 500,
    feedName: 'USDC/USD',
  },
  {
    id: 'usdt-depeg',
    stablecoin: 'USDT',
    name: 'USDT Depeg Protection',
    barrier: 0.985,
    premiumRate: 1.8,
    lpApy: 12.8,
    liquidity: 350,
    feedName: 'USDT/USD',
  },
  {
    id: 'basket-depeg',
    stablecoin: 'USDC/USDT',
    name: 'USDC/USDT Basket Protection',
    barrier: 0.990,
    premiumRate: 1.2,
    lpApy: 18.5,
    liquidity: 200,
    feedName: 'composite',
  },
];

// ═══════════════════════════════════════════════════════════════
// PLACEHOLDER VALUES — replace with contract calls when deployed
// Each placeholder has a comment showing the future contract call
// ═══════════════════════════════════════════════════════════════

export const getDepegPlatformStats = async (/*factory?: ethers.Contract*/) => {
  // FUTURE: const markets = await factory.getAllMarkets();
  // FUTURE: for each market, aggregate totalLiquidity, policies, etc.

  return {
    totalLiquidity: 1050,        // FUTURE: sum of market.totalLiquidity() across all markets
    totalProtection: 0,          // FUTURE: sum of all policy notionals
    activePolicies: 0,           // FUTURE: count of unexpired policies from events
    claimsPaid: 0,               // FUTURE: count from Claimed events
    totalLPs: 0,                 // FUTURE: unique LP count from LiquidityAdded events
  };
};

export const getMarketDetails = async (/*market?: ethers.Contract*/) => {
  // FUTURE: const config = await market.getConfig();
  // FUTURE: const liq = await market.totalLiquidity();
  // FUTURE: const util = await market.utilizationBps();
  // FUTURE: const lambda = await market.currentLambdaBps();

  return {
    liquidity: 500,              // FUTURE: market.totalLiquidity()
    utilization: 0,              // FUTURE: market.utilizationBps() / 100
    premiumRate: 1.6,            // FUTURE: market.currentLambdaBps() / 100
    lpApy: 15.2,                 // FUTURE: calculated from utilization + lambda
    activePolicies: 0,           // FUTURE: from event indexing
    barrier: 0.985,              // FUTURE: market.barrierPpm() / 1_000_000
    horizon: 7 * 24 * 3600,     // FUTURE: market.horizonSec()
    window: 15 * 60,            // FUTURE: market.windowSec()
  };
};

export const RECENT_ACTIVITY = [
  { address: '0x8c3f...a921', action: 'Bought USDC Protection', amount: '10.0 C2FLR', time: '2 min ago' },
  { address: '0x4b2e...c834', action: 'Added Liquidity (USDT)', amount: '50.0 C2FLR', time: '15 min ago' },
  { address: '0x7a1d...f092', action: 'Bought USDT Protection', amount: '5.0 C2FLR', time: '1 hour ago' },
];
