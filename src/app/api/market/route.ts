import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchPriceWithCache } from '@/lib/price-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
  );

  try {
    // Fetch stocks, market data, and holdings in parallel
    const [stocksRes, marketRes, holdingsRes] = await Promise.all([
      supabase
        .from('ai_readable_pitches')
        .select('pitch_id, company_name, ticker, category, sector, elevator_pitch, current_price, price_change_24h')
        .not('ticker', 'is', null),
      supabase
        .from('pitch_market_data')
        .select('pitch_id, total_volume, total_shares_issued, unique_investors, market_rank'),
      supabase
        .from('user_investments')
        .select('user_id, pitch_id, shares_owned')
        .gt('shares_owned', 0),
    ]);

    const stocks = stocksRes.data || [];
    const marketData = marketRes.data || [];
    const holdings = holdingsRes.data || [];

    // Build market data lookup
    const marketMap: Record<number, typeof marketData[0]> = {};
    marketData.forEach(m => { marketMap[m.pitch_id] = m; });

    // Build holdings aggregation per stock
    const holdingsAgg: Record<number, { holders: number; totalShares: number; holderNames: string[] }> = {};
    holdings.forEach(h => {
      if (!holdingsAgg[h.pitch_id]) {
        holdingsAgg[h.pitch_id] = { holders: 0, totalShares: 0, holderNames: [] };
      }
      holdingsAgg[h.pitch_id].holders++;
      holdingsAgg[h.pitch_id].totalShares += h.shares_owned;
    });

    // Fetch live prices
    const apiKey = process.env.STOCK_API_KEY;
    const livePrices: Record<string, number> = {};
    if (apiKey) {
      await Promise.all(
        stocks.map(async (s) => {
          try {
            const price = await fetchPriceWithCache(s.ticker, s.pitch_id, apiKey);
            if (price > 0) livePrices[s.ticker] = price;
          } catch { /* keep db price */ }
        })
      );
    }

    // Assemble response
    const result = stocks.map(s => {
      const price = livePrices[s.ticker] || s.current_price || 0;
      const agg = holdingsAgg[s.pitch_id] || { holders: 0, totalShares: 0 };
      const md = marketMap[s.pitch_id];
      return {
        pitchId: s.pitch_id,
        ticker: s.ticker,
        companyName: s.company_name,
        category: s.category,
        sector: s.sector,
        description: s.elevator_pitch,
        price,
        priceChange24h: s.price_change_24h || 0,
        holders: agg.holders,
        totalSharesHeld: parseFloat(agg.totalShares.toFixed(2)),
        marketValue: parseFloat((agg.totalShares * price).toFixed(2)),
        totalVolume: md?.total_volume || 0,
        marketRank: md?.market_rank || null,
      };
    });

    // Sort by market value (most invested first)
    result.sort((a, b) => b.marketValue - a.marketValue);

    // Summary stats
    const totalMarketValue = result.reduce((s, r) => s + r.marketValue, 0);
    const totalStocks = result.length;
    const uniqueHolders = new Set(holdings.map(h => h.user_id)).size;

    return NextResponse.json({
      stocks: result,
      summary: {
        totalStocks,
        totalMarketValue: parseFloat(totalMarketValue.toFixed(2)),
        activeTraders: uniqueHolders,
      },
      timestamp: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('Market API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
