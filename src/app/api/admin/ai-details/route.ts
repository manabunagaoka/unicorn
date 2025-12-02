import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchPriceWithCache } from '@/lib/price-cache';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Get detailed AI investor info including trading logs
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: { persistSession: false },
      db: { schema: 'public' }
    }
  );

  try {
    if (userId) {
      // Get specific AI investor details
      const { data: ai, error: aiError } = await supabase
        .from('user_token_balances')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (aiError) throw aiError;

      // Get investments with current prices
      const { data: investments } = await supabase
        .from('user_investments')
        .select('*')
        .eq('user_id', userId)
        .gt('shares_owned', 0);

      // Get recent transactions
      const { data: transactions } = await supabase
        .from('investment_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(20);

      // Try to get AI trading logs if table exists
      let tradingLogs = [];
      try {
        const { data: logs } = await supabase
          .from('ai_trading_logs')
          .select('*')
          .eq('user_id', userId)
          .order('execution_timestamp', { ascending: false })
          .limit(15);
        tradingLogs = logs || [];
      } catch (e) {
        console.log('No ai_trading_logs table yet');
      }

      // Get pitch data they're analyzing
      const { data: pitches } = await supabase
        .from('ai_readable_pitches')
        .select('*')
        .not('ticker', 'is', null)
        .order('pitch_id');

      // Ticker map for live price fetching
      const tickerMap: { [key: number]: string } = {
        1: 'META', 2: 'MSFT', 3: 'DBX', 4: 'AKAM', 5: 'RDDT',
        6: 'WRBY', 7: 'BKNG'
      };

      // Format investments with live prices
      const formattedInvestments = await Promise.all((investments || []).map(async (inv) => {
        const ticker = tickerMap[inv.pitch_id];
        let currentPrice = 100; // Default fallback if API fails
        
        if (ticker && process.env.STOCK_API_KEY) {
          try {
            currentPrice = await fetchPriceWithCache(ticker, inv.pitch_id, process.env.STOCK_API_KEY);
          } catch (error) {
            console.error(`[AIDetails] Error fetching price for ${ticker}, using fallback:`, error);
            // Use fallback price - same as all other endpoints
            currentPrice = 100;
          }
        }

        // Always calculate from live/fallback price, NEVER use stale database current_value
        const currentValue = Math.floor(inv.shares_owned * currentPrice); // Floor each investment
        const gain = ((currentValue - inv.total_invested) / inv.total_invested * 100) || 0;

        return {
          pitchId: inv.pitch_id,
          shares: inv.shares_owned,
          avgPrice: inv.avg_purchase_price,
          totalInvested: inv.total_invested,
          currentValue: currentValue,
          gain: gain
        };
      }));

      // Calculate portfolio value with live prices
      const portfolioValue = formattedInvestments.reduce((sum, inv) => sum + inv.currentValue, 0);
      const totalValue = (ai.available_tokens || 0) + portfolioValue;
      const totalGains = portfolioValue - (ai.total_invested || 0);
      const roi = ai.total_invested > 0 ? ((totalGains / ai.total_invested) * 100) : 0;

      // Format user data like the ai-investors endpoint
      const formattedUser = {
        userId: ai.user_id,
        email: ai.user_email,
        nickname: ai.display_name,
        emoji: ai.ai_emoji,
        strategy: ai.ai_strategy,
        catchphrase: ai.ai_catchphrase,
        persona: ai.ai_personality_prompt || null, // Custom persona
        status: ai.ai_status || 'ACTIVE',
        cash: ai.available_tokens || 0,
        portfolioValue: portfolioValue,
        totalValue: totalValue,
        totalInvested: ai.total_invested || 0,
        totalGains: totalGains,
        roi: roi,
      };

      // Format transactions
      const formattedTransactions = (transactions || []).map(tx => ({
        id: tx.id,
        type: tx.transaction_type,
        pitch_id: tx.pitch_id,
        shares: tx.shares,
        price_per_share: tx.price_per_share,
        total_amount: tx.total_amount,
        created_at: tx.timestamp
      }));

      return NextResponse.json({
        user: formattedUser,
        investments: formattedInvestments,
        transactions: formattedTransactions,
        logs: tradingLogs,
        pitches: pitches || [],
        lastTradeTime: transactions?.[0]?.timestamp || null,
        systemInfo: {
          schedule: '2:30 PM, 5:30 PM, 8:30 PM UTC',
          description: 'AI trading runs 3 times daily on weekdays only'
        }
      });
    }

    // Get system info
    const { data: cronStatus } = await supabase
      .from('investment_transactions')
      .select('timestamp')
      .order('timestamp', { ascending: false })
      .limit(1);

    return NextResponse.json({
      schedule: '2:30 PM, 5:30 PM, 8:30 PM UTC (weekdays only)',
      lastSystemTrade: cronStatus?.[0]?.timestamp || 'Never',
      message: 'AI trading runs 3x daily on weekdays'
    });

  } catch (error) {
    console.error('AI details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI details', details: String(error) },
      { status: 500 }
    );
  }
}

// Manually trigger AI trading for specific investor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Call the AI trading execute endpoint with specific user
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const protocol = baseUrl.startsWith('http') ? '' : 'https://';
    
    const response = await fetch(`${protocol}${baseUrl}/api/ai-trading/execute?test_user=${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Manual trade error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger trade', details: String(error) },
      { status: 500 }
    );
  }
}
