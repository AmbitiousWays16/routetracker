import { Car, LogOut, ClipboardCheck, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ExportButton } from './ExportButton';
import { Trip } from '@/types/mileage';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useApproverVouchers } from '@/hooks/useVouchers';
import { usePrograms } from '@/hooks/usePrograms';

interface HeaderProps {
  trips: Trip[];
  totalMiles: number;
}

export const Header = ({ trips, totalMiles }: HeaderProps) => {
  const { signOut, user } = useAuth();
  const { approverRole, pendingVouchers } = useApproverVouchers();
  const { isAdmin } = usePrograms();
  const location = useLocation();
  const isApprovalsPage = location.pathname === '/approvals';
  const isUsersPage = location.pathname === '/users';

  return (
    <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <Car className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Mileage Tracker</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant={isUsersPage ? "secondary" : "outline"}
              size="sm"
              asChild
              className="gap-2"
            >
              <Link to="/users">
                <Users className="h-4 w-4" />
                Users
              </Link>
            </Button>
          )}
          {approverRole && (
            <Button
              variant={isApprovalsPage ? "secondary" : "outline"}
              size="sm"
              asChild
              className="gap-2"
            >
              <Link to="/approvals">
                <ClipboardCheck className="h-4 w-4" />
                Approvals
                {pendingVouchers.length > 0 && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                    {pendingVouchers.length}
                  </span>
                )}
              </Link>
            </Button>
          )}
          {!isApprovalsPage && !isUsersPage && <ExportButton trips={trips} totalMiles={totalMiles} />}
          <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
