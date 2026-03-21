// lib/supabase.ts
// Supabase client for Manaboodle Unicorn

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function createServiceClient() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for service client');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// --- Database types ---

export interface Investor {
  user_id: string;
  user_email: string;
  display_name: string;
  username: string | null;
  total_tokens: number;
  available_tokens: number;
  total_invested: number;
  portfolio_value: number;
  is_ai_investor: boolean;
  ai_strategy: string | null;
  ai_emoji: string | null;
  ai_catchphrase: string | null;
  ai_status: string;
  ai_personality_prompt: string | null;
  is_active: boolean;
  investor_tier: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stock {
  pitch_id: number;
  company_name: string;
  ticker: string;
  category: string;
  current_price: number;
  price_change_24h: number;
  elevator_pitch: string;
  founder_story: string;
  fun_fact: string;
}

export interface Investment {
  user_id: string;
  pitch_id: number;
  shares_owned: number;
  total_invested: number;
  avg_purchase_price: number;
  current_value: number;
  unrealized_gain_loss: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  pitch_id: number;
  transaction_type: 'BUY' | 'SELL';
  shares: number;
  price_per_share: number;
  total_amount: number;
  balance_before: number;
  balance_after: number;
  timestamp: string;
}

export interface MarketData {
  pitch_id: number;
  current_price: number;
  total_volume: number;
  total_shares_issued: number;
  unique_investors: number;
  price_change_24h: number;
  market_rank: number | null;
  updated_at: string;
}
