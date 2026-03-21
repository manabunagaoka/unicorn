#!/usr/bin/env node
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createTable() {
  console.log('📊 Creating ai_trading_logs table...\n');
  
  const sql = fs.readFileSync('supabase/create_ai_trading_logs.sql', 'utf8');
  
  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`Found ${statements.length} SQL statements to execute\n`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';
    console.log(`Executing statement ${i + 1}/${statements.length}...`);
    
    try {
      // Try using the SQL editor API
      const { data, error } = await supabase.rpc('exec', { sql: stmt });
      
      if (error) {
        // This is expected - exec function may not exist
        console.log(`   ℹ️  RPC not available (expected)`);
      } else {
        console.log(`   ✅ Success`);
      }
    } catch (err) {
      console.log(`   ℹ️  ${err.message}`);
    }
  }
  
  console.log('\n📝 Table creation SQL ready.');
  console.log('⚠️  Please manually run this SQL in Supabase SQL Editor:');
  console.log('   File: /workspaces/rize/supabase/create_ai_trading_logs.sql\n');
  console.log('Then press Enter to continue testing...');
}

createTable();
