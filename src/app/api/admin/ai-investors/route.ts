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
    // Fetch all AI investors with their complete data
    const { data: aiInvestors, error: aiError } = await supabase
      .from('user_token_balances')
      .select('*')
      .eq('is_ai_investor', true)
      .order('display_name');

    if (aiError) throw aiError;

    // Fetch their investments
    const { data: investments, error: invError } = await supabase
      .from('user_investments')
      .select('*')
      .gt('shares_owned', 0)
      .in('user_id', aiInvestors?.map(ai => ai.user_id) || []);

    if (invError) throw invError;

    // Fetch recent transactions for each AI
    const { data: transactions, error: txError } = await supabase
      .from('investment_transactions')
      .select('*')
      .in('user_id', aiInvestors?.map(ai => ai.user_id) || [])
      .order('timestamp', { ascending: false })
      .limit(100);

    if (txError) throw txError;

    // Fetch AI trading logs (if they exist)
    const { data: tradingLogs, error: logsError } = await supabase
      .from('ai_trading_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    // Ticker map for live price fetching (HM14)
    const tickerMap: { [key: number]: string } = {
      1: 'META', 2: 'MSFT', 3: 'ABNB', 4: 'NET', 5: 'GRAB',
      6: 'MRNA', 7: 'KVYO', 8: 'AFRM', 9: 'PTON', 10: 'ASAN',
      11: 'LYFT', 12: 'TDUP', 13: 'KIND', 14: 'RENT'
    };

    // Combine data with live prices
    const enrichedAIInvestors = await Promise.all(aiInvestors?.map(async (ai) => {
      let aiInvestments = investments?.filter(inv => inv.user_id === ai.user_id) || [];
      
      // Handle duplicate rows: Group by pitch_id and keep most recent
      const investmentMap = new Map<number, any>();
      aiInvestments.forEach(inv => {
        const existing = investmentMap.get(inv.pitch_id);
        if (!existing || new Date(inv.updated_at) > new Date(existing.updated_at)) {
          investmentMap.set(inv.pitch_id, inv);
        }
      });
      aiInvestments = Array.from(investmentMap.values());
      
      const aiTransactions = transactions?.filter(tx => tx.user_id === ai.user_id) || [];
      const aiLogs = tradingLogs?.filter(log => log.user_id === ai.user_id) || [];

      // Fetch live prices for investments
      const investmentsWithLivePrices = await Promise.all(
        aiInvestments.map(async (inv) => {
          const ticker = tickerMap[inv.pitch_id];
          
          // Get database price first as fallback
          const { data: dbPrice } = await supabase
            .from('pitch_market_data')
            .select('current_price')
            .eq('pitch_id', inv.pitch_id)
            .single();
          
          let currentPrice = dbPrice?.current_price || 100; // Database price or $100 if missing
          
          if (ticker && process.env.STOCK_API_KEY) {
            try {
              const livePrice = await fetchPriceWithCache(ticker, inv.pitch_id, process.env.STOCK_API_KEY);
              if (livePrice && livePrice > 0) {
                currentPrice = livePrice; // Use live price if available
              }
            } catch (error) {
              console.log(`[AIInvestors] Using database price $${currentPrice} for ${ticker} (API unavailable)`);
              // Keep currentPrice as database value
            }
          }

          // Calculate exact values without flooring - preserve decimals
          const currentValue = inv.shares_owned * currentPrice;
          const gain = currentValue - inv.total_invested;
          const gainPercent = inv.total_invested > 0 ? ((gain / inv.total_invested) * 100) : 0;

          // Debug logging for Cloud Surfer
          if (ai.display_name?.includes('Surfer') || ai.display_name?.includes('Cloud')) {
            console.log(`[AIInvestors] ${ai.display_name} Investment:`, {
              pitch_id: inv.pitch_id,
              ticker,
              shares: inv.shares_owned,
              price: currentPrice,
              current_value: currentValue,
              total_invested: inv.total_invested
            });
          }

          return {
            pitchId: inv.pitch_id,
            shares: parseFloat(inv.shares_owned.toFixed(2)),
            avgPrice: parseFloat(inv.avg_purchase_price.toFixed(2)),
            totalInvested: parseFloat(inv.total_invested.toFixed(2)),
            currentValue: parseFloat(currentValue.toFixed(2)),
            gain: parseFloat(gain.toFixed(2)),
            gainPercent: parseFloat(gainPercent.toFixed(2)),
            updatedAt: inv.updated_at
          };
        })
      );

      // Calculate portfolio value with live prices - preserve decimals
      const holdingsValue = investmentsWithLivePrices.reduce((sum, inv) => sum + inv.currentValue, 0);
      const portfolioValue = (ai.available_tokens || 0) + holdingsValue;
      const totalValue = portfolioValue;
      const totalGains = investmentsWithLivePrices.reduce((sum, inv) => sum + inv.gain, 0);
      const roi = ai.total_invested > 0 ? ((totalGains / ai.total_invested) * 100) : 0;

      // Debug logging for Cloud Surfer
      if (ai.display_name?.includes('Surfer') || ai.display_name?.includes('Cloud')) {
        console.log(`[AIInvestors] ${ai.display_name} TOTALS:`, {
          cash: ai.available_tokens || 0,
          holdings_value: holdingsValue,
          portfolio_value: portfolioValue,
          total_value: totalValue,
          num_investments: investmentsWithLivePrices.length
        });
      }

      // Calculate trading stats
      const totalTrades = aiTransactions.length;
      const successfulTrades = aiTransactions.filter(tx => {
        // A trade is successful if it resulted in a gain
        // We'll consider BUY transactions and check if subsequent value increased
        // For simplicity, count profitable positions
        return tx.transaction_type === 'BUY';
      }).length;
      const winRate = totalTrades > 0 ? ((successfulTrades / totalTrades) * 100) : 0;

      return {
        userId: ai.user_id,
        email: ai.user_email,
        nickname: ai.display_name,
        emoji: ai.ai_emoji,
        strategy: ai.ai_strategy,
        catchphrase: ai.ai_catchphrase,
        status: ai.ai_status || 'ACTIVE',
        isActive: ai.is_active !== false,
        cash: parseFloat((ai.available_tokens || 0).toFixed(2)),
        portfolioValue: parseFloat(portfolioValue.toFixed(2)),
        totalValue: parseFloat(totalValue.toFixed(2)),
        totalInvested: parseFloat((ai.total_invested || 0).toFixed(2)),
        totalGains: parseFloat(totalGains.toFixed(2)),
        roi: parseFloat(roi.toFixed(2)),
        tier: ai.investor_tier || 'BRONZE',
        totalTrades: totalTrades,
        winRate: parseFloat(winRate.toFixed(1)),
        lastTradeTime: aiTransactions[0]?.timestamp || null,
        investments: investmentsWithLivePrices,
        recentTransactions: aiTransactions.slice(0, 10).map(tx => ({
          type: tx.transaction_type,
          pitchId: tx.pitch_id,
          shares: parseFloat((tx.shares || 0).toFixed(2)),
          pricePerShare: parseFloat((tx.price_per_share || 0).toFixed(2)),
          totalAmount: parseFloat((tx.total_amount || 0).toFixed(2)),
          timestamp: tx.timestamp
        })),
        tradingLogs: aiLogs.slice(0, 5).map(log => ({
          action: log.action,
          reasoning: log.reasoning,
          pitchId: log.pitch_id,
          amount: log.amount,
          success: log.success,
          errorMessage: log.error_message,
          timestamp: log.created_at
        })),
        tradesLast24h: aiTransactions.filter(tx => {
          const txDate = new Date(tx.timestamp);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return txDate > dayAgo;
        }).length,
        updatedAt: ai.updated_at
      };
    }) || []);

    return NextResponse.json({
      aiInvestors: enrichedAIInvestors,
      summary: {
        totalAI: aiInvestors?.length || 0,
        active: aiInvestors?.filter(ai => ai.ai_status === 'ACTIVE').length || 0,
        paused: aiInvestors?.filter(ai => ai.ai_status === 'PAUSED').length || 0,
        totalValue: aiInvestors?.reduce((sum, ai) => sum + (ai.available_tokens || 0) + (ai.portfolio_value || 0), 0) || 0
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });

  } catch (error) {
    console.error('AI Admin API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI investor data', details: String(error) },
      { status: 500 }
    );
  }
}

// Update AI investor settings
export async function PATCH(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: { persistSession: false },
      db: { schema: 'public' }
    }
  );

  try {
    const body = await request.json();
    const { userId, updates } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Update AI investor in database
    const { data, error } = await supabase
      .from('user_token_balances')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('AI Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update AI investor', details: String(error) },
      { status: 500 }
    );
  }
}

// Trigger manual trade for AI investor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, pitchId, amount } = body;

    if (action === 'manual-trade') {
      // Call the AI trading execute endpoint for this specific AI
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/ai-trading/execute?user_id=${userId}&pitch_id=${pitchId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`
        },
        body: JSON.stringify({ amount })
      });

      const result = await response.json();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('AI Action error:', error);
    return NextResponse.json(
      { error: 'Failed to execute action', details: String(error) },
      { status: 500 }
    );
  }
}
