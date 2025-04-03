
-- Add parent_schedule_id column to workorders table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workorders' 
    AND column_name = 'parent_schedule_id'
  ) THEN
    ALTER TABLE public.workorders ADD COLUMN parent_schedule_id UUID NULL REFERENCES public.workorder_schedules(id);
  END IF;
END
$$;
