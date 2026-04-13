"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, HistogramData } from "lightweight-charts";

export interface ChartDataPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi?: number;
  stage?: "ACCUMULATION" | "PUMPING" | "DISTRIBUTION" | "UNKNOWN";
}

export function ChartContainer({ data, height = 500 }: { data: ChartDataPoint[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Guard against React Strict Mode double-mount by clearing previous canvas
    containerRef.current.innerHTML = "";

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0b0f19" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: "#1f2937" },
      timeScale: { borderColor: "#1f2937", timeVisible: true },
      height,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderUpColor: "#10b981",
      borderDownColor: "#f43f5e",
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    });

    const volSeries = chart.addHistogramSeries({
      color: "#3b82f6",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volSeriesRef.current = volSeries;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      if (containerRef.current) containerRef.current.innerHTML = "";
      chartRef.current = null;
      candleSeriesRef.current = null;
      volSeriesRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    if (!candleSeriesRef.current || !volSeriesRef.current || data.length === 0) return;

    const candles: CandlestickData[] = data.map((d) => ({
      time: d.time as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const volumes: HistogramData[] = data.map((d) => ({
      time: d.time as any,
      value: d.volume,
      color: d.close >= d.open ? "rgba(16,185,129,0.5)" : "rgba(244,63,94,0.5)",
    }));

    candleSeriesRef.current.setData(candles);
    volSeriesRef.current.setData(volumes);

    // Add stage markers
    const markers = data
      .filter((d) => d.stage && d.stage !== "UNKNOWN")
      .map((d) => {
        const color =
          d.stage === "ACCUMULATION"
            ? "#10b981"
            : d.stage === "PUMPING"
            ? "#f59e0b"
            : "#f43f5e";
        const text =
          d.stage === "ACCUMULATION"
            ? "吸筹"
            : d.stage === "PUMPING"
            ? "拉升"
            : "出货";
        return {
          time: d.time as any,
          position: d.stage === "DISTRIBUTION" ? ("aboveBar" as const) : ("belowBar" as const),
          color,
          text,
          size: 1.5,
          shape: d.stage === "PUMPING" ? ("arrowUp" as const) : d.stage === "DISTRIBUTION" ? ("arrowDown" as const) : ("circle" as const),
        };
      });

    candleSeriesRef.current.setMarkers(markers);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return <div ref={containerRef} className="w-full rounded-xl border border-slate-800" />;
}
