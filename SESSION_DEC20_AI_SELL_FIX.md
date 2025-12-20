# Session Notes - December 20, 2025

## Summary
Analyzed AI trading behavior from Dec 11-20 and fixed the core issue: AIs were only making 1 SELL out of 110 trades (0.9%).

## Key Findings

### Trading Analysis (Dec 11-20)
- **110 total trades** over 6 trading days
- **105 BUY** (95.5%)
- **4 HOLD** (3.6%)
- **1 SELL** (0.9%) - only FOMO Master sold once
- AIs performing well: YOLO Kid +33%, Diamond Hands +13%
- Admin page matches main site perfectly ✅

### Root Cause: Why No Selling?
1. `portfolio_value_before` always showed $1,000,000 (stale `total_tokens` value)
2. No gain/loss % shown in portfolio summary
3. No strategy-specific SELL triggers
4. Only 24h price change visible, not position P&L

## Fixes Implemented

### AI Trading Logic (`/src/app/api/admin/ai-trading/trigger/route.ts`)

1. **Added `getSellTriggers()` function** - Strategy-specific sell guidance:
   - MOMENTUM: "SELL IMMEDIATELY if position drops 3%+"
   - PERFECT_TIMING: "SELL at peaks! Position up 8%+? Lock profits"
   - CONTRARIAN: "SELL when everyone is buying! Stock rises 10%+? Take profits"
   - YOLO_MEME: "If meme magic is fading and position is down 20%+, cut losses"
   - LONG_TERM: "SELL if fundamentals change or position is up 50%+"
   - NEWS_DRIVEN: "SELL on news reversals or position down 15%"
   - TECHNICAL: "SELL at resistance! Position up 10%+? Book profits"
   - FOMO_CHASER: "SELL when hype dies! Position flat for 2 weeks? Dump it"
   - DIAMOND_HANDS: "Consider SELL only if position down 40%+"
   - SAFETY_FIRST: "SELL immediately if position down 5%+"

2. **Calculate actual portfolio value** from live stock prices instead of stale $1M

3. **Show gain/loss % for each position**:
   - `📈 AAPL: 100 shares @ $195.50 = $19,550.00 (📈 +15.5% gain)`
   - `📉 META: 50 shares @ $450.00 = $22,500.00 (📉 -8.2% loss)`

4. **Added `sellOpportunities` section** identifying positions with >10% gain or loss

5. **Updated prompt** with overall performance and sell candidates

6. **Fixed logging** to record actual portfolio value instead of stale $1M

### AI Portfolio Reset
- Created `RESET_AI_DEC20.sql` to reset all 10 AIs to $1M cash, 0 holdings
- Human investor untouched
- Trading logs cleared for clean slate

## Commits
- `a9ef3b3` - Fix AI trading to show actual P&L and encourage selling

## Test Checklist for Next Trading Day (Mon Dec 23)

### After 9:30 AM EST CRON:
- [ ] Check admin page - all AIs should have made trades
- [ ] Look for SELL decisions in trading logs
- [ ] Verify `portfolio_value_before` shows actual value (not $1M)
- [ ] Check if AIs with positions show gain/loss reasoning

### SQL to check trading behavior:
```sql
SELECT 
  display_name,
  action,
  stock_symbol,
  reasoning,
  portfolio_value_before,
  created_at
FROM ai_trading_logs
WHERE created_at >= '2025-12-23'
ORDER BY created_at DESC;
```

### Expected Changes:
- More varied actions (not 95%+ BUY)
- Reasoning should mention position P&L
- `portfolio_value_before` should vary by AI
- Strategy-specific sell logic should trigger

## Files Modified
- `/src/app/api/admin/ai-trading/trigger/route.ts` - Main AI trading logic
- `/workspaces/rize/RESET_AI_DEC20.sql` - AI reset script (created)
