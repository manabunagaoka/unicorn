# HNP7 Deployment Checklist
## Step-by-Step Execution Guide

**Status:** Ready for Implementation  
**Estimated Time:** 4-5 hours total  
**Risk Level:** Low (comprehensive testing plan, rollback ready)  
**Next AI Cron:** November 18, 2025 at 9:30am EST (14:30 UTC)

---

## ✅ PRE-DEPLOYMENT CHECKS

### [ ] 1. Verify Current System is Stable
```sql
-- Check recent AI trading cron runs
SELECT execution_timestamp, triggered_by, ai_nickname, decision_action
FROM ai_trading_logs
WHERE triggered_by = 'cron'
ORDER BY execution_timestamp DESC
LIMIT 20;
```
**Expected:** Recent successful cron runs with no errors

### [ ] 2. Confirm Backup Access
- [ ] Can access Supabase dashboard
- [ ] Can rollback changes if needed
- [ ] Have copy of rollback script ready

### [ ] 3. Review Documentation
- [ ] Read `/workspaces/rize/HNP7_IMPLEMENTATION_GUIDE.md`
- [ ] Skim `/workspaces/rize/HNP7_QUICK_REFERENCE.md`
- [ ] Have `/workspaces/rize/SESSION_NOV18_HNP7_RESEARCH_COMPLETE.md` open

---

## 📦 PHASE 1: DATABASE MIGRATION (30 mins)

### [ ] Step 1.1: Test Schema Migration (Dry Run)
```sql
-- Run in transaction to test without committing
BEGIN;

-- Copy and paste contents of:
-- /workspaces/rize/supabase/multi_index_schema_migration.sql

-- If no errors, check results
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'ai_readable_pitches'
AND column_name IN ('index_code', 'price_type');

-- DON'T COMMIT YET
ROLLBACK;
```
**Expected:** Columns show up, no errors

### [ ] Step 1.2: Execute Schema Migration (For Real)
```sql
-- Now run for real
-- Execute: /workspaces/rize/supabase/multi_index_schema_migration.sql
```
**Checkpoint:** Run verification queries at end of script

### [ ] Step 1.3: Verify Existing HM7 Data Intact
```sql
-- Ensure existing companies still work
SELECT ticker, company_name, index_code, price_type
FROM ai_readable_pitches
WHERE ticker IN ('MSFT', 'DBX', 'AKAM')
ORDER BY ticker;
```
**Expected:** All show `index_code='HM7'`, `price_type='real_stock'`

### [ ] Step 1.4: Check No Ticker Conflicts
```sql
-- Verify HNP7 tickers don't exist yet
SELECT ticker FROM ai_readable_pitches 
WHERE ticker IN ('PHL', 'HLTH', 'HSCA', 'PBHA', 'HSHS', 'R13', 'HFLP');
```
**Expected:** 0 rows (no conflicts)

### [ ] Step 1.5: Insert HNP7 Data
```sql
-- Execute: /workspaces/rize/research/HNP7_DATABASE_INSERT.sql
```

### [ ] Step 1.6: Verify HNP7 Insertion
```sql
-- Check all 7 entries
SELECT ticker, company_name, category, index_code, price_type
FROM ai_readable_pitches
WHERE index_code = 'HNP7'
ORDER BY ticker;
```
**Expected:** 7 rows with correct data

### [ ] Step 1.7: Verify Simulated Prices Created
```sql
-- Check initial prices
SELECT ticker, current_price, price_type
FROM pitch_market_data
WHERE price_type = 'simulated'
ORDER BY ticker;
```
**Expected:** 7 rows, all at $100.00

### [ ] Step 1.8: Test Pricing Functions
```sql
-- Test price calculation
SELECT calculate_simulated_price('HLTH') as test_price;
```
**Expected:** Returns a number between $97-$103 (with volatility)

**✅ PHASE 1 COMPLETE: Database ready for AI trading**

---

## 🤖 PHASE 2: AI TRADING INTEGRATION (1 hour)

### [ ] Step 2.1: Locate AI Trading Trigger File
```bash
# Open file
code /workspaces/rize/src/app/api/admin/ai-trading/trigger/route.ts
```

### [ ] Step 2.2: Add Simulated Price Update
Find the section AFTER all trades are executed, add:

```typescript
// Update simulated prices based on trading activity
console.log('Updating simulated prices for HNP7...');
const { data: priceUpdates, error: priceError } = await supabase
  .rpc('update_simulated_prices');

if (priceError) {
  console.error('Error updating simulated prices:', priceError);
} else {
  console.log('Simulated price updates:', priceUpdates);
}
```

### [ ] Step 2.3: Add Volume Tracking (Optional for v1)
When executing trades on simulated companies:

```typescript
// After successful trade execution
if (selectedPitch.price_type === 'simulated') {
  // Track order for market pricing
  await supabase.from('simulated_market_orders').insert({
    ticker: selectedPitch.ticker,
    user_id: aiInvestor.user_id,
    order_type: decision.action, // 'buy' or 'sell'
    shares: decision.shares,
    price_at_execution: currentPrice
  });
  
  // Update market volume aggregates
  const volumeChange = decision.action === 'buy' 
    ? { total_buy_volume: selectedPitch.total_buy_volume + decision.shares }
    : { total_sell_volume: selectedPitch.total_sell_volume + decision.shares };
    
  await supabase
    .from('pitch_market_data')
    .update(volumeChange)
    .eq('ticker', selectedPitch.ticker);
}
```

### [ ] Step 2.4: Verify No Syntax Errors
```bash
# Check TypeScript compilation
cd /workspaces/rize
npm run build
```
**Expected:** No compilation errors

### [ ] Step 2.5: Deploy to Vercel
```bash
git add .
git commit -m "Add HNP7 multi-index support with simulated pricing"
git push origin main
```
**Expected:** Vercel auto-deploys successfully

**✅ PHASE 2 COMPLETE: AI trading code updated**

---

## 🧪 PHASE 3: TESTING (1 hour)

### [ ] Step 3.1: Manual Trigger Test
```bash
# Trigger AI trading manually
curl -X POST https://your-app.vercel.app/api/admin/ai-trading/trigger \
  -H "Content-Type: application/json" \
  -d '{"source": "manual"}'
```
**Expected:** Returns success, takes 30-45 seconds

### [ ] Step 3.2: Check Trade Logs
```sql
-- Verify trades happened on both HM7 and HNP7
SELECT 
  atl.ai_nickname,
  arp.ticker,
  arp.company_name,
  arp.index_code,
  atl.decision_action,
  atl.decision_shares
FROM ai_trading_logs atl
JOIN ai_readable_pitches arp ON atl.decision_pitch_id = arp.pitch_id
WHERE atl.triggered_by = 'manual'
AND atl.execution_timestamp > NOW() - INTERVAL '10 minutes'
ORDER BY atl.execution_timestamp DESC;
```
**Expected:** Mix of HM7 and HNP7 trades (if AIs interested in non-profits)

### [ ] Step 3.3: Verify Simulated Prices Changed
```sql
-- Check if prices moved
SELECT 
  ticker, 
  company_name, 
  current_price,
  total_buy_volume,
  total_sell_volume
FROM pitch_market_data pmd
JOIN ai_readable_pitches arp ON pmd.ticker = arp.ticker
WHERE arp.price_type = 'simulated'
ORDER BY ticker;
```
**Expected:** Prices slightly different from $100.00 (if any HNP7 trades happened)

### [ ] Step 3.4: Check Persona Compliance
```sql
-- Ensure AIs still follow their strategies
SELECT 
  ai.ai_nickname,
  ai.ai_strategy,
  arp.category,
  COUNT(*) as trades
FROM ai_trading_logs atl
JOIN ai_investors ai ON atl.ai_nickname = ai.ai_nickname
JOIN ai_readable_pitches arp ON atl.decision_pitch_id = arp.pitch_id
WHERE atl.triggered_by = 'manual'
AND atl.execution_timestamp > NOW() - INTERVAL '10 minutes'
GROUP BY ai.ai_nickname, ai.ai_strategy, arp.category
ORDER BY ai.ai_nickname;
```
**Expected:** Cloud Surfer only bought Enterprise/B2B, etc.

### [ ] Step 3.5: Verify Portfolio Values Updated
```sql
-- Check leaderboard still works
SELECT 
  ai_nickname,
  available_tokens as cash,
  portfolio_value,
  available_tokens + portfolio_value as total_value
FROM user_token_balances
WHERE is_ai_investor = true
ORDER BY total_value DESC;
```
**Expected:** Values look reasonable, no nulls or errors

### [ ] Step 3.6: Test Frontend Leaderboard
```
Visit: https://your-app.vercel.app/compete
```
**Expected:** Leaderboard shows updated portfolios, no errors

### [ ] Step 3.7: Check for Any Errors
```sql
-- Look for error messages in logs
SELECT execution_timestamp, ai_nickname, decision_reasoning
FROM ai_trading_logs
WHERE triggered_by = 'manual'
AND execution_timestamp > NOW() - INTERVAL '10 minutes'
AND (decision_reasoning LIKE '%error%' OR decision_reasoning LIKE '%fail%')
ORDER BY execution_timestamp DESC;
```
**Expected:** 0 rows (no errors)

**✅ PHASE 3 COMPLETE: System tested and working**

---

## 📊 PHASE 4: PRODUCTION MONITORING (Ongoing)

### [ ] Step 4.1: Monitor Next Cron Run
**Time:** November 18, 2025 at 9:30am EST (14:30 UTC)

```sql
-- Wait for cron to run, then check:
SELECT execution_timestamp, ai_nickname, decision_action
FROM ai_trading_logs
WHERE triggered_by = 'cron'
AND execution_timestamp > '2025-11-18 14:20:00+00'
ORDER BY execution_timestamp DESC
LIMIT 20;
```
**Expected:** 9-10 successful trades

### [ ] Step 4.2: Check HNP7 Trading Activity
```sql
-- Did any AIs trade HNP7?
SELECT 
  arp.index_code,
  COUNT(*) as trades,
  COUNT(DISTINCT atl.ai_nickname) as unique_ais
FROM ai_trading_logs atl
JOIN ai_readable_pitches arp ON atl.decision_pitch_id = arp.pitch_id
WHERE atl.triggered_by = 'cron'
AND atl.execution_timestamp > '2025-11-18 14:20:00+00'
GROUP BY arp.index_code;
```
**Success:** At least 1 HNP7 trade  
**Warning:** 0 HNP7 trades → Need to adjust AI personas

### [ ] Step 4.3: Track Simulated Price Movements
```sql
-- Monitor price changes over first week
SELECT 
  ticker,
  company_name,
  current_price,
  total_buy_volume,
  total_sell_volume,
  unique_investors
FROM pitch_market_data pmd
JOIN ai_readable_pitches arp ON pmd.ticker = arp.ticker
WHERE arp.price_type = 'simulated'
ORDER BY current_price DESC;
```
**Expected:** Prices in $80-$120 range (reasonable volatility)

### [ ] Step 4.4: Identify Popular Non-Profits
```sql
-- Which HNP7 companies are most traded?
SELECT 
  arp.ticker,
  arp.company_name,
  COUNT(*) as total_trades,
  COUNT(DISTINCT atl.ai_nickname) as unique_ai_investors,
  pmd.current_price
FROM ai_trading_logs atl
JOIN ai_readable_pitches arp ON atl.decision_pitch_id = arp.pitch_id
JOIN pitch_market_data pmd ON arp.ticker = pmd.ticker
WHERE arp.index_code = 'HNP7'
GROUP BY arp.ticker, arp.company_name, pmd.current_price
ORDER BY total_trades DESC;
```
**Insight:** Shows which non-profits resonate with AI investors

### [ ] Step 4.5: Check for Timeout Issues
```bash
# Check Vercel logs
vercel logs --follow
```
**Expected:** Execution time < 55 seconds (within 60s limit)

**✅ PHASE 4 COMPLETE: Monitoring established**

---

## 🚨 TROUBLESHOOTING GUIDE

### Issue: AIs Not Trading HNP7
**Symptoms:** Zero HNP7 trades after multiple cron runs

**Diagnosis:**
```sql
-- Check AI decision reasoning
SELECT ai_nickname, decision_reasoning
FROM ai_trading_logs
WHERE triggered_by = 'cron'
ORDER BY execution_timestamp DESC
LIMIT 10;
```

**Fixes:**
1. Check AI prompts include social impact category
2. Add "social impact" bias to some personas
3. Adjust category mapping (HLTH → "Healthcare/B2B"?)
4. Verify `ai_readable_pitches` data looks correct

---

### Issue: Simulated Prices Unrealistic
**Symptoms:** Prices hit $1000 or $10 bounds repeatedly

**Diagnosis:**
```sql
-- Check price ratios
SELECT ticker, current_price, base_price,
       current_price / base_price as ratio
FROM pitch_market_data
WHERE price_type = 'simulated';
```

**Fixes:**
1. Reduce volatility in `calculate_simulated_price()`
2. Adjust demand factor bounds (0.8-1.2 instead of 0.7-1.3)
3. Add price smoothing (weighted average)
4. Set tighter bounds ($25-$500)

---

### Issue: Cron Timeout
**Symptoms:** 25-second timeout, incomplete trades

**Diagnosis:**
```bash
# Check Vercel logs for timeout
vercel logs | grep timeout
```

**Fixes:**
1. Verify `runtime: 'nodejs'` in route.ts
2. Verify `maxDuration: 60` in vercel.json
3. Batch GPT API calls if needed
4. Split cron into 2 runs (HM7 first, then HNP7)

---

### Issue: Database Constraint Violation
**Symptoms:** Foreign key errors, duplicate tickers

**Diagnosis:**
```sql
-- Check for duplicates
SELECT ticker, COUNT(*) 
FROM ai_readable_pitches 
GROUP BY ticker 
HAVING COUNT(*) > 1;
```

**Fixes:**
1. Rollback migration
2. Use different tickers (PHL-NP, HLTH-NP)
3. Check foreign key references exist
4. Run migration in transaction with rollback

---

## 📈 SUCCESS CRITERIA

### Day 1 (Today)
- ✅ Schema migration successful
- ✅ 7 HNP7 entries in database
- ✅ Manual trigger works with both indexes
- ✅ Simulated prices update after trades

### Week 1
- ✅ At least 3 AIs trade HNP7 companies
- ✅ Prices stay in $80-$120 range
- ✅ No cron timeouts or errors
- ✅ Persona compliance maintained

### Week 2
- ✅ HP7 added (7 more real public companies)
- ✅ AF7 added (7 AI-generated founders)
- ✅ 28 total companies across 4 indexes
- ✅ Frontend shows all indexes

---

## 📚 QUICK REFERENCE

### Key Files
```
/workspaces/rize/
├── supabase/multi_index_schema_migration.sql  ← Run first
├── research/HNP7_DATABASE_INSERT.sql          ← Run second
├── src/app/api/admin/ai-trading/trigger/route.ts  ← Update code
└── HNP7_IMPLEMENTATION_GUIDE.md               ← Full details
```

### Key Tables
- `ai_readable_pitches` - All companies (HM7 + HNP7)
- `pitch_market_data` - Current prices (real + simulated)
- `simulated_market_orders` - Trade history for pricing
- `ai_trading_logs` - AI decisions and execution

### Key Functions
- `calculate_simulated_price(ticker)` - Returns new price
- `update_simulated_prices()` - Batch update all simulated

### Key Queries
```sql
-- Check HNP7 companies
SELECT * FROM ai_readable_pitches WHERE index_code='HNP7';

-- Check simulated prices
SELECT * FROM pitch_market_data WHERE price_type='simulated';

-- Check recent trades
SELECT * FROM ai_trading_logs ORDER BY execution_timestamp DESC LIMIT 20;
```

---

## 🎯 READY TO DEPLOY?

**Pre-Flight Check:**
- [ ] Supabase access confirmed
- [ ] Vercel deployment access confirmed
- [ ] Rollback script available
- [ ] Documentation reviewed
- [ ] Coffee acquired ☕

**Deployment Order:**
1. Database migration (30 mins)
2. Code update (1 hour)
3. Testing (1 hour)
4. Monitor cron run (ongoing)

**Total Time:** 4-5 hours

**Let's do this!** 🚀

