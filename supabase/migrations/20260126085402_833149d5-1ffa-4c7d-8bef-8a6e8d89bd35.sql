-- Add server-side validation constraints to trips table for defense-in-depth
-- This ensures data integrity even if client-side validation is bypassed

-- Add CHECK constraint for reasonable mileage range (0-10000 miles per trip)
ALTER TABLE public.trips ADD CONSTRAINT check_miles_range 
  CHECK (miles >= 0 AND miles < 10000);

-- Add CHECK constraint for address lengths (max 500 characters each)
ALTER TABLE public.trips ADD CONSTRAINT check_address_lengths 
  CHECK (length(from_address) <= 500 AND length(to_address) <= 500);

-- Add CHECK constraint for purpose length (max 500 characters)
ALTER TABLE public.trips ADD CONSTRAINT check_purpose_length 
  CHECK (length(purpose) <= 500);

-- Add CHECK constraint for program name length (max 200 characters)
ALTER TABLE public.trips ADD CONSTRAINT check_program_length 
  CHECK (length(program) <= 200);

-- Add similar constraints to programs table for consistency
ALTER TABLE public.programs ADD CONSTRAINT check_program_name_length 
  CHECK (length(name) <= 200);

ALTER TABLE public.programs ADD CONSTRAINT check_program_address_length 
  CHECK (length(address) <= 500);

-- Add constraint for mileage_vouchers total_miles
ALTER TABLE public.mileage_vouchers ADD CONSTRAINT check_voucher_miles_range 
  CHECK (total_miles >= 0 AND total_miles < 100000);

-- Add constraint for rejection_reason length
ALTER TABLE public.mileage_vouchers ADD CONSTRAINT check_rejection_reason_length 
  CHECK (rejection_reason IS NULL OR length(rejection_reason) <= 1000);

-- Add constraint for approval_history comments length
ALTER TABLE public.approval_history ADD CONSTRAINT check_comments_length 
  CHECK (comments IS NULL OR length(comments) <= 1000);