// Shared price cache for Edge Runtime
// This will be shared across all API routes in the same Edge Runtime instance

export interface CachedPrice {
  price: number;
  timestamp: number;
}

export const priceCache = new Map<string, CachedPrice>();
export const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchPriceWithCache(
  ticker: string,
  pitchId: number,
  apiKey: string
): Promise<number> {
  const cached = priceCache.get(ticker);
  const now = Date.now();
  
  // Return cached price if still valid
  if (cached && (now - cached.timestamp) < PRICE_CACHE_TTL) {
    console.log(`[PriceCache] ✅ Hit for ${ticker}: $${cached.price} (age: ${Math.floor((now - cached.timestamp) / 1000)}s)`);
    return cached.price;
  }
  
  // Cache miss or expired - fetch from Finnhub
  try {
    const timestamp = Date.now();
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}&_=${timestamp}`,
      { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }
    );
    
    if (!response.ok) {
      const errorMsg = `Finnhub API error: ${response.status} ${response.statusText}`;
      console.error(`[PriceCache] ❌ ${errorMsg} for ${ticker}`);
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    console.log(`[PriceCache] 📡 Finnhub response for ${ticker}:`, data);
    
    if (data.c && data.c > 0) {
      // Valid price - update cache
      priceCache.set(ticker, { price: data.c, timestamp: now });
      console.log(`[PriceCache] ✅ Fresh fetch for ${ticker}: $${data.c}`);
      return data.c;
    } else {
      console.warn(`[PriceCache] ⚠️ Invalid Finnhub data for ${ticker}:`, data);
      // Invalid data from Finnhub - use stale cache if available
      if (cached) {
        console.warn(`[PriceCache] 🔄 Using stale cache for ${ticker}: $${cached.price} (age: ${Math.floor((now - cached.timestamp) / 1000)}s)`);
        return cached.price;
      }
      throw new Error(`Invalid Finnhub data for ${ticker} (c=${data.c}) and no cache available`);
    }
  } catch (error) {
    console.error(`[PriceCache] ❌ Error fetching ${ticker}:`, error);
    // Use stale cache if available (even if very old)
    if (cached) {
      const ageMinutes = Math.floor((now - cached.timestamp) / 60000);
      console.warn(`[PriceCache] 🔄 Using STALE cache for ${ticker}: $${cached.price} (age: ${ageMinutes} min)`);
      return cached.price;
    }
    // No cache at all - throw error so caller uses database fallback
    throw error;
  }
}
