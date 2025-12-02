import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { userId, adminToken } = await request.json();
    
    // Verify admin token - must match exactly
    if (adminToken !== 'admin_secret_manaboodle_2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Get AI nickname for confirmation message
    const { data: ai } = await supabase
      .from('user_token_balances')
      .select('display_name')
      .eq('user_id', userId)
      .eq('is_ai_investor', true)
      .single();

    if (!ai) {
      return NextResponse.json({ error: 'AI investor not found' }, { status: 404 });
    }

    // Delete related data in order (foreign key constraints)
    // 1. Delete investments
    await supabase
      .from('user_investments')
      .delete()
      .eq('user_id', userId);

    // 2. Delete transactions
    await supabase
      .from('investment_transactions')
      .delete()
      .eq('user_id', userId);

    // 3. Delete trading logs
    await supabase
      .from('ai_trading_logs')
      .delete()
      .eq('user_id', userId);

    // 4. Delete the AI investor record
    const { error } = await supabase
      .from('user_token_balances')
      .delete()
      .eq('user_id', userId)
      .eq('is_ai_investor', true);  // Safety: only delete AI investors

    if (error) throw error;

    return NextResponse.json({ 
      success: true,
      message: `AI investor "${ai.display_name}" permanently deleted` 
    });
  } catch (error) {
    console.error('Delete AI error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
