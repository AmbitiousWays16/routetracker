import { Car, LogOut } from 'lucide-react';
import { ExportButton } from './ExportButton';
import { Trip } from '@/types/mileage';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  trips: Trip[];
  totalMiles: number;
}

export const Header = ({ trips, totalMiles }: HeaderProps) => {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
            <Car className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Mileage Tracker</h1>
            <p className="text-sm text-muted-foreground">
              {user?.email ? user.email : 'Track & export your business trips'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton trips={trips} totalMiles={totalMiles} />
          <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
