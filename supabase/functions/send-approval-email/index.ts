import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Allowed origins for CORS
const allowedOrigins = [
  'https://dumhzvkifwhvdgswplew.supabase.co',
  'https://routetracker.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && (
    allowedOrigins.includes(origin) ||
    origin.endsWith('.lovable.app') ||
    origin.endsWith('.lovableproject.com')
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  };
};

interface ApprovalEmailRequest {
  voucherId: string;
  action: "submit" | "approve" | "reject" | "final_approval";
  recipientEmail: string;
  recipientName?: string;
  employeeName: string;
  month: string;
  totalMiles: number;
  rejectionReason?: string;
  nextApproverRole?: string;
}

const getRoleDisplayName = (role: string): string => {
  const roleNames: Record<string, string> = {
    supervisor: "Supervisor",
    vp: "Vice President",
    coo: "Chief Operations Officer",
  };
  return roleNames[role] || role;
};

const getStatusMessage = (action: string, nextRole?: string): string => {
  if (action === "submit") {
    return "A new mileage voucher has been submitted and requires your approval.";
  } else if (action === "approve" && nextRole) {
    return `The mileage voucher has been approved and forwarded to the ${getRoleDisplayName(nextRole)} for the next level of approval.`;
  } else if (action === "approve") {
    return "Your mileage voucher has been fully approved!";
  } else if (action === "final_approval") {
    return "A mileage voucher has been fully approved and is ready for processing.";
  } else {
    return "Your mileage voucher has been returned for corrections.";
  }
};

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT using getUser
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { 
      voucherId, 
      action, 
      recipientEmail, 
      recipientName,
      employeeName, 
      month, 
      totalMiles,
      rejectionReason,
      nextApproverRole
    }: ApprovalEmailRequest = await req.json();

    // Validate required fields
    if (!voucherId || !action || !recipientEmail || !employeeName || !month) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === AUTHORIZATION CHECK ===
    // Verify that the authenticated user has permission to trigger emails for this voucher
    const { data: voucher, error: voucherError } = await supabase
      .from('mileage_vouchers')
      .select('user_id, status')
      .eq('id', voucherId)
      .maybeSingle();

    if (voucherError || !voucher) {
      return new Response(
        JSON.stringify({ error: "Voucher not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is the voucher owner
    const isOwner = voucher.user_id === user.id;

    // Check if user has an approver role
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasApproverRole = userRoles?.some(r => 
      ['supervisor', 'vp', 'coo', 'admin'].includes(r.role)
    );

    // User must be either the voucher owner OR have an approver role
    if (!isOwner && !hasApproverRole) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: You do not have permission to send notifications for this voucher" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appUrl = Deno.env.get("APP_URL") || "https://routetracker.lovable.app";
    const approvalUrl = `${appUrl}/approvals?voucher=${voucherId}`;

    let subject: string;
    let heading: string;
    let ctaText: string;
    let ctaUrl: string;

    if (action === "submit" || (action === "approve" && nextApproverRole)) {
      subject = `Mileage Voucher Pending Approval - ${employeeName} (${month})`;
      heading = "Mileage Voucher Awaiting Your Approval";
      ctaText = "Review & Approve";
      ctaUrl = approvalUrl;
    } else if (action === "final_approval") {
      subject = `Mileage Voucher Ready for Processing - ${employeeName} (${month})`;
      heading = "Approved Mileage Voucher Ready for Processing";
      ctaText = "View Approved Voucher";
      ctaUrl = `${appUrl}`;
    } else if (action === "approve") {
      subject = `Mileage Voucher Approved - ${month}`;
      heading = "Your Mileage Voucher Has Been Approved";
      ctaText = "View Voucher";
      ctaUrl = `${appUrl}/vouchers`;
    } else {
      subject = `Mileage Voucher Returned - ${month}`;
      heading = "Your Mileage Voucher Requires Corrections";
      ctaText = "Review & Resubmit";
      ctaUrl = `${appUrl}`;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${heading}</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="margin-top: 0;">Hello${recipientName ? ` ${recipientName}` : ""},</p>
            <p>${getStatusMessage(action, nextApproverRole)}</p>
            
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e3a5f;">Voucher Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; color: #666;">Employee:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-weight: 500;">${employeeName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; color: #666;">Month:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-weight: 500;">${month}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Total Miles:</td>
                  <td style="padding: 8px 0; font-weight: 500;">${totalMiles.toFixed(1)} miles</td>
                </tr>
              </table>
            </div>
            
            ${rejectionReason ? `
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #991b1b;"><strong>Reason for Return:</strong></p>
                <p style="margin: 10px 0 0 0; color: #7f1d1d;">${rejectionReason}</p>
              </div>
            ` : ""}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${ctaUrl}" style="display: inline-block; background: #1e3a5f; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500;">${ctaText}</a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-bottom: 0;">
              If you have any questions, please contact your administrator.
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>WestCare Mileage Tracker</p>
          </div>
        </body>
      </html>
    `;

    console.log(`Processing ${action} notification`);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "WestCare Mileage Tracker <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: subject,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw emailError;
    }

    console.log("Email notification sent successfully");

    return new Response(
      JSON.stringify({ success: true, messageId: emailData?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const origin = req.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin);
    console.error("Error in send-approval-email function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);