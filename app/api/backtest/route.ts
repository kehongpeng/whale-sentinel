import { NextResponse } from "next/server";
import { fetchHistoricalSnapshots } from "@/lib/binance";
import { runBacktest } from "@/services/backtestEngine";
import { supabaseAdmin } from "@/lib/supabaseClient";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const symbol = body.symbol || "BTCUSDT";
  const startTime = body.startTime ? new Date(body.startTime).getTime() : Date.now() - 30 * 24 * 60 * 60 * 1000;
  const endTime = body.endTime ? new Date(body.endTime).getTime() : Date.now();
  const interval = body.interval || "15m";

  try {
    const { snapshots, liquidationWindow } = await fetchHistoricalSnapshots(
      symbol,
      startTime,
      endTime,
      interval as any
    );
    const result = runBacktest(snapshots, liquidationWindow, interval as any);

    const { data: record, error } = await supabaseAdmin
      .from("backtests")
      .insert({
        symbol,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        interval,
        total_signals: result.totalSignals,
        wins: result.wins,
        losses: result.losses,
        win_rate: result.winRate,
        false_positive_rate: result.falsePositiveRate,
        avg_return_after_24h: result.avgReturnAfter24h,
        avg_return_after_48h: result.avgReturnAfter48h,
        stage_breakdown: result.stageBreakdown,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ result, record });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Backtest failed" }, { status: 500 });
  }
}
