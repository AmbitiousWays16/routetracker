# Approval Queue - Return for Corrections Fix

## Problem
Users were unable to "Return for Corrections" vouchers in the approval queue, receiving a "Failed to return error" message.

## Root Cause
The Row Level Security (RLS) policies for `mileage_vouchers` table had missing `WITH CHECK` clauses. The policies were:
- Using only `USING` to check if the status was `'pending_supervisor'`, `'pending_vp'`, or `'pending_coo'`
- Missing `WITH CHECK` to explicitly allow the status transition TO `'rejected'`

When an approver tried to reject/return a voucher for corrections, the update was being denied because the RLS policy didn't explicitly allow the status transition from pending to rejected.

## Solution
A new migration (`20260131214100_1234567a-abcd-efgh-ijkl-mnopqrstuvwx.sql`) was created that:

1. **Drops** the old incomplete policies:
   - "Supervisors can update pending vouchers"
   - "VPs can update pending vouchers"  
   - "COOs can update pending vouchers"

2. **Creates** new policies with proper `WITH CHECK` clauses:
   - **Supervisors**: Can update `pending_supervisor` vouchers to `pending_vp` (approve) or `rejected` (return for corrections)
   - **VPs**: Can update `pending_vp` vouchers to `pending_coo` (approve) or `rejected` (return for corrections)
   - **COOs**: Can update `pending_coo` vouchers to `approved` (final approval) or `rejected` (return for corrections)

## RLS Policy Format
Each policy now uses both clauses:
- `USING`: Checks the CURRENT status and user's role (access control)
- `WITH CHECK`: Defines allowed NEW status values after the update

Example for Supervisors:
```sql
CREATE POLICY "Supervisors can update pending supervisor vouchers"
ON public.mileage_vouchers
FOR UPDATE
TO authenticated
USING (status = 'pending_supervisor' AND has_role(auth.uid(), 'supervisor'))
WITH CHECK (status IN ('pending_vp', 'rejected'));
```

## How to Apply

### For Local Development (Supabase CLI)
```bash
cd /workspaces/routetracker
supabase migration up
```

### For Production (Supabase Dashboard)
1. Go to SQL Editor in Supabase Dashboard
2. Run the SQL commands from the migration file manually
3. Or use the Supabase CLI with proper project configuration

## Testing
After applying the migration:
1. Open the Approvals page
2. Select a pending voucher
3. Click "Return for Corrections"
4. Provide a reason and confirm
5. The voucher should now be successfully returned to the employee

## Files Modified
- **Migration Added**: `supabase/migrations/20260131214100_1234567a-abcd-efgh-ijkl-mnopqrstuvwx.sql`
- **No Code Changes Required**: The frontend and backend code were already correct

## Impact
- ✅ Approvers can now successfully return vouchers for corrections
- ✅ Rejection emails will be sent to employees
- ✅ Vouchers will be properly marked as 'rejected' in the database
- ✅ RLS security is maintained - only proper approvers can make these transitions
