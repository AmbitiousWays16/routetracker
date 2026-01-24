import { Button } from '@/components/ui/button';
import { Trip } from '@/types/mileage';
import { FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

interface ExportButtonProps {
  trips: Trip[];
  totalMiles: number;
}

export const ExportButton = ({ trips, totalMiles }: ExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const generatePDF = async () => {
    if (trips.length === 0) return;

    setIsExporting(true);
    
    try {
      const currentMonth = format(new Date(), 'MMMM yyyy');
      
      // Create HTML content for the voucher
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Mileage Voucher - ${currentMonth}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a2e; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
            .header h1 { color: #3b82f6; font-size: 28px; margin-bottom: 8px; }
            .header p { color: #64748b; font-size: 14px; }
            .summary { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f1f5f9; padding: 20px; border-radius: 8px; }
            .summary-item { text-align: center; }
            .summary-item .value { font-size: 24px; font-weight: bold; color: #3b82f6; }
            .summary-item .label { font-size: 12px; color: #64748b; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #3b82f6; color: white; padding: 12px 8px; text-align: left; font-size: 12px; }
            td { padding: 12px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
            tr:nth-child(even) { background: #f8fafc; }
            .route-link { color: #3b82f6; text-decoration: none; font-size: 10px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
            .signature-line { display: flex; justify-content: space-between; margin-top: 30px; }
            .signature-box { width: 45%; }
            .signature-box p { font-size: 12px; color: #64748b; border-top: 1px solid #1a1a2e; padding-top: 8px; margin-top: 50px; }
            .total-row { font-weight: bold; background: #dbeafe !important; }
            @media print { body { padding: 20px; } }
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
              <div class="value">$${(totalMiles * 0.75).toFixed(2)}</div>
              <div class="label">Reimbursement (@ $0.75/mi)</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 12%">Date</th>
                <th style="width: 22%">From</th>
                <th style="width: 22%">To</th>
                <th style="width: 22%">Business Purpose</th>
                <th style="width: 12%">Program</th>
                <th style="width: 10%">Miles</th>
              </tr>
            </thead>
            <tbody>
              ${trips
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map(
                  (trip) => `
                <tr>
                  <td>${format(new Date(trip.date), 'MM/dd/yyyy')}</td>
                  <td>${trip.fromAddress}</td>
                  <td>${trip.toAddress}</td>
                  <td>${trip.businessPurpose}</td>
                  <td>${trip.program}</td>
                  <td>${trip.miles.toFixed(1)}</td>
                </tr>
              `
                )
                .join('')}
              <tr class="total-row">
                <td colspan="5" style="text-align: right; font-weight: bold;">TOTAL MILES:</td>
                <td style="font-weight: bold;">${totalMiles.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p style="font-size: 12px; color: #64748b; margin-bottom: 10px;">FOR ACCOUNTING USE ONLY</p>
            <div class="signature-line">
              <div class="signature-box">
                <p>Employee's Signature</p>
              </div>
              <div class="signature-box">
                <p>Date</p>
              </div>
            </div>
          </div>
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
