-- Add signature fields to approval_history table
ALTER TABLE public.approval_history 
ADD COLUMN signature_text TEXT,
ADD COLUMN approver_name TEXT,
ADD COLUMN acted_date DATE;

-- Add comment explaining the signature fields
COMMENT ON COLUMN public.approval_history.signature_text IS 'Typed signature (displayed in cursive font on PDF)';
COMMENT ON COLUMN public.approval_history.approver_name IS 'Full name of the approver at time of approval';
COMMENT ON COLUMN public.approval_history.acted_date IS 'Date the approval action was taken (for display purposes)';