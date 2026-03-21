# HNP7 Quick Reference
## Harvard Non-Profit 7 Index - At a Glance

---

## THE 7 NON-PROFITS

| Ticker | Organization | Category | Founded | Key Impact |
|--------|-------------|----------|---------|------------|
| **PHL** | Project Health & Literacy | Education | 2009 | 1,000+ students/year health education |
| **HLTH** | Health Leads | Healthcare | 1996 | 500K+ patients, $500M resources connected |
| **HSCA** | Harvard Square Climate Action | Climate | 2019 | 25+ businesses, 15% emissions reduction |
| **PBHA** | Phillips Brooks House Assoc. | Community | 1904 | 3,000+ served weekly, 100+ programs |
| **HSHS** | Harvard Square Homeless Shelter | Social Impact | 1983 | 22 beds, 70% permanent housing success |
| **R13** | Room 13 | Social Impact | 2016 | 500+ peer counseling sessions/year |
| **HFLP** | Harvard Food Literacy Project | Social Impact | 2012 | 1,500+ participants, 8 gardens |

---

## FILE LOCATIONS

```
/workspaces/rize/
├── research/
│   ├── HNP7_HARVARD_NONPROFITS.md       # Full research & details
│   └── HNP7_DATABASE_INSERT.sql         # Ready-to-run SQL inserts
├── supabase/
│   └── multi_index_schema_migration.sql # Schema changes + functions
└── HNP7_IMPLEMENTATION_GUIDE.md         # Complete implementation plan
```

---

## SIMULATED PRICING FORMULA

```
New Price = Base Price × Demand Factor × Popularity Bonus × Volatility

Base Price:       $100 MTK (starting point)
Demand Factor:    0.7 - 1.3 (based on buy/sell ratio)
Popularity Bonus: 1.0 + (0.01 × unique investors)
Volatility:       0.97 - 1.03 (±3% random)
Price Bounds:     $10 - $1,000 MTK
```

---

## SCHEMA CHANGES

**New Columns:**
- `ai_readable_pitches.index_code` → 'HM7' | 'HNP7' | 'HP7' | 'AF7'
- `ai_readable_pitches.price_type` → 'real_stock' | 'simulated'
- `ai_readable_pitches.founder_info` → TEXT
- `ai_readable_pitches.impact_metrics` → TEXT
- `ai_readable_pitches.mission_statement` → TEXT

**New Tables:**
- `simulated_market_orders` → Track buy/sell for pricing

**New Functions:**
- `calculate_simulated_price(ticker)` → Returns new price
- `update_simulated_prices()` → Batch update all simulated

---

## KEY PRINCIPLES

### AI Investors See All Indexes
✅ **DO:** Let AIs see all 14 companies (7 HM7 + 7 HNP7)  
✅ **DO:** Filter by category/strategy (existing personas)  
❌ **DON'T:** Restrict AIs to specific indexes  

### Example AI Behavior
**Cloud Surfer** (SaaS only):
- ✅ Sees MSFT, DBX (HM7) → Might buy
- ❌ Filters out HLTH, PBHA (HNP7) → Not SaaS

**Diamond Hands** (Long-term hold):
- ✅ Might buy social impact orgs (HNP7)
- ✅ Never sells regardless of index

---

## IMPLEMENTATION CHECKLIST

### Database (30 mins)
- [ ] Run `multi_index_schema_migration.sql`
- [ ] Verify columns added: `SELECT * FROM ai_readable_pitches LIMIT 1;`
- [ ] Run `HNP7_DATABASE_INSERT.sql`
- [ ] Verify 7 entries: `SELECT COUNT(*) FROM ai_readable_pitches WHERE index_code='HNP7';`

### AI Trading Code (1 hour)
- [ ] Add simulated price update after trades
- [ ] Track buy/sell volume in `simulated_market_orders`
- [ ] Test manual trigger: `POST /api/admin/ai-trading/trigger`
- [ ] Verify trades on both HM7 and HNP7

### Testing (1 hour)
- [ ] Check AI trading logs include HNP7 trades
- [ ] Verify simulated prices change
- [ ] Confirm persona compliance (still filtering by category)
- [ ] Monitor next cron run (Nov 18 at 9:30am EST)

### Frontend (2 hours)
- [ ] Add index filter to /compete page
- [ ] Create /compete/hnp7 info page
- [ ] Show simulated vs real stock indicator
- [ ] Display which AIs are investing in non-profits

---

## MONITORING QUERIES

**Check HNP7 Trades:**
```sql
SELECT ai_nickname, arp.ticker, company_name, decision_action, decision_shares
FROM ai_trading_logs atl
JOIN ai_readable_pitches arp ON atl.decision_pitch_id = arp.pitch_id
WHERE arp.index_code = 'HNP7'
ORDER BY execution_timestamp DESC;
```

**Check Simulated Prices:**
```sql
SELECT ticker, company_name, current_price, total_buy_volume, total_sell_volume
FROM pitch_market_data pmd
JOIN ai_readable_pitches arp ON pmd.ticker = arp.ticker
WHERE arp.price_type = 'simulated'
ORDER BY current_price DESC;
```

**Check AI Distribution:**
```sql
SELECT 
  arp.index_code,
  COUNT(*) as trades,
  COUNT(DISTINCT atl.ai_nickname) as unique_ais
FROM ai_trading_logs atl
JOIN ai_readable_pitches arp ON atl.decision_pitch_id = arp.pitch_id
WHERE triggered_by = 'cron'
GROUP BY arp.index_code;
```

---

## TROUBLESHOOTING

**Problem:** AIs not trading HNP7  
**Check:** AI prompts allow all categories  
**Fix:** Adjust category filters or add social impact bias to some personas

**Problem:** Simulated prices stuck at $100  
**Check:** `update_simulated_prices()` called after trades  
**Fix:** Add function call to AI trading trigger code

**Problem:** Prices too volatile (hitting $10 or $1000)  
**Check:** Formula constants in `calculate_simulated_price()`  
**Fix:** Reduce volatility range or adjust demand factor bounds

---

## NEXT MILESTONES

**This Week:**
- ✅ HNP7 live with 7 non-profits
- ✅ AI trading on both HM7 + HNP7
- ✅ Simulated prices updating

**Next Week:**
- HP7: Add 7 more Harvard public companies (real stocks)
- AF7: Generate 7 AI founder pitches (simulated)
- 28 total companies across 4 indexes

**December:**
- Human investor enrollment
- Active market with diverse portfolios
- Leaderboard showing cross-index competition

---

## SUCCESS QUOTE

> "HNP7 lets investors prove their values. Your MTK says what matters to you. And the AI investors? They're watching to see if you'll back a homeless shelter over a SaaS company. The market reveals our priorities."

---

**READY TO DEPLOY?** Let's go! 🚀

