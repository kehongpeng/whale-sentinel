/**
 * Minimal Supabase Database Types for Whale Sentinel
 * Generate full types with: npx supabase gen types typescript --project-id <id> --schema public
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      watchlist: {
        Row: {
          id?: string;
          symbol: string;
          added_at?: string;
          stage?: string;
          confidence?: number;
          price?: number;
          oi?: number;
          funding_rate?: number;
          top_long_ratio?: number;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          added_at?: string;
          stage?: string;
          confidence?: number;
          price?: number;
          oi?: number;
          funding_rate?: number;
          top_long_ratio?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          symbol?: string;
          added_at?: string;
          stage?: string;
          confidence?: number;
          price?: number;
          oi?: number;
          funding_rate?: number;
          top_long_ratio?: number;
          updated_at?: string;
        };
      };
      market_snapshots: {
        Row: {
          id?: string;
          symbol: string;
          timestamp: string;
          price: number;
          oi: number;
          funding_rate: number;
          top_long_ratio: number;
          liquidation_vol?: number;
          created_at?: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          timestamp: string;
          price: number;
          oi: number;
          funding_rate: number;
          top_long_ratio: number;
          liquidation_vol?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          symbol?: string;
          timestamp?: string;
          price?: number;
          oi?: number;
          funding_rate?: number;
          top_long_ratio?: number;
          liquidation_vol?: number;
          created_at?: string;
        };
      };
      alerts: {
        Row: {
          id?: string;
          symbol: string;
          stage: string;
          confidence: number;
          reasons: string[];
          metadata: Json;
          created_at?: string;
          acknowledged?: boolean;
        };
        Insert: {
          id?: string;
          symbol: string;
          stage: string;
          confidence: number;
          reasons: string[];
          metadata: Json;
          created_at?: string;
          acknowledged?: boolean;
        };
        Update: {
          id?: string;
          symbol?: string;
          stage?: string;
          confidence?: number;
          reasons?: string[];
          metadata?: Json;
          created_at?: string;
          acknowledged?: boolean;
        };
      };
      backtests: {
        Row: {
          id?: string;
          symbol: string;
          start_time: string;
          end_time: string;
          interval: string;
          total_signals: number;
          wins: number;
          losses: number;
          win_rate: number;
          false_positive_rate: number;
          avg_return_after_24h: number;
          avg_return_after_48h: number;
          stage_breakdown: Json;
          created_at?: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          start_time: string;
          end_time: string;
          interval: string;
          total_signals: number;
          wins: number;
          losses: number;
          win_rate: number;
          false_positive_rate: number;
          avg_return_after_24h: number;
          avg_return_after_48h: number;
          stage_breakdown: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          symbol?: string;
          start_time?: string;
          end_time?: string;
          interval?: string;
          total_signals?: number;
          wins?: number;
          losses?: number;
          win_rate?: number;
          false_positive_rate?: number;
          avg_return_after_24h?: number;
          avg_return_after_48h?: number;
          stage_breakdown?: Json;
          created_at?: string;
        };
      };
      paper_trades: {
        Row: {
          id?: string;
          symbol: string;
          stage: string;
          entry_price: number;
          entry_time: string;
          alerted_at: string;
          status: string;
          exit_price?: number;
          exit_time?: string;
          return_pct?: number;
          holding_period_hours?: number;
        };
        Insert: {
          id?: string;
          symbol: string;
          stage: string;
          entry_price: number;
          entry_time: string;
          alerted_at: string;
          status: string;
          exit_price?: number;
          exit_time?: string;
          return_pct?: number;
          holding_period_hours?: number;
        };
        Update: {
          id?: string;
          symbol?: string;
          stage?: string;
          entry_price?: number;
          entry_time?: string;
          alerted_at?: string;
          status?: string;
          exit_price?: number;
          exit_time?: string;
          return_pct?: number;
          holding_period_hours?: number;
        };
      };
    };
  };
}
