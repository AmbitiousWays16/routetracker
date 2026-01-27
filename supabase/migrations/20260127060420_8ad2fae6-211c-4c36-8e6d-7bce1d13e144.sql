-- Remove the comments column from approval_history
-- Rejection reasons are already stored on mileage_vouchers.rejection_reason
-- This eliminates the data leakage concern for sensitive comments

ALTER TABLE public.approval_history DROP COLUMN IF EXISTS comments;