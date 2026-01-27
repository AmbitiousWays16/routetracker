import { supabase } from '@/integrations/supabase/client';
import { RouteMapData } from '@/types/mileage';

/**
 * Fetches a static map image through the secure proxy and returns it as a base64 data URL.
 * This is used for PDF generation where we need embedded images.
 */
export const fetchMapImageAsBase64 = async (routeMapData: RouteMapData): Promise<string | null> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      console.error('No session for map fetch');
      return null;
    }

    const proxyUrl = new URL(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/static-map-proxy`
    );
    proxyUrl.searchParams.set('polyline', routeMapData.encodedPolyline);
    proxyUrl.searchParams.set('startLat', String(routeMapData.startLat));
    proxyUrl.searchParams.set('startLng', String(routeMapData.startLng));
    proxyUrl.searchParams.set('endLat', String(routeMapData.endLat));
    proxyUrl.searchParams.set('endLng', String(routeMapData.endLng));

    const response = await fetch(proxyUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch map image:', response.status);
      return null;
    }

    const blob = await response.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching map image:', error);
    return null;
  }
};
