import { useMemo, memo } from 'react';
import { Trip } from '@/types/mileage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, MapPin, Calendar, ExternalLink, Car } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TripListProps {
  trips: Trip[];
  onDelete: (id: string) => void;
  totalMiles: number;
  isArchiveView?: boolean;
}

// Individual trip row component
const TripRow = memo(({ 
  trip, 
  onDelete, 
  isArchiveView 
}: { 
  trip: Trip;
  onDelete: (id: string) => void;
  isArchiveView: boolean;
}) => (
  <div className="group rounded-lg border bg-card p-4 transition-all hover:shadow-md">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            {format(parseISO(trip.date), 'MMM d, yyyy')}
          </span>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary truncate">
            {trip.program}
          </span>
          <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-bold text-accent flex-shrink-0">
            {trip.miles.toFixed(1)} mi
          </span>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <MapPin className="h-3.5 w-3.5 text-success" />
            <div className="h-4 w-px bg-border" />
            <MapPin className="h-3.5 w-3.5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="truncate text-foreground text-xs sm:text-sm">{trip.fromAddress}</p>
            <p className="truncate text-foreground text-xs sm:text-sm">{trip.toAddress}</p>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{trip.businessPurpose}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        {trip.routeUrl && (
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-8 w-8 text-muted-foreground hover:text-primary"
          >
            <a href={trip.routeUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
        {!isArchiveView && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(trip.id)}
            className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  </div>
));

TripRow.displayName = 'TripRow';

export const TripList = memo(({ trips, onDelete, totalMiles, isArchiveView = false }: TripListProps) => {
  // Memoize sorted trips to prevent unnecessary re-renders
  const sortedTrips = useMemo(() => trips, [trips]);

  return (
    <Card data-tour="trip-list" className={`shadow-card animate-fade-in ${isArchiveView ? 'lg:col-span-2' : ''}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Car className="h-5 w-5 text-primary" />
            {isArchiveView ? 'Archived Trip Log' : 'Trip Log'}
          </CardTitle>
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5">
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="font-bold text-primary">{totalMiles.toFixed(1)} mi</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Car className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground">No trips recorded</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first trip using the form above
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {sortedTrips.map((trip) => (
              <TripRow
                key={trip.id}
                trip={trip}
                onDelete={onDelete}
                isArchiveView={isArchiveView}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
