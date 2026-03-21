/**
 * Sync Market Prices - Updates pitch_market_data with real-time stock prices
 * This should be run via cron (every hour or after AI trading) to keep DB in sync
 * Usage: npx tsx scripts/sync-market-prices.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// HM7 pitch ID to stock ticker mapping
const TICKER_MAP: Record<number, string> = {
  1: 'META',   // Facebook/Meta
  2: 'MSFT',   // Microsoft
  3: 'DBX',    // Dropbox
  4: 'AKAM',   // Akamai
  5: 'RDDT',   // Reddit
  6: 'WRBY',   // Warby Parker
  7: 'BKNG',   // Booking.com
};

async function fetchStockPrice(ticker: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${process.env.STOCK_API_KEY}`
    );
    const data = await response.json();
    
    if (data.c && data.c > 0) {
      return data.c; // Current price
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch price for ${ticker}:`, error);
    return null;
  }
}

async function syncMarketPrices() {
  console.log('🔄 Syncing market prices from Finnhub...\n');
  
  const updates: Array<{ pitchId: number; ticker: string; oldPrice: number; newPrice: number }> = [];
  
  for (const [pitchIdStr, ticker] of Object.entries(TICKER_MAP)) {
    const pitchId = parseInt(pitchIdStr);
    
    // Get current DB price
    const { data: currentData } = await supabase
      .from('pitch_market_data')
      .select('current_price')
      .eq('pitch_id', pitchId)
      .single();
    
    const oldPrice = currentData?.current_price || 100;
    
    // Fetch real-time price
    const newPrice = await fetchStockPrice(ticker);
    
    if (newPrice) {
      // Update pitch_market_data
      const { error } = await supabase
        .from('pitch_market_data')
        .update({ 
          current_price: newPrice,
          updated_at: new Date().toISOString()
        })
        .eq('pitch_id', pitchId);
      
      if (error) {
        console.error(`❌ Failed to update ${ticker}:`, error);
      } else {
        updates.push({ pitchId, ticker, oldPrice, newPrice });
        const change = ((newPrice - oldPrice) / oldPrice * 100).toFixed(2);
        const emoji = newPrice > oldPrice ? '📈' : newPrice < oldPrice ? '📉' : '➡️';
        console.log(`${emoji} ${ticker.padEnd(6)} $${oldPrice.toFixed(2)} → $${newPrice.toFixed(2)} (${change}%)`);
      }
    } else {
      console.log(`⚠️  ${ticker.padEnd(6)} Failed to fetch price`);
    }
    
    // Rate limit: 30 API calls per second on free tier
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n✅ Updated ${updates.length} prices`);
  
  // Now recalculate portfolio values
  console.log('\n🔄 Recalculating portfolio values...');
  
  // Step 1: Update user_investments.current_value
  const { error: investError } = await supabase.rpc('exec_sql', {
    sql: `
      UPDATE user_investments ui
      SET current_value = ui.shares_owned * pmd.current_price
      FROM pitch_market_data pmd
      WHERE ui.pitch_id = pmd.pitch_id
        AND ui.shares_owned > 0
    `
  });
  
  if (investError) {
    console.error('❌ Failed to update investments:', investError);
    return;
  }
  
  // Step 2: Update portfolio_value
  const { error: portfolioError } = await supabase.rpc('exec_sql', {
    sql: `
      UPDATE user_token_balances utb
      SET portfolio_value = utb.available_tokens + COALESCE(
        (SELECT SUM(current_value) FROM user_investments WHERE user_id = utb.user_id AND shares_owned > 0),
        0
      )
    `
  });
  
  if (portfolioError) {
    console.error('❌ Failed to update portfolios:', portfolioError);
    return;
  }
  
  // Step 3: Update all_time_gain_loss
  const { error: gainError } = await supabase.rpc('exec_sql', {
    sql: `UPDATE user_token_balances SET all_time_gain_loss = portfolio_value - 1000000`
  });
  
  if (gainError) {
    console.error('❌ Failed to update gains:', gainError);
    return;
  }
  
  console.log('✅ Portfolio values recalculated');
  
  // Step 4: Award tiers (this will trigger automatically via trigger, but call manually to be sure)
  const { error: tierError } = await supabase.rpc('award_investor_tiers');
  
  if (tierError) {
    console.error('❌ Failed to award tiers:', tierError);
  } else {
    console.log('✅ Tiers awarded to top 3');
  }
  
  console.log('\n🎉 Sync complete!');
}

// Run if called directly
if (require.main === module) {
  syncMarketPrices()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { syncMarketPrices };
