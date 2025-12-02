import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import OpenAI from 'openai';


// Force dynamic rendering - don't pre-render at build time
export const dynamic = 'force-dynamic';
// Lazy-load OpenAI client
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// HM7 legendary pitches (Harvard-founded companies)
const HM7_PITCHES = [
  { id: 1, name: 'Facebook', ticker: 'META', founder: 'Mark Zuckerberg' },
  { id: 2, name: 'Microsoft', ticker: 'MSFT', founder: 'Bill Gates' },
  { id: 3, name: 'Dropbox', ticker: 'DBX', founder: 'Drew Houston' },
  { id: 4, name: 'Reddit', ticker: 'RDDT', founder: 'Steve Huffman' },
  { id: 5, name: 'Quora', ticker: 'PRIVATE', founder: 'Adam D\'Angelo' },
  { id: 6, name: 'Khan Academy', ticker: 'NONPROFIT', founder: 'Sal Khan' },
  { id: 7, name: 'Snapchat', ticker: 'SNAP', founder: 'Evan Spiegel' },
];

interface AITradeDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  pitch_id: number;
  amount_mtk?: number;
  shares?: number;
  reasoning: string;
}

async function getAIInvestors() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('user_token_balances')
    .select('*')
    .eq('is_ai_investor', true);
  
  if (error) throw error;
  return data;
}

async function getLastTradeTime(userId: string): Promise<Date | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('investment_transactions')
    .select('timestamp')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data) return null;
  return new Date(data.timestamp);
}


async function getAIPortfolio(userId: string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('user_investments')
    .select('pitch_id, shares_owned, total_invested, current_value')
    .eq('user_id', userId)
    .gt('shares_owned', 0);
  
  if (error) throw error;
  return data || [];
}

async function getCurrentPrices() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('pitch_market_data')
    .select('pitch_id, current_price, price_change_24h')
    .in('pitch_id', HM7_PITCHES.map(p => p.id));
  
  if (error) throw error;
  return data || [];
}

// NEW: Fetch pitch content for AI analysis
async function getPitchData() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('ai_readable_pitches')
    .select('pitch_id, company_name, ticker, elevator_pitch, fun_fact, founder_story, category, current_price, price_change_24h')
    .not('ticker', 'is', null)  // Only HM7 companies with tickers
    .order('pitch_id');
  
  if (error) {
    console.error('Error fetching pitch data:', error);
    return [];
  }
  return data || [];
}

async function getAITradeDecision(
  aiInvestor: any,
  portfolio: any[],
  pitches: any[]  // Changed from prices to pitches with full content
): Promise<AITradeDecision> {
  const portfolioSummary = portfolio.map(p => {
    const pitch = pitches.find(hp => hp.pitch_id === p.pitch_id);
    return `${pitch?.company_name}: ${p.shares_owned} shares @ $${pitch?.current_price}, invested ${p.total_invested} MTK, current value ${p.current_value} MTK`;
  }).join('\n');

  // NEW: Include pitch analysis in market data
  const marketData = pitches.map(p => {
    return `${p.company_name} (${p.ticker}) - ${p.category}
    Price: $${p.current_price} (${p.price_change_24h >= 0 ? '+' : ''}${p.price_change_24h}% today)
    Pitch: "${p.elevator_pitch}"
    Story: ${p.founder_story}
    Fun Fact: ${p.fun_fact}`;
  }).join('\n\n');

  const strategyLimits = getStrategyLimits(aiInvestor.ai_strategy, aiInvestor.available_tokens);
  
  const prompt = `You are "${aiInvestor.display_name}", an AI investor with the ${aiInvestor.ai_strategy} strategy.
Your catchphrase: "${aiInvestor.ai_catchphrase}"

⚡ CRITICAL: STAY IN CHARACTER! Be EXTREME and TRUE to your personality!

CURRENT STATUS:
- Available Balance: ${aiInvestor.available_tokens} MTK
- Total Portfolio Value: ${aiInvestor.portfolio_value} MTK

YOUR PORTFOLIO:
${portfolioSummary || 'No current holdings'}

INVESTMENT OPPORTUNITIES (HM7 Index - Harvard Legends):
${marketData}

🎭 YOUR PERSONALITY - ${aiInvestor.ai_strategy}:
${getStrategyGuidelines(aiInvestor.ai_strategy)}

💰 TRADING RULES FOR YOU:
- Trade sizes: ${strategyLimits.suggestion}
- Budget for this trade: $${strategyLimits.min.toLocaleString()} - $${strategyLimits.max.toLocaleString()} MTK
- You are called every 6 hours - BE ACTIVE! Make bold moves!
- SELL if holdings are declining/overvalued/wrong for your strategy
- BUY if you see opportunities that match YOUR strategy
- Stay in character - be as extreme as your personality demands!

${aiInvestor.ai_strategy === 'MOMENTUM' ? '🚨 FOMO MASTER SPECIAL RULES: Stock up 3%+ today? BUY NOW! Stock down 2%+? PANIC SELL! You HATE missing opportunities!' : ''}
${aiInvestor.ai_strategy === 'HOLD_FOREVER' ? '💎 DIAMOND HANDS RULE: You can BUY but NEVER SELL. Selling is for paper hands!' : ''}
${aiInvestor.ai_strategy === 'ALL_IN' ? '🎲 YOLO KID RULE: Go BIG (80-95% of balance) or go home! No small positions!' : ''}
${aiInvestor.ai_strategy === 'CONTRARIAN' ? '🔄 CONTRARIAN RULE: Stock rising? Consider SELLING. Stock falling? Time to BUY!' : ''}

Make ONE bold trade decision. Respond with valid JSON only:
{
  "action": "BUY" | "SELL" | "HOLD",
  "pitch_id": number (1-7),
  "shares": number (calculate from your budget / stock price),
  "reasoning": "Brief explanation showing your personality and referencing specific pitch details or price action"
}

Important: 
- Calculate shares: (your budget) / (current stock price)
- Reference the pitch content or founder story in your reasoning
- Show your personality in the reasoning - make it CLEAR you're ${aiInvestor.display_name}!`;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an AI investor analyzing both business fundamentals and market data. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' }
    });

    const decision = JSON.parse(completion.choices[0].message.content || '{}');
    return decision as AITradeDecision;
  } catch (error) {
    console.error('OpenAI error:', error);
    // Fallback to HOLD
    return {
      action: 'HOLD',
      pitch_id: 1,
      reasoning: 'Technical difficulties, holding position'
    };
  }
}

function getStrategyLimits(strategy: string, availableTokens: number) {
  const limits: Record<string, { min: number; max: number; suggestion: string }> = {
    'CONSERVATIVE': { 
      min: Math.floor(availableTokens * 0.05), 
      max: Math.floor(availableTokens * 0.15),
      suggestion: '5-15% per trade (small, cautious positions)'
    },
    'DIVERSIFIED': { 
      min: Math.floor(availableTokens * 0.15), 
      max: Math.floor(availableTokens * 0.25),
      suggestion: '15-25% per trade (balanced approach)'
    },
    'ALL_IN': { 
      min: Math.floor(availableTokens * 0.80), 
      max: Math.floor(availableTokens * 0.95),
      suggestion: '80-95% all at once (GO BIG!)'
    },
    'HOLD_FOREVER': { 
      min: Math.floor(availableTokens * 0.30), 
      max: Math.floor(availableTokens * 0.50),
      suggestion: '30-50% when buying (then NEVER sell)'
    },
    'TECH_ONLY': { 
      min: Math.floor(availableTokens * 0.25), 
      max: Math.floor(availableTokens * 0.45),
      suggestion: '25-45% per tech stock'
    },
    'SAAS_ONLY': { 
      min: Math.floor(availableTokens * 0.30), 
      max: Math.floor(availableTokens * 0.50),
      suggestion: '30-50% per SaaS play'
    },
    'MOMENTUM': { 
      min: Math.floor(availableTokens * 0.40), 
      max: Math.floor(availableTokens * 0.80),
      suggestion: '40-80% FOMO HARD - can\'t miss this!'
    },
    'TREND_FOLLOW': { 
      min: Math.floor(availableTokens * 0.30), 
      max: Math.floor(availableTokens * 0.60),
      suggestion: '30-60% follow the momentum'
    },
    'CONTRARIAN': { 
      min: Math.floor(availableTokens * 0.25), 
      max: Math.floor(availableTokens * 0.55),
      suggestion: '25-55% buy the dip aggressively'
    },
    'PERFECT_TIMING': { 
      min: Math.floor(availableTokens * 0.20), 
      max: Math.floor(availableTokens * 0.45),
      suggestion: '20-45% precise entries/exits'
    }
  };
  return limits[strategy] || { 
    min: Math.floor(availableTokens * 0.20), 
    max: Math.floor(availableTokens * 0.30),
    suggestion: '20-30% moderate position'
  };
}

function getStrategyGuidelines(strategy: string): string {
  const guidelines: Record<string, string> = {
    'CONSERVATIVE': 'The Boomer: ONLY invest in proven companies like Microsoft and Facebook. Small positions. Prefer holding over frequent trading. You lived through dot-com crash - never again!',
    'DIVERSIFIED': 'Steady Eddie: MUST spread investments across at least 4 different companies. Balance growth vs stability. Regular rebalancing. Never go all-in on one stock.',
    'ALL_IN': 'YOLO Kid: Pick ONE stock you believe in and BET BIG (80-95%). High risk = high reward. Fortune favors the bold! No half measures!',
    'HOLD_FOREVER': 'Diamond Hands: Buy quality and NEVER EVER SELL. Long-term value investing. Ignore ALL short-term volatility. Paper hands lose, diamond hands WIN. 💎🙌',
    'TECH_ONLY': 'Silicon Brain: ONLY pure tech companies (Facebook, Microsoft, Dropbox). NO non-tech. Growth over everything. Code is eating the world.',
    'SAAS_ONLY': 'Cloud Surfer: ONLY software-as-a-service businesses with recurring revenue. Dropbox, Microsoft yes. Hardware? NO WAY.',
    'MOMENTUM': 'FOMO Master: You HATE missing gains! Buy stocks rising 3%+. Multiple stocks rising? Buy the HOTTEST one. Stock falling 2%+? PANIC SELL immediately! Sitting on >40% cash is UNACCEPTABLE.',
    'TREND_FOLLOW': 'Hype Train: Ride trends. Buy stocks with positive momentum. Sell losers quickly. Follow the crowd to profits!',
    'CONTRARIAN': 'The Contrarian: Buy when others panic-sell (falling stocks). Sell when others FOMO-buy (rising stocks). Go against the herd ALWAYS.',
    'PERFECT_TIMING': 'The Oracle: Buy low, sell high. Look for oversold opportunities (down 5%+). Exit overbought peaks (up 8%+). Precision timing wins.'
  };
  return guidelines[strategy] || 'Follow your instincts.';
}

async function executeTrade(aiInvestor: any, decision: AITradeDecision) {
  const supabase = getSupabaseServer();
  
  if (decision.action === 'HOLD') {
    console.log(`${aiInvestor.display_name} decided to HOLD`);
    return { success: true, message: 'Holding position' };
  }

  if (decision.action === 'BUY' && decision.shares) {
    // Execute buy via investment API
    const pitch = HM7_PITCHES.find(p => p.id === decision.pitch_id);
    const { data: priceData } = await supabase
      .from('pitch_market_data')
      .select('current_price')
      .eq('pitch_id', decision.pitch_id)
      .single();

    if (!priceData) throw new Error('Price not found');

    const totalCost = decision.shares * priceData.current_price;
    const balanceBefore = aiInvestor.available_tokens;
    const balanceAfter = balanceBefore - totalCost;
    
    // ⚠️ SAFETY CHECK: Prevent over-leveraging
    if (balanceAfter < 0) {
      console.warn(`🚫 ${aiInvestor.display_name} tried to buy ${decision.shares} shares of pitch ${decision.pitch_id} for $${totalCost.toFixed(2)} but only has $${balanceBefore.toFixed(2)}. Trade rejected.`);
      return { 
        success: false, 
        message: `Insufficient funds: needed $${totalCost.toFixed(2)}, available $${balanceBefore.toFixed(2)}` 
      };
    }
    
    // Insert investment transaction
    const { error } = await supabase
      .from('investment_transactions')
      .insert({
        user_id: aiInvestor.user_id,
        pitch_id: decision.pitch_id,
        transaction_type: 'BUY',
        shares: decision.shares,
        price_per_share: priceData.current_price,
        total_amount: totalCost,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        timestamp: new Date().toISOString()
      });

    if (error) throw error;

    // Update user_investments
    const { data: existingInvestment } = await supabase
      .from('user_investments')
      .select('*')
      .eq('user_id', aiInvestor.user_id)
      .eq('pitch_id', decision.pitch_id)
      .single();

    if (existingInvestment) {
      const newShares = existingInvestment.shares_owned + decision.shares;
      const newInvested = existingInvestment.total_invested + totalCost;
      const newAvgPrice = newInvested / newShares;

      await supabase
        .from('user_investments')
        .update({
          shares_owned: newShares,
          total_invested: newInvested,
          avg_purchase_price: newAvgPrice,
          current_value: newShares * priceData.current_price
        })
        .eq('user_id', aiInvestor.user_id)
        .eq('pitch_id', decision.pitch_id);
    } else {
      await supabase
        .from('user_investments')
        .insert({
          user_id: aiInvestor.user_id,
          pitch_id: decision.pitch_id,
          shares_owned: decision.shares,
          total_invested: totalCost,
          avg_purchase_price: priceData.current_price,
          current_value: totalCost
        });
    }

    // Update user balance
    await supabase
      .from('user_token_balances')
      .update({
        available_tokens: aiInvestor.available_tokens - totalCost,
        total_invested: aiInvestor.total_invested + totalCost
      })
      .eq('user_id', aiInvestor.user_id);

    return {
      success: true,
      message: `${aiInvestor.display_name} bought ${decision.shares.toFixed(2)} shares of ${pitch?.name} for ${totalCost.toFixed(2)} MTK`
    };
  }

  if (decision.action === 'SELL' && decision.shares) {
    // Execute sell
    const pitch = HM7_PITCHES.find(p => p.id === decision.pitch_id);
    
    // Check current holdings
    const { data: existingInvestment } = await supabase
      .from('user_investments')
      .select('*')
      .eq('user_id', aiInvestor.user_id)
      .eq('pitch_id', decision.pitch_id)
      .single();

    if (!existingInvestment || existingInvestment.shares_owned < decision.shares) {
      return {
        success: false,
        message: `Insufficient shares: has ${existingInvestment?.shares_owned || 0}, tried to sell ${decision.shares}`
      };
    }

    // Get current price
    const { data: priceData } = await supabase
      .from('pitch_market_data')
      .select('current_price')
      .eq('pitch_id', decision.pitch_id)
      .single();

    if (!priceData) throw new Error('Price not found');

    const totalRevenue = decision.shares * priceData.current_price;
    const balanceBefore = aiInvestor.available_tokens;
    const balanceAfter = balanceBefore + totalRevenue;
    
    // Insert sell transaction
    const { error } = await supabase
      .from('investment_transactions')
      .insert({
        user_id: aiInvestor.user_id,
        pitch_id: decision.pitch_id,
        transaction_type: 'SELL',
        shares: decision.shares,
        price_per_share: priceData.current_price,
        total_amount: totalRevenue,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        timestamp: new Date().toISOString()
      });

    if (error) throw error;

    // Update user_investments
    const newShares = existingInvestment.shares_owned - decision.shares;
    const soldPortion = decision.shares / existingInvestment.shares_owned;
    const newInvested = existingInvestment.total_invested * (1 - soldPortion);

    if (newShares > 0) {
      await supabase
        .from('user_investments')
        .update({
          shares_owned: newShares,
          total_invested: newInvested,
          current_value: newShares * priceData.current_price
        })
        .eq('user_id', aiInvestor.user_id)
        .eq('pitch_id', decision.pitch_id);
    } else {
      // Sold all shares, delete the investment
      await supabase
        .from('user_investments')
        .delete()
        .eq('user_id', aiInvestor.user_id)
        .eq('pitch_id', decision.pitch_id);
    }

    // Update user balance
    const soldAmount = decision.shares * existingInvestment.avg_purchase_price;
    await supabase
      .from('user_token_balances')
      .update({
        available_tokens: balanceAfter,
        total_invested: aiInvestor.total_invested - soldAmount
      })
      .eq('user_id', aiInvestor.user_id);

    return {
      success: true,
      message: `${aiInvestor.display_name} sold ${decision.shares.toFixed(2)} shares of ${pitch?.name} for ${totalRevenue.toFixed(2)} MTK`
    };
  }

  return { success: false, message: 'Invalid action' };
}

export async function POST(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const aiInvestors = await getAIInvestors();
    const pitches = await getPitchData();  // Changed from prices to pitches
    const results = [];
    
    // NO COOLDOWN - AI should trade every time cron runs (every 6 hours)
    // Each AI makes 2-3 decisions per run for more activity

    for (const ai of aiInvestors) {
      const aiResults = [];
      try {
        const portfolio = await getAIPortfolio(ai.user_id);
        
        // Make 2-3 trading decisions per AI investor per run
        const numTrades = Math.floor(Math.random() * 2) + 2; // 2-3 trades
        
        for (let i = 0; i < numTrades; i++) {
          try {
            const decision = await getAITradeDecision(ai, portfolio, pitches);
            
            // Skip if AI decided to HOLD
            if (decision.action === 'HOLD') {
              aiResults.push({
                decision,
                result: { success: true, message: 'Holding position' }
              });
              continue;
            }
            
            const result = await executeTrade(ai, decision);
            aiResults.push({ decision, result });
            
            // Small delay between trades
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (tradeError) {
            console.error(`Trade ${i+1} error for ${ai.display_name}:`, tradeError);
            aiResults.push({
              decision: { action: 'HOLD', pitch_id: 1, reasoning: 'Trade error' },
              result: { success: false, message: String(tradeError) }
            });
          }
        }
        
        results.push({
          investor: ai.display_name,
          trades: aiResults
        });

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing ${ai.display_name}:`, error);
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        results.push({
          investor: ai.display_name,
          error: errorMessage
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      results 
    });
  } catch (error) {
    console.error('AI trading error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
