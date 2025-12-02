import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { sourceUserId, adminToken } = await request.json();

    // Security check
    if (adminToken !== 'admin_secret_manaboodle_2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!sourceUserId) {
      return NextResponse.json({ error: 'Source user ID required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: { persistSession: false },
        db: { schema: 'public' }
      }
    );

    // Get source AI details
    const { data: sourceAI, error: fetchError } = await supabase
      .from('user_token_balances')
      .select('*')
      .eq('user_id', sourceUserId)
      .eq('is_ai_investor', true)
      .single();

    if (fetchError || !sourceAI) {
      return NextResponse.json({ error: 'Source AI not found' }, { status: 404 });
    }

    // Generate new user_id (simple increment or UUID)
    const timestamp = Date.now();
    const newUserId = `ai_clone_${timestamp}`;
    const newEmail = `ai_clone_${timestamp}@rize.com`;
    const newNickname = `${sourceAI.display_name} 2`;

    // Create cloned AI investor
    const { error: insertError } = await supabase
      .from('user_token_balances')
      .insert({
        user_id: newUserId,
        user_email: newEmail,
        is_ai_investor: true,
        is_active: true,
        display_name: newNickname,
        ai_emoji: sourceAI.ai_emoji,
        ai_strategy: sourceAI.ai_strategy,
        ai_catchphrase: sourceAI.ai_catchphrase,
        ai_personality_prompt: sourceAI.ai_personality_prompt,
        available_tokens: 1000000, // Fresh $1M
        total_tokens: 1000000,
        portfolio_value: 0,
        total_invested: 0,
        investor_tier: 'BRONZE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Clone insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create clone', details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully cloned ${sourceAI.display_name} as ${newNickname}`,
      newUserId,
      newNickname
    });

  } catch (error) {
    console.error('Clone AI error:', error);
    return NextResponse.json(
      { error: 'Failed to clone AI', details: String(error) },
      { status: 500 }
    );
  }
}
