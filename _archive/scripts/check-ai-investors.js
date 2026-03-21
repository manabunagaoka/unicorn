#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2];
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  console.log('\n🤖 AI INVESTORS CURRENT STATUS\n');
  console.log('='.repeat(80));
  
  // Get AI investors
  const { data: aiInvestors, error } = await supabase
    .from('user_token_balances')
    .select('user_id, ai_nickname, ai_emoji, ai_strategy, ai_catchphrase, available_tokens, total_tokens, total_invested')
    .eq('is_ai_investor', true)
    .order('total_tokens', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  aiInvestors.forEach((ai, idx) => {
    console.log(`\n${idx + 1}. ${ai.ai_emoji} ${ai.ai_nickname} (${ai.ai_strategy})`);
    console.log(`   "${ai.ai_catchphrase}"`);
    console.log(`   Cash: $${Math.floor(ai.available_tokens).toLocaleString()}`);
    console.log(`   Portfolio Value: $${Math.floor(ai.total_tokens).toLocaleString()}`);
    console.log(`   Total Invested: $${Math.floor(ai.total_invested || 0).toLocaleString()}`);
  });
  
  // Get recent transactions
  console.log('\n\n📊 RECENT TRADING ACTIVITY (Last 20 transactions)\n');
  console.log('='.repeat(80));
  
  const { data: transactions } = await supabase
    .from('investment_transactions')
    .select('user_id, transaction_type, pitch_id, shares, price_per_share, total_amount, timestamp')
    .order('timestamp', { ascending: false })
    .limit(20);
  
  if (transactions && transactions.length > 0) {
    // Get AI nicknames
    const aiMap = {};
    aiInvestors.forEach(ai => {
      aiMap[ai.user_id] = ai.ai_nickname;
    });
    
    transactions.forEach((tx, idx) => {
      const date = new Date(tx.timestamp).toLocaleString();
      const nickname = aiMap[tx.user_id] || tx.user_id.substring(0, 8);
      console.log(`${idx + 1}. ${date}`);
      console.log(`   ${nickname}: ${tx.transaction_type} ${tx.shares.toFixed(2)} shares @ $${tx.price_per_share.toFixed(2)} = $${tx.total_amount.toFixed(2)}`);
    });
  } else {
    console.log('No trading activity found yet.');
  }
  
  // Check AI investments
  console.log('\n\n💼 AI HOLDINGS\n');
  console.log('='.repeat(80));
  
  const { data: investments } = await supabase
    .from('user_investments')
    .select('user_id, pitch_id, shares_owned, total_invested, current_value')
    .gt('shares_owned', 0)
    .in('user_id', aiInvestors.map(ai => ai.user_id));
  
  if (investments && investments.length > 0) {
    const holdingsByAI = {};
    investments.forEach(inv => {
      if (!holdingsByAI[inv.user_id]) holdingsByAI[inv.user_id] = [];
      holdingsByAI[inv.user_id].push(inv);
    });
    
    Object.entries(holdingsByAI).forEach(([userId, holdings]) => {
      const ai = aiInvestors.find(a => a.user_id === userId);
      console.log(`\n${ai?.ai_emoji} ${ai?.ai_nickname}:`);
      holdings.forEach(h => {
        console.log(`   Pitch ${h.pitch_id}: ${h.shares_owned.toFixed(2)} shares, Value: $${Math.floor(h.current_value).toLocaleString()}`);
      });
    });
  } else {
    console.log('No AI holdings found yet.');
  }
  
  console.log('\n');
}

main();
