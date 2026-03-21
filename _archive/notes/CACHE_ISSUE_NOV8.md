# Cache Issue - November 8, 2025 [RESOLVED]

## Problem ✅ FIXED
Portfolio prices showed $100 (fallback) or stale prices when navigating back to Manage page after trading. Prices would refresh correctly after **exactly 60 seconds** or when switching browser tabs.

## Root Cause [IDENTIFIED]
**NOT Vercel caching** - The server timestamps were fresh (0 seconds staleness).

**Actual cause**: Finnhub API intermittently returns invalid/empty data (`{ c: 0 }` or slow responses), causing the code to fall back to the hardcoded $100 default price. When navigating back and forth, eventually Finnhub would return valid data.

## Solution Implemented ✅

### 5-Minute Server-Side Price Cache
Added an in-memory cache in the Edge Runtime that stores last known good prices:

```typescript
const priceCache = new Map<string, { price: number; timestamp: number }>();
const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

**How it works:**
1. **First fetch**: Calls Finnhub, caches the valid price
2. **Subsequent fetches**: Uses cached price if Finnhub fails or returns invalid data
3. **Cache expiry**: 5 minutes (refreshes automatically)
4. **Graceful degradation**: Falls back to stale cache if Finnhub is down

### Benefits
- ✅ No more $100 fallback prices
- ✅ Instant price display on navigation (uses cache)
- ✅ Survives Finnhub API delays/failures
- ✅ Cache persists across Edge Runtime requests
- ✅ Automatic refresh every 5 minutes

## Verification
Console logs now show:
```javascript
{
  price_source: 'cache',        // or 'finnhub', 'stale-cache', 'fallback'
  current_price: 621.71,         // Real price, not $100
  is_fallback: false,
  stalenessSeconds: 0            // Server response is fresh
}
```

## Files Modified (Final)

### 1. ✅ Fixed Invalid Finnhub API Key
- Old key was invalid/expired
- Updated with new working key

## Diagnostic Journey (What We Learned)

### Initial Hypothesis: Vercel Caching ❌
Suspected Vercel was caching API responses for 60 seconds despite headers.

### Tests Performed:
1. ✅ Added Edge Runtime (`export const runtime = 'edge'`)
2. ✅ Added aggressive cache-busting headers on server and client
3. ✅ Added staleness detection (compared server timestamp to client time)
4. ✅ Added auto-retry logic for stale responses

### Key Discovery:
**Server timestamps showed 0 seconds staleness** → Vercel was NOT caching!

The real issue was Finnhub API returning invalid data intermittently, causing fallback to $100.

## Files Modified (Final)

## What Works

## Diagnostic Journey (What We Learned)

### Initial Hypothesis: Vercel Caching ❌
Suspected Vercel was caching API responses for 60 seconds despite headers.

### Tests Performed:
1. ✅ Added Edge Runtime (`export const runtime = 'edge'`)
2. ✅ Added aggressive cache-busting headers on server and client
3. ✅ Added staleness detection (compared server timestamp to client time)
4. ✅ Added auto-retry logic for stale responses

### Key Discovery:
**Server timestamps showed 0 seconds staleness** → Vercel was NOT caching!

The real issue was Finnhub API returning invalid data intermittently, causing fallback to $100.

## Files Modified (Final)
- `/src/app/api/portfolio/route.ts` - Added 5-minute price cache with fallback logic
- `/src/components/Portfolio.tsx` - Added staleness detection, auto-retry, and price source logging
- `/src/app/api/news/route.ts` - Fixed to return empty array instead of 500 error
- `/src/app/api/debug-prices/route.ts` - Added debug endpoint to test Finnhub directly

## Test Results ✅
After deployment:
- ✅ Prices show immediately on navigation (cache hit)
- ✅ All prices are real values (not $100)
- ✅ `price_source: 'cache'` confirms cache is working
- ✅ No 60-second delay
- ✅ Console shows `stalenessSeconds: 0` (server responses are fresh)

## Bonus Fix
Fixed `/api/news` endpoint to gracefully handle missing `news_posts` table instead of throwing 500 errors.

