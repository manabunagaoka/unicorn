# Portfolio Fix - November 8, 2025

## Session Summary
Fixed critical portfolio discrepancies between Manage and Compete pages, resolved database replication lag issues, and simplified UI.

## Issues Fixed

### 1. Portfolio Price Display ($100 Bug)
**Problem**: All stock prices showing as $100 instead of real market prices
**Root Cause**: Invalid `next: { revalidate: 60 }` syntax in API route fetch calls (only valid in Server Components)
**Solution**: Changed all API route fetches to use `cache: 'no-store'`
**Files Modified**:
- `/src/app/api/portfolio/route.ts`
- `/src/app/api/leaderboard/route.ts`
- `/src/app/api/market-cap/route.ts`
- `/src/app/api/stock/[ticker]/route.ts`

### 2. Portfolio Value Discrepancy ($10K difference)
**Problem**: Manage page showing $970,492, Compete page showing $980,932
**Root Cause**: Duplicate investment records in database (DBX had 2 entries)
**Solution**: 
- Added UNIQUE constraint: `ALTER TABLE user_investments ADD CONSTRAINT user_investments_user_pitch_unique UNIQUE (user_id, pitch_id)`
- Consolidated duplicate records using SQL merge script
**Files Created**:
- `/workspaces/rize/supabase/add-unique-constraint.sql`
- `/workspaces/rize/supabase/fix-all-duplicates.sql`

### 3. Cash Balance Discrepancy ($4,995 difference)
**Problem**: After fixing duplicates, still had discrepancy. Manage showing $661,740, Compete showing $656,745
**Root Cause**: Database replication lag - Leaderboard API reading from stale read replica
**Diagnosis Process**:
- Created `/src/app/api/portfolio-check/route.ts` - confirmed true DB value is $661,740
- Created `/src/app/api/debug-portfolio/route.ts` - side-by-side comparison
- Added debug logging showing `updated_at` timestamps to identify staleness
- Console logs proved Leaderboard API returning old cash value

**Solution**: Hybrid approach in Compete page
- Fetch both `/api/leaderboard` AND `/api/portfolio` in parallel
- Use accurate cash balance from Portfolio API (reads from primary correctly)
- Recalculate portfolio value: `cash (from Portfolio API) + holdings (from Leaderboard API)`
**Files Modified**:
- `/src/app/compete/page.tsx` - added dual API fetch with cash override

### 4. UI Simplification
**Problem**: Redundant "Your Performance" card at top of Compete page showing same data as leaderboard entry
**Solution**: Removed the performance card entirely, keeping only the leaderboard table
**Result**: Cleaner UI - detailed analytics in Manage tab, pure rankings in Compete tab
**Files Modified**:
- `/src/app/compete/page.tsx` - removed performance card section (lines 305-349)

## Current State

### Database Schema
```sql
-- user_investments table has UNIQUE constraint
CONSTRAINT user_investments_user_pitch_unique UNIQUE (user_id, pitch_id)

-- No duplicate investment records exist
-- Verified: SELECT user_id, pitch_id, COUNT(*) FROM user_investments WHERE shares_owned > 0 GROUP BY user_id, pitch_id HAVING COUNT(*) > 1
```

### ManaMana (user_id: 19be07bc-28d0-4ac6-956b-714eef1ccc85) Portfolio
- **Cash**: $661,740
- **Holdings**: $308,752
- **Total Portfolio**: $970,492
- **Rank**: 11th out of 11 investors
- **Active Positions**: 5 stocks
  - DBX (pitch_id 3): 500 shares @ $31 = $15,500
  - AKAM (pitch_id 4): 200 shares @ $84 = $16,800
  - RDDT (pitch_id 5): 1,290 shares @ $195 = $251,550
  - WRBY (pitch_id 6): 50 shares @ $17 = $850
  - BKNG (pitch_id 7): 5 shares @ $4,940 = $24,700

### API Endpoints Working Correctly
✅ `/api/portfolio` - Returns accurate real-time portfolio with Finnhub prices, reads from primary DB
✅ `/api/leaderboard` - Returns rankings for all investors (may have replica lag on cash)
✅ `/api/market-cap` - Returns market cap for all pitches
✅ `/api/invest` - Buy stocks
✅ `/api/sell` - Sell stocks
✅ `/api/transactions` - Transaction history

### Pages Status
✅ **Manage** (`/manage`) - Shows accurate portfolio: $970,492 total
✅ **Compete** (`/compete`) - Shows accurate portfolio after fix: $970,492 total, rank #11
  - Simplified UI: no performance card, only leaderboard
  - Fetches both Portfolio and Leaderboard APIs
  - Uses Portfolio API's cash for accuracy

### Technical Details
- **Stock Prices**: Real-time from Finnhub API (15-min delay on free tier)
- **Caching**: All API routes use `cache: 'no-store'`, cache-busting query params `?t=${Date.now()}`
- **Database**: Supabase PostgreSQL with read replicas (can have lag)
- **Authentication**: Manaboodle SSO via cookies
- **Auto-refresh**: Compete page refreshes every 60 seconds

## Diagnostic Endpoints Created
- `/api/portfolio-check` - Simple ground truth verification (approximate prices)
- `/api/debug-portfolio` - Side-by-side comparison of both APIs
- `/api/cash-direct` - Direct cash balance query (for debugging)

## Files Created/Modified Summary

### New Files
- `/src/app/api/portfolio-check/route.ts` - Diagnostic endpoint
- `/src/app/api/debug-portfolio/route.ts` - Comparison tool
- `/src/app/api/cash-direct/route.ts` - Direct cash query
- `/supabase/add-unique-constraint.sql` - Prevent duplicate investments
- `/supabase/fix-all-duplicates.sql` - Consolidate existing duplicates
- `/supabase/get_fresh_cash_function.sql` - DB function for fresh reads (not deployed)

### Modified Files
- `/src/app/api/portfolio/route.ts` - Fixed caching
- `/src/app/api/leaderboard/route.ts` - Fixed caching, added debug logging
- `/src/app/api/market-cap/route.ts` - Fixed caching
- `/src/app/api/stock/[ticker]/route.ts` - Fixed caching
- `/src/app/compete/page.tsx` - Added dual API fetch, removed performance card
- `/src/components/Portfolio.tsx` - Added debug logging

## Lessons Learned
1. **next: { revalidate }** only works in Server Components, NOT in API routes - use `cache: 'no-store'` instead
2. **Database replication lag** is real - critical data should be read from primary or use fallback strategies
3. **Unique constraints** should be added proactively to prevent data integrity issues
4. **Multiple diagnostic endpoints** help triangulate issues faster than guessing
5. **Hybrid API fetching** can work around infrastructure limitations (combining accurate + potentially stale data)

## Next Steps
**Priority: AI Investors**
- User wants to work on AI investor functionality next
- AI investors should trade every 6 hours (2-3 trades each)
- Current status: 10 AI investors exist but trading may need verification/fixes
- Relevant files likely in:
  - `/scripts/test-ai-trading.sh`
  - Database tables: `user_token_balances` with `is_ai_investor = true`
  - AI strategies, emojis, catchphrases stored in DB

## Quick Recovery Commands
```bash
# Check for duplicate investments
psql $DATABASE_URL -c "SELECT user_id, pitch_id, COUNT(*) FROM user_investments WHERE shares_owned > 0 GROUP BY user_id, pitch_id HAVING COUNT(*) > 1;"

# Verify ManaMana's portfolio
psql $DATABASE_URL -c "SELECT pitch_id, shares_owned, total_invested, avg_purchase_price FROM user_investments WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85' AND shares_owned > 0 ORDER BY pitch_id;"

# Check cash balance
psql $DATABASE_URL -c "SELECT available_tokens, updated_at FROM user_token_balances WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85';"

# Test portfolio API
curl "https://rize.vercel.app/api/portfolio?t=$(date +%s)" -H "Cookie: manaboodle_sso_token=YOUR_TOKEN"

# Test leaderboard API
curl "https://rize.vercel.app/api/leaderboard?t=$(date +%s)"
```

## Environment Variables Required
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key  # For server-side operations
STOCK_API_KEY=your_finnhub_key  # For real-time stock prices
```

## All Values Verified as Accurate ✅
- Manage page: $970,492 ✅
- Compete page: $970,492 ✅
- Cash: $661,740 ✅
- Holdings: $308,752 ✅
- Rank: 11th ✅
- No duplicates in database ✅
- Unique constraint active ✅
