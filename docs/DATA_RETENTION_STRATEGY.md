# Data Retention and Archival Strategy

## Overview

This document outlines the data retention and archival strategy for the RouteTracker application. The strategy balances operational needs, performance optimization, compliance requirements, and data privacy considerations.

## Goals

1. **Performance Optimization:** Reduce query load by separating active from historical data
2. **Compliance:** Meet legal and regulatory requirements for data retention
3. **Data Privacy:** Support GDPR and other privacy regulations
4. **Storage Efficiency:** Minimize storage costs while preserving necessary records
5. **Audit Trail:** Maintain financial and approval records for accountability

## Data Classification

### Critical Data (Financial/Legal)
**Tables:** `mileage_vouchers`, `approval_history`, `trips`

**Retention Period:** 7 years (standard for financial records)

**Rationale:** These tables contain financial reimbursement data and must be retained for tax, audit, and legal purposes.

**Archival Strategy:**
- Never automatically delete
- Archive after 12 months to separate storage tier
- Maintain full audit trail

---

### Operational Data (Route Tracking)
**Tables:** `routes`, `waypoints`, `gps_coordinates`

**Retention Period:** 2 years active, 5 years archived, then purge

**Rationale:** Route data supports trip records but has less regulatory significance. Older routes become less relevant for operational use.

**Archival Strategy:**
- Mark as archived after 12 months using `is_archived` flag
- Keep archived routes for 4 additional years (5 years total)
- Purge after 5 years unless linked to active trip records

---

### User Data (Profiles/Roles)
**Tables:** `profiles`, `user_roles`

**Retention Period:** Indefinite while user account exists, 30 days after deletion

**Rationale:** User data must be available as long as the user is active. After account deletion, brief retention allows for account recovery.

**Archival Strategy:**
- Soft delete (mark inactive) upon user request
- Hard delete after 30-day grace period
- Cascade deletes remove all associated data

---

### Reference Data (Programs)
**Tables:** `programs`

**Retention Period:** Indefinite

**Rationale:** Programs are organizational reference data and should persist as long as they're relevant to the organization.

**Archival Strategy:**
- No automatic archival
- Admin-managed soft delete (add `is_active` flag in future migration if needed)

---

## Archival Process

### Automatic Archival

#### Routes Archival
```sql
-- Scheduled job (run monthly via pg_cron or external scheduler)
SELECT archive_old_routes(12);  -- Archive routes older than 12 months
```

**Implementation:**
- Run as a scheduled database function (monthly)
- Sets `is_archived = TRUE` and `archived_at = NOW()`
- Filtered indexes automatically exclude archived routes from active queries

#### Benefits:
- Improved query performance on active routes
- Maintains data for compliance and historical reference
- Non-destructive operation (can be reversed)

---

### Manual Archival

Administrators can manually archive specific routes:

```sql
-- Archive a specific route
UPDATE public.routes
SET is_archived = TRUE, archived_at = now()
WHERE id = 'route-uuid-here' AND user_id = auth.uid();

-- Archive all routes for a specific trip
UPDATE public.routes
SET is_archived = TRUE, archived_at = now()
WHERE trip_id = 'trip-uuid-here' AND user_id = auth.uid();
```

---

### Data Purge Process

#### Routes and Associated Data
Purge archived routes older than 5 years:

```sql
-- Create purge function (to be added in future migration)
CREATE OR REPLACE FUNCTION public.purge_old_archived_routes(years_old INTEGER DEFAULT 5)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  purged_count INTEGER;
BEGIN
  -- Only purge routes NOT linked to active trips
  DELETE FROM public.routes
  WHERE is_archived = TRUE
    AND archived_at < (now() - (years_old || ' years')::INTERVAL)
    AND (trip_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.trips t WHERE t.id = trip_id
    ));
  
  GET DIAGNOSTICS purged_count = ROW_COUNT;
  RETURN purged_count;
END;
$$;
```

**Safety Measures:**
- Requires `is_archived = TRUE` (double confirmation)
- Preserves routes linked to active trip records
- Returns count of deleted records for audit logging

#### Execution Schedule:
- Run annually (suggested: January 1st)
- Log execution results for audit trail
- Notify administrators before execution

---

## Backup Strategy

### Daily Backups
**Frequency:** Every 24 hours  
**Retention:** 30 days  
**Scope:** Full database backup via Supabase automatic backups

**Tables Included:**
- All tables in `public` schema
- `auth.users` metadata (handled by Supabase)

---

### Long-Term Archival Backups
**Frequency:** Monthly  
**Retention:** 7 years  
**Scope:** Critical financial tables only

**Tables Included:**
- `mileage_vouchers`
- `approval_history`
- `trips`
- `user_roles` (for audit context)

**Storage:**
- Export to external archive storage (e.g., AWS S3 Glacier)
- Encrypted at rest
- Compressed to reduce storage costs

**Process:**
```bash
# Example export command (run via cron job)
pg_dump \
  --table=public.mileage_vouchers \
  --table=public.approval_history \
  --table=public.trips \
  --table=public.user_roles \
  --format=custom \
  --compress=9 \
  "postgresql://connection-string" \
  > backup_$(date +%Y%m%d).dump
```

---

## Compliance and Privacy

### GDPR Compliance

#### Right to Access
Users can access all their data via the application UI. RLS policies ensure users only see their own data.

```sql
-- User can query their own data
SELECT * FROM routes WHERE user_id = auth.uid();
SELECT * FROM trips WHERE user_id = auth.uid();
SELECT * FROM mileage_vouchers WHERE user_id = auth.uid();
```

#### Right to Erasure (Right to be Forgotten)
Upon user account deletion, all user data is cascade-deleted:

```sql
-- Triggered by Supabase auth.users deletion
-- CASCADE ensures all related data is removed:
-- - profiles
-- - user_roles  
-- - trips (and associated routes via CASCADE)
-- - mileage_vouchers (and associated approval_history via CASCADE)
-- - routes (and associated waypoints, gps_coordinates via CASCADE)
-- - programs (owned by user)
```

**Exception:** Archived financial records (vouchers, approval history) may be retained for legal compliance even after user deletion. In this case:
1. Personal identifiers (email, name) are anonymized
2. User ID is preserved for referential integrity
3. Retention is limited to minimum legal requirement (7 years)

#### Data Minimization
- GPS coordinates are optional; routes can use polylines only
- Waypoint details (notes, timing) are optional
- Only required fields are enforced in schema

#### Purpose Limitation
- Trip data: Mileage reimbursement business purpose
- Route data: Route optimization and tracking purpose
- Clear separation prevents data misuse

---

### CCPA Compliance

#### Do Not Sell
RouteTracker does not sell user data. This is enforced by:
- RLS policies prevent unauthorized access
- No third-party data sharing agreements
- Data remains within Supabase infrastructure

#### Opt-Out
Users can opt out of non-essential data collection:
- GPS coordinates can be disabled (use polylines only)
- Route details can be omitted (use trips table only)

---

### Financial Compliance

#### Retention Requirements
**US Tax Law (IRS):** 7 years for business expense records  
**Sarbanes-Oxley (SOX):** 7 years for audit records  
**General Best Practice:** 7 years minimum

**Implementation:**
- `mileage_vouchers` retained for 7 years
- `approval_history` retained for 7 years (audit trail)
- `trips` retained for 7 years (supporting documentation)

---

## Performance Optimization

### Partitioning Strategy (Future Enhancement)

For large-scale deployments, consider table partitioning:

```sql
-- Example: Partition routes by year
CREATE TABLE routes_2026 PARTITION OF routes
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE routes_2027 PARTITION OF routes
  FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
```

**Benefits:**
- Faster queries on recent data
- Easier archival (detach old partitions)
- Improved maintenance operations

---

### Archive Table Strategy (Alternative)

Create separate archive tables for long-term storage:

```sql
-- Create archive table (identical structure)
CREATE TABLE routes_archive (LIKE routes INCLUDING ALL);

-- Move old archived routes
INSERT INTO routes_archive
SELECT * FROM routes
WHERE is_archived = TRUE AND archived_at < now() - INTERVAL '2 years';

DELETE FROM routes
WHERE id IN (SELECT id FROM routes_archive);
```

**Benefits:**
- Separate storage tier (can use slower, cheaper storage)
- Active tables remain small and fast
- Clear separation of active vs. historical data

---

## Monitoring and Auditing

### Metrics to Track

1. **Data Growth:**
   - Row counts per table
   - Storage size per table
   - Growth rate per month

2. **Archive Operations:**
   - Number of routes archived per month
   - Number of routes purged per year
   - Archive operation duration

3. **Backup Status:**
   - Last backup timestamp
   - Backup success/failure rate
   - Backup storage usage

### Monitoring Queries

```sql
-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Row counts
SELECT 
  'routes' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE is_archived = FALSE) AS active_rows,
  COUNT(*) FILTER (WHERE is_archived = TRUE) AS archived_rows
FROM routes
UNION ALL
SELECT 
  'trips' AS table_name,
  COUNT(*) AS total_rows,
  NULL AS active_rows,
  NULL AS archived_rows
FROM trips;

-- Archive candidate count
SELECT COUNT(*)
FROM routes
WHERE is_archived = FALSE
  AND created_at < now() - INTERVAL '12 months';
```

---

## Implementation Checklist

### Phase 1: Immediate (Already Implemented)
- [x] Create routes table with `is_archived` flag
- [x] Create `archive_old_routes()` function
- [x] Add filtered indexes for archived data
- [x] Implement CASCADE deletes for user data removal
- [x] Document retention strategy

### Phase 2: Short-Term (Next Sprint)
- [ ] Set up monthly cron job to run `archive_old_routes(12)`
- [ ] Create monitoring dashboard for data growth
- [ ] Implement backup export script for financial tables
- [ ] Create admin UI for manual archival operations
- [ ] Add logging for archival operations

### Phase 3: Mid-Term (Next Quarter)
- [ ] Implement `purge_old_archived_routes()` function
- [ ] Set up annual purge job
- [ ] Create notification system for administrators
- [ ] Implement user data export for GDPR compliance
- [ ] Add anonymization for deleted user records

### Phase 4: Long-Term (Next Year)
- [ ] Evaluate table partitioning for routes table
- [ ] Consider separate archive database tier
- [ ] Implement automated compliance reporting
- [ ] Set up long-term backup to cold storage (S3 Glacier)
- [ ] Regular review and update of retention policies

---

## Administrative Procedures

### Monthly Tasks
1. Review archival job execution logs
2. Monitor database storage usage
3. Verify backup completion
4. Check for growth anomalies

### Annual Tasks
1. Run purge function for 5+ year old data
2. Export financial records to long-term archive
3. Review and update retention policies
4. Audit compliance with regulations
5. Test backup restoration process

### Ad-Hoc Tasks
1. User data export requests (GDPR)
2. User account deletion requests
3. Manual archival of specific routes
4. Restore from backup (disaster recovery)

---

## Contact and Escalation

**Data Retention Policy Owner:** Database Administrator  
**Compliance Officer:** [To be assigned]  
**Backup Administrator:** DevOps Team

**Escalation Path:**
1. Database Administrator (routine operations)
2. Engineering Manager (policy questions)
3. Legal Team (compliance issues)
4. Executive Team (major incidents)

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-04  
**Next Review Date:** 2027-02-04
