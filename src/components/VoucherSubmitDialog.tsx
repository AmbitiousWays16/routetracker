import { useState } from 'react';
import { format } from 'date-fns';
import { Send, AlertCircle, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVouchers } from '@/hooks/useVouchers';
import { useAuth } from '@/contexts/AuthContext';
import { Trip } from '@/types/mileage';
import { getStatusDisplayName } from '@/types/voucher';
import { z } from 'zod';

interface VoucherSubmitDialogProps {
  selectedMonth: Date;
  trips: Trip[];
  totalMiles: number;
}

const emailSchema = z.string().email('Please enter a valid email address');

export function VoucherSubmitDialog({ selectedMonth, trips, totalMiles }: VoucherSubmitDialogProps) {
  const { user } = useAuth();
  const { getOrCreateVoucher, submitVoucher, getVoucherForMonth } = useVouchers();
  const [open, setOpen] = useState(false);
  const [supervisorEmail, setSupervisorEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const existingVoucher = getVoucherForMonth(selectedMonth);
  const canSubmit = trips.length > 0 && (!existingVoucher || existingVoucher.status === 'draft' || existingVoucher.status === 'rejected');

  const handleSubmit = async () => {
    // Validate email
    const result = emailSchema.safeParse(supervisorEmail.trim());
    if (!result.success) {
      setEmailError(result.error.errors[0].message);
      return;
    }
    setEmailError('');

    if (!user?.email) return;

    setSubmitting(true);
    try {
      // Get or create the voucher
      const voucher = await getOrCreateVoucher(selectedMonth, totalMiles);
      if (!voucher) {
        throw new Error('Failed to create voucher');
      }

      // Submit for approval
      const success = await submitVoucher(
        voucher.id,
        supervisorEmail.trim(),
        user.email,
        format(selectedMonth, 'MMMM yyyy'),
        totalMiles
      );

      if (success) {
        setOpen(false);
        setSupervisorEmail('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderVoucherStatus = () => {
    if (!existingVoucher) return null;

    const statusColors: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      pending_supervisor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      pending_vp: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      pending_coo: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${statusColors[existingVoucher.status]}`}>
        {existingVoucher.status === 'approved' && <CheckCircle className="h-4 w-4" />}
        {existingVoucher.status === 'rejected' && <AlertCircle className="h-4 w-4" />}
        {getStatusDisplayName(existingVoucher.status)}
      </div>
    );
  };

  if (!canSubmit && existingVoucher) {
    return (
      <div className="flex items-center gap-3">
        {renderVoucherStatus()}
        {existingVoucher.status !== 'approved' && existingVoucher.status !== 'draft' && (
          <span className="text-sm text-muted-foreground">
            Submitted {existingVoucher.submitted_at ? format(new Date(existingVoucher.submitted_at), 'MMM d, yyyy') : ''}
          </span>
        )}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          disabled={trips.length === 0}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          {existingVoucher?.status === 'rejected' ? 'Resubmit for Approval' : 'Submit for Approval'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Mileage Voucher</DialogTitle>
          <DialogDescription>
            Submit your {format(selectedMonth, 'MMMM yyyy')} mileage voucher for approval.
          </DialogDescription>
        </DialogHeader>

        {existingVoucher?.status === 'rejected' && existingVoucher.rejection_reason && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Previous submission was returned:</strong> {existingVoucher.rejection_reason}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Month:</span>
              <span className="font-medium">{format(selectedMonth, 'MMMM yyyy')}</span>
              <span className="text-muted-foreground">Total Trips:</span>
              <span className="font-medium">{trips.length}</span>
              <span className="text-muted-foreground">Total Miles:</span>
              <span className="font-medium">{totalMiles.toFixed(1)} miles</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supervisor-email">Supervisor Email</Label>
            <Input
              id="supervisor-email"
              type="email"
              placeholder="supervisor@westcare.com"
              value={supervisorEmail}
              onChange={(e) => {
                setSupervisorEmail(e.target.value);
                setEmailError('');
              }}
              className={emailError ? 'border-destructive' : ''}
            />
            {emailError && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Your supervisor will receive an email to review and approve your voucher.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
