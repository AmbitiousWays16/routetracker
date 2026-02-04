import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Navigation, 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  MapPin, 
  Timer,
  Gauge,
  Route
} from "lucide-react";
import { useGPSTracking } from "@/hooks/useGPSTracking";
import { GPSCoordinate } from "@/types/mileage";

interface GPSTrackerProps {
  onTrackingComplete?: (coordinates: GPSCoordinate[], totalMiles: number) => void;
  autoStart?: boolean;
}

export const GPSTracker = ({ onTrackingComplete, autoStart = false }: GPSTrackerProps) => {
  const {
    isTracking,
    isPaused,
    coordinates,
    totalDistanceMiles,
    currentSpeed,
    averageSpeed,
    duration,
    error,
    isGeolocationSupported,
    startTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,
    resetTracking,
  } = useGPSTracking();

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && !isTracking) {
      startTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const handleStop = () => {
    stopTracking();
    if (onTrackingComplete && coordinates.length > 0) {
      onTrackingComplete(coordinates, totalDistanceMiles);
    }
  };

  const handleReset = () => {
    resetTracking();
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSpeed = (mps: number): string => {
    // Convert m/s to mph
    const mph = mps * 2.23694;
    return mph.toFixed(1);
  };

  if (!isGeolocationSupported) {
    return (
      <Card className="shadow-card border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Navigation className="h-5 w-5" />
            GPS Not Supported
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your browser or device does not support GPS tracking. Please use manual address entry.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg font-semibold">
          <span className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            GPS Route Tracking
          </span>
          <Badge variant={isTracking ? (isPaused ? "secondary" : "default") : "outline"}>
            {isTracking ? (isPaused ? "Paused" : "Tracking") : "Ready"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Tracking Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Route className="h-3.5 w-3.5" />
              Distance
            </div>
            <div className="text-2xl font-bold text-primary">
              {totalDistanceMiles.toFixed(2)}
              <span className="text-sm font-normal text-muted-foreground ml-1">mi</span>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Timer className="h-3.5 w-3.5" />
              Duration
            </div>
            <div className="text-2xl font-bold">
              {formatDuration(duration)}
            </div>
          </div>

          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Gauge className="h-3.5 w-3.5" />
              Current Speed
            </div>
            <div className="text-lg font-semibold">
              {formatSpeed(currentSpeed)}
              <span className="text-xs font-normal text-muted-foreground ml-1">mph</span>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <MapPin className="h-3.5 w-3.5" />
              GPS Points
            </div>
            <div className="text-lg font-semibold">
              {coordinates.length}
            </div>
          </div>
        </div>

        {/* Tracking Controls */}
        <div className="flex gap-2">
          {!isTracking ? (
            <Button
              onClick={startTracking}
              className="flex-1 gradient-primary"
              size="lg"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Tracking
            </Button>
          ) : (
            <>
              {!isPaused ? (
                <Button
                  onClick={pauseTracking}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </Button>
              ) : (
                <Button
                  onClick={resumeTracking}
                  className="flex-1 gradient-primary"
                  size="lg"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Resume
                </Button>
              )}
              <Button
                onClick={handleStop}
                variant="destructive"
                className="flex-1"
                size="lg"
              >
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            </>
          )}
        </div>

        {coordinates.length > 0 && !isTracking && (
          <Button
            onClick={handleReset}
            variant="outline"
            className="w-full"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset & Start New Route
          </Button>
        )}

        {/* Info message */}
        {isTracking && (
          <div className="text-xs text-muted-foreground text-center p-2 rounded-lg bg-muted/30">
            Keep this page open while tracking. Your location is being recorded every 5 seconds for battery efficiency.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
