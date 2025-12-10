# AI TRADING FIX IMPLEMENTATION - Dec 10, 2025

## 🚨 CRITICAL ISSUE SUMMARY

**Problem**: AI investors overspent millions of MTK over 1 week (Dec 3-10) due to three concurrent bugs:
1. **Balance validation broken** - no transaction locking allowed overspending
2. **Price API failing** - stocks stuck at $100 fallback, preventing sells
3. **No idempotency** - possible duplicate cron runs

**Damage**: 
- AIs accumulated millions (should have $11M total, likely have $50M+)
- 113 trades executed, 100% were BUYS (0 sells)
- Prices showing $100/share indicating Finnhub API failures
- Platform inflation estimated 300-400%

---

## ✅ FIXES COMPLETED

### 1. ✅ Cron Disabled (IMMEDIATE)
**File**: `vercel.json`
- Removed AI trading cron schedule
- Only price sync cron remains active
- **STATUS**: Deployed - no more damage possible

### 2. ✅ Price Fallback Improved  
**Files**: 
- `/src/lib/price-cache.ts` - Added 5s timeout, better stale cache logic
- `/src/app/api/admin/ai-trading/trigger/route.ts` - Better error logging

**Changes**:
- Added AbortSignal.timeout(5000) for Finnhub calls
- Improved logging with emojis for quick visual parsing
- Uses stale cache even if very old (better than crashing)
- Falls back to database prices if all else fails
- Throws error if no price available (aborts trading safely)

### 3. ✅ Balance Validation Fixed
**File**: `FIX_BALANCE_VALIDATION_DEC10.sql`

**Database changes**:
- Added `positive_balance_check` constraint (prevents negative balances at DB level)
- Created `execute_ai_trade()` function with row-level locking
- Uses `SELECT FOR UPDATE` to lock balance row during transaction
- Atomic: check balance → insert transaction → update investment → update balance
- Returns success/failure with detailed error messages

### 4. ✅ Idempotency Added
**File**: `ADD_IDEMPOTENCY_DEC10.sql`

**Database changes**:
- Created `ai_trading_cron_runs` table tracking each run
- Unique constraint on (run_date, run_slot) prevents duplicates
- `start_cron_run()` returns NULL if already completed/running
- Auto-detects stale runs (>10 min = crashed)
- Tracks status, trades executed, error messages

### 5. ✅ Portfolio Reset Script
**File**: `RESET_AI_PORTFOLIOS_DEC10.sql`

**Cleanup actions**:
- Backs up current state to `ai_portfolios_backup_dec10`
- Clears all AI holdings
- Archives corrupted trades/transactions
- Resets all AI balances to $1M
- Verification queries to confirm clean state

---

## 🔧 IMPLEMENTATION STEPS

### Phase 1: Database Migrations (15 minutes)

```bash
# 1. Apply balance validation fix
psql $DATABASE_URL -f FIX_BALANCE_VALIDATION_DEC10.sql

# 2. Apply idempotency tables
psql $DATABASE_URL -f ADD_IDEMPOTENCY_DEC10.sql

# 3. Test the new function (don't reset yet!)
# SELECT * FROM execute_ai_trade(
#   '<oracle-user-id>'::uuid,
#   1,
#   1.0,
#   100.0,
#   'BUY'
# );
```

### Phase 2: Code Updates (30 minutes)

#### 2A. Update trigger route to use new database function

**File**: `/src/app/api/admin/ai-trading/trigger/route.ts`

Find the BUY execution section (around line 383-460) and replace with:

```typescript
// Instead of manual balance check + multiple queries:
const { data: tradeResult, error: tradeError } = await supabase
  .rpc('execute_ai_trade', {
    p_user_id: aiInvestor.user_id,
    p_pitch_id: decision.pitch_id,
    p_shares: decision.shares,
    p_price_per_share: priceData.current_price,
    p_transaction_type: 'BUY'
  })
  .single();

if (tradeError) {
  console.error(`[AI Trading] Database error for ${aiInvestor.display_name}:`, tradeError);
  throw tradeError;
}

if (!tradeResult.success) {
  console.warn(`[AI Trading] ❌ ${aiInvestor.display_name} trade rejected: ${tradeResult.error_message}`);
  return {
    success: false,
    message: tradeResult.error_message,
    execution: {
      balanceBefore: aiInvestor.available_tokens,
      balanceAfter: aiInvestor.available_tokens,
      portfolioBefore,
      portfolioAfter: portfolioBefore,
      price: priceData.current_price,
      cost: decision.shares * priceData.current_price
    }
  };
}

console.log(`[AI Trading] ✅ ${aiInvestor.display_name} bought ${decision.shares} shares, new balance: $${tradeResult.new_balance}`);
```

#### 2B. Update cron route to use idempotency

**File**: `/src/app/api/admin/ai-trading/cron/route.ts`

Add at the start of GET handler (after auth check):

```typescript
// Determine trading slot based on current time (EST)
const now = new Date();
const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
const hour = estTime.getHours();
const runDate = estTime.toISOString().split('T')[0]; // YYYY-MM-DD
const runSlot = hour < 15 ? 'MORNING' : 'AFTERNOON';

console.log(`[AI Trading Cron] Attempting ${runSlot} run for ${runDate}`);

// Check idempotency - start cron run
const { data: runData, error: runError } = await supabase
  .rpc('start_cron_run', {
    p_run_date: runDate,
    p_run_slot: runSlot
  })
  .single();

if (runError) {
  console.error('[AI Trading Cron] Error starting run:', runError);
  return NextResponse.json({ error: 'Failed to start cron run' }, { status: 500 });
}

if (!runData) {
  console.log('[AI Trading Cron] ⏭️ Skipping - already ran today');
  return NextResponse.json({
    success: true,
    skipped: true,
    message: `Already executed ${runSlot} run for ${runDate}`
  });
}

const runId = runData;
console.log(`[AI Trading Cron] Started run ID ${runId}`);

// ... existing trigger call logic ...

// At the end, mark as complete:
await supabase.rpc('complete_cron_run', {
  p_run_id: runId,
  p_trades_executed: data.results?.length || 0,
  p_error_message: null
});
```

Add error handling to mark failed runs:

```typescript
} catch (error) {
  console.error('[AI Trading Cron] Error:', error);
  
  // Mark run as failed
  if (runId) {
    await supabase.rpc('complete_cron_run', {
      p_run_id: runId,
      p_trades_executed: 0,
      p_error_message: error.message
    });
  }
  
  return NextResponse.json({ error: error.message }, { status: 500 });
}
```

#### 2C. Initialize Supabase client in cron route

Add at top of cron/route.ts:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
```

### Phase 3: Deploy & Test (2 hours)

```bash
# 1. Commit all changes
git add .
git commit -m "fix: AI trading balance validation, idempotency, and price fallback"

# 2. Deploy to Vercel (cron still disabled)
git push origin main

# 3. Wait for deployment to complete
```

#### Manual Testing Protocol (Run 10+ times)

1. **Test overspending protection**:
   ```
   POST /api/admin/ai-trading/trigger
   - Manually edit Oracle's balance to $10,000
   - Trigger trade
   - Should fail with "Insufficient funds" message
   - Balance should remain $10,000 (unchanged)
   ```

2. **Test concurrent execution**:
   ```
   - Open 2 terminal windows
   - Call trigger endpoint simultaneously
   - Both should succeed without race conditions
   - Verify no duplicate trades in database
   ```

3. **Test idempotency**:
   ```
   - Call cron endpoint twice in same slot
   - Second call should return "skipped: true"
   - Only one set of trades should execute
   ```

4. **Test price fallback**:
   ```
   - Temporarily set invalid STOCK_API_KEY
   - Trigger should use database prices
   - Logs should show "from database" for prices
   - Trading should still work
   ```

5. **Test SELL logic**:
   ```
   - Give Oracle some holdings manually
   - Set stock price to be declining
   - Trigger trade
   - Oracle should decide to SELL
   - Verify shares decrease and balance increases
   ```

6. **Full integration test**:
   ```
   - Reset all AIs to $1M
   - Run trigger 10 times in a row
   - Check total platform value = $11M ± (trades executed)
   - Verify no AI has negative balance
   - Verify all trades logged correctly
   ```

### Phase 4: Reset Production Data (30 minutes)

⚠️ **DO THIS AFTER FIXES ARE TESTED AND WORKING** ⚠️

```bash
# 1. Run reset script
psql $DATABASE_URL -f RESET_AI_PORTFOLIOS_DEC10.sql

# 2. Verify all AIs at $1M
# Check output from final queries in script

# 3. Manual verification in Supabase dashboard
# - Check user_token_balances table
# - Verify available_tokens = 1000000 for all AIs
# - Check user_investments table is empty for AIs
```

### Phase 5: Re-enable Cron (5 minutes)

**ONLY AFTER 10+ successful manual tests and data reset!**

Edit `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/sync-prices",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/admin/ai-trading/cron",
      "schedule": "30 14,20 * * *",
      "_comment": "Re-enabled Dec 10 after fixing balance validation, idempotency, and price fallback"
    }
  ]
}
```

```bash
git add vercel.json
git commit -m "chore: re-enable AI trading cron after fixes"
git push origin main
```

### Phase 6: Monitor First 3 Days (Ongoing)

**Daily checks**:
```sql
-- Check platform value hasn't inflated
SELECT 
  SUM(available_tokens) as cash,
  (SELECT SUM(current_value) FROM user_investments WHERE user_id IN (SELECT user_id FROM user_token_balances WHERE is_ai_investor = true)) as holdings,
  SUM(available_tokens) + (SELECT COALESCE(SUM(current_value), 0) FROM user_investments WHERE user_id IN (SELECT user_id FROM user_token_balances WHERE is_ai_investor = true)) as total
FROM user_token_balances
WHERE is_ai_investor = true;
-- Should be ~$11M ± reasonable variance

-- Check for overspending attempts (should be 0 or low)
SELECT COUNT(*) FROM ai_trading_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND execution_success = false
  AND execution_message LIKE '%Insufficient funds%';

-- Check cron runs (should be exactly 2 per trading day)
SELECT run_date, COUNT(*) as runs
FROM ai_trading_cron_runs
WHERE run_date > NOW() - INTERVAL '7 days'
GROUP BY run_date
ORDER BY run_date DESC;
```

---

## 📋 CHECKLIST

### Pre-Deployment
- [x] Cron disabled in vercel.json
- [x] Price fallback logic improved
- [x] Database migration scripts created
- [x] Code changes documented
- [ ] All fixes peer reviewed

### Deployment
- [ ] Database migrations applied
- [ ] New function tested manually
- [ ] Code deployed to Vercel
- [ ] Deployment successful

### Testing
- [ ] Overspending protection: 10+ tests passed
- [ ] Concurrent execution: 5+ tests passed
- [ ] Idempotency: 5+ tests passed  
- [ ] Price fallback: 3+ tests passed
- [ ] SELL logic: 3+ tests passed
- [ ] Full integration: 10+ runs clean

### Production
- [ ] AI portfolios reset to $1M
- [ ] Backup verified
- [ ] Data integrity checks passed
- [ ] Cron re-enabled
- [ ] First cron run monitored
- [ ] 3 days of monitoring completed

---

## 🔍 ROOT CAUSE ANALYSIS

### Why Balance Validation Failed

**Original code** (lines 383-404 in trigger/route.ts):
```typescript
const totalCost = decision.shares * priceData.current_price;
const balanceBefore = aiInvestor.available_tokens;

if (totalCost > balanceBefore) {
  // reject trade
}

// Insert transaction
await supabase.from('investment_transactions').insert({...});

// Update balance  
await supabase.from('user_token_balances').update({...});
```

**Problem**: Between the balance check and the update, another process could modify the balance. With 11 AIs trading simultaneously, race conditions were inevitable.

**Solution**: Database-level atomic function with `SELECT FOR UPDATE` row locking ensures only one process can modify a balance at a time.

### Why Prices Stuck at $100

**Theory 1**: Finnhub API rate limited (free tier = 60 calls/min)
- 15 cron runs × 11 AIs × 14 stocks = 2,310 calls in 1 week
- If sync-prices runs hourly: 168 hours × 14 stocks = 2,352 calls
- Total: ~4,662 calls (well within limits for paid tier)

**Theory 2**: STOCK_API_KEY expired or invalid
- Check environment variables in Vercel
- Verify API key still active on Finnhub dashboard

**Theory 3**: Finnhub data quality issues
- Some stocks (GRAB, KVYO, TDUP, KIND, RENT) may have low volume
- API may return 0 or null for these tickers
- Fallback logic wasn't robust enough

**Solution**: Multi-layered fallback (cache → database → error) with better logging

### Why No Sells Occurred

**Root cause**: All prices static at $100
- AIs use price movement to decide when to sell
- With no price changes (all $100), no sell signals triggered
- Contrarian should sell on gains - but saw no gains (flat $100)
- Momentum should sell on drops - but saw no drops (flat $100)
- Diamond Hands correctly never sold (HOLD_FOREVER strategy)

**Solution**: Fix price API reliability so AIs see real market movement

---

## 🎯 SUCCESS METRICS

After fixes deployed, monitor for:

✅ **Platform value stability**: $11M ± 10% (reasonable trading variance)  
✅ **No overspending**: 0 "Insufficient funds" errors (or <1% of trades)  
✅ **Cron reliability**: Exactly 2 runs per trading day  
✅ **Price data quality**: <5% of prices from fallback  
✅ **Balanced trading**: SELL actions should be 20-40% of total trades  
✅ **Persona diversity**: All 11 AIs should trade (not just a few)

🚨 **Red flags** (disable cron immediately if detected):
- Platform value >$12M (inflation detected)
- Any AI balance negative (validation broken)
- >10% trades failing (price API down)
- No SELL actions for 3+ days (price data stale)
- Duplicate cron runs (idempotency broken)

---

## 📚 RELATED DOCS

- `CRITICAL_OVERSPENDING_BUG_DEC7.md` - Original bug report
- `INVESTIGATE_WEEK_DEC3_DEC10.sql` - Forensic analysis queries
- `SESSION_NOV17_AI_TRADING_COMPLETE.md` - Original AI trading implementation
- `AI_TRADING_COMPLETE.md` - Feature documentation
- `SYSTEM_SCHEDULES.md` - Cron schedule reference

---

## 🛠️ EMERGENCY ROLLBACK

If fixes cause new issues:

```bash
# 1. Disable cron immediately
# Edit vercel.json, remove AI trading cron, push to main

# 2. Restore from backup (if data corrupted)
psql $DATABASE_URL
> INSERT INTO user_token_balances (user_id, available_tokens, total_tokens)
  SELECT user_id, 1000000, 1000000
  FROM ai_portfolios_backup_dec10;

# 3. Clear all AI holdings
> DELETE FROM user_investments WHERE user_id IN (...);

# 4. Investigate logs
# Check Vercel logs for errors
# Check Supabase logs for failed queries
```

---

**Created**: Dec 10, 2025  
**Author**: GitHub Copilot  
**Status**: Ready for implementation  
**Estimated time**: 3-4 hours (including testing)
