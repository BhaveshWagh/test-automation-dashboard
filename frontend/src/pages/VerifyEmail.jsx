import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MailCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resendVerification } from '../api';
import { useCooldown } from '@/hooks/use-cooldown';
import OtpInput from '../components/OtpInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VerifyEmail() {
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const email = useLocation().state?.email;
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { remaining, start } = useCooldown(60);

  // A code was just emailed by register/login, so the resend timer starts running.
  useEffect(() => {
    start();
  }, [start]);

  if (!email) return <Navigate to="/login" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await verifyEmail(email, otp);
      toast.success('Email verified. Welcome!');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify email');
      setOtp('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await resendVerification(email);
      toast.success('A new code has been sent.');
      start();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resend the code. Try again later.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <MailCheck className="size-5" />
          </div>
          <CardTitle className="text-lg">Verify your email</CardTitle>
          <CardDescription>
            Enter the 6-digit code we sent to <span className="font-medium text-foreground">{email}</span>. It expires in
            10 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <OtpInput value={otp} onChange={setOtp} disabled={submitting} />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting || otp.length !== 6}>
              {submitting ? 'Verifying...' : 'Verify email'}
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm text-muted-foreground">
            <button
              type="button"
              onClick={handleResend}
              disabled={remaining > 0}
              className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
            >
              {remaining > 0 ? `Resend code in ${remaining}s` : 'Resend code'}
            </button>
            <Link to="/login" className="hover:underline">
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
