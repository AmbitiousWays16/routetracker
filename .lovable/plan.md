

## Comprehensive Security Remediation Plan

### Phase 1: Fix Critical Issues

**1. Remove user_id Exposure from Programs Table**
- Create a database migration to update the `Anyone can view programs` policy
- Options:
  - A) Replace with `auth.uid() IS NOT NULL` to require authentication
  - B) Create a database VIEW that excludes `user_id` and grant public access to the view instead
  - C) Keep public access but modify the frontend to not expose user_id in responses

**2. Add Authentication to Static Map Proxy**
- Update `supabase/functions/static-map-proxy/index.ts` to:
  - Import Supabase client
  - Validate JWT token using `getClaims()`
  - Return 401 for unauthenticated requests
  - Add rate limiting similar to `google-maps-route`

### Phase 2: Harden RLS Policies (Defense-in-Depth)

**3. Restrict Policies to Authenticated Role**
- Update all RLS policies to explicitly use `TO authenticated` clause
- Tables affected: `profiles`, `trips`, `user_roles`, `programs`
- This prevents any possibility of anonymous access even if app-level auth is bypassed

Example migration:
```sql
-- Drop and recreate policies with authenticated role
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);
```

### Phase 3: Additional Hardening

**4. Add Input Validation to TripForm**
- Add Zod schema validation for trip form inputs (addresses, purpose, program)
- Enforce maximum length limits on client side before submission
- Validate date is not in the future

**5. Strengthen Password Requirements**
- Update the auth schema to require stronger passwords:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one number
  - At least one special character

**6. Add CSRF Protection Headers**
- Update edge functions to include additional security headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`

### Summary of Changes

| Component | Change | Priority |
|-----------|--------|----------|
| Database | Update programs SELECT policy to hide user_id | High |
| Edge Function | Add auth to static-map-proxy | High |
| Database | Add `TO authenticated` to all RLS policies | Medium |
| TripForm.tsx | Add Zod validation for form inputs | Medium |
| Auth.tsx | Strengthen password requirements | Low |
| Edge Functions | Add security headers | Low |

### Files to Modify
1. `supabase/migrations/` - New migration for RLS policy updates
2. `supabase/functions/static-map-proxy/index.ts` - Add authentication
3. `src/components/TripForm.tsx` - Add input validation
4. `src/pages/Auth.tsx` - Strengthen password schema

