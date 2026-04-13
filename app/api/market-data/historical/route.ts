import { NextRequest, NextResponse } from "next/server";
import { buildSnapshotSeries } from "@/lib/binance";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");
  const interval = (searchParams.get("interval") as any) || "15m";
  const limit = parseInt(searchParams.get("limit") || "200", 10);

  if (!symbol) {
    return NextResponse.json(
      { success: false, error: "symbol is required" },
      { status: 400 }
    );
  }

  try {
    const { snapshots, liquidationWindow } = await buildSnapshotSeries(
      symbol,
      limit,
      interval
    );

    return NextResponse.json({
      success: true,
      snapshots,
      liquidationWindow,
      meta: { symbol, interval, limit: snapshots.length },
    });
  } catch (error) {
    console.error("Historical data fetch failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch historical data" },
      { status: 500 }
    );
  }
}
