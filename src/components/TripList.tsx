import { Trip } from '@/types/mileage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, MapPin, Calendar, ExternalLink, Car } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TripListProps {
  trips: Trip[];
  onDelete: (id: string) => void;
  totalMiles: number;
  isArchiveView?: boolean;
}

export const TripList = ({ trips, onDelete, totalMiles, isArchiveView = false }: TripListProps) => {
  // Trips are already sorted by date ascending from the database (earliest first)

  return (
    <Card className={`shadow-card animate-fade-in ${isArchiveView ? 'lg:col-span-2' : ''}`}>
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
        {trips.length === 0 ? (
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
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {trips.map((trip, index) => (
                <div
                  key={trip.id}
                  className="group rounded-lg border bg-card p-4 transition-all hover:shadow-md"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(parseISO(trip.date), 'MMM d, yyyy')}
                        </span>
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {trip.program}
                        </span>
                        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-bold text-accent">
                          {trip.miles.toFixed(1)} mi
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <div className="flex flex-col items-center gap-0.5">
                          <MapPin className="h-3.5 w-3.5 text-success" />
                          <div className="h-4 w-px bg-border" />
                          <MapPin className="h-3.5 w-3.5 text-destructive" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="truncate text-foreground">{trip.fromAddress}</p>
                          <p className="truncate text-foreground">{trip.toAddress}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{trip.businessPurpose}</p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
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
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
