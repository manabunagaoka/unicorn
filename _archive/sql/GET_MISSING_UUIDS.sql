-- Get the UUIDs for companies 8-14 that need to be mapped
SELECT 
  id,
  startup_name,
  ticker
FROM student_projects
WHERE ticker IN ('AFRM', 'PTON', 'ASAN', 'LYFT', 'TDUP', 'KIND', 'RENT')
ORDER BY ticker;
