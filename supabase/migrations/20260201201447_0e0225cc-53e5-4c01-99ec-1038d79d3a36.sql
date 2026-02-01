-- Add full_name and job_title columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN full_name text,
ADD COLUMN job_title text;

-- Add CHECK constraints for reasonable lengths
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_full_name_length CHECK (char_length(full_name) <= 100),
ADD CONSTRAINT profiles_job_title_length CHECK (char_length(job_title) <= 100);