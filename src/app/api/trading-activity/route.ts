import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
  );

  try {
    // Get recent AI trading logs (richer data than investment_transactions)
    const { data: logs, error: logsError } = await supabase
      .from('ai_trading_logs')
      .select('id, user_id, display_name, decision_action, decision_pitch_id, decision_shares, decision_reasoning, execution_success, execution_message, created_at')
      .order('created_at', { ascending: false })
      .limit(30);

    if (logsError) {
      // Fallback to investment_transactions if ai_trading_logs fails
      const { data: trades, error: tradesError } = await supabase
        .from('investment_transactions')
        .select('id, user_id, pitch_id, transaction_type, shares, price_per_share, total_amount')
        .order('id', { ascending: false })
        .limit(30);

      if (tradesError) throw tradesError;

      // Get user names
      const userIds = [...new Set(trades?.map(t => t.user_id) || [])];
      const { data: users } = await supabase
        .from('user_token_balances')
        .select('user_id, display_name')
        .in('user_id', userIds);

      // Get tickers from ai_readable_pitches
      const pitchIds = [...new Set(trades?.map(t => t.pitch_id) || [])];
      const { data: stocks } = await supabase
        .from('ai_readable_pitches')
        .select('pitch_id, ticker')
        .in('pitch_id', pitchIds);

      const tickerMap: Record<number, string> = {};
      stocks?.forEach(s => { tickerMap[s.pitch_id] = s.ticker; });

      const userMap: Record<string, string> = {};
      users?.forEach(u => { userMap[u.user_id] = u.display_name; });

      return NextResponse.json({
        activities: (trades || []).map(t => ({
          id: t.id,
          investor_name: userMap[t.user_id] || 'Unknown',
          action: t.transaction_type,
          ticker: tickerMap[t.pitch_id] || `ID-${t.pitch_id}`,
          shares: t.shares,
          price: t.price_per_share,
          timestamp: new Date().toISOString(),
        })),
      });
    }

    // Get tickers for pitch IDs
    const pitchIds = [...new Set(logs?.map(l => l.decision_pitch_id).filter(Boolean) || [])];
    const { data: stocks } = await supabase
      .from('ai_readable_pitches')
      .select('pitch_id, ticker')
      .in('pitch_id', pitchIds.length > 0 ? pitchIds : [0]);

    const tickerMap: Record<number, string> = {};
    stocks?.forEach(s => { tickerMap[s.pitch_id] = s.ticker; });

    return NextResponse.json({
      activities: (logs || []).map(log => ({
        id: log.id,
        investor_name: log.display_name,
        action: log.decision_action,
        ticker: tickerMap[log.decision_pitch_id] || '',
        shares: log.decision_shares,
        price: 0,
        timestamp: log.created_at,
        reasoning: log.decision_reasoning,
        success: log.execution_success,
      })),
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('Trading activity error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
