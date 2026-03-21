-- Get the actual UUIDs for companies 8-14 (Affirm through Rent the Runway)
SELECT 
  id as uuid,
  startup_name,
  ticker
FROM student_projects
WHERE ticker IN ('AFRM', 'PTON', 'ASAN', 'LYFT', 'TDUP', 'KIND', 'RENT')
ORDER BY startup_name;
