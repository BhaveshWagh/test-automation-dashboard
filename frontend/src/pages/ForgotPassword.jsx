import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import { forgotPassword, verifyResetOtp, resetPassword } from '../api';
import { useCooldown } from '@/hooks/use-cooldown';
import OtpInput from '../components/OtpInput';
import PasswordInput from '../components/PasswordInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const STEP_COPY = {
  email: ['Forgot password?', "Enter your account email and we'll send you a 6-digit code."],
  otp: ['Enter the code', 'Check your inbox. The code expires in 10 minutes.'],
  password: ['Set a new password', 'Choose a password of at least 10 characters.']
};

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { remaining, start } = useCooldown(60);

  const run = async (fn) => {
    setError('');
    setSubmitting(true);
    try {
      await fn();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmail = (e) => {
    e.preventDefault();
    run(async () => {
      await forgotPassword(email);
      start();
      setStep('otp');
    });
  };

  const handleOtp = (e) => {
    e.preventDefault();
    run(async () => {
      try {
        const data = await verifyResetOtp(email, otp);
        setResetToken(data.resetToken);
        setStep('password');
      } catch (err) {
        setOtp('');
        throw err;
      }
    });
  };

  const handlePassword = (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    run(async () => {
      await resetPassword(resetToken, password);
      toast.success('Password updated. Sign in with your new password.');
      navigate('/login', { replace: true });
    });
  };

  const handleResend = () =>
    run(async () => {
      await forgotPassword(email);
      toast.success('If the account exists, a new code has been sent.');
      start();
    });

  const [title, description] = STEP_COPY[step];

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <KeyRound className="size-5" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>
            {step === 'otp' ? (
              <>
                If an account exists for <span className="font-medium text-foreground">{email}</span>, a code is on its
                way. The code expires in 10 minutes.
              </>
            ) : (
              description
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' && (
            <form onSubmit={handleEmail} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Sending...' : 'Send code'}
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleOtp} className="space-y-4">
              <OtpInput value={otp} onChange={setOtp} disabled={submitting} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting || otp.length !== 6}>
                {submitting ? 'Verifying...' : 'Verify code'}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={remaining > 0 || submitting}
                  className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                >
                  {remaining > 0 ? `Resend code in ${remaining}s` : 'Resend code'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtp('');
                    setError('');
                    setStep('email');
                  }}
                  className="text-muted-foreground hover:underline"
                >
                  Change email
                </button>
              </div>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handlePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  minLength={10}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  minLength={10}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          )}

          <p className="mt-5 text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
