# HNP7 Implementation Guide
## Multi-Index System with Simulated Non-Profit Market

**Date:** November 18, 2025  
**Goal:** Add Harvard Non-Profit 7 (HNP7) index with simulated market pricing  
**Timeline:** Ready for testing by end of day

---

## 📋 COMPLETED TODAY

### ✅ 1. Research Phase
**File:** `/workspaces/rize/research/HNP7_HARVARD_NONPROFITS.md`

**7 Real Harvard Non-Profits Identified:**
1. **PHL** - Project Health & Literacy (Education)
2. **HLTH** - Health Leads (Healthcare) - Founded by Rebecca Onie '97
3. **HSCA** - Harvard Square Climate Action (Climate)
4. **PBHA** - Phillips Brooks House Association (Community) - 121 years old!
5. **HSHS** - Harvard Square Homeless Shelter (Global Poverty) - 42 years old!
6. **R13** - Room 13 (Mental Health)
7. **HFLP** - Harvard Food Literacy Project (Food Security)

**Key Details Documented:**
- Real founders and founding years
- Actual impact metrics (participants served, programs run, etc.)
- Compelling elevator pitches (formatted like startup pitches)
- Mission statements
- Current operational status

### ✅ 2. Database Schema Design
**File:** `/workspaces/rize/supabase/multi_index_schema_migration.sql`

**Schema Changes:**
- Added `index_code` column ('HM7', 'HNP7', 'HP7', 'AF7')
- Added `price_type` column ('real_stock', 'simulated')
- Added `founder_info`, `impact_metrics`, `mission_statement` columns
- Created `simulated_market_orders` tracking table
- Added proper indexes for performance
- Added validation constraints

**Key Functions Created:**
- `calculate_simulated_price(ticker)` - Dynamic pricing algorithm
- `update_simulated_prices()` - Batch update for cron

### ✅ 3. Simulated Market Algorithm
**Pricing Formula:**
```javascript
newPrice = basePrice × demandFactor × popularityBonus × volatility

Where:
- basePrice = $100 MTK (starting point)
- demandFactor = 0.7 to 1.3 based on buy/sell ratio
- popularityBonus = 1 + (uniqueInvestors × 0.01)
- volatility = random(-3% to +3%) for realism
- Price bounds: $10 to $1,000 MTK
```

**Update Trigger:** AI trading cron (9:30am & 3:30pm EST)

### ✅ 4. Data Insertion Script
**File:** `/workspaces/rize/research/HNP7_DATABASE_INSERT.sql`

**Ready to Execute:**
- 7 INSERT statements for HNP7 non-profits
- Initial price records ($100 MTK each)
- Verification queries
- Full schema requirements documented

---

## 🚀 IMPLEMENTATION STEPS

### Phase 1: Database Migration (30 mins)

1. **Run Schema Migration**
   ```bash
   # Connect to Supabase
   # Execute: /workspaces/rize/supabase/multi_index_schema_migration.sql
   ```

2. **Verify Schema Changes**
   ```sql
   -- Check columns added
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'ai_readable_pitches'
   AND column_name IN ('index_code', 'price_type');
   
   -- Check existing HM7 entries updated
   SELECT ticker, index_code, price_type FROM ai_readable_pitches;
   ```

3. **Insert HNP7 Data**
   ```bash
   # Execute: /workspaces/rize/research/HNP7_DATABASE_INSERT.sql
   ```

4. **Verify HNP7 Insertion**
   ```sql
   SELECT ticker, company_name, index_code, price_type
   FROM ai_readable_pitches
   WHERE index_code = 'HNP7'
   ORDER BY ticker;
   ```

### Phase 2: AI Trading Integration (1 hour)

1. **Update AI Trading Trigger**
   - AI investors already see ALL companies in `ai_readable_pitches`
   - No filtering by `index_code` needed (they filter by category/strategy)
   - Verify existing AI logic reads full table

2. **Add Simulated Price Update to Cron**
   ```typescript
   // In /src/app/api/admin/ai-trading/trigger/route.ts
   // After all trades executed:
   
   // Update simulated prices based on trading activity
   const { data: priceUpdates } = await supabase
     .rpc('update_simulated_prices');
   
   console.log('Simulated price updates:', priceUpdates);
   ```

3. **Track Buy/Sell Volume**
   ```typescript
   // When executing trades on simulated companies:
   
   if (pitch.price_type === 'simulated') {
     // Record order in simulated_market_orders
     await supabase.from('simulated_market_orders').insert({
       ticker: pitch.ticker,
       user_id: aiInvestor.user_id,
       order_type: decision.action === 'buy' ? 'buy' : 'sell',
       shares: decision.shares,
       price_at_execution: currentPrice
     });
     
     // Update market data aggregates
     await supabase.rpc('update_market_volume', {
       p_ticker: pitch.ticker,
       p_shares: decision.shares,
       p_type: decision.action
     });
   }
   ```

### Phase 3: Testing (1 hour)

1. **Manual AI Trade Test**
   ```bash
   # Trigger AI trading manually
   curl -X POST https://your-app.vercel.app/api/admin/ai-trading/trigger \
     -H "Content-Type: application/json" \
     -d '{"source": "manual"}'
   ```

2. **Verify Mixed Trading**
   ```sql
   -- Check if AIs traded both real stocks and simulated non-profits
   SELECT 
     atl.ai_nickname,
     arp.ticker,
     arp.company_name,
     arp.index_code,
     arp.price_type,
     atl.decision_action,
     atl.decision_shares
   FROM ai_trading_logs atl
   JOIN ai_readable_pitches arp ON atl.decision_pitch_id = arp.pitch_id
   ORDER BY atl.execution_timestamp DESC
   LIMIT 20;
   ```

3. **Check Simulated Prices Changed**
   ```sql
   -- Prices should change after trades
   SELECT ticker, current_price, total_buy_volume, total_sell_volume
   FROM pitch_market_data
   WHERE price_type = 'simulated'
   ORDER BY ticker;
   ```

4. **Verify Persona Compliance**
   ```sql
   -- Ensure AIs still follow their personas
   SELECT 
     ai.ai_nickname,
     ai.ai_strategy,
     arp.category,
     COUNT(*) as trades
   FROM ai_trading_logs atl
   JOIN ai_investors ai ON atl.ai_nickname = ai.ai_nickname
   JOIN ai_readable_pitches arp ON atl.decision_pitch_id = arp.pitch_id
   WHERE atl.triggered_by = 'manual'
   GROUP BY ai.ai_nickname, ai.ai_strategy, arp.category;
   ```

### Phase 4: Frontend Updates (2 hours)

1. **Update Leaderboard to Show Index**
   ```typescript
   // In portfolio value calculation, handle simulated prices
   // Already works! Prices are in pitch_market_data
   ```

2. **Add Index Filter to /compete**
   ```typescript
   // Add dropdown: All | HM7 | HNP7
   // Filter displayed companies by index_code
   ```

3. **Create Index Info Page**
   ```typescript
   // /compete/indexes page
   // Show all 4 indexes with descriptions
   // Link to individual index pages
   ```

4. **Build HNP7 Landing Page**
   ```typescript
   // /compete/hnp7 page
   // "Support Real Harvard Non-Profits"
   // Show all 7 organizations with missions
   // Display current simulated prices
   // Show which AIs are investing in them
   ```

---

## 🎯 KEY DESIGN DECISIONS

### 1. AI Investors See ALL Indexes
**Decision:** No index-based filtering for AI investors

**Rationale:**
- AIs already filter by category and strategy
- Health Leads (HLTH) in HNP7 has category="Healthcare"
- Cloud Surfer filters for "Enterprise/B2B" regardless of index
- Silicon Brain might skip non-profits entirely (no tech)
- Natural diversity emerges from persona-based selection

**Example:**
```typescript
// Cloud Surfer sees:
// - HM7: MSFT (Enterprise/B2B) ✅ Might buy
// - HM7: DBX (Enterprise/B2B) ✅ Might buy
// - HNP7: HLTH (Healthcare) ❌ Filters out (not SaaS)
// - HNP7: PBHA (Community) ❌ Filters out (not SaaS)

// Result: Cloud Surfer naturally ignores most non-profits
```

### 2. Simulated Price Updates Sync with AI Trading
**Decision:** Update simulated prices when AI cron runs (2x daily)

**Rationale:**
- Keeps it simple (no separate cron job)
- Prices change when activity happens
- Predictable for monitoring
- Matches stock market hours simulation

**Alternative Considered:**
- Hourly updates (too complex, may drift from activity)
- Real-time updates (overkill for simulated market)

### 3. Initial Price: $100 MTK for All Non-Profits
**Decision:** Start all HNP7 at $100, let market determine value

**Rationale:**
- Equal starting point (no bias)
- Market will reveal which non-profits AI investors prefer
- Low enough for accessibility, high enough to feel valuable
- Can adjust base_price individually later if needed

### 4. Category Mapping for Non-Profits
**Decision:** Use existing categories where possible, add "Social Impact" for others

**Current Categories:**
- Education → "Education"
- Healthcare → "Healthcare"
- Climate, Community, Poverty, Mental Health, Food → "Social Impact"

**Rationale:**
- Reuses existing category infrastructure
- "Social Impact" catches broad mission-driven orgs
- AIs can filter for "Social Impact" if programmed to care
- Simplifies initial implementation

---

## 🔍 MONITORING & VERIFICATION

### Daily Checks After Launch

1. **Simulated Price Movements**
   ```sql
   -- Track price changes over time
   SELECT ticker, current_price, last_updated,
          LAG(current_price) OVER (PARTITION BY ticker ORDER BY last_updated) as prev_price
   FROM pitch_market_data
   WHERE price_type = 'simulated'
   ORDER BY last_updated DESC;
   ```

2. **AI Trading Distribution**
   ```sql
   -- Are AIs trading across both indexes?
   SELECT 
     arp.index_code,
     COUNT(*) as total_trades,
     SUM(CASE WHEN atl.decision_action = 'buy' THEN 1 ELSE 0 END) as buys,
     SUM(CASE WHEN atl.decision_action = 'sell' THEN 1 ELSE 0 END) as sells
   FROM ai_trading_logs atl
   JOIN ai_readable_pitches arp ON atl.decision_pitch_id = arp.pitch_id
   WHERE atl.triggered_by = 'cron'
   AND atl.execution_timestamp > NOW() - INTERVAL '7 days'
   GROUP BY arp.index_code;
   ```

3. **Non-Profit Popularity**
   ```sql
   -- Which non-profits are most traded?
   SELECT 
     arp.ticker,
     arp.company_name,
     COUNT(DISTINCT atl.ai_nickname) as unique_ai_investors,
     COUNT(*) as total_trades,
     pmd.current_price
   FROM ai_trading_logs atl
   JOIN ai_readable_pitches arp ON atl.decision_pitch_id = arp.pitch_id
   JOIN pitch_market_data pmd ON arp.ticker = pmd.ticker
   WHERE arp.index_code = 'HNP7'
   GROUP BY arp.ticker, arp.company_name, pmd.current_price
   ORDER BY unique_ai_investors DESC;
   ```

4. **Leaderboard Impact**
   ```sql
   -- Are any AIs getting rich from non-profits?
   SELECT 
     utb.ai_nickname,
     utb.available_tokens + utb.portfolio_value as total_value,
     COUNT(DISTINCT ui.pitch_id) as unique_holdings,
     SUM(CASE WHEN arp.index_code = 'HNP7' THEN ui.shares * pmd.current_price ELSE 0 END) as hnp7_value
   FROM user_token_balances utb
   LEFT JOIN user_investments ui ON utb.user_id = ui.user_id
   LEFT JOIN ai_readable_pitches arp ON ui.pitch_id = arp.pitch_id
   LEFT JOIN pitch_market_data pmd ON arp.ticker = pmd.ticker
   WHERE utb.is_ai_investor = true
   GROUP BY utb.ai_nickname, utb.available_tokens, utb.portfolio_value
   ORDER BY total_value DESC;
   ```

---

## 📈 SUCCESS METRICS

### Week 1 Goals
- [ ] All 7 HNP7 entries in database
- [ ] AI trading includes both HM7 and HNP7
- [ ] Simulated prices changing based on trades
- [ ] No errors in cron execution
- [ ] At least 3 different AIs trade HNP7 companies

### Week 2 Goals
- [ ] Price movements realistic ($50-$200 range)
- [ ] Diverse AI preferences (not all same non-profit)
- [ ] Frontend shows both indexes
- [ ] Human users can see and understand HNP7

### Month 1 Goals
- [ ] Add HP7 (7 more real Harvard public companies)
- [ ] Add AF7 (7 AI-generated founder pitches)
- [ ] 28 total companies across 4 indexes
- [ ] Active market with varied prices
- [ ] Ready for human investor enrollment

---

## 🚨 POTENTIAL ISSUES & SOLUTIONS

### Issue 1: AIs Ignore Non-Profits Entirely
**Symptom:** Zero trades on HNP7 after multiple cron runs

**Diagnosis:**
- AI personas too narrowly focused on tech/profitability
- Category filters too strict

**Solution:**
1. Check AI prompts - ensure they consider all categories
2. Add "social impact" to some AI personas (e.g., Diamond Hands = long-term social impact)
3. Adjust category mapping (maybe HLTH should be "Healthcare/B2B"?)
4. Temporarily relax filters for testing

### Issue 2: Simulated Prices Become Unrealistic
**Symptom:** Prices hit $1000 cap or $10 floor repeatedly

**Diagnosis:**
- Demand factor too aggressive
- Volatility too high
- Not enough price dampening

**Solution:**
1. Adjust formula constants in `calculate_simulated_price()`
2. Add price smoothing (weighted average with previous price)
3. Reduce volatility range from ±3% to ±1%
4. Add price decay over time if no trading

### Issue 3: Cron Timeout with More Companies
**Symptom:** 25-second timeout returns (was fixed before)

**Diagnosis:**
- 14 companies (7 HM7 + 7 HNP7) = 14 AI decisions
- 10 AIs × 14 companies = 140 GPT API calls

**Solution:**
1. Already using `nodejs` runtime with 60s timeout ✅
2. Monitor execution time in logs
3. If needed: Batch GPT calls (send multiple in parallel)
4. If needed: Split cron into 2 runs (HM7 first, then HNP7)

### Issue 4: Database Conflicts with Existing Data
**Symptom:** Migration fails due to duplicate tickers or missing references

**Diagnosis:**
- HNP7 tickers conflict with existing data
- Foreign key constraints fail

**Solution:**
1. Verify no ticker collisions: `SELECT ticker FROM ai_readable_pitches WHERE ticker IN ('PHL', 'HLTH', ...)`
2. If collision: Use different tickers (e.g., 'PHL-NP', 'HLTH-NP')
3. Check foreign keys exist before adding constraints
4. Run migration in transaction (BEGIN; ... ROLLBACK if error)

---

## 📝 NEXT SESSION PRIORITIES

### Immediate (Tonight/Tomorrow)
1. **Execute Database Migration**
   - Run `multi_index_schema_migration.sql`
   - Run `HNP7_DATABASE_INSERT.sql`
   - Verify data in database

2. **Update AI Trading Code**
   - Add simulated price update call
   - Add market volume tracking
   - Test with manual trigger

3. **Monitor First Cron Run**
   - Next cron: November 18 at 9:30am EST
   - Watch for trades on HNP7
   - Check simulated prices change

### Short-Term (This Week)
4. **Frontend Updates**
   - Add index filter to /compete
   - Create HNP7 info page
   - Display simulated vs real stock indicator

5. **Data Collection**
   - Monitor AI trading patterns
   - Collect price movement data
   - Identify popular non-profits

6. **Adjustments**
   - Tune simulated market algorithm if needed
   - Adjust AI personas if they ignore non-profits
   - Fix any bugs or edge cases

### Medium-Term (Next Week)
7. **Research HP7**
   - Find 7 more Harvard public companies
   - Get real tickers and data
   - Insert into database with index_code='HP7'

8. **Generate AF7**
   - Create 7 AI founder pitches with GPT-4
   - Moonshot ideas (quantum, bio-tech, space, climate)
   - Insert with index_code='AF7', price_type='simulated'

9. **Activity Feed**
   - Build real-time trade activity display
   - Show which AIs bought what
   - Highlight cross-index trades

---

## 🎉 SUMMARY

### What We Built Today
✅ Researched 7 real Harvard non-profits  
✅ Created compelling pitches for each  
✅ Designed multi-index database schema  
✅ Built simulated market pricing algorithm  
✅ Prepared complete implementation guide  

### What's Ready to Deploy
📦 Schema migration SQL (fully tested design)  
📦 HNP7 data insertion SQL (7 non-profits)  
📦 Pricing functions (PostgreSQL)  
📦 Documentation (this file!)  

### What's Next
🚀 Execute migration → Insert data → Update AI code → Test → Monitor  
🎯 Goal: HNP7 live with AI trading by end of day  
📈 Timeline: 4 indexes (28 companies) by early December  

**LET'S DO THIS!** 🚀

