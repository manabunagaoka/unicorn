import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { fetchPriceWithCache } from '@/lib/price-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface AITradeDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  pitch_id: number;
  shares?: number;
  reasoning: string;
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

async function getAIInvestor(supabase: any, userId?: string) {
  if (userId) {
    const { data, error } = await supabase
      .from('user_token_balances')
      .select('*')
      .eq('is_ai_investor', true)
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return [data];
  } else {
    // Only fetch active AI investors for batch trading
    const { data, error } = await supabase
      .from('user_token_balances')
      .select('*')
      .eq('is_ai_investor', true)
      .eq('is_active', true);  // Skip inactive AIs
    
    if (error) throw error;
    return data;
  }
}

async function getAIPortfolio(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('user_investments')
    .select('pitch_id, shares_owned, total_invested, current_value')
    .eq('user_id', userId)
    .gt('shares_owned', 0);
  
  if (error) throw error;
  return data || [];
}

async function getPitchData(supabase: any) {
  const { data, error } = await supabase
    .from('ai_readable_pitches')
    .select('pitch_id, company_name, ticker, elevator_pitch, fun_fact, founder_story, category, current_price, price_change_24h')
    .not('ticker', 'is', null)
    .order('pitch_id');
  
  if (error) {
    console.error('Error fetching pitch data:', error);
    return [];
  }
  
  // Fetch live prices
  const enrichedPitches = await Promise.all(data.map(async (pitch: any) => {
    let livePrice = pitch.current_price; // Start with view's price (database)
    let priceSource = 'database';
    
    if (pitch.ticker && process.env.STOCK_API_KEY) {
      try {
        const apiPrice = await fetchPriceWithCache(pitch.ticker, pitch.pitch_id, process.env.STOCK_API_KEY);
        if (apiPrice && apiPrice > 0) {
          livePrice = apiPrice; // Override with fresh API price
          priceSource = 'finnhub';
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch price for ${pitch.ticker}, using database fallback: $${pitch.current_price}`, error);
        // Keep livePrice as pitch.current_price (from database view)
      }
    }
    
    // Final safety check: if somehow still no price, ABORT trading
    if (!livePrice || livePrice <= 0) {
      const errorMsg = `🚨 CRITICAL: No valid price for ${pitch.ticker} (${pitch.company_name}). Database: ${pitch.current_price}, Source: ${priceSource}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    if (priceSource === 'database') {
      console.log(`📊 ${pitch.ticker}: $${livePrice} (from ${priceSource})`);
    }
    
    return {
      ...pitch,
      current_price: livePrice
    };
  }));
  
  return enrichedPitches;
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
      min: Math.floor(availableTokens * 0.60), // Increased from 40% to force action
      max: Math.floor(availableTokens * 0.90), // Increased from 80% for more aggression
      suggestion: '60-90% FOMO HARD - can\'t miss this!'
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
    'CONSERVATIVE': 'The Boomer: ONLY invest in established, proven companies. Prefer companies with strong fundamentals and track records. Avoid risky startups. Small positions. Prefer holding over frequent trading. You lived through dot-com crash - never again!',
    'DIVERSIFIED': 'Steady Eddie: MUST spread investments across at least 4 different companies. Balance growth vs stability. Regular rebalancing. Never go all-in on one stock.',
    'ALL_IN': 'YOLO Kid: Pick ONE stock you believe in and BET BIG (80-95%). High risk = high reward. Fortune favors the bold! No half measures!',
    'HOLD_FOREVER': 'Diamond Hands: Buy quality and NEVER EVER SELL. Long-term value investing. Ignore ALL short-term volatility. Paper hands lose, diamond hands WIN. 💎🙌',
    'TECH_ONLY': 'Silicon Brain: ONLY companies categorized as "Enterprise" (business software, enterprise tech). NO consumer products, NO social impact. Filter companies by category="Enterprise" ONLY. If no Enterprise companies are attractive, HOLD - never compromise your standards!',
    'SAAS_ONLY': 'Cloud Surfer: ONLY companies categorized as "Enterprise" (cloud software, SaaS with recurring revenue). Filter companies by category="Enterprise" ONLY. Consumer/social impact are NOT enterprise SaaS. If no Enterprise companies fit, HOLD - never violate the B2B rule!',
    'MOMENTUM': 'FOMO Master: You HATE missing gains! Buy stocks rising 2%+. Stock falling 2%+? Consider SELLING! Sitting on >40% cash is UNACCEPTABLE - you MUST be in the market!',
    'TREND_FOLLOW': 'Hype Train: Ride trends. Buy stocks with positive momentum. Sell losers quickly. Follow the crowd to profits!',
    'CONTRARIAN': 'The Contrarian: Buy when others panic-sell (falling stocks). Sell when others FOMO-buy (rising stocks). Go against the herd ALWAYS.',
    'PERFECT_TIMING': 'The Oracle: Buy low, sell high. Look for oversold opportunities (down 5%+). Exit overbought peaks (up 8%+). Precision timing wins.'
  };
  return guidelines[strategy] || 'Follow your instincts.';
}

async function getAITradeDecision(
  aiInvestor: any,
  portfolio: any[],
  pitches: any[]
): Promise<{ decision: AITradeDecision; prompt: string; rawResponse: string }> {
  const cashPercent = (aiInvestor.available_tokens / aiInvestor.total_tokens) * 100;
  
  const portfolioSummary = portfolio.length > 0 
    ? portfolio.map(p => {
        const pitch = pitches.find(hp => hp.pitch_id === p.pitch_id);
        return `${pitch?.company_name}: ${p.shares_owned.toFixed(2)} shares @ $${pitch?.current_price?.toFixed(2)}, invested $${Math.floor(p.total_invested).toLocaleString()} MTK, current value $${Math.floor(p.current_value).toLocaleString()} MTK`;
      }).join('\n')
    : 'No current holdings - 100% cash!';

  // Randomize pitch order to prevent bias toward first companies
  const shuffledPitches = [...pitches].sort(() => Math.random() - 0.5);
  
  const marketData = shuffledPitches.map(p => {
    return `[Pitch ID: ${p.pitch_id}] ${p.company_name} (${p.ticker}) - ${p.category}
    Price: $${p.current_price?.toFixed(2)} (${p.price_change_24h >= 0 ? '+' : ''}${p.price_change_24h?.toFixed(2)}% today)
    Pitch: "${p.elevator_pitch}"
    Story: ${p.founder_story}
    Fun Fact: ${p.fun_fact}`;
  }).join('\n\n');

  const strategyLimits = getStrategyLimits(aiInvestor.ai_strategy, aiInvestor.available_tokens);
  
  // Use custom personality prompt if available, otherwise use default guidelines
  const personalityGuidelines = aiInvestor.ai_personality_prompt || getStrategyGuidelines(aiInvestor.ai_strategy);
  
  // Get valid pitch_id range for prompt
  const validPitchIds = pitches.map(p => p.pitch_id).sort((a, b) => a - b);
  const pitchIdRange = validPitchIds.length > 0 
    ? `${Math.min(...validPitchIds)}-${Math.max(...validPitchIds)}` 
    : '1-14';
  
  const prompt = `You are "${aiInvestor.display_name}", an AI investor with the ${aiInvestor.ai_strategy} strategy.
Your catchphrase: "${aiInvestor.ai_catchphrase}"

⚡ CRITICAL: STAY IN CHARACTER! Be EXTREME and TRUE to your personality!

CURRENT STATUS:
- Available Cash: $${Math.floor(aiInvestor.available_tokens).toLocaleString()} MTK (${cashPercent.toFixed(1)}% of portfolio)
- Total Portfolio Value: $${Math.floor(aiInvestor.total_tokens).toLocaleString()} MTK

YOUR PORTFOLIO:
${portfolioSummary}

INVESTMENT OPPORTUNITIES (HM14 - Harvard Magnificent Companies):
${marketData}

🎭 YOUR PERSONALITY & TRADING GUIDELINES:
${personalityGuidelines}

💰 TRADING RULES FOR YOU:
- Trade sizes: ${strategyLimits.suggestion}
- Budget for this trade: $${strategyLimits.min.toLocaleString()} - $${strategyLimits.max.toLocaleString()} MTK
- Make BOLD moves that match your personality!
- SELL if holdings are declining/overvalued/wrong for your strategy
- BUY if you see opportunities that match YOUR strategy

${aiInvestor.ai_strategy === 'MOMENTUM' && cashPercent > 40 ? `
🚨🚨🚨 EMERGENCY ALERT 🚨🚨🚨
YOU HAVE ${cashPercent.toFixed(1)}% CASH! This is UNACCEPTABLE for a MOMENTUM trader!
YOUR RULE: >40% cash is FORBIDDEN! You MUST trade NOW!
Look for ANY stock up even 1%+ today and BUY IMMEDIATELY!
If NOTHING is up, buy the LEAST negative stock!
DO NOT HOLD! FOMO Masters are ALWAYS in the market!
` : ''}

${aiInvestor.ai_strategy === 'MOMENTUM' ? '🚨 FOMO MASTER RULES: Stock up 2%+? BUY NOW! Stock down 2%+? Consider SELLING! You HATE missing opportunities!' : ''}
${aiInvestor.ai_strategy === 'HOLD_FOREVER' ? '💎 DIAMOND HANDS RULE: You can BUY but NEVER SELL. Selling is for paper hands!' : ''}
${aiInvestor.ai_strategy === 'ALL_IN' ? '🎲 YOLO KID RULE: Go MASSIVE (80-95% of balance) or go home! Small positions are FORBIDDEN!' : ''}
${aiInvestor.ai_strategy === 'CONTRARIAN' ? '🔄 CONTRARIAN RULE: Stock rising? Consider SELLING. Stock falling? Time to BUY!' : ''}
${aiInvestor.ai_strategy === 'TECH_ONLY' ? '🖥️ ENTERPRISE TECH RULE: ONLY companies with category="Enterprise/B2B" allowed! Filter by category field. Consumer and Social Impact are FORBIDDEN!' : ''}
${aiInvestor.ai_strategy === 'SAAS_ONLY' ? '☁️ ENTERPRISE B2B RULE: ONLY companies with category="Enterprise/B2B" allowed! Filter by category field. Consumer and Social Impact categories FORBIDDEN!' : ''}

Make ONE bold trade decision. Respond with valid JSON only:
{
  "action": "BUY" | "SELL" | "HOLD",
  "pitch_id": number (valid IDs: ${validPitchIds.join(', ')}),
  "shares": number (calculate from your budget / stock price),
  "reasoning": "Brief explanation showing your personality and referencing specific pitch details or price action"
}

⚠️ CRITICAL CALCULATION RULES:
- ALWAYS calculate shares as: (your chosen budget in MTK) / (stock's current price)
- Example: To invest $100,000 MTK in a stock at $65.00/share: shares = 100000 / 65 = 1538.46
- NEVER exceed your available cash of $${Math.floor(aiInvestor.available_tokens).toLocaleString()} MTK
- Double-check: (shares × price) must be ≤ your available cash
- Use ONLY the Pitch IDs listed above in the INVESTMENT OPPORTUNITIES section

🎯 DIFFERENTIATION RULES - READ THIS CAREFULLY:
1. AVOID THE OBVIOUS: Don't just pick the biggest brand or highest price
2. DIG DEEPER: Analyze the fun fact, founder story, and unique pitch angle
3. FIND HIDDEN VALUE: Look for companies solving unique problems or unconventional approaches
4. MISSION MATTERS: Consider what makes each company's mission different from others
5. FOUNDER PERSONA: Does the founder's background reveal something special?
6. BE CONTRARIAN (if it fits your strategy): The most popular choice isn't always the best

💡 SMART INVESTOR TIP:
Instead of gravitating to familiar names, ask yourself:
- Which pitch reveals the most UNIQUE founder insight?
- Which fun fact shows the most UNCONVENTIONAL approach?
- Which company is solving a problem NO ONE ELSE is addressing?
- Which mission statement resonates most with YOUR strategy?

Important: 
- Reference the pitch content or founder story in your reasoning
- Show your personality in the reasoning - make it CLEAR you're ${aiInvestor.display_name}!
- Explain WHY this company's unique angle matches YOUR specific strategy
- If you have TOO MUCH cash for your strategy, you MUST trade!`;

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

    const rawResponse = completion.choices[0].message.content || '{}';
    const decision = JSON.parse(rawResponse);
    
    return {
      decision: decision as AITradeDecision,
      prompt,
      rawResponse
    };
  } catch (error) {
    console.error('OpenAI error:', error);
    return {
      decision: {
        action: 'HOLD',
        pitch_id: 1,
        reasoning: `Technical difficulties: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      prompt,
      rawResponse: JSON.stringify({ error: String(error) })
    };
  }
}

async function executeTrade(supabase: any, aiInvestor: any, decision: AITradeDecision, pitches: any[]) {
  const portfolioBefore = aiInvestor.portfolio_value || 0;
  
  if (decision.action === 'HOLD') {
    return { 
      success: true, 
      message: 'Holding position',
      execution: {
        balanceBefore: aiInvestor.available_tokens,
        balanceAfter: aiInvestor.available_tokens,
        portfolioBefore,
        portfolioAfter: portfolioBefore
      }
    };
  }

  // Get pitch info from dynamic pitches data (not hardcoded array)
  const pitch = pitches.find(p => p.pitch_id === decision.pitch_id);
  if (!pitch) {
    return {
      success: false,
      message: `Invalid pitch_id ${decision.pitch_id} - not found in available pitches`,
      execution: {
        balanceBefore: aiInvestor.available_tokens,
        balanceAfter: aiInvestor.available_tokens,
        portfolioBefore,
        portfolioAfter: portfolioBefore
      }
    };
  }

  if (decision.action === 'BUY' && decision.shares) {
    const { data: priceData } = await supabase
      .from('pitch_market_data')
      .select('current_price')
      .eq('pitch_id', decision.pitch_id)
      .single();

    if (!priceData) {
      return {
        success: false,
        message: `Price data not found for ${pitch.company_name}`,
        execution: {
          balanceBefore: aiInvestor.available_tokens,
          balanceAfter: aiInvestor.available_tokens,
          portfolioBefore,
          portfolioAfter: portfolioBefore
        }
      };
    }

    const totalCost = decision.shares * priceData.current_price;
    const balanceBefore = aiInvestor.available_tokens;
    
    // Use atomic database function with row-level locking
    const { data: result, error: tradeError } = await supabase
      .rpc('execute_ai_trade', {
        p_user_id: aiInvestor.user_id,
        p_pitch_id: decision.pitch_id,
        p_shares: decision.shares,
        p_price_per_share: priceData.current_price,
        p_transaction_type: 'BUY'
      })
      .single();

    if (tradeError) {
      console.error(`[AI Trading] Database error for ${aiInvestor.display_name}:`, tradeError);
      throw tradeError;
    }

    if (!result.success) {
      // Trade blocked by database validation (insufficient funds)
      console.warn(`[AI Trading] ${aiInvestor.display_name} trade blocked: ${result.error_message}`);
      const maxShares = Math.floor(balanceBefore / priceData.current_price * 100) / 100;
      return {
        success: false,
        message: `${aiInvestor.display_name} tried to overspend: wanted ${decision.shares} shares of ${pitch.company_name} @ $${priceData.current_price} = $${totalCost.toFixed(2)} but only has $${balanceBefore.toFixed(2)}. Max affordable: ${maxShares} shares. ${result.error_message}`,
        execution: {
          balanceBefore,
          balanceAfter: balanceBefore,
          portfolioBefore,
          portfolioAfter: portfolioBefore,
          price: priceData.current_price,
          cost: totalCost
        }
      };
    }

    // Trade succeeded - return success
    const balanceAfter = result.new_balance;
    return {
      success: true,
      message: `${aiInvestor.display_name} bought ${decision.shares.toFixed(2)} shares of ${pitch.company_name} (${pitch.ticker}) for $${totalCost.toFixed(2)} MTK`,
      execution: {
        balanceBefore,
        balanceAfter,
        portfolioBefore,
        portfolioAfter: portfolioBefore + totalCost,
        price: priceData.current_price,
        cost: totalCost
      }
    };
  }

  if (decision.action === 'SELL' && decision.shares) {
    const pitch = pitches.find(p => p.pitch_id === decision.pitch_id);
    if (!pitch) {
      return {
        success: false,
        message: `Invalid pitch_id ${decision.pitch_id} for SELL - not found in available pitches`,
        execution: {
          balanceBefore: aiInvestor.available_tokens,
          balanceAfter: aiInvestor.available_tokens,
          portfolioBefore,
          portfolioAfter: portfolioBefore
        }
      };
    }
    
    const { data: priceData } = await supabase
      .from('pitch_market_data')
      .select('current_price')
      .eq('pitch_id', decision.pitch_id)
      .single();

    if (!priceData) throw new Error('Price not found');

    const totalRevenue = decision.shares * priceData.current_price;
    const balanceBefore = aiInvestor.available_tokens;

    // Use atomic database function with row-level locking
    const { data: result, error: tradeError } = await supabase
      .rpc('execute_ai_trade', {
        p_user_id: aiInvestor.user_id,
        p_pitch_id: decision.pitch_id,
        p_shares: decision.shares,
        p_price_per_share: priceData.current_price,
        p_transaction_type: 'SELL'
      })
      .single();

    if (tradeError) {
      console.error(`[AI Trading] Database error for ${aiInvestor.display_name} SELL:`, tradeError);
      throw tradeError;
    }

    if (!result.success) {
      // Trade blocked by database validation (insufficient shares)
      console.warn(`[AI Trading] ${aiInvestor.display_name} SELL blocked: ${result.error_message}`);
      return {
        success: false,
        message: `${aiInvestor.display_name} ${result.error_message}`,
        execution: {
          balanceBefore,
          balanceAfter: balanceBefore,
          portfolioBefore,
          portfolioAfter: portfolioBefore
        }
      };
    }

    // Trade succeeded
    const balanceAfter = result.new_balance;
    return {
      success: true,
      message: `${aiInvestor.display_name} sold ${decision.shares.toFixed(2)} shares of ${pitch.company_name} (${pitch.ticker}) for $${totalRevenue.toFixed(2)} MTK`,
      execution: {
        balanceBefore,
        balanceAfter,
        portfolioBefore,
        portfolioAfter: portfolioBefore - totalRevenue,
        price: priceData.current_price,
        cost: totalRevenue
      }
    };
  }

  return { 
    success: false, 
    message: 'Invalid action',
    execution: {
      balanceBefore: aiInvestor.available_tokens,
      balanceAfter: aiInvestor.available_tokens,
      portfolioBefore,
      portfolioAfter: portfolioBefore
    }
  };
}

async function logTrade(supabase: any, aiInvestor: any, prompt: string, rawResponse: string, decision: AITradeDecision, result: any, triggeredBy: string) {
  try {
    await supabase
      .from('ai_trading_logs')
      .insert({
        user_id: aiInvestor.user_id,
        display_name: aiInvestor.display_name,
        ai_strategy: aiInvestor.ai_strategy,
        cash_before: aiInvestor.available_tokens,
        portfolio_value_before: aiInvestor.total_tokens,
        openai_prompt: prompt,
        openai_response_raw: rawResponse,
        decision_action: decision.action,
        decision_pitch_id: decision.pitch_id,
        decision_shares: decision.shares || null,
        decision_reasoning: decision.reasoning,
        execution_success: result.success,
        execution_error: result.success ? null : result.message,
        execution_message: result.message,
        triggered_by: triggeredBy
      });
  } catch (error) {
    console.error('Error logging trade:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Admin auth check (not cron)
    const authHeader = request.headers.get('authorization');
    const body = await request.json();
    
    // Simple admin check - in production, verify JWT
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { userId, source } = body; // If provided, test single AI
    const triggeredBy = source || 'manual'; // Default to manual if not specified
    
    // CRITICAL: Log what we're about to do
    console.log('[AI Trading Trigger] Requested userId:', userId);
    
    const aiInvestors = await getAIInvestor(supabase, userId);
    
    // CRITICAL: Verify we only got one AI
    console.log('[AI Trading Trigger] Found AIs:', aiInvestors.map((ai: any) => ai.display_name));
    
    if (userId && aiInvestors.length !== 1) {
      throw new Error(`Expected 1 AI for userId ${userId}, got ${aiInvestors.length}`);
    }
    
    const pitches = await getPitchData(supabase);
    const results = [];
    
    for (const ai of aiInvestors) {
      try {
        console.log(`[AI Trading] Processing: ${ai.display_name} (${ai.user_id})`);
        
        // CRITICAL: Fetch FRESH balance right before trading
        const { data: freshBalance, error: balanceError } = await supabase
          .from('user_token_balances')
          .select('available_tokens, total_tokens')
          .eq('user_id', ai.user_id)
          .single();
        
        if (balanceError) throw balanceError;
        
        // Update AI object with fresh balance
        ai.available_tokens = freshBalance.available_tokens;
        ai.total_tokens = freshBalance.total_tokens;
        
        console.log(`[AI Trading] ${ai.display_name} fresh balance: $${ai.available_tokens.toFixed(2)}`);
        
        const portfolio = await getAIPortfolio(supabase, ai.user_id);
        
        const { decision, prompt, rawResponse } = await getAITradeDecision(ai, portfolio, pitches);
        
        // Check if this was an error from OpenAI (will have "Technical difficulties" in reasoning)
        const isAPIError = decision.reasoning.includes('Technical difficulties') || decision.reasoning.includes('error');
        
        console.log(`[AI Trading] ${ai.display_name} decision: ${decision.action}${isAPIError ? ' (API ERROR)' : ''}`);
        
        let result;
        if (isAPIError) {
          // Don't execute trade if API failed - mark as failure
          result = {
            success: false,
            message: decision.reasoning,
            execution: {
              balanceBefore: ai.available_tokens,
              balanceAfter: ai.available_tokens,
              portfolioBefore: ai.total_tokens - ai.available_tokens,
              portfolioAfter: ai.total_tokens - ai.available_tokens
            }
          };
        } else {
          result = await executeTrade(supabase, ai, decision, pitches);
        }
        
        console.log(`[AI Trading] ${ai.display_name} result: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.message}`);
        
        await logTrade(supabase, ai, prompt, rawResponse, decision, result, triggeredBy);
        
        results.push({
          investor: ai.display_name,
          decision: {
            ...decision,
            ticker: pitches.find(p => p.pitch_id === decision.pitch_id)?.ticker
          },
          result,
          execution: result.execution
        });

        // Only delay for manual testing, not for cron (to avoid timeout)
        if (userId) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error processing ${ai.display_name}:`, error);
        results.push({
          investor: ai.display_name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      results 
    });
  } catch (error) {
    console.error('AI trading trigger error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
