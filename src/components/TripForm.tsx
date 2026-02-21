import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MapPin, Calendar, Car, FileText, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Trip, RouteMapData } from "@/types/mileage";
import { Program } from "@/hooks/usePrograms";
import { UserAddress } from "@/hooks/useUserAddresses";
import { ProgramManager } from "./ProgramManager";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { ProxyMapImage } from "./ProxyMapImage";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Input validation schema for trip form
const tripFormSchema = z.object({
  date: z.string().refine((val) => {
    const date = new Date(val);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date <= today;
  }, "Date cannot be in the future"),
  fromAddress: z
    .string()
    .trim()
    .min(1, "From address is required")
    .max(500, "Address is too long (max 500 characters)"),
  toAddress: z.string().trim().min(1, "To address is required").max(500, "Address is too long (max 500 characters)"),
  businessPurpose: z
    .string()
    .trim()
    .min(1, "Business purpose is required")
    .max(500, "Business purpose is too long (max 500 characters)"),
  program: z.string().min(1, "Program is required").max(200, "Program name is too long"),
});

interface TripFormProps {
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
  userAddresses?: UserAddress[];
  onSaveAddress?: (name: string, address: string) => Promise<UserAddress | null>;
}

export const TripForm = ({
  onSubmit,
  onCalculateRoute,
  programs,
  programsLoading,
  isAdmin,
  onAddProgram,
  onUpdateProgram,
  onDeleteProgram,
  userAddresses = [],
  onSaveAddress,
}: TripFormProps) => {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [businessPurpose, setBusinessPurpose] = useState("");
  const [program, setProgram] = useState("");
  const [miles, setMiles] = useState<number>(0);
  const [routeUrl, setRouteUrl] = useState("");
  const [routeMapData, setRouteMapData] = useState<RouteMapData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  // Optional: structure for per-field error messages (inline UX)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof z.infer<typeof tripFormSchema>, string>>>({});

  const handleProgramChange = (programName: string) => {
    setProgram(programName);
    const selectedProgram = programs.find((p) => p.name === programName);
    // Only auto-fill destination if it is currently empty
    if (!toAddress && selectedProgram?.address) {
      setToAddress(selectedProgram.address);
    }
  };

  const handleCalculateRoute = async () => {
    if (!fromAddress || !toAddress) {
      toast.error("Please enter both From and To addresses before calculating the route.");
      return;
    }

    setIsCalculating(true);
    try {
      const result = await onCalculateRoute(fromAddress, toAddress);
      if (result) {
        setMiles(result.miles);
        setRouteUrl(result.routeUrl);
        setRouteMapData(result.routeMapData || null);
      } else {
        // Clear any stale data if calculation failed
        setMiles(0);
        setRouteUrl("");
        setRouteMapData(null);
      }
    } finally {
      setIsCalculating(false);
    }
  };

  const fetchSuggestions = async () => {
    if (!fromAddress || !toAddress) {
      toast.error("Please enter addresses before getting suggestions");
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        toast.error("Please log in to get suggestions");
        return;
      }

      const { data, error } = await supabase.functions.invoke('trip-purpose-suggestions', {
        body: { fromAddress, toAddress, program },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) {
        console.error('Suggestions error:', error);
        toast.error("Failed to get suggestions");
        return;
      }

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
        toast.success("AI suggestions loaded!");
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      toast.error("Failed to get suggestions");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setBusinessPurpose(suggestion);
    setSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Reset previous field errors
    setFieldErrors({});

    const validation = tripFormSchema.safeParse({
      date,
      fromAddress,
      toAddress,
      businessPurpose,
      program,
    });

    if (!validation.success) {
      // Map the first error to fieldErrors for inline use, and show toast
      const firstError = validation.error.errors[0];
      if (firstError?.path?.[0]) {
        setFieldErrors((prev) => ({
          ...prev,
          [firstError.path[0] as keyof z.infer<typeof tripFormSchema>]: firstError.message,
        }));
      }
      toast.error(firstError.message);
      return;
    }

    if (miles <= 0) {
      toast.error("Please calculate the route first");
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        date: validDate,
        fromAddress: validFrom,
        toAddress: validTo,
        businessPurpose: validPurpose,
        program: validProgram,
      } = validation.data;

      // Outbound trip
      await onSubmit({
        date: validDate,
        fromAddress: validFrom,
        toAddress: validTo,
        businessPurpose: validPurpose,
        program: validProgram,
        miles,
        routeUrl,
        routeMapData: routeMapData || undefined,
      });

      // Optional round trip
      if (isRoundTrip) {
        await onSubmit({
          date: validDate,
          fromAddress: validTo,
          toAddress: validFrom,
          businessPurpose: `${validPurpose} (Return)`,
          program: validProgram,
          miles,
          routeUrl,
          routeMapData: routeMapData || undefined,
        });
        toast.success("Round trip added (2 entries).");
      } else {
        toast.success("Trip added successfully.");
      }

      // Reset form
      setFromAddress("");
      setToAddress("");
      setBusinessPurpose("");
      setProgram("");
      setMiles(0);
      setRouteUrl("");
      setRouteMapData(null);
      setIsRoundTrip(false);
      setFieldErrors({});
      setSuggestions([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = date && fromAddress && toAddress && businessPurpose && program && miles > 0 && !isSubmitting;

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg font-semibold">
          <span className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Add New Trip
          </span>
          {isAdmin && (
            <ProgramManager
              programs={programs}
              loading={programsLoading}
              onAdd={onAddProgram}
              onUpdate={onUpdateProgram}
              onDelete={onDeleteProgram}
            />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-1.5 text-sm font-medium">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10"
                disabled={isSubmitting}
              />
              {fieldErrors.date && <p className="text-xs text-destructive mt-1">{fieldErrors.date}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="program" className="flex items-center gap-1.5 text-sm font-medium">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Program
              </Label>
              <Select value={program} onValueChange={handleProgramChange} disabled={isSubmitting || programsLoading}>
                <SelectTrigger className="h-10">
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
              {fieldErrors.program && <p className="text-xs text-destructive mt-1">{fieldErrors.program}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="from" className="flex items-center gap-1.5 text-sm font-medium">
                <MapPin className="h-3.5 w-3.5 text-success" />
                From Address
              </Label>
              <AddressAutocomplete
                id="from"
                placeholder="Enter starting address"
                value={fromAddress}
                onChange={setFromAddress}
                programs={programs}
                userAddresses={userAddresses}
                onSaveAddress={onSaveAddress}
                disabled={isSubmitting}
              />
              {fieldErrors.fromAddress && <p className="text-xs text-destructive mt-1">{fieldErrors.fromAddress}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="to" className="flex items-center gap-1.5 text-sm font-medium">
                <MapPin className="h-3.5 w-3.5 text-destructive" />
                To Address
              </Label>
              <AddressAutocomplete
                id="to"
                placeholder="Enter destination address"
                value={toAddress}
                onChange={setToAddress}
                programs={programs}
                userAddresses={userAddresses}
                onSaveAddress={onSaveAddress}
                disabled={isSubmitting}
              />
              {fieldErrors.toAddress && <p className="text-xs text-destructive mt-1">{fieldErrors.toAddress}</p>}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCalculateRoute}
              disabled={!fromAddress || !toAddress || isCalculating || isSubmitting}
              className="flex-shrink-0"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                "Calculate Route"
              )}
            </Button>
            {miles > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-success/10 px-4 py-2 text-success">
                <Car className="h-4 w-4" />
                <span className="font-semibold">{miles.toFixed(1)} miles</span>
              </div>
            )}
          </div>

          {routeMapData && (
            <div className="overflow-hidden rounded-lg border">
              <ProxyMapImage routeMapData={routeMapData} routeUrl={routeUrl} className="rounded-t-lg" />
              <div className="bg-muted p-2 text-center text-sm text-muted-foreground">
                Click to view directions on Google Maps
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="purpose" className="text-sm font-medium">
                Business Purpose
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fetchSuggestions}
                disabled={!fromAddress || !toAddress || isLoadingSuggestions || isSubmitting}
                className="h-7 px-2 text-xs text-primary hover:text-primary"
              >
                {isLoadingSuggestions ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1 h-3 w-3" />
                    AI Suggest
                  </>
                )}
              </Button>
            </div>
            <Input
              id="purpose"
              placeholder="Describe the business purpose of this trip"
              value={businessPurpose}
              onChange={(e) => setBusinessPurpose(e.target.value)}
              className="h-10"
              disabled={isSubmitting}
            />
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-muted/50 border">
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="h-auto py-1 px-2 text-xs whitespace-normal text-left"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            )}
            {fieldErrors.businessPurpose && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.businessPurpose}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="round-trip" className="text-sm font-medium cursor-pointer">
                  Round Trip
                </Label>
                <p className="text-xs text-muted-foreground">Automatically add return journey</p>
              </div>
            </div>
            <Switch id="round-trip" checked={isRoundTrip} onCheckedChange={setIsRoundTrip} disabled={isSubmitting} />
          </div>

          <Button 
            type="submit" 
            disabled={!isValid} 
            className={`w-full gradient-primary ${!isValid ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
          >
            {isSubmitting ? "Saving..." : "Add Trip"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
