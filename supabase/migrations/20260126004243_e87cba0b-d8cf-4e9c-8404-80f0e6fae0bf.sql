-- Create enum for voucher status
CREATE TYPE public.voucher_status AS ENUM (
  'draft',
  'pending_supervisor',
  'pending_vp',
  'pending_coo',
  'approved',
  'rejected'
);

-- Create enum for approval action
CREATE TYPE public.approval_action AS ENUM ('approve', 'reject');

-- Create mileage_vouchers table to track submitted vouchers
CREATE TABLE public.mileage_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  total_miles NUMERIC NOT NULL DEFAULT 0,
  status voucher_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMP WITH TIME ZONE,
  current_approver_id UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

-- Create approval_history table to track all approval actions
CREATE TABLE public.approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES public.mileage_vouchers(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  approver_role app_role NOT NULL,
  action approval_action NOT NULL,
  comments TEXT,
  acted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on mileage_vouchers
ALTER TABLE public.mileage_vouchers ENABLE ROW LEVEL SECURITY;

-- Employees can view their own vouchers
CREATE POLICY "Users can view their own vouchers"
ON public.mileage_vouchers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Approvers can view vouchers pending their approval
CREATE POLICY "Supervisors can view pending vouchers"
ON public.mileage_vouchers
FOR SELECT
TO authenticated
USING (
  status = 'pending_supervisor' AND has_role(auth.uid(), 'supervisor')
);

CREATE POLICY "VPs can view pending vouchers"
ON public.mileage_vouchers
FOR SELECT
TO authenticated
USING (
  status = 'pending_vp' AND has_role(auth.uid(), 'vp')
);

CREATE POLICY "COOs can view pending vouchers"
ON public.mileage_vouchers
FOR SELECT
TO authenticated
USING (
  status = 'pending_coo' AND has_role(auth.uid(), 'coo')
);

-- Users can insert their own vouchers
CREATE POLICY "Users can create their own vouchers"
ON public.mileage_vouchers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own draft/rejected vouchers
CREATE POLICY "Users can update their draft vouchers"
ON public.mileage_vouchers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status IN ('draft', 'rejected'));

-- Approvers can update vouchers pending their approval
CREATE POLICY "Supervisors can update pending vouchers"
ON public.mileage_vouchers
FOR UPDATE
TO authenticated
USING (status = 'pending_supervisor' AND has_role(auth.uid(), 'supervisor'));

CREATE POLICY "VPs can update pending vouchers"
ON public.mileage_vouchers
FOR UPDATE
TO authenticated
USING (status = 'pending_vp' AND has_role(auth.uid(), 'vp'));

CREATE POLICY "COOs can update pending vouchers"
ON public.mileage_vouchers
FOR UPDATE
TO authenticated
USING (status = 'pending_coo' AND has_role(auth.uid(), 'coo'));

-- Enable RLS on approval_history
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;

-- Users can view approval history for their vouchers
CREATE POLICY "Users can view their voucher approval history"
ON public.approval_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.mileage_vouchers v
    WHERE v.id = voucher_id AND v.user_id = auth.uid()
  )
);

-- Approvers can view and insert approval history
CREATE POLICY "Approvers can view approval history"
ON public.approval_history
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'supervisor') OR 
  has_role(auth.uid(), 'vp') OR 
  has_role(auth.uid(), 'coo') OR
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Approvers can insert approval history"
ON public.approval_history
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = approver_id AND (
    has_role(auth.uid(), 'supervisor') OR 
    has_role(auth.uid(), 'vp') OR 
    has_role(auth.uid(), 'coo')
  )
);

-- Create trigger for updated_at on mileage_vouchers
CREATE TRIGGER update_mileage_vouchers_updated_at
BEFORE UPDATE ON public.mileage_vouchers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();