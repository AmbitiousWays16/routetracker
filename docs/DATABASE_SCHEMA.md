# RouteTracker Database Schema Documentation

## Overview

This document describes the complete database schema for the RouteTracker application, including tables for route storage, user management, mileage tracking, and approval workflows.

## Entity Relationship Diagram

```
┌─────────────────┐
│   auth.users    │
│  (Supabase)     │
└────────┬────────┘
         │
         │ 1:1
         ├──────────────────────────────────────────────────────┐
         │                                                        │
         │ 1:N                                                    │
    ┌────▼────────┐                                         ┌────▼─────────┐
    │  profiles   │                                         │  user_roles  │
    │             │                                         │              │
    │ - id        │                                         │ - id         │
    │ - user_id   │                                         │ - user_id    │
    │ - email     │                                         │ - role       │
    │ - full_name │                                         └──────────────┘
    │ - job_title │
    └─────────────┘
         │
         │ 1:N
    ┌────▼────────┐       1:N        ┌──────────────┐
    │   trips     │◄─────────────────┤   routes     │
    │             │                   │              │
    │ - id        │                   │ - id         │
    │ - user_id   │                   │ - trip_id    │
    │ - date      │                   │ - user_id    │
    │ - from_addr │                   │ - route_name │
    │ - to_addr   │                   │ - distance   │
    │ - program   │                   │ - polyline   │
    │ - purpose   │                   │ - start_lat  │
    │ - miles     │                   │ - start_lng  │
    │ - route_url │                   │ - end_lat    │
    │ - map_url   │                   │ - end_lng    │
    └─────────────┘                   │ - is_archived│
         │                             └──────┬───────┘
         │                                    │
         │ N:1                                │ 1:N
    ┌────▼───────────────┐                   │
    │ mileage_vouchers   │              ┌────▼──────────┐
    │                    │              │  waypoints    │
    │ - id               │              │               │
    │ - user_id          │              │ - id          │
    │ - month            │              │ - route_id    │
    │ - total_miles      │              │ - sequence    │
    │ - status           │              │ - type        │
    │ - submitted_at     │              │ - name        │
    │ - rejection_reason │              │ - address     │
    └────────┬───────────┘              │ - latitude    │
             │                           │ - longitude   │
             │ 1:N                       │ - altitude    │
        ┌────▼────────────┐              └───────────────┘
        │approval_history │
        │                 │              ┌────────────────────┐
        │ - id            │              │  gps_coordinates   │
        │ - voucher_id    │              │                    │
        │ - approver_id   │              │ - id               │
        │ - approver_role │              │ - route_id         │
        │ - action        │              │ - waypoint_id      │
        │ - comments      │              │ - latitude         │
        │ - acted_at      │              │ - longitude        │
        └─────────────────┘              │ - altitude         │
                                         │ - accuracy         │
         ┌──────────┐                    │ - heading          │
         │ programs │                    │ - speed            │
         │          │                    │ - sequence         │
         │ - id     │                    │ - recorded_at      │
         │ - user_id│                    │ - source           │
         │ - name   │                    └────────────────────┘
         │ - address│
         └──────────┘
```

## Table Descriptions

### Core User Tables

#### `profiles`
Stores user profile information.

**Columns:**
- `id` (UUID, PK): Primary key
- `user_id` (UUID, FK → auth.users): Reference to Supabase auth user
- `email` (TEXT): User email address
- `full_name` (TEXT): User's full name
- `job_title` (TEXT): User's job title
- `created_at` (TIMESTAMPTZ): Record creation timestamp
- `updated_at` (TIMESTAMPTZ): Last update timestamp

**Indexes:**
- Primary key on `id`
- Unique constraint on `user_id`

**RLS Policies:**
- Users can view, insert, and update their own profile

---

#### `user_roles`
Manages role-based access control.

**Columns:**
- `id` (UUID, PK): Primary key
- `user_id` (UUID, FK → auth.users): Reference to user
- `role` (app_role ENUM): User role (admin, user, supervisor, vp, coo, accountant)
- `created_at` (TIMESTAMPTZ): Role assignment timestamp

**Indexes:**
- Primary key on `id`
- Unique constraint on `(user_id, role)`

**RLS Policies:**
- Users can view their own roles

---

### Route and Trip Tables

#### `trips`
Stores individual trip records for mileage reimbursement.

**Columns:**
- `id` (UUID, PK): Primary key
- `user_id` (UUID, FK → auth.users): Trip owner
- `date` (DATE): Trip date
- `from_address` (TEXT): Origin address
- `to_address` (TEXT): Destination address
- `program` (TEXT): Associated program/project
- `purpose` (TEXT): Trip purpose/reason
- `miles` (NUMERIC): Trip distance in miles
- `route_url` (TEXT): Google Maps route URL
- `static_map_url` (TEXT): Static map image data
- `created_at` (TIMESTAMPTZ): Record creation timestamp
- `updated_at` (TIMESTAMPTZ): Last update timestamp

**Constraints:**
- `check_miles_range`: miles between 0 and 10,000
- `check_address_lengths`: addresses max 500 characters
- `check_purpose_length`: purpose max 500 characters
- `check_program_length`: program max 200 characters

**Indexes:**
- Primary key on `id`

**RLS Policies:**
- Users can view, create, update, and delete their own trips

---

#### `routes`
Stores detailed route information with geometry and metadata.

**Columns:**
- `id` (UUID, PK): Primary key
- `trip_id` (UUID, FK → trips): Optional link to trip record
- `user_id` (UUID, FK → auth.users): Route owner
- `route_name` (TEXT): Optional route name
- `description` (TEXT): Route description
- `encoded_polyline` (TEXT): Google Maps encoded polyline
- `total_distance_meters` (NUMERIC): Distance in meters
- `total_distance_miles` (NUMERIC, COMPUTED): Auto-calculated from meters
- `estimated_duration_seconds` (INTEGER): Estimated travel time
- `actual_duration_seconds` (INTEGER): Actual travel time
- `start_lat` (NUMERIC): Starting latitude
- `start_lng` (NUMERIC): Starting longitude
- `end_lat` (NUMERIC): Ending latitude
- `end_lng` (NUMERIC): Ending longitude
- `bbox_north` (NUMERIC): Bounding box north coordinate
- `bbox_south` (NUMERIC): Bounding box south coordinate
- `bbox_east` (NUMERIC): Bounding box east coordinate
- `bbox_west` (NUMERIC): Bounding box west coordinate
- `is_verified` (BOOLEAN): Route verification status
- `is_archived` (BOOLEAN): Archive status for retention
- `archived_at` (TIMESTAMPTZ): Archive timestamp
- `created_at` (TIMESTAMPTZ): Record creation timestamp
- `updated_at` (TIMESTAMPTZ): Last update timestamp

**Constraints:**
- `check_distance_valid`: Distance between 0 and 10,000,000 meters
- `check_duration_valid`: Duration between 0 and 86,400 seconds (24 hours)
- `check_coordinates_valid`: Lat/lng within valid ranges
- `check_archived_consistency`: Archive flag matches timestamp presence

**Indexes:**
- Primary key on `id`
- `idx_routes_user_id`: Query by user
- `idx_routes_trip_id`: Link to trip
- `idx_routes_created_at`: Query by creation date
- `idx_routes_is_archived`: Filter non-archived routes
- `idx_routes_user_archived`: User + archive status
- `idx_routes_start_location`: Spatial queries on start point
- `idx_routes_end_location`: Spatial queries on end point

**RLS Policies:**
- Users can view, create, update, and delete their own routes

---

#### `waypoints`
Stores individual waypoints/stops along routes.

**Columns:**
- `id` (UUID, PK): Primary key
- `route_id` (UUID, FK → routes): Parent route
- `sequence_number` (INTEGER): Order in route (1-based)
- `waypoint_type` (TEXT): Type: 'stop', 'via', 'checkpoint'
- `name` (TEXT): Waypoint name
- `address` (TEXT): Waypoint address
- `notes` (TEXT): Additional notes
- `latitude` (NUMERIC): GPS latitude
- `longitude` (NUMERIC): GPS longitude
- `altitude_meters` (NUMERIC): Altitude in meters
- `arrival_time` (TIMESTAMPTZ): Arrival timestamp
- `departure_time` (TIMESTAMPTZ): Departure timestamp
- `duration_seconds` (INTEGER): Time spent at waypoint
- `distance_from_previous_meters` (NUMERIC): Distance from previous waypoint (meters)
- `distance_from_previous_miles` (NUMERIC, COMPUTED): Auto-calculated from meters
- `created_at` (TIMESTAMPTZ): Record creation timestamp
- `updated_at` (TIMESTAMPTZ): Last update timestamp

**Constraints:**
- `check_sequence_positive`: Sequence number > 0
- `check_waypoint_type_valid`: Type in allowed values
- `check_waypoint_coordinates_valid`: Lat/lng within valid ranges
- `check_waypoint_distance_valid`: Distance between 0 and 1,000,000 meters
- `check_waypoint_duration_valid`: Duration between 0 and 86,400 seconds
- `check_waypoint_time_order`: Arrival ≤ departure
- Unique constraint on `(route_id, sequence_number)`

**Indexes:**
- Primary key on `id`
- `idx_waypoints_route_id`: Query by route
- `idx_waypoints_route_sequence`: Route + sequence ordering
- `idx_waypoints_type`: Filter by type
- `idx_waypoints_location`: Spatial queries

**RLS Policies:**
- Users can view, create, update, and delete waypoints for their own routes

---

#### `gps_coordinates`
Stores detailed GPS tracking data for routes.

**Columns:**
- `id` (UUID, PK): Primary key
- `route_id` (UUID, FK → routes): Parent route
- `waypoint_id` (UUID, FK → waypoints): Optional associated waypoint
- `latitude` (NUMERIC): GPS latitude
- `longitude` (NUMERIC): GPS longitude
- `altitude_meters` (NUMERIC): Altitude in meters
- `accuracy_meters` (NUMERIC): GPS accuracy/precision
- `heading_degrees` (NUMERIC): Heading (0-360°)
- `speed_mps` (NUMERIC): Speed in meters per second
- `sequence_number` (INTEGER): Order in route (1-based)
- `recorded_at` (TIMESTAMPTZ): GPS reading timestamp
- `source` (TEXT): Data source: 'gps', 'manual', 'calculated', 'imported'
- `created_at` (TIMESTAMPTZ): Record creation timestamp

**Constraints:**
- `check_gps_coordinates_valid`: Lat/lng within valid ranges
- `check_gps_accuracy_valid`: Accuracy between 0 and 1,000 meters
- `check_gps_heading_valid`: Heading between 0 and 360 degrees
- `check_gps_speed_valid`: Speed between 0 and 200 m/s
- `check_gps_sequence_positive`: Sequence number > 0
- `check_gps_source_valid`: Source in allowed values
- Unique constraint on `(route_id, sequence_number)`

**Indexes:**
- Primary key on `id`
- `idx_gps_route_id`: Query by route
- `idx_gps_route_sequence`: Route + sequence ordering
- `idx_gps_waypoint_id`: Link to waypoint
- `idx_gps_recorded_at`: Query by recording time
- `idx_gps_location`: Spatial queries

**RLS Policies:**
- Users can view, create, update, and delete GPS coordinates for their own routes

---

### Mileage Voucher Tables

#### `mileage_vouchers`
Tracks monthly mileage submission bundles.

**Columns:**
- `id` (UUID, PK): Primary key
- `user_id` (UUID, FK → auth.users): Voucher owner
- `month` (DATE): Voucher month
- `total_miles` (NUMERIC): Total miles for the month
- `status` (voucher_status ENUM): Approval workflow status
- `submitted_at` (TIMESTAMPTZ): Submission timestamp
- `current_approver_id` (UUID, FK → auth.users): Current approver
- `rejection_reason` (TEXT): Rejection explanation
- `created_at` (TIMESTAMPTZ): Record creation timestamp
- `updated_at` (TIMESTAMPTZ): Last update timestamp

**Status Values:**
- `draft`: Being prepared by user
- `pending_supervisor`: Awaiting supervisor approval
- `pending_vp`: Awaiting VP approval
- `pending_coo`: Awaiting COO approval
- `approved`: Fully approved
- `rejected`: Rejected at any stage

**Constraints:**
- `check_voucher_miles_range`: Total miles between 0 and 100,000
- `check_rejection_reason_length`: Rejection reason max 1,000 characters
- Unique constraint on `(user_id, month)`

**Indexes:**
- Primary key on `id`

**RLS Policies:**
- Users can view and create their own vouchers
- Users can update draft/rejected vouchers
- Approvers can view and update vouchers pending their approval level

---

#### `approval_history`
Audit trail of all approval actions.

**Columns:**
- `id` (UUID, PK): Primary key
- `voucher_id` (UUID, FK → mileage_vouchers): Related voucher
- `approver_id` (UUID, FK → auth.users): User who took action
- `approver_role` (app_role ENUM): Role at time of action
- `action` (approval_action ENUM): 'approve' or 'reject'
- `comments` (TEXT): Approval/rejection comments
- `acted_at` (TIMESTAMPTZ): Action timestamp

**Constraints:**
- `check_comments_length`: Comments max 1,000 characters

**Indexes:**
- Primary key on `id`

**RLS Policies:**
- Users can view approval history for their own vouchers
- Approvers can view all approval history
- Approvers can insert approval history for their actions

---

### Other Tables

#### `programs`
Shared organization programs for trip classification.

**Columns:**
- `id` (UUID, PK): Primary key
- `user_id` (UUID, FK → auth.users): Program owner (legacy)
- `name` (TEXT): Program name
- `address` (TEXT): Program address
- `created_at` (TIMESTAMPTZ): Record creation timestamp
- `updated_at` (TIMESTAMPTZ): Last update timestamp

**Constraints:**
- `check_program_name_length`: Name max 200 characters
- `check_program_address_length`: Address max 500 characters
- Unique constraint on `(user_id, name)`

**Indexes:**
- Primary key on `id`

**RLS Policies:**
- Anyone can view programs
- Only admins can create, update, or delete programs

---

## Database Functions

### `has_role(_user_id UUID, _role app_role)`
Checks if a user has a specific role. Used in RLS policies.

**Returns:** BOOLEAN

**Example:**
```sql
SELECT has_role(auth.uid(), 'admin');
```

---

### `archive_old_routes(months_old INTEGER DEFAULT 12)`
Archives routes older than the specified number of months.

**Returns:** INTEGER (count of archived routes)

**Example:**
```sql
-- Archive routes older than 12 months
SELECT archive_old_routes(12);
```

---

### `get_route_stats(p_user_id UUID)`
Returns statistics about a user's routes.

**Returns:** TABLE with:
- `total_routes`: Total number of routes
- `total_distance_miles`: Total distance across all routes
- `total_waypoints`: Total waypoints across all routes
- `total_gps_points`: Total GPS coordinates recorded
- `avg_route_distance`: Average route distance
- `archived_routes`: Number of archived routes

**Example:**
```sql
SELECT * FROM get_route_stats(auth.uid());
```

---

## Data Relationships

### Foreign Key Relationships

1. **User Relationships:**
   - `profiles.user_id` → `auth.users.id`
   - `user_roles.user_id` → `auth.users.id`
   - `trips.user_id` → `auth.users.id`
   - `routes.user_id` → `auth.users.id`
   - `programs.user_id` → `auth.users.id`
   - `mileage_vouchers.user_id` → `auth.users.id`

2. **Route Relationships:**
   - `routes.trip_id` → `trips.id` (optional)
   - `waypoints.route_id` → `routes.id`
   - `gps_coordinates.route_id` → `routes.id`
   - `gps_coordinates.waypoint_id` → `waypoints.id` (optional)

3. **Approval Relationships:**
   - `mileage_vouchers.current_approver_id` → `auth.users.id`
   - `approval_history.voucher_id` → `mileage_vouchers.id`
   - `approval_history.approver_id` → `auth.users.id`

### Cascade Behaviors

- **ON DELETE CASCADE:**
  - Deleting a user deletes all their profiles, roles, trips, routes, programs, vouchers
  - Deleting a route deletes all its waypoints and GPS coordinates
  - Deleting a voucher deletes all its approval history
  - Deleting a trip deletes all associated routes

- **ON DELETE SET NULL:**
  - Deleting a waypoint sets `waypoint_id` to NULL in GPS coordinates

---

## Data Types and Enums

### Enums

#### `app_role`
```sql
'admin' | 'user' | 'supervisor' | 'vp' | 'coo' | 'accountant'
```

#### `voucher_status`
```sql
'draft' | 'pending_supervisor' | 'pending_vp' | 'pending_coo' | 'approved' | 'rejected'
```

#### `approval_action`
```sql
'approve' | 'reject'
```

### Common Data Types

- **UUIDs:** Primary keys and foreign keys
- **TIMESTAMPTZ:** All timestamps with timezone
- **NUMERIC(10, 7):** GPS coordinates (7 decimal places ≈ 1.1 cm precision)
- **NUMERIC(8, 2):** Altitudes, accuracies
- **TEXT:** Variable-length strings

---

## Performance Optimization

### Indexing Strategy

1. **User-based queries:** Indexes on `user_id` columns for quick user data retrieval
2. **Time-based queries:** Indexes on `created_at`, `recorded_at` for chronological queries
3. **Spatial queries:** Composite indexes on latitude/longitude pairs
4. **Foreign key queries:** Indexes on all foreign key columns
5. **Filtered indexes:** Partial indexes on `is_archived = FALSE` for active data

### Query Optimization Tips

1. Use the filtered `is_archived` index for active route queries
2. Use composite indexes for route + sequence queries on waypoints and GPS coordinates
3. Leverage computed columns (`total_distance_miles`) to avoid runtime calculations
4. Use the `get_route_stats()` function for aggregated statistics

---

## Security

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:

1. **User Isolation:** Users can only access their own data
2. **Role-Based Access:** Approvers can access relevant vouchers based on their role
3. **Controlled Admin Access:** Admins have special privileges for program management
4. **Read-Only Policies:** Some tables (like programs) are read-only for non-admins

### Security Functions

- `has_role()`: Security definer function prevents RLS recursion while checking roles
- All policies use `auth.uid()` to enforce user context

---

## Data Retention and Archival Strategy

### Archive Strategy

1. **Purpose:** Optimize query performance by separating active from historical data
2. **Mechanism:** 
   - `routes.is_archived` flag marks archived routes
   - `routes.archived_at` timestamp records when archived
   - Filtered indexes exclude archived routes from active queries

3. **Archival Process:**
   ```sql
   -- Manual archival
   UPDATE routes SET is_archived = TRUE, archived_at = now()
   WHERE created_at < now() - INTERVAL '12 months';
   
   -- Or use helper function
   SELECT archive_old_routes(12);
   ```

4. **Purge Policy (Recommended):**
   - Keep all data for 12 months (active)
   - Archive data older than 12 months
   - Purge archived data older than 7 years (compliance dependent)

### Backup Strategy

1. **Frequency:** Daily automated backups via Supabase
2. **Retention:** Keep backups for 30 days
3. **Critical Tables:** All tables backed up, with priority on:
   - `trips` (reimbursement records)
   - `mileage_vouchers` (financial records)
   - `approval_history` (audit trail)

### GDPR Compliance

1. **Right to Access:** Users can query all their data via RLS policies
2. **Right to Deletion:** Cascade deletes ensure complete data removal
3. **Data Minimization:** GPS coordinates are optional; routes can use polylines
4. **Purpose Limitation:** Clear separation of trip (business) vs. route (tracking) data

---

## Migration Management

### Migration Files

Migrations are located in `supabase/migrations/` and are applied in timestamp order.

### Key Migrations

- `20260124192506_*`: Initial profiles and programs tables
- `20260125005807_*`: Trips table creation
- `20260125010105_*`: User roles and RLS setup
- `20260126004243_*`: Mileage vouchers and approval workflow
- `20260126085402_*`: Validation constraints
- `20260204044937_*`: **Route storage schema (routes, waypoints, GPS coordinates)**

### Running Migrations

```bash
# Local development
supabase start
supabase db reset  # Applies all migrations

# Production
# Migrations are automatically applied via Supabase dashboard or CLI
supabase db push
```

---

## Sample Queries

### Create a Route with Waypoints

```sql
-- Insert a route
INSERT INTO routes (user_id, route_name, total_distance_meters, start_lat, start_lng, end_lat, end_lng)
VALUES (
  auth.uid(),
  'Morning Commute',
  15000,
  37.7749, -122.4194,  -- San Francisco
  37.7849, -122.4094   -- North San Francisco
)
RETURNING id;

-- Insert waypoints (assuming route_id = '...')
INSERT INTO waypoints (route_id, sequence_number, waypoint_type, name, latitude, longitude)
VALUES
  ('route-id-here', 1, 'stop', 'Home', 37.7749, -122.4194),
  ('route-id-here', 2, 'via', 'Gas Station', 37.7799, -122.4144),
  ('route-id-here', 3, 'stop', 'Office', 37.7849, -122.4094);
```

### Query Routes with Statistics

```sql
-- Get user's route statistics
SELECT * FROM get_route_stats(auth.uid());

-- Get recent routes with waypoint counts
SELECT 
  r.id,
  r.route_name,
  r.total_distance_miles,
  r.created_at,
  COUNT(w.id) as waypoint_count
FROM routes r
LEFT JOIN waypoints w ON w.route_id = r.id
WHERE r.user_id = auth.uid() AND r.is_archived = FALSE
GROUP BY r.id
ORDER BY r.created_at DESC
LIMIT 10;
```

### Find Routes Near a Location

```sql
-- Find routes starting near a location (within ~0.1 degrees, ~11 km)
SELECT 
  id,
  route_name,
  start_lat,
  start_lng,
  total_distance_miles
FROM routes
WHERE user_id = auth.uid()
  AND start_lat BETWEEN 37.7 AND 37.9
  AND start_lng BETWEEN -122.5 AND -122.3
  AND is_archived = FALSE
ORDER BY created_at DESC;
```

---

## Appendix: Schema Diagram Details

### Table Cardinality

- `auth.users` 1:1 `profiles`
- `auth.users` 1:N `user_roles`
- `auth.users` 1:N `trips`
- `auth.users` 1:N `routes`
- `auth.users` 1:N `programs`
- `auth.users` 1:N `mileage_vouchers`
- `trips` 1:N `routes` (optional relationship)
- `routes` 1:N `waypoints`
- `routes` 1:N `gps_coordinates`
- `waypoints` 1:N `gps_coordinates` (optional relationship)
- `mileage_vouchers` 1:N `approval_history`

### Key Design Decisions

1. **Separate `trips` and `routes`:** Trips are business entities for reimbursement; routes are technical tracking entities
2. **Optional `trip_id` in routes:** Not all routes need to be associated with reimbursement trips
3. **Sequence numbers:** Enable ordered traversal of waypoints and GPS coordinates
4. **Computed distance columns:** Automatic mile conversion from meters reduces calculation errors
5. **Bounding boxes in routes:** Enable efficient spatial filtering before detailed coordinate comparisons
6. **Archive flag instead of deletion:** Preserve historical data while optimizing performance
7. **Source tracking in GPS coordinates:** Enable data quality assessment and debugging

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-04  
**Schema Version:** Migration 20260204044937
