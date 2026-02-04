-- =====================================================
-- Enhanced Route Storage Schema Design
-- =====================================================
-- This migration creates dedicated tables for storing detailed route information,
-- waypoints, and GPS coordinates to provide comprehensive route tracking capabilities.

-- =====================================================
-- 1. ROUTES TABLE
-- =====================================================
-- Stores detailed route information with metadata
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Route metadata
  route_name TEXT,
  description TEXT,
  
  -- Route geometry
  encoded_polyline TEXT, -- Google Maps encoded polyline
  total_distance_meters NUMERIC NOT NULL DEFAULT 0,
  total_distance_miles NUMERIC GENERATED ALWAYS AS (total_distance_meters * 0.000621371) STORED,
  
  -- Timing information
  estimated_duration_seconds INTEGER,
  actual_duration_seconds INTEGER,
  
  -- Route bounds (for efficient spatial queries)
  start_lat NUMERIC(10, 7),
  start_lng NUMERIC(10, 7),
  end_lat NUMERIC(10, 7),
  end_lng NUMERIC(10, 7),
  
  -- Bounding box for the entire route
  bbox_north NUMERIC(10, 7),
  bbox_south NUMERIC(10, 7),
  bbox_east NUMERIC(10, 7),
  bbox_west NUMERIC(10, 7),
  
  -- Route status
  is_verified BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT check_distance_valid CHECK (total_distance_meters >= 0 AND total_distance_meters < 10000000),
  CONSTRAINT check_duration_valid CHECK (
    estimated_duration_seconds IS NULL OR (estimated_duration_seconds >= 0 AND estimated_duration_seconds < 86400)
  ),
  CONSTRAINT check_actual_duration_valid CHECK (
    actual_duration_seconds IS NULL OR (actual_duration_seconds >= 0 AND actual_duration_seconds < 86400)
  ),
  CONSTRAINT check_coordinates_valid CHECK (
    (start_lat IS NULL OR (start_lat >= -90 AND start_lat <= 90)) AND
    (start_lng IS NULL OR (start_lng >= -180 AND start_lng <= 180)) AND
    (end_lat IS NULL OR (end_lat >= -90 AND end_lat <= 90)) AND
    (end_lng IS NULL OR (end_lng >= -180 AND end_lng <= 180))
  ),
  CONSTRAINT check_archived_consistency CHECK (
    (is_archived = FALSE AND archived_at IS NULL) OR 
    (is_archived = TRUE AND archived_at IS NOT NULL)
  )
);

-- =====================================================
-- 2. WAYPOINTS TABLE
-- =====================================================
-- Stores individual waypoints/stops along a route
CREATE TABLE public.waypoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  
  -- Waypoint metadata
  sequence_number INTEGER NOT NULL,
  waypoint_type TEXT NOT NULL DEFAULT 'stop', -- 'stop', 'via', 'checkpoint'
  name TEXT,
  address TEXT,
  notes TEXT,
  
  -- Location data
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  altitude_meters NUMERIC(8, 2),
  
  -- Timing data
  arrival_time TIMESTAMP WITH TIME ZONE,
  departure_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- Distances
  distance_from_previous_meters NUMERIC,
  distance_from_previous_miles NUMERIC GENERATED ALWAYS AS (distance_from_previous_meters * 0.000621371) STORED,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT check_sequence_positive CHECK (sequence_number > 0),
  CONSTRAINT check_waypoint_type_valid CHECK (waypoint_type IN ('stop', 'via', 'checkpoint')),
  CONSTRAINT check_waypoint_coordinates_valid CHECK (
    latitude >= -90 AND latitude <= 90 AND
    longitude >= -180 AND longitude <= 180
  ),
  CONSTRAINT check_waypoint_distance_valid CHECK (
    distance_from_previous_meters IS NULL OR 
    (distance_from_previous_meters >= 0 AND distance_from_previous_meters < 1000000)
  ),
  CONSTRAINT check_waypoint_duration_valid CHECK (
    duration_seconds IS NULL OR 
    (duration_seconds >= 0 AND duration_seconds < 86400)
  ),
  CONSTRAINT check_waypoint_time_order CHECK (
    arrival_time IS NULL OR departure_time IS NULL OR arrival_time <= departure_time
  ),
  
  -- Unique constraint on route_id and sequence_number
  UNIQUE(route_id, sequence_number)
);

-- =====================================================
-- 3. GPS_COORDINATES TABLE
-- =====================================================
-- Stores detailed GPS coordinate tracking data for routes
CREATE TABLE public.gps_coordinates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  waypoint_id UUID REFERENCES public.waypoints(id) ON DELETE SET NULL,
  
  -- GPS data
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  altitude_meters NUMERIC(8, 2),
  
  -- Accuracy and quality metrics
  accuracy_meters NUMERIC(8, 2),
  heading_degrees NUMERIC(5, 2), -- 0-360 degrees
  speed_mps NUMERIC(8, 2), -- meters per second
  
  -- Sequence in route
  sequence_number INTEGER NOT NULL,
  
  -- Time tracking
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Metadata
  source TEXT DEFAULT 'gps', -- 'gps', 'manual', 'calculated', 'imported'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT check_gps_coordinates_valid CHECK (
    latitude >= -90 AND latitude <= 90 AND
    longitude >= -180 AND longitude <= 180
  ),
  CONSTRAINT check_gps_accuracy_valid CHECK (
    accuracy_meters IS NULL OR (accuracy_meters >= 0 AND accuracy_meters < 1000)
  ),
  CONSTRAINT check_gps_heading_valid CHECK (
    heading_degrees IS NULL OR (heading_degrees >= 0 AND heading_degrees <= 360)
  ),
  CONSTRAINT check_gps_speed_valid CHECK (
    speed_mps IS NULL OR (speed_mps >= 0 AND speed_mps < 200)
  ),
  CONSTRAINT check_gps_sequence_positive CHECK (sequence_number > 0),
  CONSTRAINT check_gps_source_valid CHECK (
    source IN ('gps', 'manual', 'calculated', 'imported')
  ),
  
  -- Unique constraint on route_id and sequence_number
  UNIQUE(route_id, sequence_number)
);

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================

-- Routes table indexes
CREATE INDEX idx_routes_user_id ON public.routes(user_id);
CREATE INDEX idx_routes_trip_id ON public.routes(trip_id);
CREATE INDEX idx_routes_created_at ON public.routes(created_at DESC);
CREATE INDEX idx_routes_is_archived ON public.routes(is_archived) WHERE is_archived = FALSE;
CREATE INDEX idx_routes_user_archived ON public.routes(user_id, is_archived) WHERE is_archived = FALSE;

-- Spatial query indexes for routes
CREATE INDEX idx_routes_start_location ON public.routes(start_lat, start_lng) WHERE start_lat IS NOT NULL AND start_lng IS NOT NULL;
CREATE INDEX idx_routes_end_location ON public.routes(end_lat, end_lng) WHERE end_lat IS NOT NULL AND end_lng IS NOT NULL;

-- Waypoints table indexes
CREATE INDEX idx_waypoints_route_id ON public.waypoints(route_id);
CREATE INDEX idx_waypoints_route_sequence ON public.waypoints(route_id, sequence_number);
CREATE INDEX idx_waypoints_type ON public.waypoints(waypoint_type);
CREATE INDEX idx_waypoints_location ON public.waypoints(latitude, longitude);

-- GPS coordinates table indexes
CREATE INDEX idx_gps_route_id ON public.gps_coordinates(route_id);
CREATE INDEX idx_gps_route_sequence ON public.gps_coordinates(route_id, sequence_number);
CREATE INDEX idx_gps_waypoint_id ON public.gps_coordinates(waypoint_id) WHERE waypoint_id IS NOT NULL;
CREATE INDEX idx_gps_recorded_at ON public.gps_coordinates(recorded_at DESC);
CREATE INDEX idx_gps_location ON public.gps_coordinates(latitude, longitude);

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waypoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_coordinates ENABLE ROW LEVEL SECURITY;

-- Routes policies - users can access their own routes
CREATE POLICY "Users can view their own routes"
ON public.routes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own routes"
ON public.routes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routes"
ON public.routes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routes"
ON public.routes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Waypoints policies - users can access waypoints for their routes
CREATE POLICY "Users can view waypoints for their routes"
ON public.waypoints FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id = waypoints.route_id AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create waypoints for their routes"
ON public.waypoints FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id = waypoints.route_id AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update waypoints for their routes"
ON public.waypoints FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id = waypoints.route_id AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete waypoints for their routes"
ON public.waypoints FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id = waypoints.route_id AND r.user_id = auth.uid()
  )
);

-- GPS coordinates policies - users can access GPS data for their routes
CREATE POLICY "Users can view GPS coordinates for their routes"
ON public.gps_coordinates FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id = gps_coordinates.route_id AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create GPS coordinates for their routes"
ON public.gps_coordinates FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id = gps_coordinates.route_id AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update GPS coordinates for their routes"
ON public.gps_coordinates FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id = gps_coordinates.route_id AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete GPS coordinates for their routes"
ON public.gps_coordinates FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id = gps_coordinates.route_id AND r.user_id = auth.uid()
  )
);

-- =====================================================
-- 6. TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =====================================================

CREATE TRIGGER update_routes_updated_at
BEFORE UPDATE ON public.routes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_waypoints_updated_at
BEFORE UPDATE ON public.waypoints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to archive old routes
CREATE OR REPLACE FUNCTION public.archive_old_routes(months_old INTEGER DEFAULT 12)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Archive routes older than specified months that aren't already archived
  UPDATE public.routes
  SET is_archived = TRUE,
      archived_at = now()
  WHERE is_archived = FALSE
    AND created_at < (now() - (months_old || ' months')::INTERVAL);
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;

-- Function to calculate route statistics
CREATE OR REPLACE FUNCTION public.get_route_stats(p_user_id UUID)
RETURNS TABLE (
  total_routes BIGINT,
  total_distance_miles NUMERIC,
  total_waypoints BIGINT,
  total_gps_points BIGINT,
  avg_route_distance NUMERIC,
  archived_routes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT r.id)::BIGINT as total_routes,
    COALESCE(SUM(r.total_distance_miles), 0) as total_distance_miles,
    COUNT(DISTINCT w.id)::BIGINT as total_waypoints,
    COUNT(DISTINCT g.id)::BIGINT as total_gps_points,
    COALESCE(AVG(r.total_distance_miles), 0) as avg_route_distance,
    COUNT(DISTINCT r.id) FILTER (WHERE r.is_archived)::BIGINT as archived_routes
  FROM public.routes r
  LEFT JOIN public.waypoints w ON w.route_id = r.id
  LEFT JOIN public.gps_coordinates g ON g.route_id = r.id
  WHERE r.user_id = p_user_id;
END;
$$;

-- =====================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.routes IS 'Stores detailed route information including geometry, timing, and metadata';
COMMENT ON TABLE public.waypoints IS 'Stores individual waypoints/stops along routes with sequence and timing information';
COMMENT ON TABLE public.gps_coordinates IS 'Stores detailed GPS tracking data for routes with quality metrics';

COMMENT ON COLUMN public.routes.encoded_polyline IS 'Google Maps encoded polyline format for efficient route storage';
COMMENT ON COLUMN public.routes.total_distance_miles IS 'Auto-calculated from meters using stored generated column';
COMMENT ON COLUMN public.routes.is_archived IS 'Flag for data retention strategy - archived routes can be purged after retention period';

COMMENT ON COLUMN public.waypoints.sequence_number IS 'Order of waypoint in the route (1-based)';
COMMENT ON COLUMN public.waypoints.waypoint_type IS 'Type: stop (destination), via (pass-through), checkpoint (tracking point)';

COMMENT ON COLUMN public.gps_coordinates.sequence_number IS 'Order of GPS point in the route (1-based)';
COMMENT ON COLUMN public.gps_coordinates.accuracy_meters IS 'GPS accuracy/precision in meters';
COMMENT ON COLUMN public.gps_coordinates.source IS 'Data source: gps (device), manual (user input), calculated (interpolated), imported (external)';
