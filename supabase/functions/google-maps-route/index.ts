import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RouteRequest {
  fromAddress: string;
  toAddress: string;
}

interface RouteResponse {
  miles: number;
  routeUrl: string;
  staticMapUrl: string;
  encodedPolyline?: string;
}

// Maximum allowed length for addresses
const MAX_ADDRESS_LENGTH = 500;

serve(async (req) => {
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

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);
    
    if (authError || !claimsData?.claims) {
      console.error('Authentication failed:', authError?.message || 'Invalid token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`Authenticated user: ${userId}`);

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

    console.log(`Calculating route from "${trimmedFrom}" to "${trimmedTo}" for user ${userId}`);

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
    
    // Generate Static Maps URL with the actual route polyline
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=600x300&maptype=roadmap&path=enc:${encodeURIComponent(encodedPolyline)}&markers=color:green%7Clabel:A%7C${encodeURIComponent(leg.start_location.lat)},${encodeURIComponent(leg.start_location.lng)}&markers=color:red%7Clabel:B%7C${encodeURIComponent(leg.end_location.lat)},${encodeURIComponent(leg.end_location.lng)}&key=${apiKey}`;

    const response: RouteResponse = {
      miles,
      routeUrl,
      staticMapUrl,
      encodedPolyline,
    };

    console.log(`Route calculated: ${miles} miles`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error calculating route:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to calculate route' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
