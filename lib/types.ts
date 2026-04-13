/**
 * Whale Sentinel — Shared TypeScript Types
 */

export type WhaleStage = "ACCUMULATION" | "PUMPING" | "DISTRIBUTION" | "UNKNOWN";

export interface MarketSnapshot {
  symbol: string;
  timestamp: number;
  price: number;
  oi: number; // Open Interest in USDT
  fundingRate: number; // e.g. 0.0001 = 0.01%
  topLongRatio: number; // 0.65 = 65%
  liquidationVol?: number; // optional for realtime
}

export interface StageSignal {
  stage: WhaleStage;
  confidence: number; // 0-1
  reasons: string[];
  metadata: Record<string, number>;
}

export interface AlertRecord {
  id?: string;
  symbol: string;
  stage: WhaleStage;
  confidence: number;
  reasons: string[];
  metadata: Record<string, number>;
  created_at: string;
  acknowledged?: boolean;
}

export interface WatchItem {
  symbol: string;
  addedAt: string;
  stage: WhaleStage;
  confidence: number;
  price: number;
  oi: number;
  fundingRate: number;
  topLongRatio: number;
  updatedAt: string;
}

export interface BacktestResult {
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number;
  falsePositiveRate: number;
  avgReturnAfter24h: number;
  avgReturnAfter48h: number;
  stageBreakdown: Record<WhaleStage, { count: number; winRate: number }>;
  trades: BacktestTrade[];
}

export interface BacktestTrade {
  symbol: string;
  stage: WhaleStage;
  entryPrice: number;
  entryTime: number;
  exitPrice24h?: number;
  exitPrice48h?: number;
  return24h?: number;
  return48h?: number;
  result24h?: "win" | "loss" | "neutral";
  result48h?: "win" | "loss" | "neutral";
}

export interface PaperTrade {
  id?: string;
  symbol: string;
  stage: WhaleStage;
  entryPrice: number;
  entryTime: string;
  alertedAt: string;
  status: "open" | "closed";
  exitPrice?: number;
  exitTime?: string;
  returnPct?: number;
  holdingPeriodHours?: number;
}

export interface SymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
}
