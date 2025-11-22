import { NextResponse } from 'next/server';


// Force dynamic rendering - don't pre-render at build time
export const dynamic = 'force-dynamic';
// Market cap data fetched from Finnhub API
// Returns real-time market capitalization for HM7 companies

const TICKER_MAP: { [key: string]: string } = {
  'META': 'Meta Platforms',
  'MSFT': 'Microsoft',
  'ABNB': 'Airbnb',
  'NET': 'Cloudflare',
  'GRAB': 'Grab Holdings',
  'MRNA': 'Moderna',
  'KVYO': 'Klaviyo',
  'AFRM': 'Affirm',
  'PTON': 'Peloton',
  'ASAN': 'Asana',
  'LYFT': 'Lyft',
  'TDUP': 'ThredUp',
  'KIND': 'Nextdoor',
  'RENT': 'Rent the Runway'
};

export async function GET() {
  try {
    const apiKey = process.env.STOCK_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Fetch market cap for all HM7 tickers
    const marketCapPromises = Object.keys(TICKER_MAP).map(async (ticker) => {
      try {
        // Finnhub profile2 endpoint gives us market capitalization
        const response = await fetch(
          `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${apiKey}`,
          { 
            cache: 'no-store' // Don't use next.revalidate in API routes
          }
        );
        
        const data = await response.json();
        
        // marketCapitalization is in millions, convert to actual number
        const marketCap = data.marketCapitalization ? data.marketCapitalization * 1000000 : 0;
        
        return {
          ticker,
          name: TICKER_MAP[ticker],
          marketCap,
          // Format for display (1.2T, 3.1T, 10B, etc.)
          valuationDisplay: formatMarketCap(marketCap)
        };
      } catch (error) {
        console.error(`Failed to fetch market cap for ${ticker}:`, error);
        return {
          ticker,
          name: TICKER_MAP[ticker],
          marketCap: 0,
          valuationDisplay: 'N/A'
        };
      }
    });

    const marketCaps = await Promise.all(marketCapPromises);
    
    // Convert to object for easy lookup
    const marketCapData = marketCaps.reduce((acc, item) => {
      acc[item.ticker] = item;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json(marketCapData);
    
  } catch (error) {
    console.error('Error fetching market caps:', error);
    return NextResponse.json({ error: 'Failed to fetch market caps' }, { status: 500 });
  }
}

// Format market cap for display
function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1000000000000) {
    // Trillions
    return `$${(marketCap / 1000000000000).toFixed(1)}T`;
  } else if (marketCap >= 1000000000) {
    // Billions
    return `$${(marketCap / 1000000000).toFixed(1)}B`;
  } else if (marketCap >= 1000000) {
    // Millions
    return `$${(marketCap / 1000000).toFixed(1)}M`;
  } else {
    return '$0';
  }
}
