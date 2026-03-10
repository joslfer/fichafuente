ALTER TABLE public.fichas
  DROP COLUMN IF EXISTS visit_count,
  DROP COLUMN IF EXISTS monthly_visit_count,
  DROP COLUMN IF EXISTS visits_month;

DROP FUNCTION IF EXISTS public.increment_visit_count(TEXT);
DROP FUNCTION IF EXISTS public.increment_visit_count(TEXT, TEXT);
