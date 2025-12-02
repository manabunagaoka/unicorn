import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchPriceWithCache } from '@/lib/price-cache';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: { persistSession: false },
      db: { schema: 'public' }
    }
  );

  try {
    // Get Cloud Surfer from user_token_balances
    const { data: cloudSurfer } = await supabase
      .from('user_token_balances')
      .select('*')
      .ilike('display_name', '%Cloud%Surfer%')
      .single();

    if (!cloudSurfer) {
      return NextResponse.json({ error: 'Cloud Surfer not found' }, { status: 404 });
    }

    // Get investments
    const { data: investments } = await supabase
      .from('user_investments')
      .select('*')
      .eq('user_id', cloudSurfer.user_id)
      .gt('shares_owned', 0);

    const tickerMap: { [key: number]: string } = {
      1: 'META', 2: 'MSFT', 3: 'DBX', 4: 'AKAM', 5: 'RDDT',
      6: 'WRBY', 7: 'BKNG'
    };

    // Calculate holdings value the CORRECT way (same as all APIs should)
    let holdingsValue = 0;
    const investmentDetails = [];

    for (const inv of investments || []) {
      const ticker = tickerMap[inv.pitch_id];
      let currentPrice = 100;
      
      if (ticker && process.env.STOCK_API_KEY) {
        try {
          currentPrice = await fetchPriceWithCache(ticker, inv.pitch_id, process.env.STOCK_API_KEY);
        } catch (error) {
          console.error(`Error fetching price for ${ticker}:`, error);
        }
      }

      const value = Math.floor(inv.shares_owned * currentPrice);
      holdingsValue += value;

      investmentDetails.push({
        pitch_id: inv.pitch_id,
        ticker: ticker || 'UNKNOWN',
        shares: inv.shares_owned,
        price: currentPrice,
        value: value,
        db_current_value: inv.current_value // What's stored in DB (might be stale)
      });
    }

    const cash = Math.floor(cloudSurfer.available_tokens || 0);
    const totalValue = cash + holdingsValue;

    return NextResponse.json({
      display_name: cloudSurfer.display_name,
      user_id: cloudSurfer.user_id,
      
      calculated_correct: {
        cash: cash,
        holdings: holdingsValue,
        total: totalValue,
        num_investments: investments?.length || 0
      },

      database_raw: {
        available_tokens: cloudSurfer.available_tokens,
        total_invested: cloudSurfer.total_invested,
        updated_at: cloudSurfer.updated_at
      },

      investments: investmentDetails,

      summary: `Cash: $${cash.toLocaleString()}, Holdings: $${holdingsValue.toLocaleString()}, Total: $${totalValue.toLocaleString()}`
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
