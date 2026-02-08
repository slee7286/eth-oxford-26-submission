"use client";

export type Tick = {
  price: number;
  time: number;
};

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

const STORAGE_KEY = 'flare_ftso_v7_ticks';
let memoryTicks: Tick[] = [];
let seeded = false;

/**
 * CHART SEED DATA
 * Generates initial price history so the chart looks full on first load.
 * Creates a realistic random walk with momentum and mean-reversion
 * so candles have visible wicks and body variation (not a flat line).
 */
export function seedIfNeeded(currentPrice: number, currentTime: number) {
  if (typeof window === 'undefined') return;
  if (seeded || currentPrice <= 0) return;
  if (memoryTicks.length >= 30) { seeded = true; return; }

  seeded = true;
  const seedTicks: Tick[] = [];
  const interval = 5; // 5s intervals (matches polling)
  const count = 360;  // ~30 minutes of history

  // Walk forward from a starting price toward current price
  let price = currentPrice * (0.92 + Math.random() * 0.16); // start 92-108% of current
  const minPrice = Math.max(1, currentPrice * 0.75);
  const maxPrice = currentPrice * 1.25;
  let momentum = 0;

  for (let i = count; i > 0; i--) {
    // Mean-reversion toward current price + momentum for trend
    const reversion = (currentPrice - price) * 0.002;
    momentum = momentum * 0.85 + (Math.random() - 0.5) * 0.4;
    const volatility = currentPrice * 0.008 * (0.5 + Math.random());
    const change = reversion + momentum * volatility * 0.1 + (Math.random() - 0.5) * volatility;

    price = Math.max(minPrice, Math.min(maxPrice, price + change));
    seedTicks.push({
      price: parseFloat(price.toFixed(2)),
      time: currentTime - (i * interval)
    });
  }

  // Ensure last seed connects smoothly to current price
  seedTicks.push({ price: currentPrice, time: currentTime - 1 });
  memoryTicks = [...seedTicks, ...memoryTicks];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryTicks));
  } catch {}
}

/**
 * LIVE FTSO DATA PERSISTENCE
 * Stores real price ticks from the Flare FTSO oracle.
 * Uses in-memory store with localStorage backup.
 */
export function saveTick(tick: Tick) {
  if (typeof window === 'undefined') return;
  if (!tick.price || tick.price <= 0) return;

  // Load from localStorage on first call
  if (memoryTicks.length === 0) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) memoryTicks = JSON.parse(raw);
    } catch {}
  }

  // Prevent duplicate timestamps
  if (memoryTicks.length > 0 && memoryTicks[memoryTicks.length - 1].time === tick.time) return;

  // Skip if price hasn't moved in 10s (same FTSO epoch)
  if (memoryTicks.length > 0 &&
      memoryTicks[memoryTicks.length - 1].price === tick.price &&
      tick.time - memoryTicks[memoryTicks.length - 1].time < 10) {
    return;
  }

  memoryTicks.push(tick);
  if (memoryTicks.length > 2000) memoryTicks.shift();

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryTicks));
  } catch {}
}

export function clearTicks() {
  if (typeof window === 'undefined') return;
  memoryTicks = [];
  seeded = false;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * OHLC GENERATOR
 * Converts raw FTSO price ticks into candlesticks.
 * Each candle's open = previous candle's close (no gaps).
 */
export function getCandles(timeframeMinutes: number = 1): Candle[] {
  if (typeof window === 'undefined') return [];

  if (memoryTicks.length === 0) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) memoryTicks = JSON.parse(raw);
    } catch {}
  }

  if (memoryTicks.length === 0) return [];

  const timeframeSeconds = timeframeMinutes * 60;
  const candles: Candle[] = [];
  let currentCandle: Partial<Candle> | null = null;
  let prevClose: number | null = null;

  memoryTicks.forEach(tick => {
    const candleTime = Math.floor(tick.time / timeframeSeconds) * timeframeSeconds;

    if (!currentCandle || currentCandle.time !== candleTime) {
      if (currentCandle) {
        candles.push(currentCandle as Candle);
        prevClose = currentCandle.close!;
      }
      // Open = previous candle's close (no gaps)
      const open = prevClose !== null ? prevClose : tick.price;
      currentCandle = {
        time: candleTime,
        open,
        high: Math.max(open, tick.price),
        low: Math.min(open, tick.price),
        close: tick.price
      };
    } else {
      currentCandle.high = Math.max(currentCandle.high!, tick.price);
      currentCandle.low = Math.min(currentCandle.low!, tick.price);
      currentCandle.close = tick.price;
    }
  });

  if (currentCandle) candles.push(currentCandle as Candle);
  return candles.sort((a, b) => a.time - b.time);
}
