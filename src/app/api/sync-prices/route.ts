import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';


// Force dynamic rendering - don't pre-render at build time
export const dynamic = 'force-dynamic';
// Mapping of pitch IDs to ticker symbols (HM14 - Harvard Magnificent 14)
const PITCH_TICKERS: Record<number, string | null> = {
  1: 'META',      // Meta Platforms
  2: 'MSFT',      // Microsoft
  3: 'ABNB',      // Airbnb
  4: 'NET',       // Cloudflare
  5: 'GRAB',      // Grab Holdings
  6: 'MRNA',      // Moderna
  7: 'KVYO',      // Klaviyo
  8: 'AFRM',      // Affirm
  9: 'PTON',      // Peloton
  10: 'ASAN',     // Asana
  11: 'LYFT',     // Lyft
  12: 'TDUP',     // ThredUp
  13: 'KIND',     // Nextdoor
  14: 'RENT',     // Rent the Runway
};

export async function POST(request: Request) {
  try {
    // Initialize Supabase client at runtime (not at module level)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    console.log('🔄 Starting price sync...');
    
    // Fetch current prices for all public companies
    const priceUpdates = await Promise.all(
      Object.entries(PITCH_TICKERS).map(async ([pitchId, ticker]) => {
        // All HM14 companies are public with tickers
        if (!ticker) {
          throw new Error(`No ticker for pitch ${pitchId}`);
        }

        try {
          // Fetch real stock price from our stock API
          const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/stock/${ticker}`);
          const data = await response.json();
          
          if (data.c && data.c > 0) {
            console.log(`✅ ${ticker}: $${data.c}`);
            return { pitchId: parseInt(pitchId), price: data.c };
          } else {
            console.error(`⚠️ ${ticker}: No valid price data received:`, data);
            throw new Error(`No valid price for ${ticker}`);
          }
        } catch (error) {
          console.error(`❌ Error fetching price for ${ticker}:`, error);
          throw error; // Don't fallback to $100, let it fail
        }
      })
    );

    // Update database with real prices
    for (const update of priceUpdates) {
      const { error } = await supabase
        .from('pitch_market_data')
        .update({ 
          current_price: update.price,
          updated_at: new Date().toISOString()
        })
        .eq('pitch_id', update.pitchId);

      if (error) {
        console.error(`Failed to update pitch ${update.pitchId}:`, error);
      }
    }

    // Recalculate investor tiers with updated prices
    console.log('🏆 Recalculating investor tiers...');
    const { error: tierError } = await supabase.rpc('award_investor_tiers');
    
    if (tierError) {
      console.error('❌ Error recalculating tiers:', tierError);
    } else {
      console.log('✅ Tiers recalculated with real-time prices');
    }

    console.log('✅ Price sync complete!');

    return NextResponse.json({ 
      success: true, 
      message: 'Prices synced and tiers recalculated',
      updates: priceUpdates
    });
  } catch (error) {
    console.error('Error syncing prices:', error);
    return NextResponse.json(
      { error: 'Failed to sync prices' },
      { status: 500 }
    );
  }
}

// Allow GET requests to trigger sync as well
export async function GET(request: Request) {
  return POST(request);
}
