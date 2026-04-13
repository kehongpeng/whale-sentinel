"use client";

import { useEffect, useState } from "react";
import { WatchCard } from "@/components/WatchCard";
import type { AlertRecord } from "@/lib/types";

const DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "DOGEUSDT"];

interface MarketItem {
  symbol: string;
  price: number;
  oi: number;
  fundingRate: number;
  topLongRatio: number;
  stage: import("@/lib/types").WhaleStage;
  confidence: number;
  reasons: string[];
  error?: string;
}

export default function HomePage() {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [data, setData] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/market-data?symbols=${symbols.join(",")}`);
      const json = await res.json();
      setData(json.data || []);
    } catch (err) {
      console.error("Fetch market data failed:", err);
      setErrorMsg("数据加载失败，请检查网络或浏览器扩展拦截");
    } finally {
      setLoading(false);
    }
    // sync alerts in background so Supabase failures don't block UI
    fetchAlerts().catch(() => {});
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/alert?limit=20");
      if (!res.ok) return;
      const json = await res.json();
      setAlerts(json.data || []);
    } catch {
      // silently ignore alert fetch failures in dev/local
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 20000);
    return () => clearInterval(id);
  }, [symbols.join(",")]);

  const addSymbol = () => {
    const s = newSymbol.trim().toUpperCase();
    if (s && !symbols.includes(s)) {
      setSymbols([...symbols, s]);
      setNewSymbol("");
    }
  };

  const removeSymbol = (s: string) => {
    setSymbols(symbols.filter((x) => x !== s));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Whale Sentinel</h1>
            <p className="text-slate-400">币安 U 本位永续合约大户行为监控与三阶段预警</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSymbol()}
              placeholder="添加币种如 PEPEUSDT"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-sky-500"
            />
            <button
              onClick={addSymbol}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              添加
            </button>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {errorMsg} （建议用无痕窗口试试）
          </div>
        )}

        {loading && data.length === 0 && (
          <div className="py-10 text-center text-slate-400">加载中...</div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((item) => (
            <div key={item.symbol} className="relative">
              <button
                onClick={() => removeSymbol(item.symbol)}
                className="absolute right-2 top-2 z-10 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                title="移除"
              >
                ✕
              </button>
              <WatchCard {...item} />
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="mb-4 text-lg font-semibold">最近预警</h2>
          {alerts.length === 0 ? (
            <div className="text-sm text-slate-500">暂无预警记录</div>
          ) : (
            <ul className="space-y-2">
              {alerts.slice(0, 10).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3"
                >
                  <div className="text-sm">
                    <span className="font-semibold text-slate-200">{a.symbol}</span>
                    <span
                      className={`ml-2 rounded px-2 py-0.5 text-xs ${
                        a.stage === "ACCUMULATION"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : a.stage === "PUMPING"
                          ? "bg-amber-500/10 text-amber-400"
                          : a.stage === "DISTRIBUTION"
                          ? "bg-rose-500/10 text-rose-400"
                          : "bg-slate-500/10 text-slate-400"
                      }`}
                    >
                      {a.stage === "ACCUMULATION"
                        ? "吸筹"
                        : a.stage === "PUMPING"
                        ? "拉升"
                        : a.stage === "DISTRIBUTION"
                        ? "出货"
                        : "观望"}
                    </span>
                    <span className="ml-2 text-slate-500">
                      {(a.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(a.created_at).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
