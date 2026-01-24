import { Car } from 'lucide-react';
import { ExportButton } from './ExportButton';
import { Trip } from '@/types/mileage';

interface HeaderProps {
  trips: Trip[];
  totalMiles: number;
}

export const Header = ({ trips, totalMiles }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
            <Car className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Mileage Tracker</h1>
            <p className="text-sm text-muted-foreground">Track & export your business trips</p>
          </div>
        </div>
        <ExportButton trips={trips} totalMiles={totalMiles} />
      </div>
    </header>
  );
};
