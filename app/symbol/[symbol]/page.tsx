"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChartContainer, type ChartDataPoint } from "@/components/ChartContainer";
import { StageBadge } from "@/components/StageBadge";
import { detectStage } from "@/lib/rules";
import type { WhaleStage } from "@/lib/types";

export default function SymbolPage() {
  const params = useParams();
  const symbol = (params.symbol as string).toUpperCase();

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [stage, setStage] = useState<WhaleStage>("UNKNOWN");
  const [confidence, setConfidence] = useState(0);
  const [reasons, setReasons] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<Record<string, number>>({});
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // Use our own API
        const res = await fetch(`/api/market-data?symbols=${symbol}`);
        const json = await res.json();
        const item = json.data?.[0];

        // Pull historical snapshots for chart
        const histRes = await fetch(
          `/api/market-data/historical?symbol=${symbol}&interval=15m&limit=200`
        );
        const histJson = await histRes.json();
        const snapshots = histJson.snapshots || [];
        const liquidationWindow = histJson.liquidationWindow || [];
        const signal = detectStage(snapshots, liquidationWindow);

        if (!mounted) return;

        // Prefer API stage if real-time, else historical signal
        setStage(item?.stage || signal.stage);
        setConfidence(item?.confidence || signal.confidence);
        setReasons(item?.reasons || signal.reasons);
        setMetadata(item?.metadata || signal.metadata);
        setPrice(item?.price ?? null);

        // Build chart points only if we have snapshots
        if (snapshots.length > 0) {
          const points: ChartDataPoint[] = snapshots.map((s: any, idx: number) => {
            const prev = snapshots[idx - 1];
            const slice = snapshots.slice(Math.max(0, idx - 5), idx + 1);
            const sig = detectStage(slice, liquidationWindow.slice(Math.max(0, idx - 5), idx + 1));
            const openPrice = prev?.price ?? s.price * 0.999;
            const highPrice = Math.max(prev?.price ?? s.price, s.price) * 1.002;
            const lowPrice = Math.min(prev?.price ?? s.price, s.price) * 0.998;
            return {
              time: Math.floor(s.timestamp / 1000) as any,
              open: openPrice,
              high: highPrice,
              low: lowPrice,
              close: s.price,
              volume: s.oi / 1000,
              oi: s.oi,
              stage: sig.stage,
            };
          });
          setChartData(points);
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [symbol]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/" className="text-sm text-sky-400 hover:underline">
          ← 返回 Dashboard
        </Link>

        <header className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{symbol}</h1>
            <p className="text-slate-400">历史走势与阶段标记</p>
          </div>
          <StageBadge stage={stage} confidence={confidence} />
        </header>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          {loading ? (
            <div className="flex h-96 items-center justify-center text-slate-500">
              加载图表数据...
            </div>
          ) : (
            <ChartContainer data={chartData} height={480} />
          )}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <MetricCard label="Price" value={price != null ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 4 })}` : '-'} />
          <MetricCard label="OI Slope" value={typeof metadata.oiSlope === 'number' ? `${(metadata.oiSlope * 100).toFixed(2)}%` : '-'} />
          <MetricCard label="Funding Δ" value={typeof metadata.frDelta === 'number' ? `${(metadata.frDelta * 100).toFixed(4)}%` : '-'} />
          <MetricCard label="Top Long Δ" value={typeof metadata.tlrSlope === 'number' ? `${(metadata.tlrSlope * 100).toFixed(2)}%` : '-'} />
        </section>

        {reasons.length > 0 && (
          <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="mb-3 text-lg font-semibold">当前信号说明</h2>
            <ul className="list-disc space-y-1 pl-5 text-slate-300">
              {reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-100">{value}</div>
    </div>
  );
}
