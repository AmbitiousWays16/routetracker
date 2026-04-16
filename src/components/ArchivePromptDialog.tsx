import { useState, useEffect } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, Archive } from 'lucide-react';
import { Trip, RouteMapData } from '@/types/mileage';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMapImageAsBase64 } from '@/lib/mapUtils';

interface ArchivePromptDialogProps {
  onExportComplete: () => void;
}

const MILEAGE_RATE = 0.75;
const ARCHIVE_PROMPT_KEY = 'lastArchivePromptMonth';

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
      if (lastPromptMonth === currentMonthKey) return;

      const previousMonth = subMonths(now, 1);
      const monthStart = format(startOfMonth(previousMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(previousMonth), 'yyyy-MM-dd');

      try {
        const q = query(
          collection(db, 'trips'),
          where('user_id', '==', user.uid),
          where('date', '>=', monthStart),
          where('date', '<=', monthEnd),
          orderBy('date', 'asc')
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const formattedTrips: Trip[] = snapshot.docs.map((docSnap) => {
            const trip = docSnap.data();
            let routeMapData: RouteMapData | undefined;
            if (trip.static_map_url) {
              try {
                const parsed = JSON.parse(trip.static_map_url);
                if (parsed.encodedPolyline) routeMapData = parsed;
              } catch { /* legacy URL */ }
            }
            return {
              id: docSnap.id,
              date: trip.date,
              fromAddress: trip.from_address,
              toAddress: trip.to_address,
              program: trip.program,
              businessPurpose: trip.purpose,
              miles: Number(trip.miles),
              routeUrl: trip.route_url || undefined,
              routeMapData,
              createdAt: trip.created_at?.toDate ? trip.created_at.toDate() : new Date(trip.created_at),
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
      const totalMiles = previousMonthTrips.reduce((sum, t) => sum + t.miles, 0);
      const reimbursement = totalMiles * MILEAGE_RATE;

      let bannerDataUrl = '';
      try {
        const bannerResponse = await fetch('/images/westcare-banner.png');
        const bannerBlob = await bannerResponse.blob();
        bannerDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(bannerBlob);
        });
      } catch { bannerDataUrl = ''; }

      const sortedTrips = [...previousMonthTrips].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const mapImages = await Promise.all(sortedTrips.map((trip) => trip.routeMapData ? fetchMapImageAsBase64(trip.routeMapData) : Promise.resolve(null)));

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
              <div><p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b; text-transform: uppercase;">From</p><p style="margin: 0; font-size: 13px;">${safeFromAddress}</p></div>
              <div><p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b; text-transform: uppercase;">To</p><p style="margin: 0; font-size: 13px;">${safeToAddress}</p></div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
              <div><p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b; text-transform: uppercase;">Business Purpose</p><p style="margin: 0; font-size: 13px;">${safePurpose}</p></div>
              <div><p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b; text-transform: uppercase;">Program</p><p style="margin: 0; font-size: 13px;">${safeProgram}</p></div>
            </div>
            <div style="background: #f8fafc; border-radius: 6px; padding: 15px; text-align: center;">
              ${mapImageBase64 ? `<img src="${mapImageBase64}" alt="Route Map" style="width: 100%; max-width: 600px; height: auto; border-radius: 6px; margin-bottom: 10px;" />` : '<p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">Route Map</p>'}
              <a href="${directionsUrl}" target="_blank" style="color: #3b82f6; text-decoration: none; font-size: 13px;">📍 View Route on Google Maps →</a>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">${safeFromAddress} → ${safeToAddress}</p>
            </div>
          </div>`;
      }).join('');

      const htmlContent = `<!DOCTYPE html><html><head><title>Mileage Voucher - ${previousMonthLabel}</title>
        <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a2e; line-height: 1.5; }
        .header { position: relative; text-align: center; margin-bottom: 30px; padding: 50px 20px; border-radius: 8px; overflow: hidden; background: #d4e8f2; }
        .header .banner { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; object-position: left center; z-index: 0; }
        .header .header-content { position: relative; z-index: 1; }
        .header h1 { color: #1a1a2e; font-size: 28px; margin-bottom: 8px; } .header p { color: #374151; font-size: 14px; font-weight: 500; }
        .summary { display: flex; justify-content: space-around; margin-bottom: 30px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 25px; border-radius: 12px; border: 1px solid #bfdbfe; }
        .summary-item { text-align: center; } .summary-item .value { font-size: 28px; font-weight: bold; color: #1e40af; } .summary-item .label { font-size: 12px; color: #64748b; margin-top: 4px; text-transform: uppercase; }
        .section-title { font-size: 18px; color: #1a1a2e; margin: 30px 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
        th { background: #3b82f6; color: white; padding: 12px 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
        td { padding: 12px 8px; border-bottom: 1px solid #e2e8f0; } tr:nth-child(even) { background: #f8fafc; }
        .total-row { font-weight: bold; background: #dbeafe !important; font-size: 13px; }
        .signatures-section { margin-top: 50px; page-break-inside: avoid; }
        .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px 60px; margin-top: 20px; }
        .signature-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; background: #fafafa; }
        .signature-box .title { font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 40px; }
        .signature-line { border-top: 1px solid #1a1a2e; padding-top: 8px; display: flex; justify-content: space-between; }
        .signature-line span { font-size: 11px; color: #64748b; }
        .check-amount-box { margin-top: 30px; padding: 20px; border: 2px solid #1e3a5f; border-radius: 8px; background: #f8fafc; }
        .check-amount-box .title { font-size: 12px; font-weight: 600; color: #1e3a5f; text-transform: uppercase; margin-bottom: 15px; }
        .check-amount-row { display: flex; align-items: center; gap: 20px; margin-bottom: 15px; }
        .check-amount-row label { font-size: 11px; color: #64748b; min-width: 100px; }
        .check-amount-row .amount-value { font-size: 18px; font-weight: 700; color: #1e3a5f; }
        .check-signoff { display: flex; justify-content: space-between; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; }
        .check-signoff span { font-size: 11px; color: #64748b; }
        .page-break { page-break-before: always; }
        @media print { body { padding: 20px; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style></head><body>
        <div class="header">${bannerDataUrl ? `<img class="banner" src="${bannerDataUrl}" alt="" />` : ''}<div class="header-content"><h1>MILEAGE VOUCHER</h1><p>${previousMonthLabel} • Submit by the 10th of the following month</p></div></div>
        <div class="summary"><div class="summary-item"><div class="value">${previousMonthTrips.length}</div><div class="label">Total Trips</div></div><div class="summary-item"><div class="value">${totalMiles.toFixed(1)}</div><div class="label">Total Miles</div></div><div class="summary-item"><div class="value">$${reimbursement.toFixed(2)}</div><div class="label">Reimbursement @ $${MILEAGE_RATE}/mi</div></div></div>
        <h2 class="section-title">Trip Summary</h2>
        <table><thead><tr><th style="width:10%">#</th><th style="width:12%">Date</th><th style="width:20%">From</th><th style="width:20%">To</th><th style="width:18%">Purpose</th><th style="width:12%">Program</th><th style="width:8%">Miles</th></tr></thead>
        <tbody>${sortedTrips.map((trip, i) => `<tr><td>${i + 1}</td><td>${format(new Date(trip.date), 'MM/dd/yyyy')}</td><td>${escapeHtml(trip.fromAddress)}</td><td>${escapeHtml(trip.toAddress)}</td><td>${escapeHtml(trip.businessPurpose)}</td><td>${escapeHtml(trip.program)}</td><td>${trip.miles.toFixed(1)}</td></tr>`).join('')}
        <tr class="total-row"><td colspan="6" style="text-align:right">TOTAL MILES:</td><td>${totalMiles.toFixed(1)}</td></tr></tbody></table>
        <div class="signatures-section"><h2 class="section-title">Authorization Signatures</h2>
        <div class="signature-grid">
          <div class="signature-box"><div class="title">Employee</div><div class="signature-line"><span>Signature</span><span>Date</span></div></div>
          <div class="signature-box"><div class="title">Supervisor</div><div class="signature-line"><span>Signature</span><span>Date</span></div></div>
          <div class="signature-box"><div class="title">Deputy Administrator / Vice President</div><div class="signature-line"><span>Signature</span><span>Date</span></div></div>
          <div class="signature-box"><div class="title">Chief Operations Officer</div><div class="signature-line"><span>Signature</span><span>Date</span></div></div>
        </div>
        <div class="check-amount-box"><div class="title">Check Amount Sign-Off</div>
          <div class="check-amount-row"><label>Check Amount:</label><div class="amount-value">$${reimbursement.toFixed(2)}</div></div>
          <div class="check-signoff"><span>Accounting Signature</span><span>Date</span></div>
        </div></div>
        <div class="page-break"></div>
        <div class="header">${bannerDataUrl ? `<img class="banner" src="${bannerDataUrl}" alt="" />` : ''}<div class="header-content"><h1>TRIP ROUTE DETAILS</h1><p>${previousMonthLabel} - Individual Trip Documentation</p></div></div>
        ${tripRouteSections}
        </body></html>`;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
      }

      localStorage.setItem(ARCHIVE_PROMPT_KEY, format(new Date(), 'yyyy-MM'));
      setIsOpen(false);
      onExportComplete();
    } finally {
      setIsExporting(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(ARCHIVE_PROMPT_KEY, format(new Date(), 'yyyy-MM'));
    setIsOpen(false);
    onExportComplete();
  };

  const totalMiles = previousMonthTrips.reduce((sum, t) => sum + t.miles, 0);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Archive className="h-6 w-6 text-primary" />
          </div>
          <AlertDialogTitle className="text-center">Archive {previousMonthLabel} Trips</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            You have <span className="font-semibold text-foreground">{previousMonthTrips.length} trips</span> ({totalMiles.toFixed(1)} miles) from {previousMonthLabel}. Would you like to export them to PDF before starting the new month?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleExport} disabled={isExporting} className="w-full gradient-primary">
            {isExporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating PDF...</> : <><FileDown className="mr-2 h-4 w-4" />Export to PDF</>}
          </Button>
          <AlertDialogCancel asChild>
            <Button variant="ghost" onClick={handleSkip} className="w-full">Skip for now</Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
