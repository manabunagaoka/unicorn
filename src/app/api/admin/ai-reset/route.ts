import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId, adminToken } = await request.json();
    
    // Verify admin token - must match exactly
    if (adminToken !== 'admin_secret_manaboodle_2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: { persistSession: false },
        db: { schema: 'public' }
      }
    );

    // Verify user is an AI investor
    const { data: user, error: userError } = await supabase
      .from('user_token_balances')
      .select('user_id, display_name, is_ai_investor')
      .eq('user_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.is_ai_investor) {
      return NextResponse.json({ error: 'User is not an AI investor' }, { status: 400 });
    }

    // Reset balance to $1,000,000 in user_token_balances
    const { error: balanceError } = await supabase
      .from('user_token_balances')
      .update({ 
        available_tokens: 1000000,
        total_tokens: 1000000,
        total_invested: 0
      })
      .eq('user_id', userId);

    if (balanceError) {
      console.error('Error resetting balance:', balanceError);
      return NextResponse.json({ error: 'Failed to reset balance' }, { status: 500 });
    }

    // Clear investment holdings
    const { error: investmentError } = await supabase
      .from('user_investments')
      .delete()
      .eq('user_id', userId);

    if (investmentError) {
      console.error('Error clearing investments:', investmentError);
      // Non-critical, continue
    }

    // Clear transaction history
    const { error: transactionError } = await supabase
      .from('investment_transactions')
      .delete()
      .eq('user_id', userId);

    if (transactionError) {
      console.error('Error clearing transactions:', transactionError);
      // Non-critical, continue
    }

    // Clear trading logs
    const { error: logsError } = await supabase
      .from('ai_trading_logs')
      .delete()
      .eq('user_id', userId);

    if (logsError) {
      console.error('Error clearing trading logs:', logsError);
      // Non-critical, continue
    }

    console.log(`✅ Reset AI investor ${user.display_name} (${userId}) - Balance: $1M, History cleared`);

    return NextResponse.json({ 
      success: true,
      message: `Reset ${user.display_name} successfully`,
      newBalance: 1000000
    });

  } catch (error) {
    console.error('Error in ai-reset:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}
