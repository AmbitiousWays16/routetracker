import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "https://lovable.dev",
];

const getCorsHeaders = (origin: string | null) => {
  // Check if origin matches allowed patterns (including *.lovable.app and *.lovableproject.com)
  const isAllowed = origin && (
    allowedOrigins.includes(origin) ||
    origin.endsWith('.lovable.app') ||
    origin.endsWith('.lovable.dev') ||
    origin.endsWith('.lovableproject.com')
  );
  
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 50;

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const checkRateLimit = (userId: string): { allowed: boolean; remaining: number; resetIn: number } => {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  
  if (!entry || (now - entry.windowStart) > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const resetIn = RATE_LIMIT_WINDOW_MS - (now - entry.windowStart);
    return { allowed: false, remaining: 0, resetIn };
  }
  
  entry.count++;
  return { 
    allowed: true, 
    remaining: MAX_REQUESTS_PER_WINDOW - entry.count, 
    resetIn: RATE_LIMIT_WINDOW_MS - (now - entry.windowStart) 
  };
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // =============================================
    // AUTHENTICATION - Validate JWT token
    // =============================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Missing authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("JWT validation failed:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log("User authenticated successfully");

    // =============================================
    // RATE LIMITING - Check user rate limit
    // =============================================
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for user: ${userId}`);
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded", 
          resetIn: Math.ceil(rateLimit.resetIn / 1000) 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetIn / 1000))
          } 
        }
      );
    }

    // =============================================
    // PARAMETER VALIDATION
    // =============================================
    const url = new URL(req.url);
    const polyline = url.searchParams.get("polyline");
    const startLat = url.searchParams.get("startLat");
    const startLng = url.searchParams.get("startLng");
    const endLat = url.searchParams.get("endLat");
    const endLng = url.searchParams.get("endLng");

    // Validate required parameters
    if (!polyline || !startLat || !startLng || !endLat || !endLng) {
      console.error("Missing required parameters");
      return new Response(
        JSON.stringify({ error: "Missing required parameters: polyline, startLat, startLng, endLat, endLng" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate coordinate ranges
    const coords = [
      { name: "startLat", value: parseFloat(startLat), min: -90, max: 90 },
      { name: "startLng", value: parseFloat(startLng), min: -180, max: 180 },
      { name: "endLat", value: parseFloat(endLat), min: -90, max: 90 },
      { name: "endLng", value: parseFloat(endLng), min: -180, max: 180 },
    ];

    for (const coord of coords) {
      if (isNaN(coord.value) || coord.value < coord.min || coord.value > coord.max) {
        console.error(`Invalid coordinate: ${coord.name}=${coord.value}`);
        return new Response(
          JSON.stringify({ error: `Invalid ${coord.name}: must be between ${coord.min} and ${coord.max}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate polyline length (prevent abuse)
    if (polyline.length > 10000) {
      console.error("Polyline too long:", polyline.length);
      return new Response(
        JSON.stringify({ error: "Polyline exceeds maximum length of 10000 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // FETCH STATIC MAP FROM GOOGLE
    // =============================================
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      console.error("Google Maps API key not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?` +
      `size=600x300&maptype=roadmap` +
      `&path=enc:${encodeURIComponent(polyline)}` +
      `&markers=color:green|label:A|${startLat},${startLng}` +
      `&markers=color:red|label:B|${endLat},${endLng}` +
      `&key=${apiKey}`;

    console.log("Fetching static map for authenticated user");
    
    const response = await fetch(staticMapUrl);
    
    if (!response.ok) {
      console.error("Google Maps API error:", response.status, await response.text());
      return new Response(
        JSON.stringify({ error: "Failed to fetch map image" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("Content-Type") || "image/png";

    return new Response(imageBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetIn / 1000)),
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});