import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchPriceWithCache } from '@/lib/price-cache';

// Use Edge Runtime to bypass Vercel's function caching
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Verify user from Manaboodle SSO
async function verifyUser(request: NextRequest) {
  const token = request.cookies.get('manaboodle_sso_token')?.value;
  
  if (!token) {
    return null;
  }

  try {
    const response = await fetch('https://www.manaboodle.com/api/sso/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const user = data.user || data;
    
    return {
      id: user.id,
      email: user.email
    };
  } catch (error) {
    console.error('SSO verification error:', error);
    return null;
  }
}

// GET - Fetch leaderboard with all investors ranked by portfolio value
export async function GET(request: NextRequest) {
  console.log('[Leaderboard API] Request timestamp:', new Date().toISOString());
  
  // Create fresh Supabase client - FORCE PRIMARY READ (same config as Portfolio API)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'x-client-info': `supabase-js-node`,
          'apikey': process.env.SUPABASE_SERVICE_KEY!
        }
      }
    }
  );
  
  try {
    const user = await verifyUser(request);
    
    // Allow unauthenticated access to leaderboard, but don't show current user data
    // if (!user) {
    //   return NextResponse.json(
    //     { error: 'Not authenticated' },
    //     { status: 401 }
    //   );
    // }

        // Fetch all investors with their balances and holdings - force fresh data from PRIMARY
    const queryTime = new Date().toISOString();
    const { data: investors, error: investorsError } = await supabase
      .from('user_token_balances')
      .select(`
        user_id,
        user_email,
        username,
        is_ai_investor,
        display_name,
        ai_emoji,
        ai_strategy,
        ai_catchphrase,
        ai_status,
        investor_tier,
        founder_tier,
        available_tokens,
        updated_at
      `)
      .lte('updated_at', queryTime) // Force fresh query with current timestamp
      .order('updated_at', { ascending: false }) // Force non-cached query
      .limit(1000); // Add limit to prevent caching

    console.log(`[Leaderboard] Fetched ${investors?.length || 0} investors at ${queryTime}`);

    if (investorsError) {
      console.error('Error fetching investors:', investorsError);
      return NextResponse.json(
        { error: 'Failed to fetch investors' },
        { status: 500 }
      );
    }

    // Fetch all user investments (pitch holdings) - force fresh query from PRIMARY
    // Add timestamp to query to force fresh data
    const now = new Date().toISOString();
    const { data: investments, error: investmentsError} = await supabase
      .from('user_investments')
      .select(`
        user_id,
        pitch_id,
        shares_owned,
        current_value,
        updated_at
      `)
      .gt('shares_owned', 0) // Only fetch positions with actual shares
      .lte('created_at', now) // Force fresh query with timestamp filter
      .order('updated_at', { ascending: false }) // Order by latest updates first
      .limit(10000); // Force non-cached query

    console.log(`[Leaderboard] Fetched ${investments?.length || 0} investments with shares > 0`);

    if (investmentsError) {
      console.error('Error fetching investments:', investmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch investments' },
        { status: 500 }
      );
    }

    // Get unique pitch IDs to fetch current prices
    const pitchIdsSet = new Set<number>();
    investments?.forEach(inv => pitchIdsSet.add(inv.pitch_id));
    const pitchIds = Array.from(pitchIdsSet);
    
    // Company ticker mapping (HM14 - Harvard Magnificent 14)
    // Must match portfolio API for consistency
    const tickerMap: Record<number, string> = {
      1: 'META', 2: 'MSFT', 3: 'ABNB', 4: 'NET', 5: 'GRAB',
      6: 'MRNA', 7: 'KVYO', 8: 'AFRM', 9: 'PTON', 10: 'ASAN',
      11: 'LYFT', 12: 'TDUP', 13: 'KIND', 14: 'RENT'
    };
    
    console.log('[Leaderboard] Using HM14 ticker map:', tickerMap);
    
    // Fetch real-time prices from Finnhub with shared caching
    const pitchPrices: Record<number, number> = {};
    const apiKey = process.env.STOCK_API_KEY;
    
    // First, get database prices as fallback
    const { data: dbPrices } = await supabase
      .from('pitch_market_data')
      .select('pitch_id, current_price')
      .in('pitch_id', pitchIds);
    
    // Initialize with database prices
    dbPrices?.forEach(p => {
      pitchPrices[p.pitch_id] = p.current_price || 100;
    });
    
    // Then try to get live prices if API key available
    if (apiKey) {
      await Promise.all(
        pitchIds.map(async (pitchId) => {
          const ticker = tickerMap[pitchId];
          if (ticker) {
            try {
              const livePrice = await fetchPriceWithCache(ticker, pitchId, apiKey);
              if (livePrice && livePrice > 0) {
                pitchPrices[pitchId] = livePrice; // Override database price with live price
              }
            } catch (error) {
              console.log(`[Leaderboard] Using database price for ${ticker}: $${pitchPrices[pitchId]}`);
              // Keep database price
            }
          }
        })
      );
    }

    // Calculate portfolio value for each investor
    const leaderboardData = investors?.map(investor => {
      // Calculate holdings value using real-time prices
      let userInvestments = investments?.filter(inv => inv.user_id === investor.user_id) || [];
      
      // Handle duplicate rows: Group by pitch_id and keep most recent
      const investmentMap = new Map<number, any>();
      userInvestments.forEach(inv => {
        const existing = investmentMap.get(inv.pitch_id);
        if (!existing || new Date(inv.updated_at) > new Date(existing.updated_at)) {
          investmentMap.set(inv.pitch_id, inv);
        }
      });
      userInvestments = Array.from(investmentMap.values());
      
      const holdingsValue = userInvestments.reduce((sum, inv) => {
        // Always calculate from real-time prices, not database current_value
        const value = (inv.shares_owned || 0) * (pitchPrices[inv.pitch_id] || 100);
        
        // Debug logging for Cloud Surfer
        if (investor.username?.includes('Surfer') || investor.username?.includes('Cloud') || investor.display_name?.includes('Surfer') || investor.display_name?.includes('Cloud')) {
          console.log(`[Leaderboard] ${investor.username || investor.display_name} Investment:`, {
            pitch_id: inv.pitch_id,
            shares: inv.shares_owned,
            price: pitchPrices[inv.pitch_id] || 100,
            value: value
          });
        }
        
        return sum + value;
      }, 0);

      // Debug logging for specific user
      if (investor.user_id === '19be07bc-28d0-4ac6-956b-714eef1ccc85' || investor.user_id === user?.id || investor.username?.includes('Surfer') || investor.username?.includes('Cloud') || investor.display_name?.includes('Surfer') || investor.display_name?.includes('Cloud')) {
        console.log(`[Leaderboard] ${investor.username || investor.user_email || investor.display_name} TOTALS:`, {
          user_id: investor.user_id,
          cash: investor.available_tokens,
          cash_updated_at: investor.updated_at,
          investments_count: userInvestments.length,
          investment_pitch_ids: userInvestments.map(inv => inv.pitch_id),
          holdings_value: holdingsValue,
          total: (investor.available_tokens || 0) + holdingsValue,
          query_time: new Date().toISOString()
        });
      }

      // Portfolio value = cash + holdings (exact calculation, no rounding)
      const portfolioValue = (investor.available_tokens || 0) + holdingsValue;

      return {
        userId: investor.user_id,
        email: investor.user_email,
        username: investor.username || investor.display_name || investor.user_email,
        isAI: investor.is_ai_investor || false,
        aiEmoji: investor.ai_emoji || '',
        aiStrategy: investor.ai_strategy || undefined,
        aiCatchphrase: investor.ai_catchphrase || undefined,
        aiStatus: investor.ai_status || 'ACTIVE',
        investorTier: investor.investor_tier || undefined,
        founderTier: investor.founder_tier || undefined,
        cash: investor.available_tokens || 0,
        holdingsValue,
        portfolioValue,
        holdings: userInvestments.map(inv => ({
          ticker: tickerMap[inv.pitch_id] || `PITCH-${inv.pitch_id}`, // Show real stock ticker
          shares: inv.shares_owned,
          currentPrice: pitchPrices[inv.pitch_id] || 0,
          value: Math.floor((inv.shares_owned || 0) * (pitchPrices[inv.pitch_id] || 100))
        }))
      };
    }) || [];

    // Sort by portfolio value (descending)
    leaderboardData.sort((a, b) => b.portfolioValue - a.portfolioValue);

    // Add rank to each investor
    const rankedLeaderboard = leaderboardData.map((investor, index) => ({
      ...investor,
      rank: index + 1
    }));

    // Find current user's position (only if authenticated)
    const currentUserData = user ? rankedLeaderboard.find(inv => inv.userId === user.id) : null;
    
    // Get top 7 AI investors
    const topAI = rankedLeaderboard.filter(inv => inv.isAI).slice(0, 7);

    return NextResponse.json({
      leaderboard: rankedLeaderboard,
      currentUser: currentUserData,
      topAI,
      totalInvestors: rankedLeaderboard.length,
      timestamp: new Date().toISOString(),
      _version: 'v2025-11-08-cdn-fix',
      _serverTime: Date.now()
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-API-Version': 'v2025-11-08-cdn-fix'
      }
    });

  } catch (error) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
