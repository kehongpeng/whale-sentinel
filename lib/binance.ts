/**
 * Binance USDS-M Futures Public API Client
 * Based on official Binance skill endpoints (derivatives-trading-usds-futures)
 * https://github.com/binance/binance-skills-hub
 *
 * Endpoints used:
 *  • GET /fapi/v1/premiumIndex              → price, fundingRate, oi
 *  • GET /futures/data/openInterestHist     → historical OI
 *  • GET /futures/data/topLongShortAccountRatio → top trader long/short ratio (accounts)
 *  • GET /fapi/v1/fundingRate               → funding rate history
 *  • GET /fapi/v1/klines                    → kline/candlestick data
 *  • GET /fapi/v1/allForceOrders            → liquidation orders
 *  • GET /fapi/v1/exchangeInfo              → symbol list
 */

import type { MarketSnapshot, SymbolInfo } from "./types";

const BASE_FAPI = "https://fapi.binance.com";
const BASE_DATA = "https://fapi.binance.com/futures/data";

async function getJson(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "binance-derivatives-trading-usds-futures/1.1.0 (Skill)",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "unknown");
    throw new Error(`Binance API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function fetchPremiumIndex(symbol: string) {
  const [data, oiData]: [any, any] = await Promise.all([
    getJson(`${BASE_FAPI}/fapi/v1/premiumIndex?symbol=${symbol}`),
    getJson(`${BASE_FAPI}/fapi/v1/openInterest?symbol=${symbol}`),
  ]);
  return {
    price: parseFloat(data.markPrice),
    fundingRate: parseFloat(data.lastFundingRate),
    nextFundingTime: data.nextFundingTime as number,
    oi: parseFloat(oiData.openInterest) || 0,
  };
}

export async function fetchOpenInterestHistory(
  symbol: string,
  period: "5m" | "15m" | "30m" | "1h" | "2h" | "4h" | "6h" = "5m",
  limit = 30
) {
  const data: any[] = await getJson(
    `${BASE_DATA}/openInterestHist?symbol=${symbol}&period=${period}&limit=${limit}`
  );
  return data.map((d) => ({
    timestamp: d.timestamp as number,
    oi: parseFloat(d.sumOpenInterestValue),
  }));
}

export async function fetchTopLongShortAccountRatio(
  symbol: string,
  period: "5m" | "15m" | "30m" | "1h" | "2h" | "4h" | "6h" = "5m",
  limit = 30
) {
  const data: any[] = await getJson(
    `${BASE_DATA}/topLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=${limit}`
  );
  return data.map((d) => ({
    timestamp: d.timestamp as number,
    longShortRatio: parseFloat(d.longShortRatio),
    longAccount: parseFloat(d.longAccount),
    shortAccount: parseFloat(d.shortAccount),
  }));
}

export async function fetchFundingRateHistory(
  symbol: string,
  limit = 30,
  startTime?: number,
  endTime?: number
) {
  let url = `${BASE_FAPI}/fapi/v1/fundingRate?symbol=${symbol}&limit=${limit}`;
  if (startTime) url += `&startTime=${startTime}`;
  if (endTime) url += `&endTime=${endTime}`;
  const data: any[] = await getJson(url);
  return data.map((d) => ({
    timestamp: d.fundingTime as number,
    fundingRate: parseFloat(d.fundingRate),
  }));
}

export async function fetchKlines(
  symbol: string,
  interval = "5m",
  limit = 30,
  startTime?: number,
  endTime?: number
) {
  let url = `${BASE_FAPI}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  if (startTime) url += `&startTime=${startTime}`;
  if (endTime) url += `&endTime=${endTime}`;
  const data: any[] = await getJson(url);
  return data.map((k) => ({
    openTime: k[0] as number,
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    closeTime: k[6] as number,
  }));
}

/**
 * Binance /fapi/v1/allForceOrders is out of maintenance as of 2025.
 * Gracefully degrade to empty array so stage detection still works
 * (liquidation spike is only a confidence booster, not required).
 */
export async function fetchAllForceOrders(
  _symbol: string,
  _startTime?: number,
  _endTime?: number,
  _limit = 1000
) {
  return [] as {
    symbol: string;
    price: number;
    qty: number;
    side: "SELL" | "BUY";
    time: number;
  }[];
}

export async function fetchUsdMarginSymbols(): Promise<SymbolInfo[]> {
  const data: any = await getJson(`${BASE_FAPI}/fapi/v1/exchangeInfo`);
  return data.symbols
    .filter((s: any) => s.contractType === "PERPETUAL" && s.status === "TRADING")
    .map((s: any) => ({
      symbol: s.symbol as string,
      baseAsset: s.baseAsset as string,
      quoteAsset: s.quoteAsset as string,
    }));
}

/**
 * Build a time-series of MarketSnapshot for stage detection.
 * Aligns price (klines), fundingRate, OI and topLongRatio by nearest timestamp.
 */
export async function buildSnapshotSeries(
  symbol: string,
  barCount = 30,
  interval: "5m" | "15m" | "30m" | "1h" = "5m"
): Promise<{ snapshots: MarketSnapshot[]; liquidationWindow: number[] }> {
  const period = interval;
  const [klines, oiHist, ratioHist, fundHist] = await Promise.all([
    fetchKlines(symbol, interval, barCount),
    fetchOpenInterestHistory(symbol, period, barCount),
    fetchTopLongShortAccountRatio(symbol, period, barCount),
    fetchFundingRateHistory(symbol, barCount),
  ]);

  const snapshots: MarketSnapshot[] = [];
  for (const k of klines) {
    const ts = k.openTime;
    const oiPoint = findNearest(oiHist, ts, (d) => d.timestamp);
    const ratioPoint = findNearest(ratioHist, ts, (d) => d.timestamp);
    const fundPoint = findNearest(fundHist, ts, (d) => d.timestamp);

    snapshots.push({
      symbol,
      timestamp: ts,
      price: k.close,
      oi: oiPoint?.oi ?? 0,
      fundingRate: fundPoint?.fundingRate ?? 0,
      topLongRatio: ratioPoint?.longAccount ?? 0.5,
    });
  }

  // Pull liquidation buckets for the same overall window
  const startMs = klines[0]?.openTime ?? Date.now() - barCount * 5 * 60 * 1000;
  const endMs = klines[klines.length - 1]?.closeTime ?? Date.now();
  const liqBuckets = await buildLiquidationBuckets(symbol, startMs, endMs, 6);

  return { snapshots, liquidationWindow: liqBuckets };
}

function findNearest<T>(arr: T[], target: number, getTs: (item: T) => number): T | undefined {
  if (arr.length === 0) return undefined;
  let best = arr[0];
  let bestDiff = Math.abs(getTs(best) - target);
  for (const item of arr) {
    const diff = Math.abs(getTs(item) - target);
    if (diff < bestDiff) {
      best = item;
      bestDiff = diff;
    }
  }
  return best;
}

async function buildLiquidationBuckets(
  symbol: string,
  startTime: number,
  endTime: number,
  buckets = 6
): Promise<number[]> {
  const orders = await fetchAllForceOrders(symbol, startTime, endTime, 1000);
  const interval = Math.ceil((endTime - startTime) / buckets);
  const out: number[] = new Array(buckets).fill(0);
  for (const o of orders) {
    const idx = Math.min(buckets - 1, Math.floor((o.time - startTime) / interval));
    if (idx >= 0) out[idx] += o.price * o.qty;
  }
  return out;
}

/**
 * Realtime aggregate snapshot (single current point + recent history for slope calc)
 */
export async function fetchRealtimeAggregate(
  symbol: string,
  lookback = 30
): Promise<{ snapshots: MarketSnapshot[]; liquidationWindow: number[] }> {
  return buildSnapshotSeries(symbol, lookback, "5m");
}

/**
 * Historical backtest data builder — pulls longer history.
 */
export async function fetchHistoricalSnapshots(
  symbol: string,
  startTime: number,
  endTime: number,
  interval: "5m" | "15m" | "30m" | "1h" = "15m"
): Promise<{ snapshots: MarketSnapshot[]; liquidationWindow: number[] }> {
  const msPerBar =
    interval === "5m" ? 5 * 60 * 1000
    : interval === "15m" ? 15 * 60 * 1000
    : interval === "30m" ? 30 * 60 * 1000
    : 60 * 60 * 1000;
  const bars = Math.min(1000, Math.ceil((endTime - startTime) / msPerBar));
  return buildSnapshotSeries(symbol, bars, interval);
}
