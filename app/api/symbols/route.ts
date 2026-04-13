import { NextResponse } from "next/server";
import { fetchUsdMarginSymbols } from "@/lib/binance";

export const runtime = "nodejs";

export async function GET() {
  try {
    const symbols = await fetchUsdMarginSymbols();
    return NextResponse.json({
      success: true,
      data: symbols,
      meta: { total: symbols.length },
    });
  } catch (error) {
    console.error("Failed to fetch symbols:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch symbols" },
      { status: 500 }
    );
  }
}
