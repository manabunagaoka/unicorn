# RIZE System Schedules & Data Flow Verification

## 1. STOCK PRICES (Finnhub Real-Time Data)

### Source: Finnhub API
- **API Endpoint**: `/api/stock/[ticker]`
- **Data Source**: `https://finnhub.io/api/v1/quote?symbol={ticker}`
- **Caching**: 5 minutes (300 seconds) via Next.js `revalidate: 300`
- **Stocks Tracked**:
  - META (Meta Platforms, Inc.) - pitch_id: 1
  - MSFT (Microsoft Corporation) - pitch_id: 2
  - DBX (Dropbox, Inc.) - pitch_id: 3
  - AKAM (Akamai Technologies, Inc.) - pitch_id: 4
  - RDDT (Reddit, Inc.) - pitch_id: 5
  - WRBY (Warby Parker Inc.) - pitch_id: 6
  - BKNG (Booking Holdings Inc.) - pitch_id: 7

### Update Schedule:
- **Real-time on demand**: When any component calls `/api/stock/{ticker}`
- **Max staleness**: 5 minutes due to caching
- **Used by**:
  - PitchCard components (individual stock cards)
  - Leaderboard calculations
  - Trading modals

---

## 2. PRICE SYNC TO DATABASE

### Endpoint: `/api/sync-prices` (POST)
- **Cron Schedule**: `0 0 * * *` = **Every day at midnight UTC**
- **What it does**:
  1. Fetches current price for all 7 stocks from Finnhub
  2. Updates `pitch_market_data.current_price` for each stock
  3. Calls `award_investor_tiers()` to recalculate top 3 badges
- **Authentication**: Requires `CRON_SECRET` header
- **Manual trigger**: Can be called via curl with authorization

### Process Flow:
```
Midnight UTC
  ↓
Fetch prices from Finnhub → /api/stock/{ticker}
  ↓
Update pitch_market_data table
  ↓
Recalculate investor tiers (TITAN, ORACLE, ALCHEMIST)
  ↓
Return success with updated prices
```

---

## 3. AI TRADING EXECUTION

### Endpoint: `/api/ai-trading/execute` (POST)
- **Cron Schedule**: `0 2 * * *` = **Every day at 2:00 AM UTC**
- **What it does**:
  1. Fetches all 10 AI investors
  2. Gets current portfolio and market data for each
  3. Calls GPT-4 to make trading decisions based on AI personality
  4. Executes BUY/SELL/HOLD actions via `/api/invest` and `/api/sell`
- **Authentication**: Requires `CRON_SECRET` header
- **Manual trigger**: Can be called via curl with authorization

### AI Investors & Personalities:
1. **The Boomer** - Conservative, blue-chip stocks
2. **Hype Train** - Trends and momentum
3. **Diamond Hands** - Buy and hold forever
4. **Cloud Surfer** - Tech infrastructure focus
5. **Silicon Brain** - AI/ML company focus
6. **FOMO Master** - Panic buy/sell, emotional
7. **The Contrarian** - Goes against the crowd
8. **YOLO Kid** - High risk, high reward
9. **Steady Eddie** - Balanced, diversified
10. **The Oracle** - Data-driven, analytical

### GPT-4 Decision Parameters:
- Portfolio allocation suggestions
- Risk tolerance levels
- Market context (prices, trends, news sentiment)
- Personality-specific strategies
- Available balance and current holdings

---

## 4. LEADERBOARD RANKINGS

### Endpoint: `/api/leaderboard` (GET)
- **Update Frequency**: On-demand (no cron)
- **Cache Control**: `no-store, no-cache, must-revalidate` headers
- **Used by**: Compete page
- **Frontend Refresh**: Only on page load (no auto-refresh)

### Calculation Method:
```javascript
portfolio_value = available_tokens + SUM(shares_owned × current_price)

// For each investor:
holdings_value = SUM over all investments {
  shares_owned × pitch_market_data.current_price
}

total_portfolio = cash + holdings_value
```

### Ranking Logic:
1. Sort all investors by `total_portfolio` DESC
2. Ties broken by `created_at` ASC (older accounts rank higher)
3. Assign ranks 1, 2, 3, ...
4. Filter by investor type (all/students/AI)

### Data Sources:
- `user_token_balances.available_tokens` (cash)
- `user_investments.shares_owned` (holdings)
- `pitch_market_data.current_price` (stock prices)

**IMPORTANT**: Leaderboard calculates values in real-time from these tables. It does NOT use cached `user_investments.current_value` column.

---

## 5. TRENDING STOCKS CHART

### Endpoint: `/api/trending-stocks` (GET)
- **Update Frequency**: On-demand (no cron)
- **Frontend Auto-Refresh**: **Every 60 seconds** via `setInterval(60000)`
- **Used by**: Home page TrendingStocks component

### Data Calculation:
```sql
-- Aggregates trades from last 7 days
SELECT 
  pitch_id,
  SUM(shares) WHERE transaction_type = 'BUY' as buyVolume,
  SUM(shares) WHERE transaction_type = 'SELL' as sellVolume,
  SUM(shares) as totalVolume,
  COUNT(*) as tradeCount,
  MAX(price_per_share) as lastPrice
FROM investment_transactions
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY pitch_id
ORDER BY totalVolume DESC
```

### Display Format:
- All 7 stocks (not just top 5 anymore)
- Visual bar charts showing buy vs sell pressure
- Trade counts and volumes
- Last updated timestamp with "Updated Xs ago" indicator

---

## 6. TIER BADGE ASSIGNMENT

### Function: `award_investor_tiers()` (Supabase SQL function)
- **Trigger**: Called by `/api/sync-prices` after price updates
- **Schedule**: Daily at midnight UTC (with price sync)
- **Manual trigger**: Can be called directly in Supabase SQL editor

### Logic:
```sql
1. Calculate real-time portfolio values for all investors
2. Rank by portfolio_value DESC
3. Assign:
   - Rank 1 → TITAN
   - Rank 2 → ORACLE
   - Rank 3 → ALCHEMIST
4. Clear badges from everyone else
```

### Important Note:
Badges are **persistent** in `user_token_balances.investor_tier` column. They don't auto-update when rankings change due to trades. Only update when sync-prices runs.

---

## 7. DATA FLOW SUMMARY

### Real-Time Updates (< 5 min):
✅ Stock prices (Finnhub via 5-min cache)
✅ Trending stocks chart (60-second auto-refresh on frontend)
✅ User trades (immediate via invest/sell APIs)

### Near Real-Time (on page load):
✅ Leaderboard rankings (calculated fresh on each request)
✅ Portfolio values (calculated from current prices + holdings)

### Daily Batch Updates:
🕛 **Midnight UTC**: Price sync → Database update → Tier recalculation
🕑 **2 AM UTC**: AI trading → 10 AI investors make trades

---

## 8. VERIFICATION CHECKLIST

### To verify all numbers are correct:

**A. Stock Prices:**
```bash
# Check Finnhub live price
curl "https://finnhub.io/api/v1/quote?symbol=META&token=YOUR_KEY"

# Check our cached price
curl "https://unicorn-six-pi.vercel.app/api/stock/META"

# Check database price
SELECT pitch_id, current_price, updated_at 
FROM pitch_market_data 
ORDER BY pitch_id;
```

**B. Portfolio Values:**
```bash
# Check leaderboard calculation
curl "https://unicorn-six-pi.vercel.app/api/leaderboard" | jq '.leaderboard[0:5]'

# Verify in database
SELECT 
  utb.username,
  utb.available_tokens as cash,
  COALESCE(SUM(ui.shares_owned * pmd.current_price), 0) as holdings,
  utb.available_tokens + COALESCE(SUM(ui.shares_owned * pmd.current_price), 0) as total
FROM user_token_balances utb
LEFT JOIN user_investments ui ON utb.user_id = ui.user_id
LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
GROUP BY utb.user_id
ORDER BY total DESC
LIMIT 5;
```

**C. Trending Stocks:**
```bash
# Check API response
curl "https://unicorn-six-pi.vercel.app/api/trending-stocks"

# Verify trade volume in database
SELECT 
  pitch_id,
  transaction_type,
  SUM(shares) as total_shares,
  COUNT(*) as trade_count
FROM investment_transactions
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY pitch_id, transaction_type
ORDER BY pitch_id, transaction_type;
```

**D. Tier Badges:**
```sql
-- Check tier assignments
SELECT username, investor_tier, available_tokens
FROM user_token_balances
WHERE investor_tier IS NOT NULL
ORDER BY investor_tier;

-- Manually recalculate to verify
-- See /supabase/manual_tier_fix.sql
```

---

## 9. CURRENT ISSUES & NOTES

### Fixed:
✅ Supabase caching bug - now using fresh `createClient()` connections
✅ AI investor unrealistic gains - adjusted share counts to fair market prices
✅ Tier badges misaligned - manually recalculated based on adjusted portfolios
✅ Portfolio showing stale data - added query ordering to force cache refresh

### Known Limitations:
⚠️ Leaderboard doesn't auto-refresh on frontend (only on page load)
⚠️ Tier badges only update daily at midnight, not immediately when rankings change
⚠️ Trending stocks only shows last 7 days (could show real-time today's trades)
⚠️ Stock prices have 5-minute cache delay from Finnhub

### Recommendations:
💡 Add auto-refresh to leaderboard (every 60 seconds like trending stocks)
💡 Trigger tier recalculation after any trade (not just daily)
💡 Add "Last Updated" timestamp to leaderboard
💡 Show real-time trade feed (last 10 trades across all users)
