import { supabaseAdmin } from "@/lib/supabaseClient";
import type { PaperTrade, StageSignal } from "@/lib/types";

export async function openPaperTrade(
  symbol: string,
  entryPrice: number,
  signal: StageSignal
): Promise<PaperTrade> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("paper_trades")
    .insert({
      symbol,
      stage: signal.stage,
      entry_price: entryPrice,
      entry_time: now,
      alerted_at: now,
      status: "open",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as PaperTrade;
}

export async function evaluateOpenTrades(symbol: string, currentPrice: number) {
  const { data: openTrades, error } = await supabaseAdmin
    .from("paper_trades")
    .select("*")
    .eq("symbol", symbol)
    .eq("status", "open");

  if (error || !openTrades) return;

  for (const trade of openTrades as PaperTrade[]) {
    const entry = new Date(trade.entryTime).getTime();
    const now = Date.now();
    const holdingHours = (now - entry) / (1000 * 60 * 60);

    // Simple exit logic: hold 24-48h then close
    if (holdingHours >= 24) {
      const returnPct = (currentPrice - trade.entryPrice) / trade.entryPrice;
      await supabaseAdmin
        .from("paper_trades")
        .update({
          status: "closed",
          exit_price: currentPrice,
          exit_time: new Date().toISOString(),
          return_pct: returnPct,
          holding_period_hours: holdingHours,
        })
        .eq("id", trade.id);
    }
  }
}
