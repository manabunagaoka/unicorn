import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';


// Force dynamic rendering - don't pre-render at build time
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

// POST - Buy shares
export async function POST(request: NextRequest) {
  console.log('=== INVEST API CALLED ===');
  console.log('Timestamp:', new Date().toISOString());
  
  // Create fresh Supabase client to avoid caching issues
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { 
      auth: { persistSession: false },
      db: { schema: 'public' },
      global: {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'x-supabase-api-version': '2024-01-01'
        }
      }
    }
  );
  
  try {
    const user = await verifyUser(request);
    console.log('User verified:', user ? user.id : 'NONE');
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { pitchId, shares } = await request.json();
    
    console.log('=== TRADE REQUEST ===');
    console.log('User ID:', user.id);
    console.log('User ID type:', typeof user.id);
    console.log('Full user:', JSON.stringify(user));
    console.log('Pitch ID:', pitchId, 'Shares:', shares);

    if (!pitchId || !shares || shares <= 0) {
      return NextResponse.json(
        { error: 'Invalid pitch ID or share count' },
        { status: 400 }
      );
    }

    // Get or create user balance
    let { data: balance, error: balanceError } = await supabase
      .from('user_token_balances')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (balanceError || !balance) {
      // Create new user balance with 1M MTK
      const { data: newBalance, error: createError } = await supabase
        .from('user_token_balances')
        .insert({
          user_id: user.id,
          user_email: user.email,
          total_tokens: 1000000,
          available_tokens: 1000000,
          is_ai_investor: false
        })
        .select()
        .single();

      if (createError || !newBalance) {
        return NextResponse.json(
          { error: 'Failed to create user balance' },
          { status: 500 }
        );
      }
      balance = newBalance;
    }

    // Get current market data
    const { data: marketData, error: marketError } = await supabase
      .from('pitch_market_data')
      .select('*')
      .eq('pitch_id', pitchId)
      .single();

    if (marketError || !marketData) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Get real stock price from the ticker (HM14 - Harvard Magnificent 14)
    const tickerMap: { [key: number]: string } = {
      1: 'META', 2: 'MSFT', 3: 'ABNB', 4: 'NET', 5: 'GRAB',
      6: 'MRNA', 7: 'KVYO', 8: 'AFRM', 9: 'PTON', 10: 'ASAN',
      11: 'LYFT', 12: 'TDUP', 13: 'KIND', 14: 'RENT'
    };
    
    const ticker = tickerMap[pitchId];
    let currentPrice = marketData.current_price;
    
    if (!currentPrice) {
      return NextResponse.json(
        { error: 'Stock price unavailable. Please try again in a moment.' },
        { status: 503 }
      );
    }
    
    if (ticker) {
      try {
        // Fetch directly from Finnhub API instead of internal endpoint
        const apiKey = process.env.STOCK_API_KEY;
        if (!apiKey) {
          console.error('[Invest API] STOCK_API_KEY not found in environment');
        } else {
          const timestamp = Date.now();
          const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}&_=${timestamp}`;
          const priceResponse = await fetch(finnhubUrl, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          const priceData = await priceResponse.json();
          console.log(`[Invest API] Fetched price for ${ticker} from Finnhub:`, priceData);
          if (priceData.c && priceData.c > 0) {
            currentPrice = priceData.c;
            console.log(`[Invest API] Using real market price: $${currentPrice} for ${ticker}`);
          } else {
            console.log(`[Invest API] WARNING: Failed to get real price, using fallback: $${currentPrice}`);
          }
        }
      } catch (error) {
        console.error('[Invest API] Failed to fetch real stock price, using database price:', error);
      }
    }

    const totalCost = Math.floor(shares * currentPrice);

    // Check if user has enough tokens
    if (balance.available_tokens < totalCost) {
      return NextResponse.json(
        { error: 'Insufficient MTK balance', available: balance.available_tokens, required: totalCost },
        { status: 400 }
      );
    }

    // Update market data - track volume and shares but price comes from real market
    const newTotalVolume = marketData.total_volume + totalCost;
    const newTotalShares = parseFloat(marketData.total_shares_issued) + shares;

    await supabase
      .from('pitch_market_data')
      .update({
        current_price: currentPrice, // Store real price
        total_volume: newTotalVolume,
        total_shares_issued: newTotalShares,
        updated_at: new Date().toISOString()
      })
      .eq('pitch_id', pitchId);

    // Get or create user investment - force read from primary
    console.log('Checking existing investment...');
    const { data: existingInvestment, error: fetchError } = await supabase
      .from('user_investments')
      .select('*')
      .eq('user_id', user.id)
      .eq('pitch_id', pitchId)
      .order('created_at', { ascending: false })
      .maybeSingle();

    console.log('Existing investment:', existingInvestment ? `${existingInvestment.shares_owned} shares` : 'NONE');
    
    if (fetchError) {
      console.error('CRITICAL: Failed to fetch investment:', fetchError);
      throw new Error(`Failed to check existing investment: ${fetchError.message}`);
    }

    if (existingInvestment) {
      // Update existing investment
      const newShares = parseFloat(existingInvestment.shares_owned) + shares;
      const newTotalInvested = existingInvestment.total_invested + totalCost;
      const newAvgPrice = newTotalInvested / newShares;

      console.log('UPDATING investment - new shares:', newShares);
      const { error: updateError } = await supabase
        .from('user_investments')
        .update({
          shares_owned: newShares,
          total_invested: newTotalInvested,
          avg_purchase_price: newAvgPrice,
          current_value: Math.floor(newShares * currentPrice),
          unrealized_gain_loss: Math.floor(newShares * currentPrice) - newTotalInvested,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('pitch_id', pitchId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(`Failed to update investment: ${updateError.message}`);
      }
      console.log('✓ Investment updated successfully');
    } else {
      // Create new investment
      console.log('CREATING new investment - shares:', shares);
      const { data: newInvestment, error: insertError } = await supabase
        .from('user_investments')
        .insert({
          user_id: user.id,
          pitch_id: pitchId,
          shares_owned: shares,
          total_invested: totalCost,
          avg_purchase_price: currentPrice,
          current_value: totalCost,
          unrealized_gain_loss: 0
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Failed to create investment: ${insertError.message}`);
      }
      console.log('✓ Investment created successfully:', newInvestment);
    }

    // Record transaction
    await supabase
      .from('investment_transactions')
      .insert({
        user_id: user.id,
        pitch_id: pitchId,
        transaction_type: 'BUY',
        shares: shares,
        price_per_share: currentPrice,
        total_amount: totalCost,
        balance_before: balance.available_tokens,
        balance_after: balance.available_tokens - totalCost
      });

    // Update user balance
    const newPortfolioValue = await supabase
      .from('user_investments')
      .select('current_value')
      .eq('user_id', user.id);
    
    const totalPortfolioValue = (newPortfolioValue.data || []).reduce((sum, inv) => sum + inv.current_value, 0);

    await supabase
      .from('user_token_balances')
      .update({
        available_tokens: balance.available_tokens - totalCost,
        total_invested: balance.total_invested + totalCost,
        portfolio_value: totalPortfolioValue,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    // Update unique investors count
    const { count } = await supabase
      .from('user_investments')
      .select('user_id', { count: 'exact', head: true })
      .eq('pitch_id', pitchId)
      .gt('shares_owned', 0);

    await supabase
      .from('pitch_market_data')
      .update({
        unique_investors: count || 0
      })
      .eq('pitch_id', pitchId);

    // Wait for database replication (500ms delay for read-after-write consistency)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Fetch fresh portfolio data to return
    const { data: updatedInvestment } = await supabase
      .from('user_investments')
      .select('*')
      .eq('user_id', user.id)
      .eq('pitch_id', pitchId)
      .single();

    return NextResponse.json({
      success: true,
      investment: {
        shares: shares,
        price: currentPrice,
        totalCost: totalCost,
        newBalance: balance.available_tokens - totalCost,
        currentShares: updatedInvestment?.shares_owned || shares,
        totalInvested: updatedInvestment?.total_invested || totalCost
      }
    });

  } catch (error) {
    console.error('Investment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process investment';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
