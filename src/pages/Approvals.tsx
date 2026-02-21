import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, User, Calendar, MapPin, Loader2, Pen, Type, Eye } from 'lucide-react';
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
import { toast } from 'sonner';

const emailSchema = z.string().email('Please enter a valid email address');

export default function Approvals() {
  const { user } = useAuth();
  const { pendingVouchers, loading, approverRole, approveVoucher, rejectVoucher } = useApproverVouchers();
  const { getVPs, getCOOs, getAccountants, loading: loadingApprovers } = useApprovers();
  
  const [selectedVoucher, setSelectedVoucher] = useState<MileageVoucherRecord | null>(null);
  const [voucherTrips, setVoucherTrips] = useState<any[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  
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

  const fetchVoucherTrips = async (voucher: MileageVoucherRecord) => {
    setLoadingTrips(true);
    try {
      const monthStart = format(new Date(voucher.month), 'yyyy-MM-01');
      const monthEnd = format(new Date(new Date(voucher.month).getFullYear(), new Date(voucher.month).getMonth() + 1, 0), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', voucher.user_id)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .order('date', { ascending: true });
        
      if (error) throw error;
      setVoucherTrips(data || []);
    } catch (error) {
      console.error('Error fetching voucher trips:', error);
      toast.error('Failed to load trip details');
    } finally {
      setLoadingTrips(false);
    }
  };

  const handleApproveClick = async (voucher: MileageVoucherRecord) => {
    setSelectedVoucher(voucher);
    const data = await fetchEmployeeData(voucher.user_id);
    setEmployeeEmail(data.email);
    setEmployeeName(data.name);
    
    // Fetch trips for review
    fetchVoucherTrips(voucher);
    
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

    // Validate signature
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

    if (isFinalApproval && accountantEmail) {
      const accountantEmailResult = emailSchema.safeParse(accountantEmail.trim());
      if (!accountantEmailResult.success) {
        setAccountantEmailError(accountantEmailResult.error.errors[0].message);
        return;
      }
    }

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

  const getNextRoleInChain = (role: typeof approverRole): 'vp' | 'coo' | null => {
    if (role === 'supervisor') return 'vp';
    if (role === 'vp') return 'coo';
    return null;
  };
  
  const needsNextApprover = approverRole ? getNextRoleInChain(approverRole) : null;
  const isFinalApprover = approverRole === 'coo';

  return (
    <div className=\"min-h-screen bg-background\">
      <Header trips={[]} totalMiles={0} />
      
      <main className=\"container mx-auto space-y-6 px-4 py-6\">
        <div className=\"flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4\">
          <div>
            <h1 className=\"text-2xl font-bold\">Approval Queue</h1>
            {approverRole && (
              <p className=\"text-muted-foreground\">
                Reviewing as {getRoleDisplayName(approverRole)}
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className=\"flex items-center justify-center py-12\">
            <Loader2 className=\"h-8 w-8 animate-spin text-muted-foreground\" />
          </div>
        ) : !approverRole ? (
          <Card className=\"shadow-card\">
            <CardContent className=\"py-12 text-center\">
              <User className=\"h-12 w-12 mx-auto text-muted-foreground mb-4\" />
              <h3 className=\"text-lg font-medium mb-2\">No Approver Role</h3>
              <p className=\"text-muted-foreground\">
                You don't have an approver role assigned.
              </p>
            </CardContent>
          </Card>
        ) : pendingVouchers.length === 0 ? (
          <Card className=\"shadow-card\">
            <CardContent className=\"py-12 text-center\">
              <CheckCircle className=\"h-12 w-12 mx-auto text-green-500 mb-4\" />
              <h3 className=\"text-lg font-medium mb-2\">All Caught Up!</h3>
              <p className=\"text-muted-foreground\">No vouchers are pending your approval.</p>
            </CardContent>
          </Card>
        ) : (
          <div className=\"grid gap-4\">
            {pendingVouchers.map((voucher) => (
              <Card key={voucher.id} className=\"shadow-card\">
                <CardHeader>
                  <div className=\"flex justify-between items-start\">
                    <div>
                      <CardTitle className=\"flex items-center gap-2\">
                        <Calendar className=\"h-5 w-5\" />
                        {format(new Date(voucher.month), 'MMMM yyyy')}
                      </CardTitle>
                      <CardDescription>
                        Submitted {voucher.submitted_at ? format(new Date(voucher.submitted_at), 'MMM d, yyyy') : 'N/A'}
                      </CardDescription>
                    </div>
                    <div className=\"text-right\">
                      <div className=\"text-2xl font-bold text-primary\">{voucher.total_miles.toFixed(1)}</div>
                      <div className=\"text-sm text-muted-foreground\">miles</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className=\"flex flex-col sm:flex-row gap-2\">
                    <Button onClick={() => handleApproveClick(voucher)} className=\"gap-2\">
                      <Eye className=\"h-4 w-4\" />
                      Review & Approve
                    </Button>
                    <Button variant=\"destructive\" onClick={() => handleRejectClick(voucher)} className=\"gap-2\">
                      <XCircle className=\"h-4 w-4\" />
                      Return for Corrections
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className=\"max-w-3xl max-h-[90vh] overflow-hidden flex flex-col\">
          <DialogHeader>
            <DialogTitle>Voucher Review</DialogTitle>
            <DialogDescription>
              Review trip details and sign to approve this voucher.
            </DialogDescription>
          </DialogHeader>
          
          <div className=\"flex-1 overflow-y-auto space-y-6 py-4 px-1\">
            {/* Trip Details Section (Bug 6 Fix) */}
            <div className=\"space-y-4\">
              <h3 className=\"text-sm font-semibold uppercase tracking-wider text-muted-foreground\">Trip Details</h3>
              {loadingTrips ? (
                <div className=\"flex items-center justify-center py-8\">
                  <Loader2 className=\"h-6 w-6 animate-spin\" />
                </div>
              ) : (
                <div className=\"border rounded-lg overflow-hidden\">
                  <table className=\"w-full text-sm\">
                    <thead className=\"bg-muted/50\">
                      <tr>
                        <th className=\"px-4 py-2 text-left\">Date</th>
                        <th className=\"px-4 py-2 text-left\">Route</th>
                        <th className=\"px-4 py-2 text-right\">Miles</th>
                      </tr>
                    </thead>
                    <tbody className=\"divide-y\">
                      {voucherTrips.map((trip) => (
                        <tr key={trip.id}>
                          <td className=\"px-4 py-2\">{format(new Date(trip.date), 'MM/dd')}</td>
                          <td className=\"px-4 py-2\">
                            <div className=\"text-xs font-medium\">{trip.from_address}</div>
                            <div className=\"text-xs text-muted-foreground\">→ {trip.to_address}</div>
                          </td>
                          <td className=\"px-4 py-2 text-right font-mono\">{Number(trip.miles).toFixed(1)}</td>
                        </tr>
                      ))}
                      <tr className=\"bg-muted/30 font-bold\">
                        <td colSpan={2} className=\"px-4 py-2 text-right\">Total Miles:</td>
                        <td className=\"px-4 py-2 text-right font-mono\">{selectedVoucher?.total_miles.toFixed(1)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <hr />

            <div className=\"space-y-4\">
              <div className=\"grid sm:grid-cols-2 gap-4\">
                <div className=\"space-y-2\">
                  <Label htmlFor=\"approver-name\">Approver Name</Label>
                  <Input id=\"approver-name\" value={approverName} onChange={(e) => setApproverName(e.target.value)} />
                </div>
                <div className=\"space-y-2\">
                  <Label htmlFor=\"employee-email\">Employee Email</Label>
                  <Input id=\"employee-email\" value={employeeEmail} onChange={(e) => setEmployeeEmail(e.target.value)} />
                </div>
              </div>

              <div className=\"space-y-2\">
                <Label>Signature *</Label>
                <Tabs value={signatureMode} onValueChange={(v) => setSignatureMode(v as 'type' | 'draw')}>
                  <TabsList className=\"grid w-full grid-cols-2\">
                    <TabsTrigger value=\"type\">Type</TabsTrigger>
                    <TabsTrigger value=\"draw\">Draw</TabsTrigger>
                  </TabsList>
                  <TabsContent value=\"type\" className=\"space-y-2 mt-2\">
                    <Input 
                      value={signatureText} 
                      onChange={(e) => setSignatureText(e.target.value)}
                      placeholder=\"Type signature\"
                      className=\"text-2xl h-14\"
                      style={{ fontFamily: \"'Dancing Script', cursive\" }}
                    />
                  </TabsContent>
                  <TabsContent value=\"draw\" className=\"mt-2\">
                    <SignatureCanvas onSignatureChange={setSignatureImage} />
                  </TabsContent>
                </Tabs>
                {signatureError && <p className=\"text-sm text-destructive\">{signatureError}</p>}
              </div>

              {needsNextApprover && (
                <ApproverSelect
                  label={`Next Approver (${getRoleDisplayName(needsNextApprover)})`}
                  approvers={needsNextApprover === 'vp' ? getVPs() : getCOOs()}
                  value={nextApproverEmail}
                  onChange={setNextApproverEmail}
                  placeholder=\"Select next approver\"
                  loading={loadingApprovers}
                  error={nextEmailError}
                />
              )}
            </div>
          </div>

          <DialogFooter className=\"pt-4 border-t\">
            <Button variant=\"outline\" onClick={() => setShowApproveDialog(false)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing ? 'Approving...' : 'Approve Voucher'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return for Corrections</AlertDialogTitle>
            <AlertDialogDescription>Specify why this voucher needs corrections.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className=\"space-y-4 py-4\">
            <div className=\"space-y-2\">
              <Label>Employee Email</Label>
              <Input value={employeeEmail} onChange={(e) => setEmployeeEmail(e.target.value)} />
            </div>
            <div className=\"space-y-2\">
              <Label>Reason</Label>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={processing} className=\"bg-destructive\">
              {processing ? 'Returning...' : 'Return Voucher'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
