# HNP7 Project Index
## Complete File Reference for Harvard Non-Profit 7 Implementation

**Date:** November 18, 2025  
**Status:** Research & Design Complete → Ready for Deployment  
**Total Documentation:** ~30,000 words, 610+ lines of SQL  

---

## 📁 FILE STRUCTURE

```
/workspaces/rize/
│
├── 📘 SESSION SUMMARY
│   └── SESSION_NOV18_HNP7_RESEARCH_COMPLETE.md  (12,000 words)
│       • Complete session summary
│       • What we accomplished today
│       • Research highlights (Health Leads, PBHA, HSHS)
│       • Technical architecture decisions
│       • Key insights and learnings
│       • Success metrics and timeline
│       → START HERE for full context
│
├── 📗 IMPLEMENTATION GUIDE
│   └── HNP7_IMPLEMENTATION_GUIDE.md  (9,400 words)
│       • Step-by-step deployment plan (4 phases)
│       • Database migration instructions
│       • AI trading integration steps
│       • Testing procedures
│       • Frontend update guide
│       • Monitoring queries
│       • Troubleshooting section
│       • Potential issues & solutions
│       → USE THIS for deployment
│
├── 📙 QUICK REFERENCE
│   └── HNP7_QUICK_REFERENCE.md  (2,100 words)
│       • At-a-glance summary
│       • The 7 non-profits table
│       • Simulated pricing formula
│       • Schema changes summary
│       • Key monitoring queries
│       • Troubleshooting quick guide
│       → KEEP THIS open while working
│
├── 📋 DEPLOYMENT CHECKLIST
│   └── HNP7_DEPLOYMENT_CHECKLIST.md  (5,800 words)
│       • Pre-deployment checks
│       • Phase-by-phase checklist
│       • Verification steps
│       • Success criteria
│       • Troubleshooting guide
│       • Quick reference section
│       → FOLLOW THIS during deployment
│
├── 🎨 VISUAL SUMMARY
│   └── HNP7_VISUAL_SUMMARY.txt  (ASCII art)
│       • Visual overview of system
│       • Four indexes strategy diagram
│       • The 7 non-profits list
│       • Pricing algorithm visual
│       • AI behavior flowchart
│       • Schema changes diagram
│       → SHARE THIS for quick understanding
│
├── 🔬 research/
│   │
│   ├── HNP7_HARVARD_NONPROFITS.md  (6,200 words)
│   │   • Detailed research on 7 organizations
│   │   • Organization profiles:
│   │     - Project Health & Literacy (PHL)
│   │     - Health Leads (HLTH) ⭐ MacArthur Grant
│   │     - Harvard Square Climate Action (HSCA)
│   │     - Phillips Brooks House Association (PBHA) ⭐ 121 years!
│   │     - Harvard Square Homeless Shelter (HSHS) ⭐ 42 years!
│   │     - Room 13 (R13)
│   │     - Harvard Food Literacy Project (HFLP)
│   │   • Founder information
│   │   • Impact metrics
│   │   • Elevator pitches
│   │   • Mission statements
│   │   • Data quality notes
│   │   → REFERENCE for org details
│   │
│   └── HNP7_DATABASE_INSERT.sql  (240 lines)
│       • 7 INSERT statements for HNP7 companies
│       • Initial simulated price records
│       • Verification queries
│       • Schema requirements documented
│       → RUN THIS after schema migration
│
└── 🗄️ supabase/
    └── multi_index_schema_migration.sql  (370 lines)
        • ALTER TABLE statements for new columns
        • CREATE TABLE for simulated_market_orders
        • CREATE INDEX for performance
        • PostgreSQL functions:
          - calculate_simulated_price(ticker)
          - update_simulated_prices()
        • Verification queries
        • Rollback script (if needed)
        → RUN THIS first
```

---

## 🎯 USAGE GUIDE BY ROLE

### If You're Implementing (Developer)
**Read In Order:**
1. `SESSION_NOV18_HNP7_RESEARCH_COMPLETE.md` - Full context (15 min)
2. `HNP7_DEPLOYMENT_CHECKLIST.md` - Step-by-step (keep open)
3. `HNP7_QUICK_REFERENCE.md` - Monitoring queries (keep open)

**Execute:**
1. `/supabase/multi_index_schema_migration.sql`
2. `/research/HNP7_DATABASE_INSERT.sql`
3. Update `/src/app/api/admin/ai-trading/trigger/route.ts`

### If You're Reviewing (PM/Reviewer)
**Read:**
1. `HNP7_VISUAL_SUMMARY.txt` - Quick overview (5 min)
2. `SESSION_NOV18_HNP7_RESEARCH_COMPLETE.md` - Detailed context (20 min)
3. `/research/HNP7_HARVARD_NONPROFITS.md` - See the organizations (10 min)

### If You're Monitoring (Operations)
**Use:**
1. `HNP7_QUICK_REFERENCE.md` - Monitoring queries
2. `HNP7_DEPLOYMENT_CHECKLIST.md` - Phase 4: Monitoring section
3. `HNP7_IMPLEMENTATION_GUIDE.md` - Troubleshooting section

### If You're Curious (Stakeholder)
**Read:**
1. `HNP7_VISUAL_SUMMARY.txt` - Quick overview (5 min)
2. `/research/HNP7_HARVARD_NONPROFITS.md` - The organizations (15 min)

---

## 🔑 KEY CONCEPTS

### The 7 Non-Profits (HNP7)
1. **PHL** - Health education in Boston schools (Education)
2. **HLTH** - Social determinants of health (Healthcare) - National scale!
3. **HSCA** - Campus climate action (Climate)
4. **PBHA** - 121-year student service org (Community)
5. **HSHS** - Student-run homeless shelter (Social Impact)
6. **R13** - Peer mental health support (Social Impact)
7. **HFLP** - Food literacy & gardens (Social Impact)

### Multi-Index System
- **HM7** - Harvard Moguls 7 (existing, real stocks)
- **HNP7** - Harvard Non-Profit 7 (new, simulated)
- **HP7** - Harvard Public 7 (future, real stocks)
- **AF7** - AI Founders 7 (future, simulated)

### Simulated Pricing Algorithm
```
New Price = Base × Demand × Popularity × Volatility
Starting: $100 MTK
Range: $10 - $1,000 MTK
Updates: 2x daily (with AI trading cron)
```

### AI Investor Behavior
- See ALL companies across ALL indexes (14 now, 28 later)
- Filter by category & strategy (not by index)
- Natural diversity emerges from personas
- Examples:
  - Cloud Surfer → Only buys Enterprise/B2B (likely skips HNP7)
  - Diamond Hands → Might hold social ventures long-term
  - YOLO Kid → Could YOLO into anything

---

## 📊 DATABASE SCHEMA SUMMARY

### New Columns in `ai_readable_pitches`
```sql
index_code TEXT          -- 'HM7', 'HNP7', 'HP7', 'AF7'
price_type TEXT          -- 'real_stock', 'simulated'
founder_info TEXT        -- Founder details
impact_metrics TEXT      -- Impact data
mission_statement TEXT   -- Purpose/vision
```

### New Columns in `pitch_market_data`
```sql
price_type TEXT              -- Track pricing method
total_buy_volume INTEGER     -- For demand factor
total_sell_volume INTEGER    -- For demand factor
unique_investors INTEGER     -- For popularity bonus
base_price NUMERIC(10,2)     -- Starting reference
```

### New Table: `simulated_market_orders`
```sql
order_id UUID
ticker TEXT
user_id UUID
order_type TEXT         -- 'buy' or 'sell'
shares INTEGER
price_at_execution NUMERIC
executed_at TIMESTAMP
```

### New Functions
```sql
calculate_simulated_price(ticker) → Returns new price
update_simulated_prices()         → Batch update all
```

---

## 🚀 DEPLOYMENT SEQUENCE

```
1. Pre-Checks (10 min)
   └─ Verify system stable
   └─ Confirm backup access
   └─ Review documentation

2. Database Migration (30 min)
   └─ Run multi_index_schema_migration.sql
   └─ Verify columns added
   └─ Run HNP7_DATABASE_INSERT.sql
   └─ Verify 7 entries created
   └─ Test pricing functions

3. Code Integration (1 hour)
   └─ Update AI trading trigger
   └─ Add simulated price update call
   └─ Add volume tracking (optional)
   └─ Deploy to Vercel

4. Testing (1 hour)
   └─ Manual trigger test
   └─ Verify mixed trading (HM7 + HNP7)
   └─ Check simulated prices changed
   └─ Verify persona compliance
   └─ Test frontend leaderboard

5. Production Monitoring (Ongoing)
   └─ Monitor next cron (Nov 18, 9:30am EST)
   └─ Track HNP7 trading activity
   └─ Watch simulated price movements
   └─ Identify popular non-profits
   └─ Check for issues

TOTAL TIME: 4-5 hours
```

---

## 📈 SUCCESS METRICS

### Day 1 (Today)
- ✅ Schema migration executes without errors
- ✅ 7 HNP7 entries visible in database
- ✅ AI cron includes both HM7 and HNP7 trades
- ✅ Simulated prices change after trading

### Week 1
- ✅ At least 3 different AIs trade HNP7 companies
- ✅ Simulated prices range $80-$120 (reasonable)
- ✅ No cron timeouts or errors
- ✅ Persona compliance maintained

### Week 2
- ✅ Add HP7 (7 more Harvard public companies)
- ✅ Add AF7 (7 AI-generated founder pitches)
- ✅ 28 total companies across 4 indexes
- ✅ Frontend shows all indexes

### Month 1 (December)
- ✅ Active market with diverse portfolios
- ✅ Ready for human investor enrollment
- ✅ Leaderboard shows cross-index competition

---

## 🔗 EXTERNAL REFERENCES

### Related Session Docs
- `/workspaces/rize/SESSION_NOV17_AI_TRADING_COMPLETE.md` - Previous session
- `/workspaces/rize/SYSTEM_SCHEDULES.md` - Cron schedules

### Key SQL Queries
- `/workspaces/rize/supabase/check-pitch-categories.sql` - Check categories
- `/workspaces/rize/supabase/check-cron-persona-compliance.sql` - Verify personas
- `/workspaces/rize/supabase/simple-cron-check.sql` - Recent cron trades

### Code Files (To Be Updated)
- `/workspaces/rize/src/app/api/admin/ai-trading/trigger/route.ts` - Main integration point
- `/workspaces/rize/src/app/api/admin/ai-trading/cron/route.ts` - Cron entry point
- `/workspaces/rize/src/app/compete/page.tsx` - Leaderboard frontend

---

## 💡 QUICK TIPS

### Before Starting
1. Coffee ☕
2. Read `SESSION_NOV18_HNP7_RESEARCH_COMPLETE.md` for full context
3. Keep `HNP7_DEPLOYMENT_CHECKLIST.md` open
4. Have Supabase dashboard ready

### During Deployment
1. Test migration in transaction first (ROLLBACK to verify)
2. Keep rollback script handy (in `multi_index_schema_migration.sql`)
3. Take snapshots at each phase
4. Monitor Vercel logs during deployment

### After Deployment
1. Watch next cron run (Nov 18, 9:30am EST)
2. Check for HNP7 trades in logs
3. Monitor simulated price movements
4. Be ready to adjust if AIs ignore HNP7

### If Things Go Wrong
1. Check troubleshooting section in `HNP7_IMPLEMENTATION_GUIDE.md`
2. Use rollback script if needed
3. Verify existing HM7 still works
4. Review Vercel logs for errors

---

## 🎊 HIGHLIGHTS

### Most Impressive Organization
**Health Leads (HLTH)**
- Founded by Rebecca Onie (Harvard '97) at age 19
- Now operates in 30+ hospitals nationwide
- Founder won MacArthur "Genius Grant"
- Connected 500,000+ patients to $500M+ in resources
- Pioneered "social prescribing" concept

### Oldest Organization
**Phillips Brooks House Association (PBHA)**
- Founded 1904 (121 years!)
- 1,800+ Harvard volunteers annually
- 3,000+ community members served weekly
- 100+ student-run programs
- $2M annual budget, entirely student-managed

### Most Student-Driven
**Harvard Square Homeless Shelter (HSHS)**
- 42 years of continuous operation
- 22 beds, 200+ student volunteers
- Zero government funding (100% student fundraising)
- 70% permanent housing placement success rate
- Entirely run by undergraduates

---

## 🚨 CRITICAL REMINDERS

### DO NOT
- ❌ Change existing HM7 data
- ❌ Modify AI trading cron schedule
- ❌ Break existing persona logic
- ❌ Skip rollback script preparation

### ALWAYS
- ✅ Test migrations in transaction first
- ✅ Verify existing system works after changes
- ✅ Monitor cron runs after deployment
- ✅ Keep documentation updated

### MONITOR
- 📊 AI trading activity on HNP7
- 📊 Simulated price movements
- 📊 Cron execution time (< 55 seconds)
- 📊 Persona compliance

---

## 📞 HANDOFF SUMMARY

**Status:** Research & Design Phase Complete  
**Next Step:** Execute database migration  
**Estimated Time:** 4-5 hours to full integration  
**Risk Level:** Low (comprehensive planning, rollback ready)  
**Next Cron Run:** November 18, 2025 at 9:30am EST (14:30 UTC)  

**Deliverables:**
- ✅ 7 real Harvard non-profits researched
- ✅ Complete database schema designed
- ✅ Simulated pricing algorithm implemented
- ✅ Step-by-step deployment plan
- ✅ ~30,000 words of documentation
- ✅ 610+ lines of production-ready SQL

**Ready to deploy when you are!** 🚀

---

## 📚 DOCUMENT STATS

| Document | Words | Purpose | Audience |
|----------|-------|---------|----------|
| SESSION_NOV18 | 12,000 | Complete session summary | All |
| IMPLEMENTATION_GUIDE | 9,400 | Deployment instructions | Developers |
| QUICK_REFERENCE | 2,100 | Cheat sheet | Operations |
| DEPLOYMENT_CHECKLIST | 5,800 | Step-by-step execution | Implementers |
| VISUAL_SUMMARY | 1,500 | Quick overview | Stakeholders |
| HARVARD_NONPROFITS | 6,200 | Organization research | Researchers |
| DATABASE_INSERT | (SQL) | Data insertion | Database |
| SCHEMA_MIGRATION | (SQL) | Schema changes | Database |

**Total:** ~37,000 words + 610 lines of SQL

---

**This is everything you need to deploy HNP7.** 🎯  
**All research, design, and planning complete.**  
**Ready to execute!** 🚀

