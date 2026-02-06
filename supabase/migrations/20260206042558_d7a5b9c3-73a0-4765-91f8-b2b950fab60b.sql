-- Add signature columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS signature_type text CHECK (signature_type IN ('typed', 'drawn')),
ADD COLUMN IF NOT EXISTS signature_text text;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.signature_type IS 'Type of signature: typed (script font text) or drawn (base64 image)';
COMMENT ON COLUMN public.profiles.signature_text IS 'Signature data: typed name text for typed signatures, base64 PNG for drawn signatures';