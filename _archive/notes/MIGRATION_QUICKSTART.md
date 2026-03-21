# 🚀 QUICK START - Run Database Migration

## Step 1: Access Supabase SQL Editor

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your RIZE project
3. Click **SQL Editor** in the left sidebar
4. Click **New query**

## Step 2: Run Migration

1. Open the file: `/workspaces/rize/supabase/investment_system_migration.sql`
2. Copy ALL contents (350+ lines)
3. Paste into Supabase SQL Editor
4. Click **Run** (or press Ctrl/Cmd + Enter)

## Step 3: Verify Migration Success

Run these verification queries in SQL Editor:

```sql
-- Check AI investors were created (should show 10)
SELECT user_id, ai_nickname, ai_emoji, ai_strategy, total_tokens 
FROM user_token_balances 
WHERE is_ai_investor = true;

-- Check pitch market data (should show 10 companies)
SELECT pitch_id, current_price, total_volume 
FROM pitch_market_data 
ORDER BY pitch_id;

-- Check views work
SELECT * FROM investment_leaderboard LIMIT 10;
SELECT * FROM company_rankings;

-- Test pricing function
SELECT calculate_share_price(1) as facebook_price;
```

## Expected Results

✅ **10 AI investors** with nicknames like "The Boomer", "YOLO Kid", etc.  
✅ **10 companies** (pitch IDs 1-10) all at $100.00 starting price  
✅ **Leaderboard view** showing 10 AI investors ranked  
✅ **Company rankings** view showing all 10 companies  
✅ **Price function** returns 100.00 for any company  

## If Errors Occur

Common issues and fixes:

### Error: "relation already exists"
```sql
-- Some tables already exist. Drop them first:
DROP TABLE IF EXISTS investment_transactions CASCADE;
DROP TABLE IF EXISTS user_investments CASCADE;
DROP TABLE IF EXISTS user_token_balances CASCADE;
DROP TABLE IF EXISTS pitch_market_data CASCADE;
DROP VIEW IF EXISTS investment_leaderboard CASCADE;
DROP VIEW IF EXISTS company_rankings CASCADE;

-- Then run the full migration again
```

### Error: "duplicate key value"
```sql
-- AI investors already seeded. Skip or delete:
DELETE FROM user_token_balances WHERE is_ai_investor = true;

-- Then run just the AI investor INSERT section again
```

## After Successful Migration

Tell me: **"Migration done"**

I will then create:
1. ✅ Investment API routes (`POST /api/invest`, `GET /api/portfolio`, etc.)
2. ✅ Updated UI components (replace Vote with Invest interface)
3. ✅ Portfolio page showing holdings and gains/losses
4. ✅ Updated leaderboard displaying AI investors

---

## Database Schema Created

**Tables:**
- `user_token_balances` - Token balances and portfolio values
- `user_investments` - Current holdings (positions)
- `investment_transactions` - Full transaction history
- `pitch_market_data` - Real-time pricing and market stats

**Views:**
- `investment_leaderboard` - Ranked investors (AI + real users)
- `company_rankings` - Companies ranked by investment volume

**Functions:**
- `calculate_share_price(pitch_id)` - Dynamic pricing formula
- `update_portfolio_values()` - Recalculate all portfolio values

**Triggers:**
- Auto-update portfolio values when investments change

---

## Need Help?

If migration fails or you see errors, copy the error message and send it to me. I'll help troubleshoot!
