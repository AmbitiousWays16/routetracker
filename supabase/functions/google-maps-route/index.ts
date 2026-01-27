import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS - restrict to known domains
const allowedOrigins = [
  'https://dumhzvkifwhvdgswplew.supabase.co',
  'https://id-preview--2face1c8-df08-44c3-9a59-cc212f800657.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigin = origin && allowedOrigins.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app') || origin.endsWith('.lovableproject.com')
  ) ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  };
};

interface RouteRequest {
  fromAddress: string;
  toAddress: string;
}

interface RouteResponse {
  miles: number;
  routeUrl: string;
  // Route metadata for secure proxy-based map retrieval (API key stays server-side)
  routeMapData: {
    encodedPolyline: string;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
  };
}

// Maximum allowed length for addresses
const MAX_ADDRESS_LENGTH = 500;

// Rate limiting: 50 requests per minute per user
const RATE_LIMIT_REQUESTS = 50;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

// In-memory rate limit store (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (userId: string): { allowed: boolean; remaining: number; resetIn: number } => {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  // Clean up expired entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (userLimit.count >= RATE_LIMIT_REQUESTS) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn: Math.max(0, userLimit.resetAt - now) 
    };
  }
  
  userLimit.count++;
  return { 
    allowed: true, 
    remaining: RATE_LIMIT_REQUESTS - userLimit.count, 
    resetIn: Math.max(0, userLimit.resetAt - now) 
  };
};

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === Authentication Check ===
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message || 'No user found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log("User authenticated successfully");

    // === Rate Limiting Check ===
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for user ${userId}`);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetIn / 1000))
          } 
        }
      );
    }

    // === API Key Check ===
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === Parse and Validate Input ===
    let body: RouteRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { fromAddress, toAddress } = body;

    // Check for required fields
    if (!fromAddress || !toAddress) {
      return new Response(
        JSON.stringify({ error: 'Both fromAddress and toAddress are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate types
    if (typeof fromAddress !== 'string' || typeof toAddress !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Addresses must be strings' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trim and validate length
    const trimmedFrom = fromAddress.trim();
    const trimmedTo = toAddress.trim();

    if (trimmedFrom.length === 0 || trimmedTo.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Addresses cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (trimmedFrom.length > MAX_ADDRESS_LENGTH || trimmedTo.length > MAX_ADDRESS_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Addresses must be less than ${MAX_ADDRESS_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Calculating route for authenticated user");

    // Call Google Maps Directions API
    const directionsUrl = new URL('https://maps.googleapis.com/maps/api/directions/json');
    directionsUrl.searchParams.set('origin', trimmedFrom);
    directionsUrl.searchParams.set('destination', trimmedTo);
    directionsUrl.searchParams.set('mode', 'driving');
    directionsUrl.searchParams.set('key', apiKey);

    const directionsResponse = await fetch(directionsUrl.toString());
    const directionsData = await directionsResponse.json();

    console.log('Directions API status:', directionsData.status);

    if (directionsData.status !== 'OK') {
      console.error('Directions API error:', directionsData.status, directionsData.error_message);
      return new Response(
        JSON.stringify({ 
          error: `Could not calculate route: ${directionsData.status}`,
          details: directionsData.error_message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const route = directionsData.routes[0];
    const leg = route.legs[0];
    
    // Convert meters to miles (1 mile = 1609.34 meters)
    const distanceMeters = leg.distance.value;
    const miles = Math.round((distanceMeters / 1609.34) * 10) / 10;
    
    // Get the encoded polyline for the route
    const encodedPolyline = route.overview_polyline.points;
    
    // Generate Google Maps directions URL for viewing
    const encodedFrom = encodeURIComponent(trimmedFrom);
    const encodedTo = encodeURIComponent(trimmedTo);
    const routeUrl = `https://www.google.com/maps/dir/${encodedFrom}/${encodedTo}`;
    
    // Return route metadata for secure proxy-based map retrieval
    // The API key is never exposed to the client - maps are fetched via static-map-proxy
    const routeMapData = {
      encodedPolyline,
      startLat: leg.start_location.lat,
      startLng: leg.start_location.lng,
      endLat: leg.end_location.lat,
      endLng: leg.end_location.lng,
    };

    const response: RouteResponse = {
      miles,
      routeUrl,
      routeMapData,
    };

    console.log(`Route calculated: ${miles} miles`);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetIn / 1000))
        } 
      }
    );
  } catch (error) {
    console.error('Error calculating route:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to calculate route' }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' } }
    );
  }
});