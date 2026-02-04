import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigation, MapPin } from "lucide-react";
import { TripForm } from "./TripForm";
import { GPSTracker } from "./GPSTracker";
import { Program } from "@/hooks/usePrograms";
import { Trip, GPSCoordinate, RouteMapData } from "@/types/mileage";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGPSRoute } from "@/hooks/useGPSRoute";
import { toast } from "sonner";
import { METERS_PER_MILE } from "@/lib/gpsConstants";

interface TripEntryProps {
  onSubmit: (trip: Omit<Trip, "id" | "createdAt">) => Promise<unknown> | void;
  onCalculateRoute: (
    from: string,
    to: string,
  ) => Promise<{ miles: number; routeUrl: string; routeMapData?: RouteMapData } | null>;
  programs: Program[];
  programsLoading: boolean;
  isAdmin: boolean;
  onAddProgram: (name: string, address: string) => Promise<Program | null>;
  onUpdateProgram: (id: string, updates: { name?: string; address?: string }) => Promise<boolean>;
  onDeleteProgram: (id: string) => Promise<boolean>;
}

export const TripEntry = ({
  onSubmit,
  onCalculateRoute,
  programs,
  programsLoading,
  isAdmin,
  onAddProgram,
  onUpdateProgram,
  onDeleteProgram,
}: TripEntryProps) => {
  const [activeTab, setActiveTab] = useState<"manual" | "gps">("manual");
  const [showGPSTripDialog, setShowGPSTripDialog] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState<GPSCoordinate[]>([]);
  const [gpsTotalMiles, setGpsTotalMiles] = useState(0);
  const { saveRoute } = useGPSRoute();

  // Form state for GPS trip
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [businessPurpose, setBusinessPurpose] = useState("");
  const [program, setProgram] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGPSTrackingComplete = (coordinates: GPSCoordinate[], totalMiles: number) => {
    setGpsCoordinates(coordinates);
    setGpsTotalMiles(totalMiles);
    setShowGPSTripDialog(true);
  };

  const handleGPSTripSubmit = async () => {
    if (!fromAddress || !toAddress || !businessPurpose || !program) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (gpsTotalMiles <= 0) {
      toast.error("Invalid GPS route data");
      return;
    }

    setIsSubmitting(true);
    try {
      // Save GPS route to database
      const routeData = {
        coordinates: gpsCoordinates,
        totalDistanceMeters: gpsTotalMiles * METERS_PER_MILE,
        totalDistanceMiles: gpsTotalMiles,
        startTime: gpsCoordinates[0]?.timestamp || Date.now(),
        endTime: gpsCoordinates[gpsCoordinates.length - 1]?.timestamp || Date.now(),
        duration: Math.floor(
          ((gpsCoordinates[gpsCoordinates.length - 1]?.timestamp || 0) - 
           (gpsCoordinates[0]?.timestamp || 0)) / 1000
        ),
        startAddress: fromAddress,
        endAddress: toAddress,
      };

      const routeId = await saveRoute(routeData);

      // Create the trip entry
      await onSubmit({
        date,
        fromAddress,
        toAddress,
        businessPurpose,
        program,
        miles: gpsTotalMiles,
        routeUrl: `GPS Route (${gpsCoordinates.length} points)`,
        routeMapData: {
          // GPS data is stored in gps_coordinates table, not as encoded polyline
          encodedPolyline: '',
          startLat: gpsCoordinates[0]?.latitude || 0,
          startLng: gpsCoordinates[0]?.longitude || 0,
          endLat: gpsCoordinates[gpsCoordinates.length - 1]?.latitude || 0,
          endLng: gpsCoordinates[gpsCoordinates.length - 1]?.longitude || 0,
        },
      });

      // Reset form
      setShowGPSTripDialog(false);
      setGpsCoordinates([]);
      setGpsTotalMiles(0);
      setFromAddress("");
      setToAddress("");
      setBusinessPurpose("");
      setProgram("");
      
      toast.success("GPS trip added successfully!");
    } catch (error) {
      console.error("Error saving GPS trip:", error);
      toast.error("Failed to save GPS trip");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "manual" | "gps")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="gps" className="flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            GPS Tracking
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="manual" className="mt-0">
          <TripForm
            onSubmit={onSubmit}
            onCalculateRoute={onCalculateRoute}
            programs={programs}
            programsLoading={programsLoading}
            isAdmin={isAdmin}
            onAddProgram={onAddProgram}
            onUpdateProgram={onUpdateProgram}
            onDeleteProgram={onDeleteProgram}
          />
        </TabsContent>
        
        <TabsContent value="gps" className="mt-0">
          <GPSTracker onTrackingComplete={handleGPSTrackingComplete} />
        </TabsContent>
      </Tabs>

      {/* GPS Trip Details Dialog */}
      <Dialog open={showGPSTripDialog} onOpenChange={setShowGPSTripDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Complete GPS Trip Details</DialogTitle>
            <DialogDescription>
              Route tracked successfully! Please provide additional details for this trip.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="text-sm text-muted-foreground mb-1">Recorded Distance</div>
              <div className="text-2xl font-bold text-primary">
                {gpsTotalMiles.toFixed(2)} miles
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {gpsCoordinates.length} GPS points recorded
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gps-date">Date</Label>
              <Input
                id="gps-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gps-from">From Address</Label>
              <Input
                id="gps-from"
                placeholder="Starting location"
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gps-to">To Address</Label>
              <Input
                id="gps-to"
                placeholder="Destination"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gps-program">Program</Label>
              <Select value={program} onValueChange={setProgram} disabled={programsLoading}>
                <SelectTrigger id="gps-program">
                  <SelectValue placeholder={programsLoading ? "Loading..." : "Select program"} />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gps-purpose">Business Purpose</Label>
              <Input
                id="gps-purpose"
                placeholder="Describe the business purpose"
                value={businessPurpose}
                onChange={(e) => setBusinessPurpose(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowGPSTripDialog(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGPSTripSubmit}
              disabled={isSubmitting || !fromAddress || !toAddress || !businessPurpose || !program}
              className="flex-1 gradient-primary"
            >
              {isSubmitting ? "Saving..." : "Save Trip"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
