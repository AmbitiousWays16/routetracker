-- =====================================================
-- Sample Data for Route Storage Schema Testing
-- =====================================================
-- This script inserts sample data to validate the route storage schema
-- and demonstrate typical usage patterns.

-- Note: This script assumes you have a user authenticated with auth.uid()
-- For testing, you may need to replace auth.uid() with a specific UUID

-- =====================================================
-- 1. INSERT SAMPLE ROUTE
-- =====================================================

-- Example: Morning commute route from San Francisco to Oakland
INSERT INTO public.routes (
  user_id,
  route_name,
  description,
  encoded_polyline,
  total_distance_meters,
  estimated_duration_seconds,
  start_lat,
  start_lng,
  end_lat,
  end_lng,
  bbox_north,
  bbox_south,
  bbox_east,
  bbox_west,
  is_verified
) VALUES (
  auth.uid(),
  'Morning Commute - SF to Oakland',
  'Daily commute route via Bay Bridge',
  'w~bgFndxfVjBjE~B|DpBrDfCfEjBrD',  -- Simplified polyline
  23000,  -- 23 km
  1800,   -- 30 minutes
  37.7749, -122.4194,  -- San Francisco (start)
  37.8044, -122.2712,  -- Oakland (end)
  37.8044,  -- north
  37.7749,  -- south
  -122.2712, -- east
  -122.4194  -- west
  TRUE
) RETURNING id;

-- Store the route_id for subsequent inserts
-- For actual testing, replace 'ROUTE_ID_HERE' with the UUID returned above

-- =====================================================
-- 2. INSERT WAYPOINTS FOR THE ROUTE
-- =====================================================

-- Example waypoints along the commute
INSERT INTO public.waypoints (
  route_id,
  sequence_number,
  waypoint_type,
  name,
  address,
  latitude,
  longitude,
  altitude_meters,
  distance_from_previous_meters
) VALUES
  -- Start point
  (
    'ROUTE_ID_HERE',
    1,
    'stop',
    'Home',
    '123 Market St, San Francisco, CA 94103',
    37.7749,
    -122.4194,
    15.0,
    0  -- First waypoint, no previous distance
  ),
  -- Waypoint 1: Via point
  (
    'ROUTE_ID_HERE',
    2,
    'via',
    'Bay Bridge Toll Plaza',
    'Bay Bridge Toll Plaza, San Francisco, CA',
    37.7983,
    -122.3778,
    10.0,
    5000  -- 5 km from home
  ),
  -- Waypoint 2: Checkpoint
  (
    'ROUTE_ID_HERE',
    3,
    'checkpoint',
    'Treasure Island',
    'Treasure Island, San Francisco, CA',
    37.8267,
    -122.3716,
    5.0,
    3200  -- 3.2 km from toll plaza
  ),
  -- End point
  (
    'ROUTE_ID_HERE',
    4,
    'stop',
    'Office',
    '456 Broadway, Oakland, CA 94607',
    37.8044,
    -122.2712,
    20.0,
    14800  -- 14.8 km from Treasure Island
  );

-- =====================================================
-- 3. INSERT GPS COORDINATES FOR DETAILED TRACKING
-- =====================================================

-- Example: GPS tracking points along the route
-- In a real scenario, these would be recorded every few seconds

INSERT INTO public.gps_coordinates (
  route_id,
  sequence_number,
  latitude,
  longitude,
  altitude_meters,
  accuracy_meters,
  heading_degrees,
  speed_mps,
  recorded_at,
  source
) VALUES
  -- Start
  (
    'ROUTE_ID_HERE',
    1,
    37.7749,
    -122.4194,
    15.0,
    5.0,
    45.0,  -- Northeast heading
    0.0,   -- Stationary
    now() - INTERVAL '30 minutes',
    'gps'
  ),
  -- Point 2: Moving through city
  (
    'ROUTE_ID_HERE',
    2,
    37.7800,
    -122.4100,
    12.0,
    8.0,
    50.0,
    15.0,  -- 15 m/s ≈ 54 km/h
    now() - INTERVAL '28 minutes',
    'gps'
  ),
  -- Point 3: Approaching bridge
  (
    'ROUTE_ID_HERE',
    3,
    37.7900,
    -122.3900,
    8.0,
    6.0,
    60.0,
    20.0,  -- 20 m/s ≈ 72 km/h
    now() - INTERVAL '25 minutes',
    'gps'
  ),
  -- Point 4: On bridge
  (
    'ROUTE_ID_HERE',
    4,
    37.8100,
    -122.3600,
    25.0,  -- Elevated on bridge
    10.0,
    85.0,
    25.0,  -- 25 m/s ≈ 90 km/h
    now() - INTERVAL '20 minutes',
    'gps'
  ),
  -- Point 5: Approaching Oakland
  (
    'ROUTE_ID_HERE',
    5,
    37.8044,
    -122.2800,
    18.0,
    7.0,
    90.0,
    18.0,  -- Slowing down
    now() - INTERVAL '10 minutes',
    'gps'
  ),
  -- Point 6: Arrival
  (
    'ROUTE_ID_HERE',
    6,
    37.8044,
    -122.2712,
    20.0,
    5.0,
    0.0,
    0.0,  -- Stopped
    now() - INTERVAL '5 minutes',
    'gps'
  );

-- =====================================================
-- 4. LINK ROUTE TO EXISTING TRIP (Optional)
-- =====================================================

-- If you want to link this route to an existing trip:
-- First, create a trip
INSERT INTO public.trips (
  user_id,
  date,
  from_address,
  to_address,
  program,
  purpose,
  miles
) VALUES (
  auth.uid(),
  CURRENT_DATE,
  '123 Market St, San Francisco, CA 94103',
  '456 Broadway, Oakland, CA 94607',
  'Daily Operations',
  'Commute to office',
  14.3  -- Approximate miles
) RETURNING id;

-- Then update the route with the trip_id
-- UPDATE public.routes SET trip_id = 'TRIP_ID_HERE' WHERE id = 'ROUTE_ID_HERE';

-- =====================================================
-- 5. QUERY EXAMPLES TO VALIDATE DATA
-- =====================================================

-- View the complete route with waypoint count
SELECT 
  r.id,
  r.route_name,
  r.total_distance_miles,
  r.estimated_duration_seconds / 60.0 AS estimated_minutes,
  COUNT(w.id) AS waypoint_count,
  COUNT(g.id) AS gps_point_count
FROM public.routes r
LEFT JOIN public.waypoints w ON w.route_id = r.id
LEFT JOIN public.gps_coordinates g ON g.route_id = r.id
WHERE r.user_id = auth.uid()
GROUP BY r.id;

-- View waypoints in order
SELECT 
  sequence_number,
  waypoint_type,
  name,
  address,
  latitude,
  longitude,
  distance_from_previous_miles
FROM public.waypoints
WHERE route_id = 'ROUTE_ID_HERE'
ORDER BY sequence_number;

-- View GPS tracking points
SELECT 
  sequence_number,
  latitude,
  longitude,
  speed_mps,
  heading_degrees,
  accuracy_meters,
  recorded_at,
  source
FROM public.gps_coordinates
WHERE route_id = 'ROUTE_ID_HERE'
ORDER BY sequence_number;

-- Calculate average speed from GPS data
SELECT 
  route_id,
  AVG(speed_mps) AS avg_speed_mps,
  AVG(speed_mps) * 2.23694 AS avg_speed_mph,
  MAX(speed_mps) * 2.23694 AS max_speed_mph
FROM public.gps_coordinates
WHERE route_id = 'ROUTE_ID_HERE'
  AND speed_mps > 0
GROUP BY route_id;

-- =====================================================
-- 6. TEST ARCHIVAL FUNCTIONALITY
-- =====================================================

-- Archive routes older than 12 months
SELECT archive_old_routes(12);

-- Get route statistics for current user
SELECT * FROM get_route_stats(auth.uid());

-- =====================================================
-- 7. CLEANUP (Optional - for testing only)
-- =====================================================

-- To remove sample data after testing:
-- DELETE FROM public.routes WHERE route_name LIKE 'Morning Commute%' AND user_id = auth.uid();
-- Note: Waypoints and GPS coordinates will be cascade deleted

-- =====================================================
-- NOTES FOR TESTING
-- =====================================================

-- 1. Replace 'ROUTE_ID_HERE' with actual UUID from the INSERT...RETURNING statement
-- 2. Replace 'TRIP_ID_HERE' with actual trip UUID if linking
-- 3. Run queries in sections, not all at once
-- 4. Ensure you're authenticated (auth.uid() returns a valid UUID)
-- 5. Check RLS policies are working by trying to access as different user

-- Example test for RLS:
-- User A should not see User B's routes
-- SELECT * FROM public.routes WHERE user_id != auth.uid();
-- This should return empty result set due to RLS policies
