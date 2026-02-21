import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, Archive } from 'lucide-react';
import { Trip, RouteMapData } from '@/types/mileage';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMapImageAsBase64 } from '@/lib/mapUtils';
import { toast } from 'sonner';

interface ArchivePromptDialogProps {
  onExportComplete: () => void;
}

const MILEAGE_RATE = 0.72;
const ARCHIVE_PROMPT_KEY = 'lastArchivePromptMonth';

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Fetch route data for legacy trips that don't have routeMapData
const fetchRouteDataForLegacyTrip = async (fromAddress: string, toAddress: string): Promise<RouteMapData | null> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return null;

    const { data, error } = await supabase.functions.invoke('google-maps-route', {
      body: { fromAddress, toAddress },
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    });

    if (error || !data?.routeMapData) return null;
    return data.routeMapData as RouteMapData;
  } catch {
    return null;
  }
};

export const ArchivePromptDialog = ({ onExportComplete }: ArchivePromptDialogProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [previousMonthTrips, setPreviousMonthTrips] = useState<Trip[]>([]);
  const [previousMonthLabel, setPreviousMonthLabel] = useState('');

  useEffect(() => {
    const checkForPreviousMonthTrips = async () => {
      if (!user) return;

      const now = new Date();
      const currentMonthKey = format(now, 'yyyy-MM');
      const lastPromptMonth = localStorage.getItem(ARCHIVE_PROMPT_KEY);

      // Only prompt once per month
      if (lastPromptMonth === currentMonthKey) return;

      const previousMonth = subMonths(now, 1);
      const monthStart = format(startOfMonth(previousMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(previousMonth), 'yyyy-MM-dd');

      try {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .order('date', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const formattedTrips: Trip[] = data.map((trip) => {
            let routeMapData: RouteMapData | undefined;
            if (trip.static_map_url) {
              try {
                const parsed = JSON.parse(trip.static_map_url);
                if (parsed.encodedPolyline) {
                  routeMapData = parsed;
                }
              } catch {
                // Not JSON
              }
            }
            return {
              id: trip.id,
              date: trip.date,
              fromAddress: trip.from_address,
              toAddress: trip.to_address,
              program: trip.program,
              businessPurpose: trip.purpose,
              miles: Number(trip.miles),
              routeUrl: trip.route_url || undefined,
              routeMapData,
              createdAt: new Date(trip.created_at),
            };
          });
          setPreviousMonthTrips(formattedTrips);
          setPreviousMonthLabel(format(previousMonth, 'MMMM yyyy'));
          setIsOpen(true);
        } else {
          localStorage.setItem(ARCHIVE_PROMPT_KEY, currentMonthKey);
        }
      } catch (error) {
        console.error('Error checking for previous month trips:', error);
      }
    };

    checkForPreviousMonthTrips();
  }, [user]);

  const handleExport = async () => {
    if (previousMonthTrips.length === 0) return;
    setIsExporting(true);

    try {
      const totalMiles = Math.round(previousMonthTrips.reduce((sum, t) => sum + t.miles, 0) * 10) / 10;
      const reimbursement = totalMiles * MILEAGE_RATE;
      
      const sortedTrips = [...previousMonthTrips].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const mapImagesPromises = sortedTrips.map(async (trip) => {
        let routeData = trip.routeMapData;
        if (!routeData) {
          routeData = await fetchRouteDataForLegacyTrip(trip.fromAddress, trip.toAddress);
        }
        if (routeData) {
          return await fetchMapImageAsBase64(routeData);
        }
        return null;
      });

      const mapImages = await Promise.all(mapImagesPromises);

      const tripRouteSections = sortedTrips.map((trip, index) => {
        const safeFromAddress = escapeHtml(trip.fromAddress);
        const safeToAddress = escapeHtml(trip.toAddress);
        const safePurpose = escapeHtml(trip.businessPurpose);
        const safeProgram = escapeHtml(trip.program);
        const directionsUrl = `https://www.google.com/maps/dir/${encodeURIComponent(trip.fromAddress)}/${encodeURIComponent(trip.toAddress)}`;
        const mapImageBase64 = mapImages[index];

        return `
          <div class="trip-detail" style="page-break-inside: avoid; margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
              <h3 style="margin: 0; color: #1a1a2e; font-size: 16px;">Trip ${index + 1}: ${format(new Date(trip.date), 'MMMM d, yyyy')}</h3>
              <span style="background: #dbeafe; color: #3b82f6; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 14px;">${trip.miles.toFixed(1)} miles</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
              <div><p style="font-size: 11px; color: #64748b;">From</p><p>${safeFromAddress}</p></div>
              <div><p style="font-size: 11px; color: #64748b;">To</p><p>${safeToAddress}</p></div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
              <div><p style="font-size: 11px; color: #64748b;">Purpose</p><p>${safePurpose}</p></div>
              <div><p style="font-size: 11px; color: #64748b;">Program</p><p>${safeProgram}</p></div>
            </div>
            <div style="background: #f8fafc; border-radius: 6px; padding: 15px; text-align: center;">
              ${mapImageBase64 ? `<img src="${mapImageBase64}" style="width: 100%; max-width: 600px; height: auto; border-radius: 6px; margin-bottom: 10px;" />` : '<p>No map image available</p>'}
              <a href="${directionsUrl}" target="_blank" style="color: #3b82f6; text-decoration: none; font-size: 13px;">📍 View Route on Google Maps →</a>
            </div>
          </div>
        `;
      }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><title>Mileage Voucher - ${previousMonthLabel}</title><style>body{font-family:sans-serif;padding:40px;color:#1a1a2e;}</style></head>
        <body>
          <h1>MILEAGE VOUCHER</h1>
          <p>${previousMonthLabel}</p>
          <div class="summary" style="display:flex; justify-content:space-around; background:#eff6ff; padding:20px; border-radius:8px; margin:20px 0;">
            <div><strong>${previousMonthTrips.length}</strong><br/>Trips</div>
            <div><strong>${totalMiles.toFixed(1)}</strong><br/>Miles</div>
            <div><strong>$${reimbursement.toFixed(2)}</strong><br/>Reimbursement</div>
          </div>
          <h2>Trip Summary</h2>
          <table style="width:100%; border-collapse:collapse;">
            <thead><tr style="background:#3b82f6; color:white;"><th>#</th><th>Date</th><th>From</th><th>To</th><th>Miles</th></tr></thead>
            <tbody>
              ${sortedTrips.map((t, i) => `<tr><td>${i+1}</td><td>${format(new Date(t.date), 'MM/dd')}</td><td>${escapeHtml(t.fromAddress)}</td><td>${escapeHtml(t.toAddress)}</td><td>${t.miles.toFixed(1)}</td></tr>`).join('')}
            </tbody>
          </table>
          <div style="page-break-before:always;"></div>
          <h2>Trip Details</h2>
          ${tripRouteSections}
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Popup blocked! Please allow popups for this site to export your PDF.');
        setIsExporting(false);
        return;
      }

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();

      // Bug 4 Fix: Handle print cleanup correctly
      const finalizeExport = () => {
        const currentMonthKey = format(new Date(), 'yyyy-MM');
        localStorage.setItem(ARCHIVE_PROMPT_KEY, currentMonthKey);
        setIsOpen(false);
        onExportComplete();
        setIsExporting(false);
      };

      // Try to use afterprint event, fallback to timeout
      printWindow.onafterprint = finalizeExport;
      
      setTimeout(() => {
        printWindow.print();
        // If onafterprint isn't supported or doesn't fire (some browsers), finalize after a delay
        if (printWindow.closed || !('onafterprint' in window)) {
           finalizeExport();
        }
      }, 500);

    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to generate PDF. Please try again.');
      setIsExporting(false);
    }
  };

  const handleSkip = () => {
    const currentMonthKey = format(new Date(), 'yyyy-MM');
    localStorage.setItem(ARCHIVE_PROMPT_KEY, currentMonthKey);
    setIsOpen(false);
    onExportComplete();
  };

  const totalMiles = Math.round(previousMonthTrips.reduce((sum, t) => sum + t.miles, 0) * 10) / 10;

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Archive className="h-6 w-6 text-primary" />
          </div>
          <AlertDialogTitle className="text-center">Archive {previousMonthLabel} Trips</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            You have <span className="font-semibold">{previousMonthTrips.length} trips</span> ({totalMiles.toFixed(1)} miles) from {previousMonthLabel}.
            Would you like to export them to PDF before starting the new month?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2">
          <Button onClick={handleExport} disabled={isExporting} className="w-full">
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Export to PDF
          </Button>
          <AlertDialogCancel asChild>
            <Button variant="ghost" onClick={handleSkip} className="w-full">Skip for now</Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
