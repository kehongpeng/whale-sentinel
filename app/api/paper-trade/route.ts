import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";
import type { PaperTrade } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const status = searchParams.get("status") || "open";

  let query = supabaseAdmin
    .from("paper_trades")
    .select("*")
    .eq("status", status)
    .order("alerted_at", { ascending: false });

  if (symbol) query = query.eq("symbol", symbol);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const body: PaperTrade = await request.json().catch(() => ({} as PaperTrade));
  if (!body.symbol || !body.stage) {
    return NextResponse.json({ error: "symbol and stage required" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("paper_trades")
    .insert({
      symbol: body.symbol,
      stage: body.stage,
      entry_price: body.entryPrice,
      entry_time: body.entryTime || now,
      alerted_at: body.alertedAt || now,
      status: body.status || "open",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
