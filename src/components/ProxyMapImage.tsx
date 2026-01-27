import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin } from 'lucide-react';
import { RouteMapData } from '@/types/mileage';

interface ProxyMapImageProps {
  routeMapData: RouteMapData;
  routeUrl?: string;
  className?: string;
  alt?: string;
}

/**
 * Securely displays a route map by fetching through the authenticated proxy.
 * This prevents exposing Google Maps API keys in URLs.
 */
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

        // Get the current session for auth
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          console.error('No session for map fetch');
          setError(true);
          setLoading(false);
          return;
        }

        // Build the proxy URL with route parameters
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
          throw new Error(`Failed to fetch map: ${response.status}`);
        }

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
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
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
          <a 
            href={routeUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            View on Google Maps
          </a>
        )}
      </div>
    );
  }

  const imageElement = (
    <img
      src={imageSrc}
      alt={alt}
      className={`h-auto w-full ${className}`}
    />
  );

  if (routeUrl) {
    return (
      <a href={routeUrl} target="_blank" rel="noopener noreferrer">
        {imageElement}
      </a>
    );
  }

  return imageElement;
};
