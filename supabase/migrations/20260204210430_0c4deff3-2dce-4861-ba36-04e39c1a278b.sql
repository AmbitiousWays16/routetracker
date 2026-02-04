-- Create table for user-specific saved addresses
CREATE TABLE public.user_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, address)
);

-- Enable RLS
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- Users can only view their own addresses
CREATE POLICY "Users can view their own addresses"
ON public.user_addresses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own addresses
CREATE POLICY "Users can insert their own addresses"
ON public.user_addresses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own addresses
CREATE POLICY "Users can update their own addresses"
ON public.user_addresses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own addresses
CREATE POLICY "Users can delete their own addresses"
ON public.user_addresses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_addresses_updated_at
BEFORE UPDATE ON public.user_addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_addresses TO authenticated;