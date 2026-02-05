import { memo } from 'react';
import { LogOut, ClipboardCheck, Users } from 'lucide-react';
import mileageTrackerIcon from '@/assets/mileage-tracker-icon.jpg';
import { Link, useLocation } from 'react-router-dom';
import { ExportButton } from './ExportButton';
import { Trip } from '@/types/mileage';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useApproverVouchers } from '@/hooks/useVouchers';
import { usePrograms } from '@/hooks/usePrograms';
import { ProfileSettingsDialog } from './ProfileSettingsDialog';
import { TourHelpButton } from './TourOverlay';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  trips: Trip[];
  totalMiles: number;
}

export const Header = memo(({ trips, totalMiles }: HeaderProps) => {
  const { signOut, user } = useAuth();
  const { approverRole, pendingVouchers } = useApproverVouchers();
  const { isAdmin } = usePrograms();
  const location = useLocation();
  const isApprovalsPage = location.pathname === '/approvals';
  const isUsersPage = location.pathname === '/users';

  return (
    <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm shadow-sm transition-all">
      <div className="container mx-auto flex items-center justify-between px-4 py-3 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img 
              src={mileageTrackerIcon} 
              alt="Mileage Tracker" 
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl object-cover flex-shrink-0 transition-transform hover:scale-105" 
            />
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-foreground truncate">Mileage Tracker</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {isAdmin && (
            <Button
              variant={isUsersPage ? "secondary" : "outline"}
              size="sm"
              asChild
              className="gap-1 sm:gap-2 hidden sm:flex"
            >
              <Link to="/users">
                <Users className="h-4 w-4" />
                <span className="hidden md:inline">Users</span>
              </Link>
            </Button>
          )}
          {isAdmin && (
            <Button
              variant={isUsersPage ? "secondary" : "ghost"}
              size="icon"
              asChild
              className="sm:hidden"
              title="User Management"
            >
              <Link to="/users">
                <Users className="h-4 w-4" />
              </Link>
            </Button>
          )}
          {approverRole && (
            <Button
              variant={isApprovalsPage ? "secondary" : "outline"}
              size="sm"
              asChild
              className="gap-1 sm:gap-2 hidden sm:flex"
            >
              <Link to="/approvals">
                <ClipboardCheck className="h-4 w-4" />
                <span className="hidden md:inline">Approvals</span>
                {pendingVouchers.length > 0 && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                    {pendingVouchers.length}
                  </span>
                )}
              </Link>
            </Button>
          )}
          {approverRole && (
            <Button
              variant={isApprovalsPage ? "secondary" : "ghost"}
              size="icon"
              asChild
              className="sm:hidden relative"
              title="Approvals"
            >
              <Link to="/approvals">
                <ClipboardCheck className="h-4 w-4" />
                {pendingVouchers.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                    {pendingVouchers.length}
                  </span>
                )}
              </Link>
            </Button>
          )}
          {!isApprovalsPage && !isUsersPage && <ExportButton trips={trips} totalMiles={totalMiles} />}
          <TourHelpButton />
          <ThemeToggle />
          <ProfileSettingsDialog />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={signOut} 
            title="Sign out"
            className="transition-all hover:scale-110"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
});
