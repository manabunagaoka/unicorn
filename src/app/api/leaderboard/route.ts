import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchPriceWithCache } from '@/lib/price-cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
  );

  try {
    // Fetch all investors
    const { data: investors, error: investorsError } = await supabase
      .from('user_token_balances')
      .select('user_id, user_email, username, is_ai_investor, display_name, ai_strategy, ai_catchphrase, ai_status, available_tokens, updated_at')
      .order('updated_at', { ascending: false });

    if (investorsError) {
      return NextResponse.json({ error: 'Failed to fetch investors' }, { status: 500 });
    }

    // Fetch all investments with shares > 0
    const { data: investments, error: investmentsError } = await supabase
      .from('user_investments')
      .select('user_id, pitch_id, shares_owned, current_value, updated_at')
      .gt('shares_owned', 0);

    if (investmentsError) {
      return NextResponse.json({ error: 'Failed to fetch investments' }, { status: 500 });
    }

    // Get stocks from ai_readable_pitches (has ticker info)
    const { data: stocks } = await supabase
      .from('ai_readable_pitches')
      .select('pitch_id, ticker, current_price')
      .not('ticker', 'is', null);

    // Build pitch_id -> ticker/price map from database
    const tickerMap: Record<number, string> = {};
    const priceMap: Record<number, number> = {};
    stocks?.forEach(s => {
      tickerMap[s.pitch_id] = s.ticker;
      priceMap[s.pitch_id] = s.current_price || 0;
    });

    // Fetch live prices
    const apiKey = process.env.STOCK_API_KEY;
    if (apiKey) {
      const pitchIds = [...new Set(investments?.map(i => i.pitch_id) || [])];
      await Promise.all(
        pitchIds.map(async (pitchId) => {
          const ticker = tickerMap[pitchId];
          if (ticker) {
            try {
              const livePrice = await fetchPriceWithCache(ticker, pitchId, apiKey);
              if (livePrice && livePrice > 0) priceMap[pitchId] = livePrice;
            } catch { /* keep db price */ }
          }
        })
      );
    }

    // Calculate portfolio for each investor
    const leaderboardData = (investors || []).map(investor => {
      const userInvestments = (investments || []).filter(inv => inv.user_id === investor.user_id);

      // Deduplicate by pitch_id (keep most recent)
      const investmentMap = new Map<number, typeof userInvestments[0]>();
      userInvestments.forEach(inv => {
        const existing = investmentMap.get(inv.pitch_id);
        if (!existing || new Date(inv.updated_at) > new Date(existing.updated_at)) {
          investmentMap.set(inv.pitch_id, inv);
        }
      });
      const dedupedInvestments = Array.from(investmentMap.values());

      const holdingsValue = dedupedInvestments.reduce((sum, inv) => {
        return sum + (inv.shares_owned || 0) * (priceMap[inv.pitch_id] || 0);
      }, 0);

      const portfolioValue = (investor.available_tokens || 0) + holdingsValue;

      return {
        userId: investor.user_id,
        username: investor.username || investor.display_name || investor.user_email,
        isAI: investor.is_ai_investor || false,
        aiStrategy: investor.ai_strategy || undefined,
        aiCatchphrase: investor.ai_catchphrase || undefined,
        aiStatus: investor.ai_status || 'ACTIVE',
        cash: parseFloat((investor.available_tokens || 0).toFixed(2)),
        holdingsValue: parseFloat(holdingsValue.toFixed(2)),
        portfolioValue: parseFloat(portfolioValue.toFixed(2)),
        holdings: dedupedInvestments.map(inv => ({
          ticker: tickerMap[inv.pitch_id] || `ID-${inv.pitch_id}`,
          shares: parseFloat((inv.shares_owned || 0).toFixed(2)),
          currentPrice: parseFloat((priceMap[inv.pitch_id] || 0).toFixed(2)),
          value: parseFloat(((inv.shares_owned || 0) * (priceMap[inv.pitch_id] || 0)).toFixed(2)),
        })),
      };
    });

    leaderboardData.sort((a, b) => b.portfolioValue - a.portfolioValue);

    const rankedLeaderboard = leaderboardData.map((inv, i) => ({ ...inv, rank: i + 1 }));

    return NextResponse.json({
      leaderboard: rankedLeaderboard,
      totalInvestors: rankedLeaderboard.length,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
