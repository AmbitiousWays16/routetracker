import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Allowed origins for CORS
const allowedOrigins = [
  'https://dumhzvkifwhvdgswplew.supabase.co',
  'https://id-preview--2face1c8-df08-44c3-9a59-cc212f800657.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigin = origin && allowedOrigins.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app')
  ) ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
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
    const url = new URL(req.url);
    
    // Get map parameters from query string
    const polyline = url.searchParams.get('polyline');
    const startLat = url.searchParams.get('startLat');
    const startLng = url.searchParams.get('startLng');
    const endLat = url.searchParams.get('endLat');
    const endLng = url.searchParams.get('endLng');
    
    // Validate required parameters
    if (!polyline || !startLat || !startLng || !endLat || !endLng) {
      console.error('Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate coordinate format (basic validation)
    const coords = [startLat, startLng, endLat, endLng];
    for (const coord of coords) {
      const num = parseFloat(coord);
      if (isNaN(num) || num < -180 || num > 180) {
        console.error('Invalid coordinate:', coord);
        return new Response(
          JSON.stringify({ error: 'Invalid coordinates' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Validate polyline length (prevent abuse)
    if (polyline.length > 10000) {
      console.error('Polyline too long:', polyline.length);
      return new Response(
        JSON.stringify({ error: 'Polyline data too large' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key from environment (server-side only)
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Map service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Google Maps Static API URL with server-side key
    const mapUrl = new URL('https://maps.googleapis.com/maps/api/staticmap');
    mapUrl.searchParams.set('size', '600x300');
    mapUrl.searchParams.set('maptype', 'roadmap');
    mapUrl.searchParams.set('path', `enc:${polyline}`);
    mapUrl.searchParams.set('markers', `color:green|label:A|${startLat},${startLng}`);
    mapUrl.searchParams.append('markers', `color:red|label:B|${endLat},${endLng}`);
    mapUrl.searchParams.set('key', apiKey);

    console.log('Fetching static map image');

    // Fetch the image from Google Maps
    const mapResponse = await fetch(mapUrl.toString());
    
    if (!mapResponse.ok) {
      console.error('Google Maps API error:', mapResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to generate map' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageBuffer = await mapResponse.arrayBuffer();
    const contentType = mapResponse.headers.get('Content-Type') || 'image/png';

    console.log('Static map generated successfully');

    // Return the image with caching headers
    return new Response(imageBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Error generating static map:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate map' }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' } }
    );
  }
});