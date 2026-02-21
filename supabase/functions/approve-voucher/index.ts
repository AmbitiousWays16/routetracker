import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS (keep strict matching for production security)
const allowedOrigins = [
  'https://dumhzvkifwhvdgswplew.supabase.co',
  'https://id-preview--2face1c8-df08-44c3-9a59-cc212f800657.lovable.app',
  'https://2face1c8-df08-44c3-9a59-cc212f800657.lovableproject.com',
  'https://routetracker.lovable.app',
  'https://triptrackerapp.tech',
  'https://www.triptrackerapp.tech',
  'http://localhost:5173',
  'http://localhost:8080',
];

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && allowedOrigins.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  };
};

type ApproverRole = 'supervisor' | 'vp' | 'coo';
type VoucherStatus = 'pending_supervisor' | 'pending_vp' | 'pending_coo' | 'approved' | 'rejected' | 'draft';

interface ApproveVoucherRequest {
  voucherId: string;
  signatureText?: string | null;
  approverName?: string | null;
}

const getNextStatusForRole = (role: ApproverRole): VoucherStatus => {
  if (role === 'supervisor') return 'pending_vp';
  if (role === 'vp') return 'pending_coo';
  return 'approved';
};

const canApproveStatus = (role: ApproverRole, currentStatus: VoucherStatus): boolean => {
  if (role === 'supervisor') return currentStatus === 'pending_supervisor';
  if (role === 'vp') return currentStatus === 'pending_vp';
  return currentStatus === 'pending_coo';
};

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader! } } },
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // JWT validation + subject extraction (more reliable across domains than getUser()
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    const userId = claimsData?.claims?.sub ?? null;
    if (claimsError || !userId) {
      console.error('JWT validation failed:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const body: ApproveVoucherRequest = await req.json();
    const voucherId = body?.voucherId;
    if (!voucherId || !UUID_REGEX.test(voucherId)) {
      return new Response(JSON.stringify({ error: 'Invalid or missing voucherId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine approver role (supervisor/vp/coo)
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (rolesError) {
      console.error('Failed to fetch roles:', rolesError);
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const roleValues = (roles || []).map((r) => r.role);
    const approverRole: ApproverRole | null = roleValues.includes('coo')
      ? 'coo'
      : roleValues.includes('vp')
        ? 'vp'
        : roleValues.includes('supervisor')
          ? 'supervisor'
          : null;

    if (!approverRole) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load voucher (service role)
    const { data: voucher, error: voucherError } = await supabaseAdmin
      .from('mileage_vouchers')
      .select('id, status')
      .eq('id', voucherId)
      .maybeSingle();

    if (voucherError || !voucher) {
      console.error('Voucher lookup failed:', voucherError);
      return new Response(JSON.stringify({ error: 'Voucher not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentStatus = voucher.status as VoucherStatus;
    if (!canApproveStatus(approverRole, currentStatus)) {
      return new Response(
        JSON.stringify({ error: `Invalid status transition for ${approverRole}` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const newStatus = getNextStatusForRole(approverRole);

    // Update voucher
    const { error: updateError } = await supabaseAdmin
      .from('mileage_vouchers')
      .update({
        status: newStatus,
        ...(newStatus === 'approved' ? { current_approver_id: null } : {}),
      })
      .eq('id', voucherId);

    if (updateError) {
      console.error('Voucher update failed:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update voucher' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert approval history
    const actedDate = new Date().toISOString().split('T')[0];
    const { error: historyError } = await supabaseAdmin
      .from('approval_history')
      .insert({
        voucher_id: voucherId,
        approver_id: userId,
        approver_role: approverRole,
        action: 'approve',
        signature_text: body.signatureText ?? null,
        approver_name: body.approverName ?? null,
        acted_date: actedDate,
      });

    if (historyError) {
      console.error('Approval history insert failed:', historyError);
      return new Response(JSON.stringify({ error: 'Failed to record approval' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    console.error('Error in approve-voucher function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...getCorsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
