-- Whale Sentinel Supabase Schema

-- 1. Watchlist: 用户自选币种
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  user_id UUID DEFAULT auth.uid(),
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(symbol, user_id)
);

-- 2. Market snapshots: 定时抓取的原始市场数据（用于回测与趋势展示）
CREATE TABLE IF NOT EXISTS market_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  price NUMERIC NOT NULL,
  oi NUMERIC NOT NULL,
  funding_rate NUMERIC NOT NULL,
  top_long_ratio NUMERIC NOT NULL,
  liquidation_vol NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_market_snapshots_symbol_time
  ON market_snapshots(symbol, timestamp DESC);

-- 3. Alerts: 触发的阶段预警记录
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('ACCUMULATION', 'PUMPING', 'DISTRIBUTION', 'UNKNOWN')),
  confidence NUMERIC NOT NULL,
  reasons JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_alerts_symbol ON alerts(symbol, created_at DESC);
CREATE INDEX idx_alerts_unack ON alerts(acknowledged) WHERE acknowledged = false;

-- 4. Backtests: 回测任务元数据
CREATE TABLE IF NOT EXISTS backtests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  interval TEXT NOT NULL DEFAULT '15m',
  total_signals INTEGER NOT NULL,
  wins INTEGER NOT NULL,
  losses INTEGER NOT NULL,
  win_rate NUMERIC NOT NULL,
  false_positive_rate NUMERIC NOT NULL,
  avg_return_24h NUMERIC,
  avg_return_48h NUMERIC,
  stage_breakdown JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Paper trades: 模拟交易记录
CREATE TABLE IF NOT EXISTS paper_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  stage TEXT NOT NULL,
  entry_price NUMERIC NOT NULL,
  entry_time TIMESTAMPTZ NOT NULL,
  alerted_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  exit_price NUMERIC,
  exit_time TIMESTAMPTZ,
  return_pct NUMERIC,
  holding_period_hours NUMERIC
);

CREATE INDEX idx_paper_trades_symbol ON paper_trades(symbol, status);

-- RLS policies (basic)
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY watchlist_user_isolation ON watchlist
  FOR ALL USING (auth.uid() = user_id);

-- Allow anon read for alerts/snapshots if you want a public demo
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY alerts_public_read ON alerts FOR SELECT USING (true);
CREATE POLICY alerts_public_insert ON alerts FOR INSERT WITH CHECK (true);

ALTER TABLE market_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY snapshots_public_read ON market_snapshots FOR SELECT USING (true);
CREATE POLICY snapshots_public_insert ON market_snapshots FOR INSERT WITH CHECK (true);

ALTER TABLE backtests ENABLE ROW LEVEL SECURITY;
CREATE POLICY backtests_public_all ON backtests FOR ALL USING (true);

ALTER TABLE paper_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY paper_trades_public_all ON paper_trades FOR ALL USING (true);
