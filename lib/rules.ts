/**
 * Whale Stage Detection Engine
 * Pure functions, no side effects.
 */

import type { MarketSnapshot, StageSignal } from "./types";

/**
 * 使用最小二乘法计算序列斜率（相对值）
 * returns slope per period as ratio (e.g. 0.02 = +2%)
 */
function linearRegressionSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const base = values[values.length - 1] || 1;
  return slope / Math.abs(base);
}

function avg(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function delta(values: number[]): number {
  if (values.length < 2) return 0;
  return values[values.length - 1] - values[0];
}

export function detectStage(
  snapshots: MarketSnapshot[],
  liquidationWindow: number[] = []
): StageSignal {
  if (snapshots.length < 6) {
    return {
      stage: "UNKNOWN",
      confidence: 0,
      reasons: ["Insufficient data (need >= 6 snapshots)"],
      metadata: {},
    };
  }

  const prices = snapshots.map((s) => s.price);
  const ois = snapshots.map((s) => s.oi);
  const frs = snapshots.map((s) => s.fundingRate);
  const tlrs = snapshots.map((s) => s.topLongRatio);

  const priceSlope = linearRegressionSlope(prices);
  const oiSlope = linearRegressionSlope(ois);
  const frDeltaVal = delta(frs);
  const tlrSlope = linearRegressionSlope(tlrs);
  const currentFr = frs[frs.length - 1];
  const currentTlr = tlrs[tlrs.length - 1];

  // Liquidation spike detection
  let liqDelta = 0;
  if (liquidationWindow.length >= 2) {
    const recent = liquidationWindow.slice(-Math.ceil(liquidationWindow.length / 3));
    const past = liquidationWindow.slice(0, Math.floor((liquidationWindow.length * 2) / 3));
    liqDelta = avg(recent) / (avg(past) || 1);
  }

  const metadata = {
    priceSlope,
    oiSlope,
    frDelta: frDeltaVal,
    tlrSlope,
    currentFr,
    currentTlr,
    liqDelta,
  };

  const reasons: string[] = [];

  // --- Rule 2 first (highest conviction, prevents accumulation mislabel) ---
  const isPumping =
    oiSlope > 0.05 &&
    priceSlope > 0.005 && // 0.5% per snapshot window
    currentFr > 0.0003 && // 0.03%
    frDeltaVal > 0.0001 && // 0.01%
    tlrSlope > 0.0002 && // 0.02%
    currentTlr > 0.65;

  if (isPumping) {
    reasons.push(`Price slope +${(priceSlope * 100).toFixed(2)}%`);
    reasons.push(`OI acceleration +${(oiSlope * 100).toFixed(2)}%`);
    reasons.push(`Funding rate spiking to ${(currentFr * 100).toFixed(3)}%`);
    reasons.push(`Top long ratio rising to ${(currentTlr * 100).toFixed(1)}%`);
    let confidence = 0.75;
    if (liqDelta > 2) {
      confidence += 0.1;
      reasons.push("Liquidation spike confirms squeeze");
    }
    return { stage: "PUMPING", confidence: Math.min(0.95, confidence), reasons, metadata };
  }

  // --- Rule 3: Distribution / Dump ---
  const isDistributionA =
    priceSlope < 0.002 && // 滞涨
    oiSlope > 0.03 &&
    frDeltaVal < -0.0001 &&
    tlrSlope < -0.0001;

  const isDistributionB =
    priceSlope < -0.003 && // 下跌
    oiSlope < -0.02 &&
    frDeltaVal < -0.00005 &&
    tlrSlope < -0.0001;

  const isDistribution = (isDistributionA || isDistributionB) && tlrSlope < -0.0001;

  if (isDistribution) {
    reasons.push(
      isDistributionA
        ? "Price stalling while OI rises (rotation)"
        : "Price falling with OI declining (exit)"
    );
    reasons.push(`Funding rate cooling by ${(frDeltaVal * 100).toFixed(3)}%`);
    reasons.push(`Top long ratio declining by ${(tlrSlope * 100).toFixed(2)}%`);
    let confidence = 0.7;
    if (liqDelta > 2) {
      confidence += 0.15;
      reasons.push("High liquidations suggest final blow-off");
    }
    return { stage: "DISTRIBUTION", confidence: Math.min(0.92, confidence), reasons, metadata };
  }

  // --- Rule 1: Accumulation ---
  const isAccumulation =
    oiSlope > 0.02 &&
    priceSlope >= -0.003 &&
    priceSlope <= 0.003 &&
    currentFr < 0.0001 &&
    currentFr >= -0.00015 &&
    tlrSlope > 0.0001 &&
    currentTlr < 0.7;

  if (isAccumulation) {
    reasons.push(`OI quietly rising +${(oiSlope * 100).toFixed(2)}%`);
    reasons.push(`Price consolidating (${(priceSlope * 100).toFixed(2)}%)`);
    reasons.push(`Funding neutral at ${(currentFr * 100).toFixed(3)}%`);
    reasons.push(`Smart money longs creeping up to ${(currentTlr * 100).toFixed(1)}%`);
    return { stage: "ACCUMULATION", confidence: 0.65, reasons, metadata };
  }

  reasons.push("No clear stage signature detected");
  return { stage: "UNKNOWN", confidence: 0, reasons, metadata };
}
