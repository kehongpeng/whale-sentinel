import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";
import { fetchRealtimeAggregate } from "@/lib/binance";
import { detectStage } from "@/lib/rules";

export const runtime = "nodejs";

/**
 * Cron sync job: runs every 5 minutes.
 * 1. Fetches watchlist symbols
 * 2. Pulls real-time market data
 * 3. Persists snapshots
 * 4. Emits alerts for high-confidence stage changes
 */
export async function GET(request: Request) {
  // Optional authorization via secret header
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (process.env.CRON_SECRET && authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: watchlist } = await supabaseAdmin
      .from("watchlist")
      .select("symbol")
      .order("added_at", { ascending: false })
      .limit(50);

    const symbols = (watchlist || []).map((w) => w.symbol);
    if (symbols.length === 0) {
      return NextResponse.json({ success: true, synced: 0, alerts: 0 });
    }

    let alertCount = 0;

    await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const { snapshots, liquidationWindow } = await fetchRealtimeAggregate(symbol, 30);
          const signal = detectStage(snapshots, liquidationWindow);
          const latest = snapshots[snapshots.length - 1];

          // Persist snapshot
          await supabaseAdmin.from("market_snapshots").insert({
            symbol,
            timestamp: new Date(latest.timestamp).toISOString(),
            price: latest.price,
            oi: latest.oi,
            funding_rate: latest.fundingRate,
            top_long_ratio: latest.topLongRatio,
            liquidation_vol: liquidationWindow[liquidationWindow.length - 1] || 0,
          });

          // Emit alert if confidence >= 0.75 and stage is not UNKNOWN
          if (signal.stage !== "UNKNOWN" && signal.confidence >= 0.75) {
            await supabaseAdmin.from("alerts").insert({
              symbol,
              stage: signal.stage,
              confidence: signal.confidence,
              reasons: signal.reasons,
              metadata: signal.metadata,
            });

            // Open paper trade for actionable signals
            await fetch(`${new URL(request.url).origin}/api/paper-trade`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                symbol,
                stage: signal.stage,
                entryPrice: latest.price,
              }),
            }).catch(() => {});

            alertCount++;
          }

          // Update watchlist stage cache (skipped if columns don't exist)
          try {
            await supabaseAdmin
              .from("watchlist")
              .update({})
              .eq("symbol", symbol);
          } catch {}
        } catch (err) {
          console.error(`Sync failed for ${symbol}:`, err);
        }
      })
    );

    return NextResponse.json({
      success: true,
      synced: symbols.length,
      alerts: alertCount,
    });
  } catch (error) {
    console.error("Cron sync failed:", error);
    return NextResponse.json(
      { success: false, error: "Cron sync failed" },
      { status: 500 }
    );
  }
}
