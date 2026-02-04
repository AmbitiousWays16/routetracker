-- Update archive_old_routes function with admin-only permission check
CREATE OR REPLACE FUNCTION public.archive_old_routes(months_old integer DEFAULT 12)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archived_count integer;
BEGIN
  -- Authorization check: Only admins can archive routes
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can archive routes';
  END IF;

  -- Archive trips older than the specified months
  WITH archived AS (
    DELETE FROM trips
    WHERE date < (CURRENT_DATE - (months_old || ' months')::interval)::date
    RETURNING id
  )
  SELECT COUNT(*) INTO archived_count FROM archived;
  
  RETURN archived_count;
END;
$$;

-- Update get_route_stats function with user access validation
CREATE OR REPLACE FUNCTION public.get_route_stats(p_user_id uuid)
RETURNS TABLE(
  total_trips bigint,
  total_miles numeric,
  avg_miles_per_trip numeric,
  earliest_trip date,
  latest_trip date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorization check: Users can only access their own stats, or admins can access any
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  IF p_user_id != auth.uid() AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Cannot access other users'' statistics';
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_trips,
    COALESCE(SUM(miles), 0)::numeric as total_miles,
    COALESCE(AVG(miles), 0)::numeric as avg_miles_per_trip,
    MIN(date) as earliest_trip,
    MAX(date) as latest_trip
  FROM trips
  WHERE user_id = p_user_id;
END;
$$;