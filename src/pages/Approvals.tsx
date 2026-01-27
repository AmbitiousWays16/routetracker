import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, User, Calendar, MapPin, Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useApproverVouchers } from '@/hooks/useVouchers';
import { MileageVoucherRecord, getRoleDisplayName, getNextApproverRole, getStatusAfterApproval } from '@/types/voucher';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');

export default function Approvals() {
  const { pendingVouchers, loading, approverRole, approveVoucher, rejectVoucher } = useApproverVouchers();
  const [selectedVoucher, setSelectedVoucher] = useState<MileageVoucherRecord | null>(null);
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [nextApproverEmail, setNextApproverEmail] = useState('');
  const [accountantEmail, setAccountantEmail] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [nextEmailError, setNextEmailError] = useState('');
  const [accountantEmailError, setAccountantEmailError] = useState('');

  const fetchEmployeeEmail = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', userId)
      .maybeSingle();
    return data?.email || '';
  };

  const handleApproveClick = async (voucher: MileageVoucherRecord) => {
    setSelectedVoucher(voucher);
    const email = await fetchEmployeeEmail(voucher.user_id);
    setEmployeeEmail(email);
    setNextApproverEmail('');
    setAccountantEmail('');
    setEmailError('');
    setNextEmailError('');
    setAccountantEmailError('');
    setShowApproveDialog(true);
  };

  const handleRejectClick = async (voucher: MileageVoucherRecord) => {
    setSelectedVoucher(voucher);
    const email = await fetchEmployeeEmail(voucher.user_id);
    setEmployeeEmail(email);
    setRejectReason('');
    setEmailError('');
    setShowRejectDialog(true);
  };

  const handleApprove = async () => {
    if (!selectedVoucher || !approverRole) return;

    // Validate employee email
    const emailResult = emailSchema.safeParse(employeeEmail.trim());
    if (!emailResult.success) {
      setEmailError(emailResult.error.errors[0].message);
      return;
    }

    // Check if we need next approver email
    const newStatus = getStatusAfterApproval(approverRole);
    const nextRole = getNextApproverRole(newStatus);
    const isFinalApproval = newStatus === 'approved';
    
    if (nextRole && nextApproverEmail) {
      const nextEmailResult = emailSchema.safeParse(nextApproverEmail.trim());
      if (!nextEmailResult.success) {
        setNextEmailError(nextEmailResult.error.errors[0].message);
        return;
      }
    }

    // Validate accountant email if final approval
    if (isFinalApproval && accountantEmail) {
      const accountantEmailResult = emailSchema.safeParse(accountantEmail.trim());
      if (!accountantEmailResult.success) {
        setAccountantEmailError(accountantEmailResult.error.errors[0].message);
        return;
      }
    }

    setProcessing(true);
    try {
      await approveVoucher(
        selectedVoucher,
        employeeEmail.trim(),
        employeeEmail.trim(),
        nextApproverEmail.trim() || undefined,
        accountantEmail.trim() || undefined
      );
      setShowApproveDialog(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVoucher || !rejectReason.trim()) return;

    // Validate employee email
    const emailResult = emailSchema.safeParse(employeeEmail.trim());
    if (!emailResult.success) {
      setEmailError(emailResult.error.errors[0].message);
      return;
    }

    setProcessing(true);
    try {
      await rejectVoucher(
        selectedVoucher,
        employeeEmail.trim(),
        employeeEmail.trim(),
        rejectReason.trim()
      );
      setShowRejectDialog(false);
    } finally {
      setProcessing(false);
    }
  };

  const needsNextApprover = approverRole && getNextApproverRole(getStatusAfterApproval(approverRole));
  const isFinalApprover = approverRole === 'coo';

  return (
    <div className="min-h-screen bg-background">
      <Header trips={[]} totalMiles={0} />
      
      <main className="container mx-auto space-y-6 px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Approval Queue</h1>
            {approverRole && (
              <p className="text-muted-foreground">
                Reviewing as {getRoleDisplayName(approverRole)}
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !approverRole ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Approver Role</h3>
              <p className="text-muted-foreground">
                You don't have an approver role assigned. Contact your administrator if you should be able to approve vouchers.
              </p>
            </CardContent>
          </Card>
        ) : pendingVouchers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">
                No vouchers are pending your approval.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingVouchers.map((voucher) => (
              <Card key={voucher.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {format(new Date(voucher.month), 'MMMM yyyy')}
                      </CardTitle>
                      <CardDescription>
                        Submitted {voucher.submitted_at ? format(new Date(voucher.submitted_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{voucher.total_miles.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">miles</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <MapPin className="h-4 w-4" />
                    <span>Employee ID: {voucher.user_id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApproveClick(voucher)}
                      className="gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleRejectClick(voucher)}
                      className="gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Return for Corrections
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Voucher</DialogTitle>
            <DialogDescription>
              Approve this mileage voucher for {selectedVoucher ? format(new Date(selectedVoucher.month), 'MMMM yyyy') : ''}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employee-email">Employee Email</Label>
              <Input
                id="employee-email"
                type="email"
                value={employeeEmail}
                onChange={(e) => {
                  setEmployeeEmail(e.target.value);
                  setEmailError('');
                }}
                placeholder="employee@westcare.com"
                className={emailError ? 'border-destructive' : ''}
              />
              {emailError && <p className="text-sm text-destructive">{emailError}</p>}
            </div>

            {needsNextApprover && (
              <div className="space-y-2">
                <Label htmlFor="next-approver-email">
                  Next Approver Email ({getRoleDisplayName(needsNextApprover)})
                </Label>
                <Input
                  id="next-approver-email"
                  type="email"
                  value={nextApproverEmail}
                  onChange={(e) => {
                    setNextApproverEmail(e.target.value);
                    setNextEmailError('');
                  }}
                  placeholder={`${needsNextApprover}@westcare.com`}
                  className={nextEmailError ? 'border-destructive' : ''}
                />
                {nextEmailError && <p className="text-sm text-destructive">{nextEmailError}</p>}
                <p className="text-xs text-muted-foreground">
                  The {getRoleDisplayName(needsNextApprover)} will be notified to review next.
                </p>
              </div>
            )}

            {isFinalApprover && (
              <div className="space-y-2">
                <Label htmlFor="accountant-email">
                  Accountant Email (Optional)
                </Label>
                <Input
                  id="accountant-email"
                  type="email"
                  value={accountantEmail}
                  onChange={(e) => {
                    setAccountantEmail(e.target.value);
                    setAccountantEmailError('');
                  }}
                  placeholder="accountant@westcare.com"
                  className={accountantEmailError ? 'border-destructive' : ''}
                />
                {accountantEmailError && <p className="text-sm text-destructive">{accountantEmailError}</p>}
                <p className="text-xs text-muted-foreground">
                  The accountant will receive the final approved voucher for processing.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return Voucher for Corrections</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for returning this voucher. The employee will be notified and can make corrections.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-employee-email">Employee Email</Label>
              <Input
                id="reject-employee-email"
                type="email"
                value={employeeEmail}
                onChange={(e) => {
                  setEmployeeEmail(e.target.value);
                  setEmailError('');
                }}
                placeholder="employee@westcare.com"
                className={emailError ? 'border-destructive' : ''}
              />
              {emailError && <p className="text-sm text-destructive">{emailError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason for Return</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please specify what needs to be corrected..."
                rows={3}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={processing || !rejectReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing ? 'Returning...' : 'Return for Corrections'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
