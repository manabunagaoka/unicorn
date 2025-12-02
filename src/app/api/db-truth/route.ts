import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * DB TRUTH API - Shows exactly what's in the database without any live price calculations
 * This is the source of truth for what the database believes
 */
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
    // Get Cloud Surfer's balance
    const { data: balance, error: balanceError } = await supabase
      .from('user_token_balances')
      .select('*')
      .eq('user_id', 'ai_cloud')
      .single();

    if (balanceError) throw balanceError;

    // Get ALL investment rows (to see if there are duplicates)
    const { data: allInvestments, error: invError } = await supabase
      .from('user_investments')
      .select('*')
      .eq('user_id', 'ai_cloud')
      .gt('shares_owned', 0)
      .order('pitch_id, updated_at', { ascending: false });

    if (invError) throw invError;

    // Deduplicate: keep most recent per pitch_id
    const investmentMap = new Map<number, any>();
    allInvestments?.forEach(inv => {
      const existing = investmentMap.get(inv.pitch_id);
      if (!existing || new Date(inv.updated_at) > new Date(existing.updated_at)) {
        investmentMap.set(inv.pitch_id, inv);
      }
    });
    const deduplicatedInvestments = Array.from(investmentMap.values());

    // Calculate using database stored values (no live prices)
    const dbHoldingsValue = deduplicatedInvestments.reduce((sum, inv) => {
      return sum + (inv.current_value || 0);
    }, 0);

    const dbCash = balance.available_tokens || 0;
    const dbTotal = dbCash + dbHoldingsValue;

    return NextResponse.json({
      user_id: balance.user_id,
      display_name: balance.display_name,
      
      database_raw: {
        cash_with_decimals: dbCash,
        cash_floored: Math.floor(dbCash),
        holdings_value: dbHoldingsValue,
        total_value: dbTotal,
        total_value_floored: Math.floor(dbTotal)
      },
      
      all_investment_rows: allInvestments?.map(inv => ({
        pitch_id: inv.pitch_id,
        shares_owned: inv.shares_owned,
        current_value: inv.current_value,
        updated_at: inv.updated_at
      })),
      
      deduplicated_investments: deduplicatedInvestments.map(inv => ({
        pitch_id: inv.pitch_id,
        shares_owned: inv.shares_owned,
        avg_purchase_price: inv.avg_purchase_price,
        total_invested: inv.total_invested,
        current_value_in_db: inv.current_value,
        updated_at: inv.updated_at
      })),
      
      summary: {
        total_investment_rows: allInvestments?.length || 0,
        unique_positions: deduplicatedInvestments.length,
        has_duplicates: (allInvestments?.length || 0) !== deduplicatedInvestments.length
      },
      
      _note: 'This uses ONLY database stored values. current_value is STALE from when trades happened.'
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });

  } catch (error) {
    console.error('[DBTruth] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch database truth', details: String(error) },
      { status: 500 }
    );
  }
}
