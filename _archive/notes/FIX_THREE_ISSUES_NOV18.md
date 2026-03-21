# Three-Part Fix: Categories, YOLO Bug, and Sector System
**Date:** November 18, 2025

---

## 🔧 FIX #1: RECATEGORIZE META & RDDT (IMMEDIATE)

### **Issue:**
META and RDDT labeled as "Social Impact" when they're clearly consumer social media platforms.

### **SQL Fix:**
```sql
-- Recategorize META and RDDT to Consumer
UPDATE ai_readable_pitches 
SET category = 'Consumer' 
WHERE ticker IN ('META', 'RDDT');

-- Verify the fix
SELECT 
  category,
  COUNT(*) as companies,
  STRING_AGG(ticker, ', ' ORDER BY ticker) as tickers
FROM ai_readable_pitches
WHERE ticker IS NOT NULL
GROUP BY category
ORDER BY category;
```

### **Expected Result After Fix:**
- **Consumer:** 4 companies (BKNG, WRBY, META, RDDT)
- **Enterprise/B2B:** 3 companies (MSFT, DBX, AKAM)
- **Social Impact:** 0 companies (awaiting HSV7)

---

## 🐛 FIX #2: YOLO KID NULL SHARES BUG

### **Issue:**
YOLO Kid returned `shares: null` in this morning's cron, resulting in failed trade and only $9 cash remaining.

### **Root Cause Analysis:**

**The Flow:**
1. GPT-4o-mini receives prompt with YOLO Kid rules (80-95% position)
2. GPT calculates shares in JSON response
3. Code parses JSON: `decision.shares`
4. If `decision.shares` is null/undefined → Trade fails but gets logged

**Possible Causes:**
1. **GPT returned null in JSON** - GPT-4o-mini hallucinated or misunderstood
2. **JSON parsing error** - Response wasn't valid JSON
3. **Price data missing** - GPT couldn't calculate shares without price

### **Diagnostic Query:**
```sql
-- Get YOLO Kid's exact decision from this morning
SELECT 
  execution_timestamp AT TIME ZONE 'America/New_York' as est_time,
  ai_nickname,
  decision_action,
  decision_shares,
  decision_pitch_id,
  decision_reasoning,
  gpt_raw_response,
  gpt_prompt
FROM ai_trading_logs
WHERE ai_nickname = 'YOLO Kid'
AND triggered_by = 'cron'
AND execution_timestamp >= '2025-11-18 14:20:00+00'
ORDER BY execution_timestamp DESC
LIMIT 1;
```

### **Code Fix (Defensive Programming):**

**Location:** `/src/app/api/admin/ai-trading/trigger/route.ts`

**Add validation after JSON parse:**

```typescript
// After line ~281: const decision = JSON.parse(rawResponse);

// Validate shares for BUY actions
if (decision.action === 'BUY' && (!decision.shares || decision.shares <= 0)) {
  console.error(`Invalid shares from ${aiInvestor.ai_nickname}: ${decision.shares}`);
  
  // Fallback: Calculate shares based on strategy
  const { data: priceData } = await supabase
    .from('pitch_market_data')
    .select('current_price')
    .eq('pitch_id', decision.pitch_id)
    .single();
    
  if (priceData?.current_price) {
    const limits = getPositionLimits(aiInvestor.ai_strategy, aiInvestor.available_tokens);
    const targetAmount = (limits.min + limits.max) / 2; // Use midpoint
    decision.shares = Math.floor(targetAmount / priceData.current_price * 100) / 100;
    
    console.log(`Auto-calculated shares for ${aiInvestor.ai_nickname}: ${decision.shares}`);
    decision.reasoning += ' [Auto-calculated shares due to invalid GPT response]';
  } else {
    // Ultimate fallback: HOLD
    decision.action = 'HOLD';
    decision.reasoning = 'Invalid trade parameters - holding position';
  }
}
```

### **Improved Prompt (Make it More Explicit):**

**Location:** Around line ~250-260 in prompt construction

**Change this:**
```typescript
{
  "action": "BUY" | "SELL" | "HOLD",
  "pitch_id": number (1-7),
  "shares": number (calculate from your budget / stock price),
  "reasoning": "Brief explanation"
}
```

**To this:**
```typescript
{
  "action": "BUY" | "SELL" | "HOLD",
  "pitch_id": number (1-7),
  "shares": number (REQUIRED if BUY/SELL - calculate as: budget_in_MTK / current_price. Example: 50000 / 29.10 = 1718.21),
  "reasoning": "Brief explanation"
}

CRITICAL: If action is BUY or SELL, you MUST calculate and include the "shares" field as a positive number.
```

---

## 🏗️ FIX #3: DESIGN BETTER CATEGORY/SECTOR SYSTEM

### **Current Problem:**
- Only 3 business-model categories (Enterprise/B2B, Consumer, Social Impact)
- Too broad for 28 companies (4 indexes × 7 companies)
- Doesn't align with traditional investment sectors
- Confusing for human investors

### **Proposed Solution: DUAL-DIMENSION SYSTEM**

Add **both** `category` (for AI filtering) and `sector` (for display/human understanding):

```sql
-- Add sector column
ALTER TABLE ai_readable_pitches 
ADD COLUMN IF NOT EXISTS sector TEXT;

-- Create index
CREATE INDEX IF NOT EXISTS idx_pitches_sector 
ON ai_readable_pitches(sector);
```

### **The Two Dimensions:**

#### **CATEGORY (AI Filtering)**
Used by AI personas to filter companies:
- `Enterprise/B2B` - Cloud Surfer, Silicon Brain filter here
- `Consumer` - Consumer-focused AIs filter here
- `Healthcare` - Healthcare-focused AIs filter here
- `Education` - Education-focused AIs filter here
- `Climate` - Climate/sustainability focused
- `Social Impact` - Mission-driven, non-profit, B-Corps

#### **SECTOR (Human Display)**
Traditional investment sectors for human understanding:
- `Technology`
- `Healthcare`
- `Education`
- `Financial Services`
- `Travel & Hospitality`
- `Media & Social`
- `Consumer Goods`
- `Climate & Sustainability`
- `Infrastructure`

### **Example Mapping:**

| Ticker | Company | Category | Sector | Price Type |
|--------|---------|----------|--------|------------|
| MSFT | Microsoft | Enterprise/B2B | Technology | real_stock |
| DBX | Dropbox | Enterprise/B2B | Technology | real_stock |
| AKAM | Akamai | Enterprise/B2B | Technology | real_stock |
| META | Meta | Consumer | Media & Social | real_stock |
| RDDT | Reddit | Consumer | Media & Social | real_stock |
| BKNG | Booking.com | Consumer | Travel & Hospitality | real_stock |
| WRBY | Warby Parker | Consumer | Consumer Goods | real_stock |

### **For HSV7 (AI Social Ventures):**

| Ticker | Company | Category | Sector | Price Type |
|--------|---------|----------|--------|------------|
| LBDG | LearnBridge | Education | Education | simulated |
| MDAC | MedAccess | Healthcare | Healthcare | simulated |
| GRCL | GreenCycle | Climate | Climate & Sustainability | simulated |
| SKSH | SkillShift | Social Impact | Education | simulated |
| FTHR | FairThread | Consumer | Consumer Goods | simulated |
| LRTF | LocalRoots | Social Impact | Climate & Sustainability | simulated |
| HSNW | HouseNow | Social Impact | Social Services | simulated |

### **AI Prompt Updates:**

**Old (Business Model):**
```typescript
'SAAS_ONLY': 'Only buy category="Enterprise/B2B"'
```

**New (More Specific):**
```typescript
'SAAS_ONLY': 'Only buy companies with category="Enterprise/B2B" AND sector="Technology"'
```

This allows for:
- Enterprise/B2B + Healthcare (MedAccess - B2B healthcare SaaS)
- Enterprise/B2B + Education (LearnBridge - EdTech SaaS)
- Enterprise/B2B + Technology (Microsoft, Dropbox - traditional B2B)

### **Benefits:**

1. **For AI Investors:**
   - Clear filtering criteria
   - Can combine category + sector for nuance
   - Scalable to 28+ companies

2. **For Human Investors:**
   - Familiar sector names
   - Easier portfolio diversification
   - Matches real investment platforms

3. **For Platform:**
   - Better analytics (sector performance)
   - More intuitive UI ("filter by sector")
   - Future-proof (can add more categories/sectors)

### **Implementation SQL:**

```sql
-- Step 1: Add sector column
ALTER TABLE ai_readable_pitches 
ADD COLUMN IF NOT EXISTS sector TEXT;

-- Step 2: Populate existing HM7 companies
UPDATE ai_readable_pitches SET sector = 'Technology' WHERE ticker IN ('MSFT', 'DBX', 'AKAM');
UPDATE ai_readable_pitches SET sector = 'Media & Social' WHERE ticker IN ('META', 'RDDT');
UPDATE ai_readable_pitches SET sector = 'Travel & Hospitality' WHERE ticker = 'BKNG';
UPDATE ai_readable_pitches SET sector = 'Consumer Goods' WHERE ticker = 'WRBY';

-- Step 3: Also fix categories while we're at it
UPDATE ai_readable_pitches SET category = 'Consumer' WHERE ticker IN ('META', 'RDDT');

-- Step 4: Verify
SELECT 
  ticker,
  company_name,
  category,
  sector,
  current_price
FROM ai_readable_pitches
WHERE ticker IS NOT NULL
ORDER BY sector, category, ticker;
```

---

## 📋 IMPLEMENTATION CHECKLIST

### **Immediate (Today):**
- [ ] Run SQL to fix META/RDDT categories
- [ ] Query YOLO Kid's gpt_raw_response from this morning
- [ ] Add defensive validation for null shares

### **This Week:**
- [ ] Add sector column to database
- [ ] Populate sector for existing HM7 companies
- [ ] Update AI trading prompt to be more explicit about shares calculation
- [ ] Test YOLO Kid with manual trigger

### **Before HSV7 Deployment:**
- [ ] Finalize category + sector mapping for 28 companies
- [ ] Update AI persona prompts to use both dimensions
- [ ] Create frontend UI for sector filtering
- [ ] Update documentation

---

## 🎯 EXPECTED OUTCOMES

### **After Fix #1 (Categories):**
- More balanced category distribution
- Fewer AIs pile into same stock
- META/RDDT correctly categorized

### **After Fix #2 (YOLO Bug):**
- YOLO Kid always has valid shares
- Fallback calculation prevents null trades
- Better error logging for debugging

### **After Fix #3 (Sector System):**
- 28 companies organized clearly
- AI filtering more precise
- Human UX more intuitive
- Platform ready for long-term growth

---

## 📊 VERIFICATION QUERIES

### **Check Category Distribution:**
```sql
SELECT 
  category,
  sector,
  COUNT(*) as companies,
  STRING_AGG(ticker, ', ' ORDER BY ticker) as tickers
FROM ai_readable_pitches
WHERE ticker IS NOT NULL
GROUP BY category, sector
ORDER BY category, sector;
```

### **Check YOLO Kid Last 5 Trades:**
```sql
SELECT 
  execution_timestamp AT TIME ZONE 'America/New_York' as est_time,
  decision_action,
  decision_shares,
  decision_pitch_id,
  LEFT(decision_reasoning, 100) as reasoning
FROM ai_trading_logs
WHERE ai_nickname = 'YOLO Kid'
ORDER BY execution_timestamp DESC
LIMIT 5;
```

### **Check Current Portfolio Value Distribution:**
```sql
SELECT 
  ai_nickname,
  available_tokens as cash,
  portfolio_value,
  available_tokens + portfolio_value as total,
  ROUND((portfolio_value / NULLIF(available_tokens + portfolio_value, 0) * 100), 1) as portfolio_pct
FROM user_token_balances
WHERE is_ai_investor = true
ORDER BY total DESC;
```

---

**Ready to implement all three fixes?** Let's start with the quick SQL updates.
