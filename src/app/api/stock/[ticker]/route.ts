import { NextRequest, NextResponse } from 'next/server';


// Force dynamic rendering - don't pre-render at build time
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker;
  const apiKey = process.env.STOCK_API_KEY;
  
  // Check if this is a manual refresh request (has timestamp param)
  const { searchParams } = new URL(request.url);
  const isManualRefresh = searchParams.has('t');

  // If no API key, return mock data
  if (!apiKey) {
    const mockData: { [key: string]: any } = {
      'META': { c: 497.43, d: 5.23, dp: 1.06 },
      'MSFT': { c: 415.89, d: -2.15, dp: -0.51 },
      'DBX': { c: 24.67, d: 0.43, dp: 1.77 }
    };
    
    return NextResponse.json(mockData[ticker] || { c: 0, d: 0, dp: 0 });
  }

  try {
    // Fetch from Finnhub API with aggressive cache-busting
    const timestamp = Date.now();
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}&_=${timestamp}`,
      { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );

    if (!response.ok) {
      console.error(`[Stock API] Finnhub error for ${ticker}:`, response.status, response.statusText);
      throw new Error(`Failed to fetch stock price: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Stock API] Finnhub response for ${ticker}:`, data);

    // Check if we got valid data
    if (!data.c || data.c === 0) {
      console.warn(`[Stock API] Invalid/zero price for ${ticker}, data:`, data);
      // Return last known good price or a reasonable fallback
      const fallbackPrices: { [key: string]: number } = {
        'META': 621.71,
        'MSFT': 496.82,
        'ABNB': 116.06,
        'NET': 199.61,
        'GRAB': 5.33,
        'MRNA': 24.86,
        'KVYO': 27.47,
        'AFRM': 66.67,
        'PTON': 7.19,
        'ASAN': 12.10,
        'LYFT': 21.63,
        'TDUP': 7.47,
        'KIND': 2.06,
        'RENT': 4.53
      };
      
      if (!fallbackPrices[ticker]) {
        console.error(`[Stock API] No fallback price for ${ticker}`);
        return NextResponse.json(
          { error: 'Stock price unavailable' },
          { status: 503 }
        );
      }
      
      return NextResponse.json({
        c: fallbackPrices[ticker],
        d: 0,
        dp: 0,
        _fallback: true,
        _reason: 'Invalid price from Finnhub'
      });
    }

    // Finnhub returns: { c: current, d: change, dp: changePercent }
    const result = {
      c: data.c,   // current price
      d: data.d,   // change
      dp: data.dp  // change percent
    };
    
    // Return with appropriate cache headers
    // Cache at CDN/browser level for 5 minutes unless manual refresh
    return NextResponse.json(result, {
      headers: isManualRefresh ? {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      } : {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });

  } catch (error) {
    console.error(`Error fetching stock price for ${ticker}:`, error);
    
    // Return fallback with last known good prices
    const fallbackPrices: { [key: string]: number } = {
      'META': 621.71,
      'MSFT': 496.82,
      'ABNB': 116.06,
      'NET': 199.61,
      'GRAB': 5.33,
      'MRNA': 24.86,
      'KVYO': 27.47,
      'AFRM': 66.67,
      'PTON': 7.19,
      'ASAN': 12.10,
      'LYFT': 21.63,
      'TDUP': 7.47,
      'KIND': 2.06,
      'RENT': 4.53
    };
    
    if (!fallbackPrices[ticker]) {
      console.error(`[Stock API] No fallback price for ${ticker}`);
      return NextResponse.json(
        { error: 'Stock price unavailable' },
        { status: 503 }
      );
    }
    
    return NextResponse.json({
      c: fallbackPrices[ticker],
      d: 0,
      dp: 0,
      _fallback: true,
      _error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
