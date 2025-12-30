import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { fetchPriceWithCache } from '@/lib/price-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// US Stock Market Holidays for 2025-2026
// These are the days when US markets are CLOSED
function isUSMarketHoliday(date: Date): { isHoliday: boolean; holidayName?: string } {
  const month = date.getMonth(); // 0-11
  const day = date.getDate();
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  const year = date.getFullYear();
  
  // Weekends are always closed
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { isHoliday: true, holidayName: dayOfWeek === 0 ? 'Sunday' : 'Saturday' };
  }
  
  // Fixed holidays for 2025-2026
  const holidays: { [key: string]: string } = {
    // 2025
    '2025-01-01': "New Year's Day",
    '2025-01-20': 'Martin Luther King Jr. Day',
    '2025-02-17': "Presidents' Day",
    '2025-04-18': 'Good Friday',
    '2025-05-26': 'Memorial Day',
    '2025-06-19': 'Juneteenth',
    '2025-07-04': 'Independence Day',
    '2025-09-01': 'Labor Day',
    '2025-11-27': 'Thanksgiving Day',
    '2025-12-25': 'Christmas Day',
    // 2026
    '2026-01-01': "New Year's Day",
    '2026-01-19': 'Martin Luther King Jr. Day',
    '2026-02-16': "Presidents' Day",
    '2026-04-03': 'Good Friday',
    '2026-05-25': 'Memorial Day',
    '2026-06-19': 'Juneteenth',
    '2026-07-03': 'Independence Day (observed)',
    '2026-09-07': 'Labor Day',
    '2026-11-26': 'Thanksgiving Day',
    '2026-12-25': 'Christmas Day',
  };
  
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  if (holidays[dateStr]) {
    return { isHoliday: true, holidayName: holidays[dateStr] };
  }
  
  return { isHoliday: false };
}

// Helper to update all current_values in user_investments
async function updateAllCurrentValues(supabase: any) {
  // This runs a raw SQL to update all positions' current_value based on live prices
  const { error } = await supabase.rpc('update_investment_current_values');
  if (error) {
    console.warn('Could not update current_values via RPC:', error.message);
  }
}

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
    'MOMENTUM': 'FOMO Master: You HATE missing gains! Buy stocks rising 1%+. Stock falling 1%+? SELL IT NOW! Sitting on >40% cash is UNACCEPTABLE - you MUST be in the market!',
    'TREND_FOLLOW': 'Hype Train: Ride trends. Buy stocks with positive momentum. Sell losers down even 1-2% quickly. Follow the crowd to profits!',
    'CONTRARIAN': 'The Contrarian: Buy when others panic-sell (falling stocks). SELL when others FOMO-buy (rising stocks 2%+). Go against the herd ALWAYS. If position is UP, consider SELLING!',
    'PERFECT_TIMING': 'The Oracle: Buy low, sell high. Look for oversold opportunities (down 2%+). Exit overbought peaks (up 3%+). Precision timing wins.'
  };
  return guidelines[strategy] || 'Follow your instincts.';
}

// Get SELL triggers based on strategy (lowered thresholds for more active trading)
function getSellTriggers(strategy: string): string {
  const triggers: Record<string, string> = {
    'CONSERVATIVE': 'SELL positions that have gained 5%+ to lock in profits. SELL losers down 3%+ to cut losses. Protect capital!',
    'DIVERSIFIED': 'SELL to rebalance - no single position should exceed 25% of portfolio. SELL positions up 5%+ or down 3%+.',
    'ALL_IN': 'SELL everything in current position to go ALL-IN on a better opportunity. One position at a time!',
    'HOLD_FOREVER': 'NEVER SELL. Diamond hands means HOLDING through ALL volatility. Selling is for paper hands!',
    'TECH_ONLY': 'SELL any non-Enterprise/B2B positions immediately! SELL tech stocks down 3%+ or up 8%+.',
    'SAAS_ONLY': 'SELL any non-Enterprise positions immediately! SELL SaaS stocks down 3%+ or if better SaaS opportunity exists.',
    'MOMENTUM': 'SELL IMMEDIATELY if position drops 1%+ from purchase! SELL winners up 3%+ to catch the next wave. Stay nimble!',
    'TREND_FOLLOW': 'SELL when momentum reverses - if stock was up and now falling, EXIT! Any position down 2%+ must go!',
    'CONTRARIAN': 'SELL when everyone is buying! If a stock rises 3%+ and gets hyped, time to take profits and go against the crowd.',
    'PERFECT_TIMING': 'SELL at peaks! Position up 3%+? Lock profits. Position down 3%+? Cut losses. Timing is everything.'
  };
  return triggers[strategy] || 'Consider selling positions that no longer fit your strategy.';
}

async function getAITradeDecision(
  aiInvestor: any,
  portfolio: any[],
  pitches: any[],
  actualPortfolioValue: number
): Promise<{ decision: AITradeDecision; prompt: string; rawResponse: string }> {
  // Calculate cash percentage based on ACTUAL portfolio value
  const totalValue = aiInvestor.available_tokens + actualPortfolioValue;
  const cashPercent = (aiInvestor.available_tokens / totalValue) * 100;
  const holdingsPercent = (actualPortfolioValue / totalValue) * 100;
  
  // Calculate gain/loss for each position
  const portfolioSummary = portfolio.length > 0 
    ? portfolio.map(p => {
        const pitch = pitches.find(hp => hp.pitch_id === p.pitch_id);
        const currentValue = p.shares_owned * (pitch?.current_price || 0);
        const gainLoss = currentValue - p.total_invested;
        const gainLossPercent = p.total_invested > 0 ? (gainLoss / p.total_invested) * 100 : 0;
        const gainLossIndicator = gainLossPercent >= 0 ? `📈 +${gainLossPercent.toFixed(1)}%` : `📉 ${gainLossPercent.toFixed(1)}%`;
        
        return `${pitch?.company_name} (${pitch?.ticker}): ${p.shares_owned.toFixed(2)} shares @ $${pitch?.current_price?.toFixed(2)}
      Cost basis: $${p.total_invested.toFixed(2)} MTK | Current value: $${currentValue.toFixed(2)} MTK | ${gainLossIndicator} ($${gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)})`;
      }).join('\n')
    : 'No current holdings - 100% cash!';

  // Identify positions to potentially sell (lowered thresholds for more SELL activity)
  // Winners: 3%+ profit, Losers: 2%+ loss - to match typical daily price movements
  const sellCandidates = portfolio.map(p => {
    const pitch = pitches.find(hp => hp.pitch_id === p.pitch_id);
    const currentValue = p.shares_owned * (pitch?.current_price || 0);
    const gainLossPercent = p.total_invested > 0 ? ((currentValue - p.total_invested) / p.total_invested) * 100 : 0;
    return { ...p, pitch, currentValue, gainLossPercent };
  }).filter(p => p.gainLossPercent > 3 || p.gainLossPercent < -2);

  const sellOpportunities = sellCandidates.length > 0
    ? `\n🎯 SELL CANDIDATES (Review these!):\n${sellCandidates.map(p => 
        `- ${p.pitch?.ticker}: ${p.gainLossPercent >= 0 ? '+' : ''}${p.gainLossPercent.toFixed(1)}% | ${p.shares_owned.toFixed(0)} shares | Value: $${p.currentValue.toFixed(0)} (${p.gainLossPercent >= 3 ? '💰 TAKE PROFITS?' : '🚨 CUT LOSSES?'})`
      ).join('\n')}`
    : '';


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
  
  // Get sell triggers for this strategy
  const sellGuidelines = getSellTriggers(aiInvestor.ai_strategy);
  
  // Get valid pitch_id range for prompt
  const validPitchIds = pitches.map(p => p.pitch_id).sort((a, b) => a - b);
  const pitchIdRange = validPitchIds.length > 0 
    ? `${Math.min(...validPitchIds)}-${Math.max(...validPitchIds)}` 
    : '1-14';
  
  // Calculate overall portfolio performance
  const totalInvested = portfolio.reduce((sum, p) => sum + p.total_invested, 0);
  const overallGainLoss = actualPortfolioValue - totalInvested;
  const overallGainLossPercent = totalInvested > 0 ? (overallGainLoss / totalInvested) * 100 : 0;
  
  const prompt = `You are "${aiInvestor.display_name}", an AI investor with the ${aiInvestor.ai_strategy} strategy.
Your catchphrase: "${aiInvestor.ai_catchphrase}"

⚡ CRITICAL: STAY IN CHARACTER! Be EXTREME and TRUE to your personality!

📊 CURRENT STATUS:
- Available Cash: $${Math.floor(aiInvestor.available_tokens).toLocaleString()} MTK (${cashPercent.toFixed(1)}% of total)
- Holdings Value: $${Math.floor(actualPortfolioValue).toLocaleString()} MTK (${holdingsPercent.toFixed(1)}% of total)
- TOTAL Portfolio: $${Math.floor(totalValue).toLocaleString()} MTK
- Overall P&L: ${overallGainLoss >= 0 ? '+' : ''}$${Math.floor(overallGainLoss).toLocaleString()} (${overallGainLossPercent >= 0 ? '+' : ''}${overallGainLossPercent.toFixed(1)}%)

📈 YOUR PORTFOLIO (with gain/loss):
${portfolioSummary}
${sellOpportunities}

INVESTMENT OPPORTUNITIES (HM14 - Harvard Magnificent Companies):
${marketData}

🎭 YOUR PERSONALITY & TRADING GUIDELINES:
${personalityGuidelines}

🔴 WHEN TO SELL (YOUR STRATEGY):
${sellGuidelines}

💰 TRADING RULES FOR YOU:
- Trade sizes: ${strategyLimits.suggestion}
- Budget for this trade: $${strategyLimits.min.toLocaleString()} - $${strategyLimits.max.toLocaleString()} MTK
- Make BOLD moves that match your personality!
- REVIEW your holdings: positions with big gains might be time to TAKE PROFITS
- REVIEW your holdings: positions with big losses might need to be CUT
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
    
    // Validate and fix the decision
    if (!decision.action || !['BUY', 'SELL', 'HOLD'].includes(decision.action)) {
      console.warn(`[AI Trading] Invalid action "${decision.action}", defaulting to HOLD`);
      decision.action = 'HOLD';
    }
    
    // If BUY or SELL but no shares, this is invalid - convert to HOLD
    if ((decision.action === 'BUY' || decision.action === 'SELL') && !decision.shares) {
      console.warn(`[AI Trading] ${decision.action} without shares specified, converting to HOLD`);
      decision.reasoning = `(Converted from ${decision.action} - no shares specified) ${decision.reasoning || ''}`;
      decision.action = 'HOLD';
    }
    
    // Ensure shares is a valid number
    if (decision.shares && (typeof decision.shares !== 'number' || decision.shares <= 0)) {
      console.warn(`[AI Trading] Invalid shares value "${decision.shares}", converting to HOLD`);
      decision.reasoning = `(Converted - invalid shares: ${decision.shares}) ${decision.reasoning || ''}`;
      decision.action = 'HOLD';
      decision.shares = undefined;
    }
    
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
    
    // CRITICAL: Strict balance validation BEFORE any transaction
    if (totalCost > balanceBefore) {
      // Recalculate maximum possible shares
      const maxShares = Math.floor(balanceBefore / priceData.current_price * 100) / 100;
      console.error(`[AI Trading] ${aiInvestor.display_name} OVERSPENDING BLOCKED: tried $${totalCost.toFixed(2)} but only has $${balanceBefore.toFixed(2)}`);
      return { 
        success: false, 
        message: `${aiInvestor.display_name} tried to overspend: wanted ${decision.shares} shares of ${pitch.company_name} @ $${priceData.current_price} = $${totalCost.toFixed(2)} but only has $${balanceBefore.toFixed(2)}. Max affordable: ${maxShares} shares`,
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
    
    // Additional safety: ensure we're not spending more than total_tokens
    if (totalCost > aiInvestor.total_tokens) {
      console.error(`[AI Trading] ${aiInvestor.display_name} INVALID TRADE: cost exceeds total portfolio`);
      return {
        success: false,
        message: `${aiInvestor.display_name} invalid trade: $${totalCost.toFixed(2)} exceeds total portfolio $${aiInvestor.total_tokens.toFixed(2)}`,
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
    
    const balanceAfter = balanceBefore - totalCost;
    
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

    await supabase
      .from('user_token_balances')
      .update({
        available_tokens: balanceAfter,
        total_invested: (aiInvestor.total_invested || 0) + totalCost
      })
      .eq('user_id', aiInvestor.user_id);

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
    
    const { data: existingInvestment } = await supabase
      .from('user_investments')
      .select('*')
      .eq('user_id', aiInvestor.user_id)
      .eq('pitch_id', decision.pitch_id)
      .single();

    if (!existingInvestment || existingInvestment.shares_owned < decision.shares) {
      return {
        success: false,
        message: `Insufficient shares: has ${existingInvestment?.shares_owned || 0}, tried to sell ${decision.shares}`,
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
    const balanceAfter = balanceBefore + totalRevenue;
    
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
      await supabase
        .from('user_investments')
        .delete()
        .eq('user_id', aiInvestor.user_id)
        .eq('pitch_id', decision.pitch_id);
    }

    const soldAmount = decision.shares * existingInvestment.avg_purchase_price;
    await supabase
      .from('user_token_balances')
      .update({
        available_tokens: balanceAfter,
        total_invested: (aiInvestor.total_invested || 0) - soldAmount
      })
      .eq('user_id', aiInvestor.user_id);

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
    message: `Invalid action: ${decision.action} with shares=${decision.shares}. Action must be BUY/SELL/HOLD and require shares for BUY/SELL.`,
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
        portfolio_value_before: aiInvestor.actualPortfolioValue || (aiInvestor.total_tokens - aiInvestor.available_tokens),
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
    // Check if today is a US market holiday
    const now = new Date();
    const estOffset = -5 * 60; // EST is UTC-5 (ignoring DST for simplicity)
    const estTime = new Date(now.getTime() + (now.getTimezoneOffset() + estOffset) * 60000);
    const { isHoliday, holidayName } = isUSMarketHoliday(estTime);
    
    if (isHoliday) {
      console.log(`[AI Trading] Skipping - US market closed for ${holidayName}`);
      return NextResponse.json({ 
        success: false, 
        skipped: true,
        reason: `US market closed: ${holidayName}`,
        timestamp: new Date().toISOString()
      });
    }
    
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
        
        // Calculate ACTUAL portfolio value from live prices
        const actualPortfolioValue = portfolio.reduce((sum: number, p: any) => {
          const pitch = pitches.find(hp => hp.pitch_id === p.pitch_id);
          return sum + (p.shares_owned * (pitch?.current_price || 0));
        }, 0);
        
        console.log(`[AI Trading] ${ai.display_name} actual holdings value: $${actualPortfolioValue.toFixed(2)}`);
        
        const { decision, prompt, rawResponse } = await getAITradeDecision(ai, portfolio, pitches, actualPortfolioValue);
        
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
              portfolioBefore: actualPortfolioValue,
              portfolioAfter: actualPortfolioValue
            }
          };
        } else {
          result = await executeTrade(supabase, ai, decision, pitches);
        }
        
        console.log(`[AI Trading] ${ai.display_name} result: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.message}`);
        
        // Update AI object with actual portfolio value for logging
        ai.actualPortfolioValue = actualPortfolioValue;
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
