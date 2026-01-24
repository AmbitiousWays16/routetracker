import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Calendar, Car, FileText, Loader2 } from 'lucide-react';
import { Trip } from '@/types/mileage';

interface TripFormProps {
  onSubmit: (trip: Omit<Trip, 'id' | 'createdAt'>) => void;
  onCalculateRoute: (from: string, to: string) => Promise<{ miles: number; routeUrl: string } | null>;
}

const PROGRAMS = [
  'General Business',
  'Client Visit',
  'Training',
  'Conference',
  'Delivery',
  'Site Inspection',
  'Other',
];

export const TripForm = ({ onSubmit, onCalculateRoute }: TripFormProps) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [fromAddress, setFromAddress] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [businessPurpose, setBusinessPurpose] = useState('');
  const [program, setProgram] = useState('');
  const [miles, setMiles] = useState<number>(0);
  const [routeUrl, setRouteUrl] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculateRoute = async () => {
    if (!fromAddress || !toAddress) return;
    
    setIsCalculating(true);
    try {
      const result = await onCalculateRoute(fromAddress, toAddress);
      if (result) {
        setMiles(result.miles);
        setRouteUrl(result.routeUrl);
      }
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !fromAddress || !toAddress || !businessPurpose || !program) return;

    onSubmit({
      date,
      fromAddress,
      toAddress,
      businessPurpose,
      program,
      miles,
      routeUrl,
    });

    // Reset form
    setFromAddress('');
    setToAddress('');
    setBusinessPurpose('');
    setProgram('');
    setMiles(0);
    setRouteUrl('');
  };

  const isValid = date && fromAddress && toAddress && businessPurpose && program && miles > 0;

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Car className="h-5 w-5 text-primary" />
          Add New Trip
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="program" className="flex items-center gap-1.5 text-sm font-medium">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Program
              </Label>
              <Select value={program} onValueChange={setProgram}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="from" className="flex items-center gap-1.5 text-sm font-medium">
                <MapPin className="h-3.5 w-3.5 text-success" />
                From Address
              </Label>
              <Input
                id="from"
                placeholder="Enter starting address"
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to" className="flex items-center gap-1.5 text-sm font-medium">
                <MapPin className="h-3.5 w-3.5 text-destructive" />
                To Address
              </Label>
              <Input
                id="to"
                placeholder="Enter destination address"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                className="h-10"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCalculateRoute}
              disabled={!fromAddress || !toAddress || isCalculating}
              className="flex-shrink-0"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                'Calculate Route'
              )}
            </Button>
            {miles > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-success/10 px-4 py-2 text-success">
                <Car className="h-4 w-4" />
                <span className="font-semibold">{miles.toFixed(1)} miles</span>
              </div>
            )}
          </div>

          {routeUrl && (
            <div className="overflow-hidden rounded-lg border">
              <iframe
                src={routeUrl}
                width="100%"
                height="200"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Route Map"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="purpose" className="text-sm font-medium">
              Business Purpose
            </Label>
            <Input
              id="purpose"
              placeholder="Describe the business purpose of this trip"
              value={businessPurpose}
              onChange={(e) => setBusinessPurpose(e.target.value)}
              className="h-10"
            />
          </div>

          <Button type="submit" disabled={!isValid} className="w-full gradient-primary">
            Add Trip
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
