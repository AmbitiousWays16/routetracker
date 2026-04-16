import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, updatePassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import westcareLogo from '@/assets/westcare-auth-logo.png';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(255, 'Email is too long'),
  password: passwordSchema,
});

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(255, 'Email is too long'),
  password: z.string().min(1, 'Password is required'),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  useEffect(() => {
    // Firebase password reset uses ?mode=resetPassword in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if (mode === 'resetPassword') setIsSettingPassword(true);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser?.email) setEmail(firebaseUser.email);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !loading && !isSettingPassword) navigate('/');
  }, [user, loading, navigate, isSettingPassword]);

  const handleSetPassword = async () => {
    const validation = passwordSchema.safeParse(password);
    if (!validation.success) { toast.error(validation.error.errors[0].message); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }

    setIsSubmitting(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) { toast.error('No authenticated user found. Please use the reset link again.'); return; }
      await updatePassword(currentUser, password);
      toast.success('Password set successfully! You are now signed in.');
      setIsSettingPassword(false);
      window.history.replaceState(null, '', window.location.pathname);
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuth = async (action: 'signin' | 'signup') => {
    const schema = action === 'signup' ? authSchema : signInSchema;
    const validation = schema.safeParse({ email, password });
    if (!validation.success) { toast.error(validation.error.errors[0].message); return; }

    setIsSubmitting(true);
    try {
      const { error } = action === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        if (error.message.includes('User already registered')) {
          toast.error('This email is already registered. Please sign in instead.');
        } else if (error.message.includes('Invalid login credentials') || error.message.includes('auth/wrong-password') || error.message.includes('auth/user-not-found')) {
          toast.error('Invalid email or password. Please try again.');
        } else {
          toast.error(error.message);
        }
      } else if (action === 'signup') {
        toast.success('Account created! You are now signed in.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isSettingPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <img src={westcareLogo} alt="WestCare California" className="h-32 w-auto mx-auto rounded-lg" />
            </div>
            <CardTitle className="text-2xl">Set Your Password</CardTitle>
            <CardDescription>Welcome! Please create a password for your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="set-email">Email</Label>
              <Input id="set-email" type="email" value={email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-password">New Password</Label>
              <Input id="set-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              <p className="text-xs text-muted-foreground">Must be at least 8 characters with uppercase, lowercase, number, and special character.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleSetPassword} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Set Password & Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src={westcareLogo} alt="WestCare California" className="h-32 w-auto mx-auto rounded-lg" />
          </div>
          <CardTitle className="text-2xl">Mileage Tracker</CardTitle>
          <CardDescription>Track your WestCare mileage for reimbursement</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input id="signin-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input id="signin-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" onClick={() => handleAuth('signin')} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign In
              </Button>
            </TabsContent>
            <TabsContent value="signup" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" onClick={() => handleAuth('signup')} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Account
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
