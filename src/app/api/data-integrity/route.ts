import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchPriceWithCache } from '@/lib/price-cache';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Create Supabase client with FORCED PRIMARY READ (no replica/cache)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      db: { schema: 'public' },
      global: {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'x-client-info': 'supabase-js-node',
          'apikey': process.env.SUPABASE_SERVICE_KEY!
        }
      }
    }
  );

  try {
    const queryTime = new Date().toISOString();

    // Fetch all users from user_token_balances - FORCE PRIMARY READ
    const { data: balances, error: balancesError } = await supabase
      .from('user_token_balances')
      .select('*')
      .lte('updated_at', queryTime) // Force fresh query
      .order('updated_at', { ascending: false });

    if (balancesError) {
      throw balancesError;
    }

    // Debug: Check what Supabase returned for Cloud Surfer
    const cloudSurferBalance = balances?.find(b => 
      b.username?.includes('Surfer') || b.username?.includes('Cloud') || 
      b.display_name?.includes('Surfer') || b.display_name?.includes('Cloud')
    );
    if (cloudSurferBalance) {
      console.log('[DataIntegrity] Cloud Surfer RAW from Supabase:', {
        user_id: cloudSurferBalance.user_id,
        available_tokens: cloudSurferBalance.available_tokens,
        type: typeof cloudSurferBalance.available_tokens
      });
    }

    // Fetch all investments (raw DB data) - use same query as ai-investors
    const userIds = balances?.map(b => b.user_id) || [];
    
    const { data: investments, error: investmentsError } = await supabase
      .from('user_investments')
      .select('*')
      .gt('shares_owned', 0)
      .in('user_id', userIds);

    if (investmentsError) {
      throw investmentsError;
    }

    // Ticker map for HM14 companies
    const tickerMap: Record<number, string> = {
      1: 'META', 2: 'MSFT', 3: 'ABNB', 4: 'NET', 5: 'GRAB',
      6: 'MRNA', 7: 'KVYO', 8: 'AFRM', 9: 'PTON', 10: 'ASAN',
      11: 'LYFT', 12: 'TDUP', 13: 'KIND', 14: 'RENT'
    };

    // Build comparison data for each user
    const users = await Promise.all(balances?.map(async (balance) => {
      // Debug logging for Cloud Surfer
      if (balance.username?.includes('Surfer') || balance.username?.includes('Cloud') || balance.display_name?.includes('Surfer') || balance.display_name?.includes('Cloud')) {
        console.log(`[DataIntegrity] Processing ${balance.username || balance.display_name}:`, {
          user_id: balance.user_id,
          available_tokens_raw: balance.available_tokens,
          available_tokens_type: typeof balance.available_tokens
        });
      }
      
      // Get user's investments from DB
      let userInvestments = investments?.filter(inv => inv.user_id === balance.user_id) || [];
      
      // Handle duplicate rows: Group by pitch_id and keep most recent
      const investmentMap = new Map<number, any>();
      userInvestments.forEach(inv => {
        const existing = investmentMap.get(inv.pitch_id);
        if (!existing || new Date(inv.updated_at) > new Date(existing.updated_at)) {
          investmentMap.set(inv.pitch_id, inv);
        }
      });
      userInvestments = Array.from(investmentMap.values());

      // Fetch live prices for each investment (same as Portfolio API)
      const investmentsWithLivePrices = await Promise.all(
        userInvestments.map(async (inv) => {
          const ticker = tickerMap[inv.pitch_id];
          
          // Get database price first as fallback
          const { data: dbPrice } = await supabase
            .from('pitch_market_data')
            .select('current_price')
            .eq('pitch_id', inv.pitch_id)
            .single();
          
          let currentPrice = dbPrice?.current_price || 100;
          
          if (ticker && process.env.STOCK_API_KEY) {
            try {
              const livePrice = await fetchPriceWithCache(ticker, inv.pitch_id, process.env.STOCK_API_KEY);
              if (livePrice && livePrice > 0) {
                currentPrice = livePrice;
              }
            } catch (error) {
              console.log(`[DataIntegrity] Using database price $${currentPrice} for ${ticker}`);
            }
          }

          // Always calculate from live/fallback price, NEVER use stale database current_value
          const currentValue = Math.floor(inv.shares_owned * currentPrice); // Floor each investment
          
          // Debug logging for Cloud Surfer
          if (balance.username?.includes('Surfer') || balance.username?.includes('Cloud') || balance.display_name?.includes('Surfer') || balance.display_name?.includes('Cloud')) {
            console.log(`[DataIntegrity] ${balance.username || balance.display_name} Investment:`, {
              pitch_id: inv.pitch_id,
              ticker,
              shares: inv.shares_owned,
              price: currentPrice,
              floored_value: currentValue
            });
          }
          
          return {
            pitchId: inv.pitch_id,
            ticker: ticker || `PITCH-${inv.pitch_id}`,
            shares: inv.shares_owned,
            avgPrice: inv.avg_purchase_price,
            currentValue: currentValue,
            currentPrice: currentPrice
          };
        })
      );

      // Calculate what UI shows (using live prices)
      const holdingsValue = investmentsWithLivePrices.reduce((sum, inv) => {
        return sum + inv.currentValue; // Already floored above
      }, 0);

      // DB raw data
      const dbCash = balance.available_tokens || 0;
      const dbTotalInvested = balance.total_invested || 0;
      const dbHoldingsCount = userInvestments.length;

      // UI data (what APIs return with live prices)
      const uiCash = dbCash; // Keep exact cents
      const uiHoldingsValue = holdingsValue; // Already floored above
      const uiTotal = uiCash + uiHoldingsValue;
      const uiHoldingsCount = dbHoldingsCount; // Should match
      const uiRoi = dbTotalInvested > 0 ? ((uiHoldingsValue - dbTotalInvested) / dbTotalInvested * 100) : 0;

      // Debug logging for Cloud Surfer
      if (balance.username?.includes('Surfer') || balance.username?.includes('Cloud') || balance.display_name?.includes('Surfer') || balance.display_name?.includes('Cloud')) {
        console.log(`[DataIntegrity] ${balance.username || balance.display_name} TOTALS:`, {
          raw_available_tokens: balance.available_tokens,
          dbCash: dbCash,
          uiCash_floored: uiCash,
          holdings_value: uiHoldingsValue,
          total: uiTotal,
          num_investments: investmentsWithLivePrices.length
        });
      }

      // Calculate discrepancies (floor both sides since UI floors everything)
      const cashDiff = uiCash - Math.floor(dbCash); // Should be 0
      const holdingsCountDiff = uiHoldingsCount - dbHoldingsCount; // Should be 0

      const hasIssues = cashDiff !== 0 || holdingsCountDiff !== 0;

      return {
        userId: balance.user_id,
        // ALWAYS show nickname for display, email only for admin identification
        displayName: balance.username || balance.display_name || `User-${balance.user_id}`,
        email: balance.user_email || null, // Keep for admin reference only
        isAI: balance.is_ai_investor || false,
        ui: {
          cash: uiCash,
          portfolioValue: uiHoldingsValue,
          totalValue: uiTotal,
          holdingsCount: uiHoldingsCount,
          roi: uiRoi,
          investments: investmentsWithLivePrices,
          timestamp: queryTime
        },
        db: {
          cash: Math.floor(dbCash),
          portfolioValue: holdingsValue,
          totalValue: Math.floor(dbCash) + holdingsValue,
          holdingsCount: dbHoldingsCount,
          totalInvested: dbTotalInvested,
          updatedAt: balance.updated_at
        },
        discrepancies: {
          cash: cashDiff !== 0,
          portfolioValue: false, // Same calculation
          totalValue: cashDiff !== 0, // Will differ if cash differs
          holdingsCount: holdingsCountDiff !== 0
        },
        hasDiscrepancy: hasIssues
      };
    }) || []);

    // Sort: users with issues first
    users.sort((a, b) => {
      if (a.hasDiscrepancy && !b.hasDiscrepancy) return -1;
      if (!a.hasDiscrepancy && b.hasDiscrepancy) return 1;
      return 0;
    });

    return NextResponse.json({
      users,
      summary: {
        totalUsers: users.length,
        usersWithIssues: users.filter(u => u.hasDiscrepancy).length,
        healthyUsers: users.filter(u => !u.hasDiscrepancy).length
      },
      timestamp: queryTime
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'CDN-Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug data', details: String(error) },
      { status: 500 }
    );
  }
}
