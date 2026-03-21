-- Check if RLS (Row Level Security) is enabled on critical tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_investments', 'investment_transactions', 'user_token_balances')
ORDER BY tablename;

-- Check what RLS policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_expression,
  with_check as check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_investments', 'investment_transactions', 'user_token_balances')
ORDER BY tablename, policyname;
