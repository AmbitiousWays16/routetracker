import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, User, Calendar, MapPin, Loader2, Pen, Type } from 'lucide-react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { ApproverSelect } from '@/components/ApproverSelect';
import { useApproverVouchers } from '@/hooks/useVouchers';
import { useApprovers } from '@/hooks/useApprovers';
import { useAuth } from '@/contexts/AuthContext';
import { MileageVoucherRecord, getRoleDisplayName, getNextApproverRole, getStatusAfterApproval } from '@/types/voucher';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');

export default function Approvals() {
  const { user } = useAuth();
  const { pendingVouchers, loading, approverRole, approveVoucher, rejectVoucher } = useApproverVouchers();
  const { getVPs, getCOOs, getAccountants, loading: loadingApprovers } = useApprovers();
  const [selectedVoucher, setSelectedVoucher] = useState<MileageVoucherRecord | null>(null);
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [nextApproverEmail, setNextApproverEmail] = useState('');
  const [accountantEmail, setAccountantEmail] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [nextEmailError, setNextEmailError] = useState('');
  const [accountantEmailError, setAccountantEmailError] = useState('');
  const [approverName, setApproverName] = useState('');
  const [signatureText, setSignatureText] = useState('');
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [signatureMode, setSignatureMode] = useState<'type' | 'draw'>('type');
  const [signatureError, setSignatureError] = useState('');

  // Fetch approver's profile name on mount
  useEffect(() => {
    const fetchApproverProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', user.id)
        .maybeSingle();
      setApproverName(data?.full_name || data?.email?.split('@')[0] || '');
    };
    fetchApproverProfile();
  }, [user]);

  const fetchEmployeeData = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', userId)
      .maybeSingle();
    return {
      email: data?.email || '',
      name: data?.full_name || data?.email?.split('@')[0] || ''
    };
  };

  const handleApproveClick = async (voucher: MileageVoucherRecord) => {
    setSelectedVoucher(voucher);
    const data = await fetchEmployeeData(voucher.user_id);
    setEmployeeEmail(data.email);
    setEmployeeName(data.name);
    setNextApproverEmail('');
    setAccountantEmail('');
    setEmailError('');
    setNextEmailError('');
    setAccountantEmailError('');
    setSignatureText('');
    setSignatureImage(null);
    setSignatureMode('type');
    setSignatureError('');
    setShowApproveDialog(true);
  };

  const handleRejectClick = async (voucher: MileageVoucherRecord) => {
    setSelectedVoucher(voucher);
    const data = await fetchEmployeeData(voucher.user_id);
    setEmployeeEmail(data.email);
    setEmployeeName(data.name);
    setRejectReason('');
    setEmailError('');
    setShowRejectDialog(true);
  };

  const handleApprove = async () => {
    if (!selectedVoucher || !approverRole) return;

    // Validate signature based on mode
    const hasValidSignature = signatureMode === 'type' 
      ? signatureText.trim().length > 0 
      : signatureImage !== null;
    
    if (!hasValidSignature) {
      setSignatureError(signatureMode === 'type' 
        ? 'Please type your signature to approve' 
        : 'Please draw your signature to approve');
      return;
    }

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

    // Determine signature value: for drawn signatures, store the base64 image
    // For typed signatures, store the text
    const signatureValue = signatureMode === 'draw' ? signatureImage : signatureText.trim();

    setProcessing(true);
    try {
      await approveVoucher(
        selectedVoucher,
        employeeEmail.trim(),
        employeeName.trim() || 'Employee',
        nextApproverEmail.trim() || undefined,
        accountantEmail.trim() || undefined,
        signatureValue || '',
        approverName.trim()
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
        employeeName.trim() || 'Employee',
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
          
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
            {/* Signature Section */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor="approver-name" className="font-medium">Your Name</Label>
                <Input
                  id="approver-name"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="font-medium">
                  Your Signature <span className="text-destructive">*</span>
                </Label>
                
                <Tabs value={signatureMode} onValueChange={(v) => {
                  setSignatureMode(v as 'type' | 'draw');
                  setSignatureError('');
                }}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="type" className="gap-2">
                      <Type className="h-4 w-4" />
                      Type
                    </TabsTrigger>
                    <TabsTrigger value="draw" className="gap-2">
                      <Pen className="h-4 w-4" />
                      Draw
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="type" className="mt-3">
                    <div className="space-y-2">
                      <Input
                        id="signature"
                        value={signatureText}
                        onChange={(e) => {
                          setSignatureText(e.target.value);
                          setSignatureError('');
                        }}
                        placeholder="Type your signature here"
                        className={`text-xl h-14 ${signatureError && signatureMode === 'type' ? 'border-destructive' : ''}`}
                        style={{ fontFamily: "'Dancing Script', cursive" }}
                      />
                      {signatureText && (
                        <div className="p-3 bg-background rounded border">
                          <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                          <p className="text-2xl text-primary" style={{ fontFamily: "'Dancing Script', cursive" }}>
                            {signatureText}
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="draw" className="mt-3">
                    <SignatureCanvas 
                      onSignatureChange={(dataUrl) => {
                        setSignatureImage(dataUrl);
                        setSignatureError('');
                      }}
                      width={350}
                      height={120}
                    />
                    {signatureImage && (
                      <div className="p-3 bg-background rounded border mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                        <img src={signatureImage} alt="Your signature" className="max-h-16" />
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
                
                {signatureError && <p className="text-sm text-destructive">{signatureError}</p>}
              </div>
            </div>

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
              <ApproverSelect
                label={`Next Approver (${getRoleDisplayName(needsNextApprover)})`}
                approvers={needsNextApprover === 'vp' ? getVPs() : getCOOs()}
                value={nextApproverEmail}
                onChange={(value) => {
                  setNextApproverEmail(value);
                  setNextEmailError('');
                }}
                placeholder={`Select a ${getRoleDisplayName(needsNextApprover)}`}
                loading={loadingApprovers}
                error={nextEmailError}
                helpText={`The ${getRoleDisplayName(needsNextApprover)} will be notified to review next.`}
              />
            )}

            {isFinalApprover && (
              <ApproverSelect
                label="Accountant (Optional)"
                approvers={getAccountants()}
                value={accountantEmail}
                onChange={(value) => {
                  setAccountantEmail(value);
                  setAccountantEmailError('');
                }}
                placeholder="Select an accountant"
                loading={loadingApprovers}
                error={accountantEmailError}
                helpText="The accountant will receive the final approved voucher for processing."
              />
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
