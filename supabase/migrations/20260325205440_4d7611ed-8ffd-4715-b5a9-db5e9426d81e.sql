
-- Clean up and re-seed baseline_versions with proper split
DELETE FROM public.baseline_versions WHERE project_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Version 1: first 7 controls
INSERT INTO public.baseline_versions (project_id, user_id, version, control_count, controls_snapshot, changes_summary, status, created_at)
SELECT 
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  c.user_id,
  1,
  7,
  (SELECT jsonb_agg(to_jsonb(x)) FROM public.controls x WHERE x.project_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' AND x.created_at < '2026-03-25 20:30:00+00'),
  'Initial baseline: 7 security controls generated from document source via AI (STRIDE methodology)',
  'review',
  '2026-03-25 20:05:28.986814+00'
FROM public.controls c
WHERE c.project_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
LIMIT 1;

-- Version 2: all 15 controls
INSERT INTO public.baseline_versions (project_id, user_id, version, control_count, controls_snapshot, changes_summary, status, created_at)
SELECT 
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  c.user_id,
  2,
  15,
  (SELECT jsonb_agg(to_jsonb(x)) FROM public.controls x WHERE x.project_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  'Added 8 controls from AWS S3 Security Best Practices URL source. Enhanced coverage with CloudTrail, MFA Delete, Object Lock, and VPC Endpoints.',
  'review',
  '2026-03-25 20:36:55.798896+00'
FROM public.controls c
WHERE c.project_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
LIMIT 1;
