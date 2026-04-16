import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { Loader2, MapPin } from 'lucide-react';
import { RouteMapData } from '@/types/mileage';

interface ProxyMapImageProps {
  routeMapData: RouteMapData;
  routeUrl?: string;
  className?: string;
  alt?: string;
}

export const ProxyMapImage = ({
  routeMapData,
  routeUrl,
  className = '',
  alt = 'Route Map'
}: ProxyMapImageProps) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const fetchMapImage = async () => {
      if (!routeMapData) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(false);

        // Get Firebase ID token for auth
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.error('No authenticated user for map fetch');
          setError(true);
          setLoading(false);
          return;
        }
        const token = await currentUser.getIdToken();

        const proxyUrl = new URL(
          `${import.meta.env.VITE_WORKER_URL}/static-map-proxy`
        );
        proxyUrl.searchParams.set('polyline', routeMapData.encodedPolyline);
        proxyUrl.searchParams.set('startLat', String(routeMapData.startLat));
        proxyUrl.searchParams.set('startLng', String(routeMapData.startLng));
        proxyUrl.searchParams.set('endLat', String(routeMapData.endLat));
        proxyUrl.searchParams.set('endLng', String(routeMapData.endLng));

        const response = await fetch(proxyUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error(`Failed to fetch map: ${response.status}`);

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        if (isMounted) {
          setImageSrc(objectUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching map image:', err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchMapImage();

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [routeMapData]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`} style={{ minHeight: '150px' }}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground ${className}`} style={{ minHeight: '150px' }}>
        <MapPin className="h-6 w-6" />
        <span className="text-sm">Map unavailable</span>
        {routeUrl && (
          <a href={routeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
            View on Google Maps
          </a>
        )}
      </div>
    );
  }

  const imageElement = (
    <img src={imageSrc} alt={alt} className={`h-auto w-full ${className}`} />
  );

  if (routeUrl) {
    return <a href={routeUrl} target="_blank" rel="noopener noreferrer">{imageElement}</a>;
  }

  return imageElement;
};
