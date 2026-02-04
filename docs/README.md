# RouteTracker Database Schema - Route Storage

This directory contains comprehensive documentation for the RouteTracker database schema, specifically the enhanced route storage capabilities.

## Documentation Files

### 📚 [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
Complete database schema documentation including:
- **ER Diagrams:** Visual representation of all table relationships
- **Table Definitions:** Detailed column specifications, constraints, and indexes
- **RLS Policies:** Row-level security configuration
- **Database Functions:** Helper functions for archival and statistics
- **Sample Queries:** Common query patterns and examples
- **Performance Optimization:** Indexing strategy and query tips

### 📋 [DATA_RETENTION_STRATEGY.md](./DATA_RETENTION_STRATEGY.md)
Data retention and archival strategy documentation including:
- **Data Classification:** Critical vs. operational data definitions
- **Retention Periods:** Legal and compliance requirements
- **Archival Process:** Automatic and manual archival procedures
- **Backup Strategy:** Daily and long-term backup plans
- **GDPR Compliance:** Privacy and data protection measures
- **Implementation Checklist:** Phased rollout plan

## Quick Start

### View the Schema
1. Read [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for complete table definitions
2. Review the ER diagram to understand relationships
3. Check the RLS policies to understand data access controls

### Apply the Schema
The database migrations are located in `/supabase/migrations/`:
- **20260204044937_create_route_storage_schema.sql** - Main migration creating routes, waypoints, and GPS coordinates tables

```bash
# Local development
supabase start
supabase db reset  # Applies all migrations

# Production
supabase db push
```

### Test the Schema
1. Run the validation script:
   ```bash
   ./scripts/validate_route_schema.sh
   ```

2. Insert sample data:
   ```sql
   -- See supabase/migrations/sample_route_data.sql for examples
   ```

3. Test queries:
   ```sql
   -- Get route statistics
   SELECT * FROM get_route_stats(auth.uid());
   
   -- Archive old routes
   SELECT archive_old_routes(12);
   ```

## Schema Overview

### New Tables

#### `routes`
Stores detailed route information with:
- Geometry (encoded polylines, coordinates)
- Distance calculations (meters & miles)
- Timing information (estimated & actual duration)
- Bounding boxes for spatial queries
- Archive status for data retention

#### `waypoints`
Stores individual stops along routes with:
- Sequence ordering
- Waypoint types (stop, via, checkpoint)
- Location data (lat/lng, altitude)
- Timing information (arrival, departure, duration)
- Distance calculations between waypoints

#### `gps_coordinates`
Stores detailed GPS tracking data with:
- Precise coordinates with sequence ordering
- Quality metrics (accuracy, heading, speed)
- Recording timestamps
- Data source tracking (GPS, manual, calculated, imported)

### Key Features

✅ **Comprehensive route tracking** - From simple trips to detailed GPS trails  
✅ **Performance optimized** - Indexes for user, time, and spatial queries  
✅ **Security enforced** - RLS policies ensure user data isolation  
✅ **Flexible data model** - Optional trip linkage, computed columns  
✅ **Compliance ready** - Built-in archival strategy and GDPR support  

## Migration Details

### Dependencies
The route storage schema requires:
- `trips` table (created in earlier migration)
- `auth.users` from Supabase Auth
- `update_updated_at_column()` function (created in initial migration)

### What It Creates
- **3 tables:** routes, waypoints, gps_coordinates
- **15+ indexes:** Performance indexes for common queries
- **2 functions:** archive_old_routes(), get_route_stats()
- **RLS policies:** User isolation for all tables
- **Constraints:** Data validation for coordinates, distances, sequences

### Migration Safety
- ✅ Non-breaking: Adds new tables without modifying existing ones
- ✅ Optional linkage: Routes can optionally link to trips via `trip_id`
- ✅ Backward compatible: Existing trip functionality remains unchanged
- ✅ Rollback safe: Can be dropped without affecting existing tables

## Usage Examples

### Create a Route
```sql
INSERT INTO routes (user_id, route_name, total_distance_meters, start_lat, start_lng, end_lat, end_lng)
VALUES (
  auth.uid(),
  'Morning Commute',
  15000,
  37.7749, -122.4194,  -- San Francisco
  37.7849, -122.4094   -- Destination
)
RETURNING id;
```

### Add Waypoints
```sql
INSERT INTO waypoints (route_id, sequence_number, waypoint_type, name, latitude, longitude)
VALUES
  ('route-id', 1, 'stop', 'Home', 37.7749, -122.4194),
  ('route-id', 2, 'via', 'Coffee Shop', 37.7799, -122.4144),
  ('route-id', 3, 'stop', 'Office', 37.7849, -122.4094);
```

### Query Route Statistics
```sql
-- Get all route stats for current user
SELECT * FROM get_route_stats(auth.uid());

-- Find routes by distance
SELECT route_name, total_distance_miles
FROM routes
WHERE user_id = auth.uid()
  AND total_distance_miles > 10
  AND is_archived = FALSE
ORDER BY created_at DESC;
```

### Archive Old Routes
```sql
-- Archive routes older than 12 months
SELECT archive_old_routes(12);

-- Manually archive specific route
UPDATE routes
SET is_archived = TRUE, archived_at = now()
WHERE id = 'route-id' AND user_id = auth.uid();
```

## Data Relationships

```
auth.users (Supabase)
  └─→ routes (1:N)
       ├─→ waypoints (1:N)
       └─→ gps_coordinates (1:N)

trips (existing)
  └─→ routes (1:N, optional)
```

## Performance Considerations

### Indexes
- **User queries:** `idx_routes_user_id`, `idx_routes_user_archived`
- **Time queries:** `idx_routes_created_at`, `idx_gps_recorded_at`
- **Spatial queries:** `idx_routes_start_location`, `idx_routes_end_location`
- **Sequence queries:** `idx_waypoints_route_sequence`, `idx_gps_route_sequence`

### Query Optimization
1. Use filtered indexes (is_archived = FALSE) for active data
2. Leverage computed columns (total_distance_miles) to avoid calculations
3. Use bounding box filters before coordinate distance calculations
4. Archive old routes regularly to keep active tables small

## Security

### Row Level Security (RLS)
All tables have RLS enabled with policies that:
- Allow users to view/modify only their own data
- Use `auth.uid()` for automatic user context
- Prevent unauthorized access to other users' routes

### Data Privacy
- Optional GPS coordinates (use polylines for privacy)
- Cascade deletes for GDPR compliance
- Archival strategy for data minimization
- Clear separation of business (trips) vs. tracking (routes) data

## Maintenance

### Regular Tasks
- **Monthly:** Review archival execution logs
- **Quarterly:** Analyze storage growth trends
- **Annually:** Run purge for 5+ year old archived data
- **As needed:** User data export/deletion requests

### Monitoring Queries
```sql
-- Table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('routes', 'waypoints', 'gps_coordinates');

-- Archive candidates
SELECT COUNT(*) FROM routes
WHERE is_archived = FALSE AND created_at < now() - INTERVAL '12 months';
```

## Support

For questions or issues:
1. Review the [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) documentation
2. Check the [DATA_RETENTION_STRATEGY.md](./DATA_RETENTION_STRATEGY.md) for archival questions
3. Run validation script: `./scripts/validate_route_schema.sh`
4. Review sample queries in `supabase/migrations/sample_route_data.sql`

## Version History

- **v1.0** (2026-02-04): Initial route storage schema
  - Routes table with geometry and metadata
  - Waypoints table for route segments
  - GPS coordinates table for detailed tracking
  - Archival strategy and helper functions
  - Complete documentation and samples

---

**Last Updated:** 2026-02-04  
**Schema Version:** Migration 20260204044937
