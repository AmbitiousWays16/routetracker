import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { User, Loader2, Type, PenTool } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SignatureCanvas } from './SignatureCanvas';

interface ProfileData {
  full_name: string | null;
  job_title: string | null;
  email: string | null;
  signature_type: 'typed' | 'drawn' | null;
  signature_text: string | null;
}

export const ProfileSettingsDialog = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [signatureType, setSignatureType] = useState<'typed' | 'drawn'>('typed');
  const [typedSignature, setTypedSignature] = useState('');
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const [existingDrawnSignature, setExistingDrawnSignature] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchProfile();
    }
  }, [open, user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, job_title, email, signature_type, signature_text')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
        return;
      }

      if (data) {
        setFullName(data.full_name || '');
        setJobTitle(data.job_title || '');
        
        if (data.signature_type === 'typed') {
          setSignatureType('typed');
          setTypedSignature(data.signature_text || '');
          setDrawnSignature(null);
          setExistingDrawnSignature(null);
        } else if (data.signature_type === 'drawn') {
          setSignatureType('drawn');
          setTypedSignature('');
          setDrawnSignature(null);
          setExistingDrawnSignature(data.signature_text);
        } else {
          setSignatureType('typed');
          setTypedSignature('');
          setDrawnSignature(null);
          setExistingDrawnSignature(null);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (fullName && fullName.length > 100) {
      toast.error('Full name must be 100 characters or less');
      return;
    }
    if (jobTitle && jobTitle.length > 100) {
      toast.error('Job title must be 100 characters or less');
      return;
    }
    if (typedSignature && typedSignature.length > 100) {
      toast.error('Typed signature must be 100 characters or less');
      return;
    }

    let signatureData: { signature_type: 'typed' | 'drawn' | null; signature_text: string | null } = {
      signature_type: null,
      signature_text: null,
    };
    
    if (signatureType === 'typed' && typedSignature.trim()) {
      signatureData = {
        signature_type: 'typed',
        signature_text: typedSignature.trim(),
      };
    } else if (signatureType === 'drawn' && (drawnSignature || existingDrawnSignature)) {
      signatureData = {
        signature_type: 'drawn',
        signature_text: drawnSignature || existingDrawnSignature,
      };
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: fullName.trim() || null,
          job_title: jobTitle.trim() || null,
          signature_type: signatureData.signature_type,
          signature_text: signatureData.signature_text,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile');
        return;
      }

      toast.success('Profile updated successfully');
      setOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDrawnSignatureChange = (dataUrl: string | null) => {
    setDrawnSignature(dataUrl);
  };

  const handleClearDrawnSignature = () => {
    setDrawnSignature(null);
    setExistingDrawnSignature(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-tour="profile-settings" variant="ghost" size="icon" title="Profile settings">
          <User className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
          <DialogDescription>
            Update your profile information and signature for mileage vouchers.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                This name will appear on your mileage voucher
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                placeholder="Enter your job title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-3 pt-2 border-t">
              <Label>Your Signature</Label>
              <p className="text-xs text-muted-foreground">
                This signature will appear on vouchers you submit and exported PDFs.
              </p>
              
              <Tabs value={signatureType} onValueChange={(v) => setSignatureType(v as 'typed' | 'drawn')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="typed" className="gap-2">
                    <Type className="h-4 w-4" />
                    Type Signature
                  </TabsTrigger>
                  <TabsTrigger value="drawn" className="gap-2">
                    <PenTool className="h-4 w-4" />
                    Draw Signature
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="typed" className="mt-3 space-y-3">
                  <Input
                    placeholder="Type your signature"
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    maxLength={100}
                    className="font-signature text-xl"
                    style={{ fontFamily: "'Dancing Script', cursive" }}
                  />
                  {typedSignature && (
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                      <p 
                        className="text-2xl text-primary"
                        style={{ fontFamily: "'Dancing Script', cursive" }}
                      >
                        {typedSignature}
                      </p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="drawn" className="mt-3 space-y-3">
                  {existingDrawnSignature && !drawnSignature ? (
                    <div className="space-y-3">
                      <div className="p-4 border rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-2">Current signature:</p>
                        <img 
                          src={existingDrawnSignature} 
                          alt="Your signature" 
                          className="max-h-24 mx-auto"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClearDrawnSignature}
                        className="w-full"
                      >
                        Draw New Signature
                      </Button>
                    </div>
                  ) : (
                    <SignatureCanvas 
                      onSignatureChange={handleDrawnSignatureChange}
                      width={400}
                      height={120}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving} className="flex-1">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
