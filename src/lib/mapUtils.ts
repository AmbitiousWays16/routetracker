import { auth } from '@/lib/firebase';
import { RouteMapData } from '@/types/mileage';

export const fetchMapImageAsBase64 = async (routeMapData: RouteMapData): Promise<string | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('No authenticated user for map fetch');
      return null;
    }
    const token = await currentUser.getIdToken();

    const proxyUrl = new URL(
      import.meta.env.VITE_STATIC_MAP_PROXY_URL
    );
    proxyUrl.searchParams.set('polyline', routeMapData.encodedPolyline);
    proxyUrl.searchParams.set('startLat', String(routeMapData.startLat));
    proxyUrl.searchParams.set('startLng', String(routeMapData.startLng));
    proxyUrl.searchParams.set('endLat', String(routeMapData.endLat));
    proxyUrl.searchParams.set('endLng', String(routeMapData.endLng));

    const response = await fetch(proxyUrl.toString(), {
      headers: { 'Authorization': `Bearer ${token}` },
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
