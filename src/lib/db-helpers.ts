// lib/db-helpers.ts
// Shared database helper: load ticker map from DB

import { createClient } from '@supabase/supabase-js';

let cachedTickerMap: Record<number, string> | null = null;
let cachedAt = 0;
const CACHE_TTL = 60000; // 1 minute

export async function getTickerMap(): Promise<Record<number, string>> {
  if (cachedTickerMap && Date.now() - cachedAt < CACHE_TTL) {
    return cachedTickerMap;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data } = await supabase
    .from('ai_readable_pitches')
    .select('pitch_id, ticker')
    .not('ticker', 'is', null);

  const map: Record<number, string> = {};
  data?.forEach(row => { map[row.pitch_id] = row.ticker; });

  cachedTickerMap = map;
  cachedAt = Date.now();
  return map;
}

export function getReversedTickerMap(tickerMap: Record<number, string>): Record<string, number> {
  const reversed: Record<string, number> = {};
  for (const [pitchId, ticker] of Object.entries(tickerMap)) {
    reversed[ticker] = parseInt(pitchId);
  }
  return reversed;
}
