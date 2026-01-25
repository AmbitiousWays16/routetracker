import { Button } from '@/components/ui/button';
import { Trip } from '@/types/mileage';
import { FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

interface ExportButtonProps {
  trips: Trip[];
  totalMiles: number;
}

const MILEAGE_RATE = 0.75;

export const ExportButton = ({ trips, totalMiles }: ExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const generatePDF = async () => {
    if (trips.length === 0) return;

    setIsExporting(true);
    
    try {
      const currentMonth = format(new Date(), 'MMMM yyyy');
      const reimbursement = totalMiles * MILEAGE_RATE;
      
      // Sort trips by date
      const sortedTrips = [...trips].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Generate route map sections for each trip
      const tripRouteSections = sortedTrips.map((trip, index) => {
        const encodedFrom = encodeURIComponent(trip.fromAddress);
        const encodedTo = encodeURIComponent(trip.toAddress);
        const directionsUrl = `https://www.google.com/maps/dir/${encodedFrom}/${encodedTo}`;
        
        return `
          <div class="trip-detail" style="page-break-inside: avoid; margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
              <h3 style="margin: 0; color: #1a1a2e; font-size: 16px;">Trip ${index + 1}: ${format(new Date(trip.date), 'MMMM d, yyyy')}</h3>
              <span style="background: #dbeafe; color: #3b82f6; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 14px;">${trip.miles.toFixed(1)} miles</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
              <div>
                <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">From</p>
                <p style="margin: 0; font-size: 13px; color: #1a1a2e;">${trip.fromAddress}</p>
              </div>
              <div>
                <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">To</p>
                <p style="margin: 0; font-size: 13px; color: #1a1a2e;">${trip.toAddress}</p>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
              <div>
                <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Business Purpose</p>
                <p style="margin: 0; font-size: 13px; color: #1a1a2e;">${trip.businessPurpose}</p>
              </div>
              <div>
                <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Program</p>
                <p style="margin: 0; font-size: 13px; color: #1a1a2e;">${trip.program}</p>
              </div>
            </div>
            <div style="background: #f8fafc; border-radius: 6px; padding: 15px; text-align: center;">
              ${trip.staticMapUrl ? `
                <img src="${trip.staticMapUrl}" alt="Route Map" style="width: 100%; max-width: 600px; height: auto; border-radius: 6px; margin-bottom: 10px;" />
              ` : `
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">Route Map</p>
              `}
              <a href="${directionsUrl}" target="_blank" style="color: #3b82f6; text-decoration: none; font-size: 13px;">
                📍 View Route on Google Maps →
              </a>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">
                ${trip.fromAddress} → ${trip.toAddress}
              </p>
            </div>
          </div>
        `;
      }).join('');

      // Create HTML content for the comprehensive voucher
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Mileage Voucher - ${currentMonth}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a2e; line-height: 1.5; }
            
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              background: url('/images/westcare-banner.png') center/cover no-repeat;
              padding: 30px 20px;
              border-radius: 8px;
            }
            .header h1 { color: #1a1a2e; font-size: 28px; margin-bottom: 8px; text-shadow: 0 1px 2px rgba(255,255,255,0.8); }
            .header p { color: #374151; font-size: 14px; font-weight: 500; }
            
            .summary { 
              display: flex; 
              justify-content: space-around; 
              margin-bottom: 30px; 
              background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); 
              padding: 25px; 
              border-radius: 12px;
              border: 1px solid #bfdbfe;
            }
            .summary-item { text-align: center; }
            .summary-item .value { font-size: 28px; font-weight: bold; color: #1e40af; }
            .summary-item .label { font-size: 12px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
            
            .section-title {
              font-size: 18px;
              color: #1a1a2e;
              margin: 30px 0 20px 0;
              padding-bottom: 10px;
              border-bottom: 2px solid #e2e8f0;
            }
            
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 30px;
              font-size: 12px;
            }
            th { 
              background: #3b82f6; 
              color: white; 
              padding: 12px 8px; 
              text-align: left; 
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            td { 
              padding: 12px 8px; 
              border-bottom: 1px solid #e2e8f0; 
            }
            tr:nth-child(even) { background: #f8fafc; }
            .total-row { 
              font-weight: bold; 
              background: #dbeafe !important; 
              font-size: 13px;
            }
            
            .signatures-section {
              margin-top: 50px;
              page-break-inside: avoid;
            }
            
            .signature-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px 60px;
              margin-top: 20px;
            }
            
            .signature-box {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 20px;
              background: #fafafa;
            }
            
            .signature-box .title {
              font-size: 12px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 40px;
            }
            
            .signature-line {
              border-top: 1px solid #1a1a2e;
              padding-top: 8px;
              display: flex;
              justify-content: space-between;
            }
            
            .signature-line span {
              font-size: 11px;
              color: #64748b;
            }
            
            .accounting-box {
              margin-top: 30px;
              padding: 15px;
              background: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 8px;
            }
            
            .accounting-box p {
              font-size: 11px;
              color: #92400e;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .page-break { page-break-before: always; }
            
            @media print { 
              body { padding: 20px; }
              .page-break { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>MILEAGE VOUCHER</h1>
            <p>${currentMonth} • Submit by the 10th of the following month</p>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <div class="value">${trips.length}</div>
              <div class="label">Total Trips</div>
            </div>
            <div class="summary-item">
              <div class="value">${totalMiles.toFixed(1)}</div>
              <div class="label">Total Miles</div>
            </div>
            <div class="summary-item">
              <div class="value">$${reimbursement.toFixed(2)}</div>
              <div class="label">Reimbursement @ $${MILEAGE_RATE}/mi</div>
            </div>
          </div>

          <h2 class="section-title">Trip Summary</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 10%">#</th>
                <th style="width: 12%">Date</th>
                <th style="width: 20%">From</th>
                <th style="width: 20%">To</th>
                <th style="width: 18%">Purpose</th>
                <th style="width: 12%">Program</th>
                <th style="width: 8%">Miles</th>
              </tr>
            </thead>
            <tbody>
              ${sortedTrips.map((trip, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${format(new Date(trip.date), 'MM/dd/yyyy')}</td>
                  <td>${trip.fromAddress}</td>
                  <td>${trip.toAddress}</td>
                  <td>${trip.businessPurpose}</td>
                  <td>${trip.program}</td>
                  <td>${trip.miles.toFixed(1)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="6" style="text-align: right;">TOTAL MILES:</td>
                <td>${totalMiles.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>

          <div class="signatures-section">
            <h2 class="section-title">Authorization Signatures</h2>
            <div class="signature-grid">
              <div class="signature-box">
                <div class="title">Employee</div>
                <div class="signature-line">
                  <span>Signature</span>
                  <span>Date</span>
                </div>
              </div>
              <div class="signature-box">
                <div class="title">Supervisor</div>
                <div class="signature-line">
                  <span>Signature</span>
                  <span>Date</span>
                </div>
              </div>
              <div class="signature-box">
                <div class="title">Deputy Administrator / Vice President</div>
                <div class="signature-line">
                  <span>Signature</span>
                  <span>Date</span>
                </div>
              </div>
              <div class="signature-box">
                <div class="title">Chief Operations Officer</div>
                <div class="signature-line">
                  <span>Signature</span>
                  <span>Date</span>
                </div>
              </div>
            </div>
            
            <div class="accounting-box">
              <p>For Accounting Use Only</p>
            </div>
          </div>

          <div class="page-break"></div>
          
          <div class="header">
            <h1>TRIP ROUTE DETAILS</h1>
            <p>${currentMonth} - Individual Trip Documentation</p>
          </div>

          ${tripRouteSections}

        </body>
        </html>
      `;

      // Open print dialog
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={trips.length === 0 || isExporting}
      className="gradient-primary"
    >
      {isExporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileDown className="mr-2 h-4 w-4" />
          Export PDF
        </>
      )}
    </Button>
  );
};
