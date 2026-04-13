# Whale Sentinel

币安 U 本位永续合约大户行为监控与三阶段预警系统。

## 功能特性

- **实时看板 (Dashboard)**: 监控多个交易对的实时价格、持仓量 (OI)、资金费率、大户多空比
- **三阶段智能预警**:
  - **ACCUMULATION (低位吸筹)**: OI 上升 + 价格横盘 + 资金费中性 + 大户多头比缓慢爬升
  - **PUMPING (拉升)**: OI 加速 + 价格斜率明显 + 资金费飙升 + 大户多头比 > 65%
  - **DISTRIBUTION (出货)**: 价格滞涨/下跌 + OI 增速放缓或下降 + 资金费转负 + 大户多头比回落
- **K 线详情页**: TradingView Lightweight Charts 绘制历史 K 线，并在关键时间点标记阶段信号
- **预警记录**: 自动写入 Supabase，支持查看最近 20 条预警
- **历史回测 (Backtest)**: Walk-forward 回测引擎，评估三阶段规则在过去 N 天内的胜率与收益率
- **模拟交易 (Paper Trading)**: 基于信号自动开仓，24h 后自动平仓并统计盈亏
- **定时同步 (Cron)**: Vercel Cron 每 5 分钟自动同步 watchlist 数据并触发高置信度预警

## 技术栈

- **框架**: Next.js 14 (App Router) + TypeScript
- **样式**: TailwindCSS
- **图表**: TradingView Lightweight Charts
- **数据库**: Supabase (PostgreSQL)
- **数据源**: Binance USDS-M Futures 官方公开 API
- **部署**: Vercel

## 项目结构

```
whale-sentinel/
├── app/
│   ├── api/
│   │   ├── alert/route.ts           # 预警记录 CRUD
│   │   ├── backtest/route.ts        # 历史回测接口
│   │   ├── cron/sync/route.ts       # 定时同步任务
│   │   ├── market-data/route.ts     # 实时市场数据聚合
│   │   ├── market-data/historical/route.ts  # 历史快照数据
│   │   ├── paper-trade/route.ts     # 模拟交易接口
│   │   └── symbols/route.ts         # 所有 USDT 永续合约列表
│   ├── symbol/[symbol]/page.tsx     # 详情页 (K线 + 阶段标记)
│   ├── page.tsx                     # Dashboard 主页
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ChartContainer.tsx           # TradingView 图表封装
│   ├── StageBadge.tsx               # 阶段徽章组件
│   └── WatchCard.tsx                # 看板卡片组件
├── lib/
│   ├── binance.ts                   # Binance API 客户端 (基于官方 skill)
│   ├── database.types.ts            # Supabase 类型定义
│   ├── rules.ts                     # 三阶段检测引擎 (纯函数)
│   ├── supabaseClient.ts            # Supabase 客户端
│   └── types.ts                     # 共享类型
├── services/
│   ├── backtestEngine.ts            # Walk-forward 回测引擎
│   └── paperTradeEngine.ts          # 模拟交易引擎
├── schema.sql                       # Supabase 建表 SQL
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json                      # Vercel Cron 配置
└── package.json
```

## 快速开始

### 1. 克隆并安装依赖

```bash
cd whale-sentinel
npm install
```

### 2. 配置环境变量

创建 `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=any-random-string-for-cron-auth
```

### 3. 初始化 Supabase 数据库

在 Supabase SQL Editor 中执行 `schema.sql` 的全部内容。

### 4. 本地开发

```bash
npm run dev
```

打开 http://localhost:3000

## 部署到 Vercel

### 1. 推送代码到 GitHub

```bash
git init
git add .
git commit -m "feat: whale sentinel - binance usds-m futures whale monitor"
git remote add origin https://github.com/<your-username>/whale-sentinel.git
git push -u origin main
```

### 2. Vercel 项目创建

- 登录 [Vercel](https://vercel.com)
- 导入 GitHub 仓库 `whale-sentinel`
- 在 Environment Variables 中填入上述 `.env.local` 的所有变量
- 部署

### 3. 配置 Vercel Cron

`vercel.json` 已包含每 5 分钟执行一次的 cron 任务。部署后会自动生效（Pro 及以上计划支持 cron）。

如果免费计划不支持 cron，你可以在本地或服务器上用 `curl` 手动触发：

```bash
curl "https://your-domain.vercel.app/api/cron/sync" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## 数据源与刷新频率

| 数据 | 来源 | 刷新频率 |
|------|------|---------|
| 价格 / OI / FundingRate | Binance `/fapi/v1/premiumIndex` | 前端每 20s 轮询 |
| 历史 OI | Binance `/futures/data/openInterestHist` | 用户访问详情页时拉取 |
| 大户多空比 | Binance `/futures/data/topLongShortAccountRatio` | 前端每 20s 轮询 |
| 历史 K线 | Binance `/fapi/v1/klines` | 用户访问详情页时拉取 |
| 爆仓数据 | Binance `/fapi/v1/allForceOrders` | 聚合到 6 个时间桶计算 |
| 定时同步 | Cron `/api/cron/sync` | 每 5 分钟 |

## API 端点说明

### GET /api/market-data?symbols=BTCUSDT,ETHUSDT
返回多个币种的实时聚合数据（含当前阶段与置信度）。

### GET /api/market-data/historical?symbol=BTCUSDT&interval=15m&limit=200
返回某个币种的历史对齐快照（用于回测与详情页图表）。

### GET /api/symbols
返回所有币安 USDT 永续合约列表。

### POST /api/backtest
执行回测并写入结果。

请求体示例：
```json
{
  "symbol": "BTCUSDT",
  "startTime": "2024-01-01",
  "endTime": "2024-02-01",
  "interval": "15m"
}
```

### GET /api/alert?limit=20
获取最近预警记录。

### GET /api/paper-trade?status=open
获取模拟交易记录。

## 三阶段检测规则

核心逻辑在 `lib/rules.ts` 中，采用纯函数实现，输入为 `MarketSnapshot[]`，输出 `StageSignal`。

关键阈值（默认）：
- **PUMPING**: OI 斜率 > 5%，价格斜率 > 0.5%，资金费率 > 0.03% 且增加，大户多头比 > 65% 且上升
- **DISTRIBUTION**: 价格滞涨/下跌 + OI 增速放缓或下降 + 资金费转负 + 大户多头比回落
- **ACCUMULATION**: OI 缓慢上升 + 价格横盘 (-0.3% ~ +0.3%) + 资金费中性 (-0.015% ~ 0.01%) + 大户多头比 < 70% 且缓慢上升

你可以根据实际表现调整 `lib/rules.ts` 中的阈值。

## 后续优化方向

1. **实盘信号推送**: 接入 Telegram Bot / Webhook / Email，高置信度信号实时推送
2. **机器学习增强**: 用历史数据训练 XGBoost / LSTM，优化阶段分类准确率
3. **多时间框架融合**: 同时评估 5m / 15m / 1h / 4h 信号，进行多周期确认
4. **风险评估模块**: 加入 ATR、波动率、杠杆清算热图，避免高波动假信号
5. **组合回测**: 同时跑多个币种，评估策略在组合层面的夏普比率与最大回撤

## License

MIT
