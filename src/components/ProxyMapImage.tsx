import { useState, useEffect, useRef } from 'react';
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
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMapImage = async () => {
      if (!routeMapData?.encodedPolyline) {
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
        const newObjectUrl = URL.createObjectURL(blob);

        if (isMounted) {
          // Revoke the previous object URL before setting the new one
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
          }
          objectUrlRef.current = newObjectUrl;
          setImageSrc(newObjectUrl);
          setLoading(false);
        } else {
          // Component unmounted during fetch, clean up immediately
          URL.revokeObjectURL(newObjectUrl);
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
    };
  }, [routeMapData?.encodedPolyline, routeMapData?.startLat, routeMapData?.startLng, routeMapData?.endLat, routeMapData?.endLng]);

  // Clean up the object URL on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

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
