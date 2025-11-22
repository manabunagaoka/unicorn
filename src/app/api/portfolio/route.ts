import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchPriceWithCache } from '@/lib/price-cache';

// Use Edge Runtime to bypass Vercel's function caching
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

// GET - Fetch user's portfolio
export async function GET(request: NextRequest) {
  console.log('[Portfolio API] VERSION: 2025-11-08-CACHE-FIX - FORCING FRESH PRICES');
  console.log('[Portfolio API] Request URL:', request.url);
  console.log('[Portfolio API] Request timestamp:', new Date().toISOString());
  
  // Create fresh Supabase client - FORCE PRIMARY READ
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
    
    console.log('[Portfolio API v2] Verified user:', user);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user balance
    console.log('[Portfolio API] Fetching balance for user_id:', user.id);
    const { data: balance, error: balanceError } = await supabase
      .from('user_token_balances')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log('[Portfolio API] Balance data:', balance);
    console.log('[Portfolio API] Balance error:', balanceError);

    if (balanceError || !balance) {
      // Return default for new users
      return NextResponse.json({
        balance: {
          total_tokens: 1000000,
          available_tokens: 1000000,
          portfolio_value: 0,
          all_time_gain_loss: 0,
          total_invested: 0
        },
        investments: []
      });
    }

    // Get user's investments directly - FORCE NO CACHE
    console.log('[Portfolio API] Fetching investments for user:', user.id);
    
    const { data: investments, error: investError } = await supabase
      .from('user_investments')
      .select('*')
      .eq('user_id', user.id)
      .gt('shares_owned', 0)
      .order('updated_at', { ascending: false });

    console.log('[Portfolio API] Query result - investments:', investments);
    console.log('[Portfolio API] Query result - error:', investError);
    console.log('[Portfolio API] Number of investments:', investments?.length || 0);
    console.log('[Portfolio API] Pitch IDs returned:', investments?.map(inv => inv.pitch_id));

    if (investError) {
      console.error('Investment fetch error:', investError);
    }

    // Company ticker mapping (HM14 - Harvard Magnificent 14)
    const tickerMap: { [key: number]: string } = {
      1: 'META', 2: 'MSFT', 3: 'ABNB', 4: 'NET', 5: 'GRAB',
      6: 'MRNA', 7: 'KVYO', 8: 'AFRM', 9: 'PTON', 10: 'ASAN',
      11: 'LYFT', 12: 'TDUP', 13: 'KIND', 14: 'RENT'
    };

    // Get current market prices from Finnhub (real-time stock prices)
    const investmentsWithPrices = await Promise.all(
      (investments || []).map(async (inv) => {
        const ticker = tickerMap[inv.pitch_id];
        let currentPrice = 100; // Final fallback only if no cached price exists
        let priceSource = 'fallback';
        
        if (ticker && process.env.STOCK_API_KEY) {
          try {
            currentPrice = await fetchPriceWithCache(ticker, inv.pitch_id, process.env.STOCK_API_KEY);
            priceSource = 'cache'; // fetchPriceWithCache handles cache internally
          } catch (error) {
            console.error(`[Portfolio] Error fetching price for ${ticker}:`, error);
            priceSource = 'fallback';
          }
        }

        const currentValue = Math.floor(parseFloat(inv.shares_owned) * currentPrice);
        const unrealizedGainLoss = currentValue - inv.total_invested;

        return {
          ...inv,
          shares_owned: parseFloat(inv.shares_owned),
          current_price: currentPrice,
          current_value: currentValue,
          unrealized_gain_loss: unrealizedGainLoss,
          price_source: priceSource
        };
      })
    );

    // Calculate total portfolio value
    const totalPortfolioValue = investmentsWithPrices.reduce((sum, inv) => sum + inv.current_value, 0);
    const totalGainLoss = investmentsWithPrices.reduce((sum, inv) => sum + inv.unrealized_gain_loss, 0);

    return NextResponse.json({
      balance: {
        total_tokens: balance.total_tokens,
        available_tokens: Math.floor(balance.available_tokens), // Floor to remove cents
        portfolio_value: totalPortfolioValue,
        all_time_gain_loss: totalGainLoss,
        total_invested: balance.total_invested
      },
      investments: investmentsWithPrices,
      _version: '2025-11-08-v8', // Force cache invalidation
      _timestamp: new Date().toISOString(),
      _deploymentCheck: 'CACHE_FIX_NOV8'
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'CDN-Cache-Control': 'no-store', // Vercel-specific: disable CDN caching
        'Vercel-CDN-Cache-Control': 'no-store', // Alternative Vercel header
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'X-API-Version': '2025-11-08-v8'
      }
    });

  } catch (error) {
    console.error('Portfolio fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}
