import { useState, useEffect, useRef, memo } from 'react';
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
 * Uses Intersection Observer for lazy loading and memoization for performance.
 */
export const ProxyMapImage = memo(({ 
  routeMapData, 
  routeUrl, 
  className = '',
  alt = 'Route Map'
}: ProxyMapImageProps) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  // Lazy load when image enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad || !routeMapData) return;

    let isMounted = true;
    let objectUrl: string | null = null;

    const fetchMapImage = async () => {
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

        const proxyUrl = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/static-map-proxy`);

        // Use POST to avoid URL-length limits caused by long polylines.
        const response = await fetch(proxyUrl.toString(), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            polyline: routeMapData.encodedPolyline,
            startLat: routeMapData.startLat,
            startLng: routeMapData.startLng,
            endLat: routeMapData.endLat,
            endLng: routeMapData.endLng,
          }),
        });

        if (!response.ok) {
          throw new Error(`Map proxy error: ${response.status}`);
        }

        const blob = await response.blob();
        if (!isMounted) return;

        // Create blob URL for the image
        objectUrl = URL.createObjectURL(blob);
        setImageSrc(objectUrl);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching map image:', err);
        setError(true);
        setLoading(false);
      }
    };

    fetchMapImage();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [shouldLoad, routeMapData]);

  // Placeholder while waiting to load - with skeleton animation
  if (!shouldLoad) {
    return (
      <div
        ref={observerRef}
        className={`relative flex items-center justify-center rounded-lg bg-muted overflow-hidden ${className}`}
        style={{ aspectRatio: '16 / 9', minHeight: '200px' }}
      >
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <MapPin className="h-8 w-8 text-muted-foreground/50" />
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={`relative flex items-center justify-center rounded-lg bg-muted overflow-hidden ${className}`}
        style={{ aspectRatio: '16 / 9', minHeight: '200px' }}
      >
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-lg bg-muted ${className}`}
        style={{ aspectRatio: '16 / 9', minHeight: '200px' }}
      >
        <MapPin className="mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Unable to load map</p>
        {routeUrl && (
          <a href={routeUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-xs text-primary hover:underline">
            View in Google Maps
          </a>
        )}
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`rounded-lg object-cover w-full ${className}`}
      style={{ aspectRatio: '16 / 9' }}
      loading="lazy"
      decoding="async"
      width={800}
      height={450}
    />
  );
});

ProxyMapImage.displayName = 'ProxyMapImage';
