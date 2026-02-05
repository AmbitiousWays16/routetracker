-- Update get_route_stats function to use generic error messages
-- This prevents information disclosure about user existence

CREATE OR REPLACE FUNCTION public.get_route_stats(p_user_id uuid)
 RETURNS TABLE(total_trips bigint, total_miles numeric, avg_miles_per_trip numeric, earliest_trip date, latest_trip date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization check with generic error messages to prevent user enumeration
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid request';
  END IF;
  
  IF p_user_id != auth.uid() AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
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
$function$;