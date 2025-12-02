import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Use fresh client to avoid caching
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
  );
  
  try {
    // Get recent trades (last 50)
    const { data: recentTrades, error: tradesError } = await supabase
      .from('investment_transactions')
      .select(`
        id,
        user_id,
        pitch_id,
        transaction_type,
        shares,
        price_per_share,
        total_amount
      `)
      .order('id', { ascending: false })
      .limit(50);
    
    console.log('[Trading Activity] Query result:', {
      tradesCount: recentTrades?.length,
      hasError: !!tradesError,
      errorMessage: tradesError?.message
    });

    if (tradesError) {
      console.error('Error fetching trades:', tradesError);
      throw tradesError;
    }

    // If no trades, return empty data
    if (!recentTrades || recentTrades.length === 0) {
      return NextResponse.json({
        recentActivity: [],
        topInvestors: [],
        timestamp: new Date().toISOString()
      });
    }

    // Get user details for those trades
    const userIds = Array.from(new Set(recentTrades.map(t => t.user_id)));
    const { data: users, error: usersError } = await supabase
      .from('user_token_balances')
      .select('user_id, username, display_name, is_ai_investor, ai_emoji')
      .in('user_id', userIds);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    // Get pitch details
    const pitchIds = Array.from(new Set(recentTrades.map(t => t.pitch_id)));
    const { data: pitches, error: pitchesError} = await supabase
      .from('pitch_market_data')
      .select('pitch_id, ticker, company_name')
      .in('pitch_id', pitchIds);

    if (pitchesError) {
      console.error('Error fetching pitches:', pitchesError);
      // Don't throw - continue with empty pitches
    }
    
    console.log('[Trading Activity] Pitches:', {
      pitchesCount: pitches?.length,
      pitchIds: pitchIds.length
    });

    // Combine data
    const enrichedTrades = recentTrades?.map(trade => {
      const user = users?.find(u => u.user_id === trade.user_id);
      const pitch = pitches?.find(p => p.pitch_id === trade.pitch_id);
      
      return {
        id: trade.id,
        type: trade.transaction_type,
        investorName: user?.is_ai_investor 
          ? `${user.ai_emoji || '🤖'} ${user.display_name}` 
          : user?.username || 'Unknown',
        isAI: user?.is_ai_investor || false,
        ticker: pitch?.ticker || `PITCH-${trade.pitch_id}`,
        companyName: pitch?.company_name || 'Unknown',
        shares: trade.shares,
        pricePerShare: trade.price_per_share,
        totalAmount: trade.total_amount,
        timestamp: new Date().toISOString() // We'll add created_at column later
      };
    }) || [];

    // Get portfolio snapshots for the last 7 days (we'll build this feature next)
    // For now, return current portfolio values
    const { data: currentPortfolios, error: portfolioError } = await supabase
      .from('user_token_balances')
      .select('user_id, username, display_name, is_ai_investor, available_tokens, portfolio_value')
      .order('portfolio_value', { ascending: false })
      .limit(10);

    if (portfolioError) throw portfolioError;

    return NextResponse.json({
      recentActivity: enrichedTrades.slice(0, 20), // Last 20 trades
      topInvestors: currentPortfolios?.map(inv => ({
        name: inv.is_ai_investor ? inv.display_name : inv.username,
        isAI: inv.is_ai_investor,
        portfolioValue: inv.portfolio_value,
        cash: inv.available_tokens
      })) || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Trading activity API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trading activity' },
      { status: 500 }
    );
  }
}
