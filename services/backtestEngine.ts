import { detectStage } from "@/lib/rules";
import type { MarketSnapshot, BacktestResult, BacktestTrade } from "@/lib/types";

const INTERVAL_MS: Record<string, number> = {
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
};

export function runBacktest(
  snapshots: MarketSnapshot[],
  liquidationWindow: number[],
  interval: "5m" | "15m" | "30m" | "1h" = "15m"
): BacktestResult {
  const trades: BacktestTrade[] = [];
  const stageBreakdown: Record<string, { count: number; win: number; loss: number }> = {};
  const lookaheadBars24h = Math.ceil((24 * 60 * 60 * 1000) / INTERVAL_MS[interval]);
  const lookaheadBars48h = Math.ceil((48 * 60 * 60 * 1000) / INTERVAL_MS[interval]);

  const windowSize = 6;
  for (let i = windowSize; i < snapshots.length; i++) {
    const slice = snapshots.slice(i - windowSize, i);
    const liqSlice = liquidationWindow.slice(i - windowSize, i);
    const signal = detectStage(slice, liqSlice);

    if (signal.stage === "UNKNOWN") continue;

    const entry = snapshots[i];
    const exit24 = snapshots[i + lookaheadBars24h];
    const exit48 = snapshots[i + lookaheadBars48h];

    const trade: BacktestTrade = {
      symbol: entry.symbol,
      stage: signal.stage,
      entryPrice: entry.price,
      entryTime: entry.timestamp,
    };

    if (exit24) {
      trade.exitPrice24h = exit24.price;
      trade.return24h = (exit24.price - entry.price) / entry.price;
      trade.result24h = classifyResult(trade.return24h, signal.stage);
    }
    if (exit48) {
      trade.exitPrice48h = exit48.price;
      trade.return48h = (exit48.price - entry.price) / entry.price;
      trade.result48h = classifyResult(trade.return48h, signal.stage);
    }

    trades.push(trade);

    if (!stageBreakdown[signal.stage]) stageBreakdown[signal.stage] = { count: 0, win: 0, loss: 0 };
    stageBreakdown[signal.stage].count += 1;
    if (trade.result24h === "win") stageBreakdown[signal.stage].win += 1;
    if (trade.result24h === "loss") stageBreakdown[signal.stage].loss += 1;
  }

  const with24h = trades.filter((t) => t.result24h);
  const wins = with24h.filter((t) => t.result24h === "win").length;
  const losses = with24h.filter((t) => t.result24h === "loss").length;
  const neutrals = with24h.filter((t) => t.result24h === "neutral").length;

  const winRate = with24h.length ? wins / with24h.length : 0;
  const falsePositiveRate = with24h.length ? losses / with24h.length : 0;

  return {
    totalSignals: trades.length,
    wins,
    losses,
    winRate,
    falsePositiveRate,
    avgReturnAfter24h: avg(with24h.map((t) => t.return24h || 0)),
    avgReturnAfter48h: avg(trades.filter((t) => t.return48h != null).map((t) => t.return48h || 0)),
    stageBreakdown: Object.fromEntries(
      Object.entries(stageBreakdown).map(([stage, v]) => [
        stage,
        { count: v.count, winRate: v.count ? v.win / v.count : 0 },
      ])
    ) as any,
    trades,
  };
}

function classifyResult(ret: number, stage: string): "win" | "loss" | "neutral" {
  if (stage === "ACCUMULATION" || stage === "PUMPING") {
    if (ret > 0.02) return "win";
    if (ret < -0.01) return "loss";
    return "neutral";
  }
  if (stage === "DISTRIBUTION") {
    if (ret < -0.01) return "win"; // short / avoid logic
    if (ret > 0.02) return "loss";
    return "neutral";
  }
  return "neutral";
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
