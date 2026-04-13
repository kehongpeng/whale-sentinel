"use client";

import Link from "next/link";
import { StageBadge } from "./StageBadge";

export interface WatchCardProps {
  symbol: string;
  price: number;
  oi: number;
  fundingRate: number;
  topLongRatio: number;
  stage: import("@/lib/types").WhaleStage;
  confidence: number;
  reasons: string[];
}

export function WatchCard(props: WatchCardProps) {
  const frPct = (props.fundingRate * 100).toFixed(4);
  const tlrPct = (props.topLongRatio * 100).toFixed(1);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur transition hover:border-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/symbol/${props.symbol}`}
            className="text-lg font-semibold text-slate-100 hover:text-sky-400"
          >
            {props.symbol}
          </Link>
          <div className="mt-1 text-2xl font-bold text-slate-100">
            ${props.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          </div>
        </div>
        <StageBadge stage={props.stage} confidence={props.confidence} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl bg-slate-950/60 p-3">
          <div className="text-slate-400">OI</div>
          <div className="font-medium text-slate-200">
            {(props.oi / 1e6).toFixed(2)}M
          </div>
        </div>
        <div className="rounded-xl bg-slate-950/60 p-3">
          <div className="text-slate-400">资金费率</div>
          <div className={`font-medium ${props.fundingRate > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {frPct}%
          </div>
        </div>
        <div className="rounded-xl bg-slate-950/60 p-3">
          <div className="text-slate-400">大户多头比</div>
          <div className="font-medium text-slate-200">{tlrPct}%</div>
        </div>
      </div>

      {props.reasons.length > 0 && (
        <div className="mt-3 space-y-1">
          {props.reasons.slice(0, 3).map((r, i) => (
            <div key={i} className="text-xs text-slate-400">
              • {r}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
