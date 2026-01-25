import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { fromAddress, toAddress }: RouteRequest = await req.json();

    if (!fromAddress || !toAddress) {
      return new Response(
        JSON.stringify({ error: 'Both fromAddress and toAddress are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Calculating route from "${fromAddress}" to "${toAddress}"`);

    // Call Google Maps Directions API
    const directionsUrl = new URL('https://maps.googleapis.com/maps/api/directions/json');
    directionsUrl.searchParams.set('origin', fromAddress);
    directionsUrl.searchParams.set('destination', toAddress);
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
    const encodedFrom = encodeURIComponent(fromAddress);
    const encodedTo = encodeURIComponent(toAddress);
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
      JSON.stringify({ error: 'Failed to calculate route', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
