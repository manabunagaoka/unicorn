-- Check what companies are actually in student_projects
SELECT 
  get_pitch_id_from_uuid(id) as pitch_id,
  startup_name,
  ticker,
  status
FROM student_projects
WHERE ticker IS NOT NULL
ORDER BY get_pitch_id_from_uuid(id);

-- This will show us which pitch_ids exist and which are missing
