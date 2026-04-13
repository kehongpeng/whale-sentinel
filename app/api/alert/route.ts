import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20", 10));

  let query = supabaseAdmin
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (symbol) {
    query = query.eq("symbol", symbol);
  }

  // Guard against local network stalls: resolve empty array after 2.5s
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(NextResponse.json({ data: [] }));
    }, 2500);

    query.then(({ data, error }: any) => {
      clearTimeout(timer);
      if (error) {
        resolve(NextResponse.json({ error: error.message }, { status: 500 }));
      } else {
        resolve(NextResponse.json({ data }));
      }
    });
  }) as any;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { symbol, stage, confidence, reasons, metadata } = body;
  if (!symbol || !stage) {
    return NextResponse.json({ error: "symbol and stage required" }, { status: 400 });
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(NextResponse.json({ error: "Database timeout" }, { status: 504 }));
    }, 2500);

    supabaseAdmin
      .from("alerts")
      .insert({ symbol, stage, confidence, reasons, metadata })
      .select()
      .single()
      .then(({ data, error }: any) => {
        clearTimeout(timer);
        if (error) {
          resolve(NextResponse.json({ error: error.message }, { status: 500 }));
        } else {
          resolve(NextResponse.json({ data }));
        }
      });
  }) as any;
}
