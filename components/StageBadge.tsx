"use client";

import type { WhaleStage } from "@/lib/types";

const STAGE_META: Record<
  WhaleStage,
  { label: string; bg: string; text: string; ring: string }
> = {
  ACCUMULATION: {
    label: "低位吸筹",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    ring: "ring-emerald-500/30",
  },
  PUMPING: {
    label: "拉升中",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    ring: "ring-amber-500/30",
  },
  DISTRIBUTION: {
    label: "高位出货",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    ring: "ring-rose-500/30",
  },
  UNKNOWN: {
    label: "观望",
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    ring: "ring-slate-500/30",
  },
};

export function StageBadge({
  stage,
  confidence,
}: {
  stage: WhaleStage;
  confidence?: number;
}) {
  const meta = STAGE_META[stage];
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ring-1",
        meta.bg,
        meta.text,
        meta.ring,
      ].join(" ")}
    >
      <span className="relative flex h-2 w-2">
        {stage !== "UNKNOWN" && (
          <span
            className={[
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              meta.bg.replace("/10", ""),
            ].join(" ")}
          />
        )}
        <span
          className={[
            "relative inline-flex h-2 w-2 rounded-full",
            meta.bg.replace("/10", ""),
          ].join(" ")}
        />
      </span>
      {meta.label}
      {typeof confidence === "number" && (
        <span className="opacity-80">({(confidence * 100).toFixed(0)}%)</span>
      )}
    </span>
  );
}
