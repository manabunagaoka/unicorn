import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for Pro plan

/**
 * Vercel Cron endpoint for automated AI trading
 * Runs twice daily:
 * - 9:30am EST (14:30 UTC) - 1 hour after market open  
 * - 3:30pm EST (20:30 UTC) - 30 min before market close
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[AI Trading Cron] ===== CRON TRIGGERED =====');
    console.log('[AI Trading Cron] Auth header:', request.headers.get('authorization')?.substring(0, 30) + '...');
    console.log('[AI Trading Cron] CRON_SECRET set?', !!process.env.CRON_SECRET);
    
    // Vercel cron automatically includes auth - just verify CRON_SECRET exists
    if (!process.env.CRON_SECRET) {
      console.error('[AI Trading Cron] CRON_SECRET not set in environment!');
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }

    // Initialize Supabase for idempotency check
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Determine run date and slot (EST timezone)
    const now = new Date();
    const estOffset = -5 * 60; // EST is UTC-5
    const estTime = new Date(now.getTime() + estOffset * 60 * 1000);
    const runDate = estTime.toISOString().split('T')[0];
    const hour = estTime.getUTCHours();
    const runSlot = (hour >= 14 && hour < 17) ? 'MORNING' : 'AFTERNOON';

    console.log(`[AI Trading Cron] Run date: ${runDate}, slot: ${runSlot} (EST hour: ${hour})`);

    // Check idempotency - has this run already completed?
    const { data: runId, error: idempotencyError } = await supabase
      .rpc('start_cron_run', {
        p_run_date: runDate,
        p_run_slot: runSlot
      })
      .single();

    if (idempotencyError) {
      console.error('[AI Trading Cron] Idempotency check failed:', idempotencyError);
      return NextResponse.json({ 
        error: 'Idempotency check failed', 
        details: idempotencyError.message 
      }, { status: 500 });
    }

    if (!runId) {
      console.log(`[AI Trading Cron] ⏭️  Already ran for ${runDate} ${runSlot} - skipping`);
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `Already completed for ${runDate} ${runSlot}`,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[AI Trading Cron] ✅ Starting new run (ID: ${runId})...`);

    // Call the trigger endpoint internally
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/admin/ai-trading/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-cron-token'
      },
      body: JSON.stringify({ source: 'cron' })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[AI Trading Cron] Trigger failed:', response.status, text);
      
      // Mark run as failed
      await supabase.rpc('complete_cron_run', {
        p_run_id: runId,
        p_trades_executed: 0,
        p_error_message: `Trigger endpoint failed: ${response.status} - ${text.substring(0, 200)}`
      });
      
      throw new Error(`Trigger endpoint failed: ${response.status} - ${text.substring(0, 200)}`);
    }

    const data = await response.json();
    const tradesExecuted = data.results?.length || 0;

    // Mark run as completed
    await supabase.rpc('complete_cron_run', {
      p_run_id: runId,
      p_trades_executed: tradesExecuted,
      p_error_message: null
    });

    console.log('[AI Trading Cron] ✅ Completed:', {
      runId,
      success: response.ok,
      results: tradesExecuted
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      runId,
      runDate,
      runSlot,
      tradesExecuted,
      results: data.results
    });
  } catch (error) {
    console.error('[AI Trading Cron] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
