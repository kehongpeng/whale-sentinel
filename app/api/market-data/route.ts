import { NextResponse } from "next/server";
import { fetchRealtimeAggregate } from "@/lib/binance";
import { detectStage } from "@/lib/rules";
import { supabaseAdmin } from "@/lib/supabaseClient";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get("symbols")?.split(",") || ["BTCUSDT"];

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const { snapshots, liquidationWindow } = await fetchRealtimeAggregate(symbol, 30);
        const signal = detectStage(snapshots, liquidationWindow);
        const latest = snapshots[snapshots.length - 1];

        // Persist latest snapshot (fire-and-forget)
        void (async () => {
          try {
            await supabaseAdmin.from("market_snapshots").insert({
              symbol,
              timestamp: new Date(latest.timestamp).toISOString(),
              price: latest.price,
              oi: latest.oi,
              funding_rate: latest.fundingRate,
              top_long_ratio: latest.topLongRatio,
              liquidation_vol: liquidationWindow[liquidationWindow.length - 1] || 0,
            });
          } catch {}
        })();

        return {
          symbol,
          price: latest.price,
          oi: latest.oi,
          fundingRate: latest.fundingRate,
          topLongRatio: latest.topLongRatio,
          stage: signal.stage,
          confidence: signal.confidence,
          reasons: signal.reasons,
          metadata: signal.metadata,
        };
      } catch (err: any) {
        return {
          symbol,
          error: err.message || "Unknown error",
          stage: "UNKNOWN",
          confidence: 0,
        };
      }
    })
  );

  return NextResponse.json({ data: results });
}
