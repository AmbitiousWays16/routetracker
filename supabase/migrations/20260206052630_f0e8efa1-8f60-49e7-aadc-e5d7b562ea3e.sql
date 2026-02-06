-- Add policy to allow users to insert their own submission record into approval_history
-- This allows employees to record their signature when submitting a voucher

CREATE POLICY "Users can insert their own submission record"
ON public.approval_history
FOR INSERT
WITH CHECK (
  auth.uid() = approver_id 
  AND approver_role = 'user'
  AND action = 'approve'
  AND EXISTS (
    SELECT 1 FROM mileage_vouchers v
    WHERE v.id = voucher_id 
    AND v.user_id = auth.uid()
  )
);