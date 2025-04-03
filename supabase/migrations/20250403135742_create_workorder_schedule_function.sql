
-- Create a function to insert workorder schedules
CREATE OR REPLACE FUNCTION public.create_workorder_schedule(
  p_workorder_id UUID,
  p_schedule_type TEXT,
  p_next_run TIMESTAMPTZ,
  p_created_by UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_schedule_id UUID;
BEGIN
  INSERT INTO workorder_schedules (
    workorder_id,
    schedule_type,
    next_run,
    created_by,
    active
  ) VALUES (
    p_workorder_id,
    p_schedule_type,
    p_next_run,
    p_created_by,
    true
  )
  RETURNING id INTO new_schedule_id;
  
  RETURN new_schedule_id;
END;
$$;
