import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Lock, ArrowRight, User } from 'lucide-react';

const AuthPage: React.FC = () => {
  const { user, loading, signIn, completeFirstLoginPasswordChange } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const tAuth = (t as any).auth || {};
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setSubmitting(true);

    if (requiresPasswordChange) {
      if (!newPassword || newPassword !== confirmPassword) {
        toast({
          title: tAuth.updatePasswordErrorTitle || 'Error updating password',
          description: tAuth.updatePasswordErrorDesc || 'Confirm the new password correctly.',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      const { error } = await completeFirstLoginPasswordChange({
        username,
        currentPassword: password,
        newPassword,
      });

      if (error) {
        toast({
          title: tAuth.updatePasswordErrorTitle || 'Error updating password',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: tAuth.passwordUpdatedTitle || 'Password updated',
          description: tAuth.passwordUpdatedDesc || 'Access granted with the new password.',
        });
      }

      setSubmitting(false);
      return;
    }

    const { error } = await signIn(username, password);

    if (error) {
      if (error.code === 'PASSWORD_CHANGE_REQUIRED') {
        setRequiresPasswordChange(true);
        toast({
          title: tAuth.passwordChangeRequiredTitle || 'Password change required',
          description: tAuth.passwordChangeRequiredDesc || 'Set a new password to complete first login.',
        });
      } else {
        toast({
          title: tAuth.loginErrorTitle || 'Login error',
          description: error.message,
          variant: 'destructive',
        });
      }
    }

    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-semibold text-foreground">{t.app.name}</h1>
          <p className="text-sm text-muted-foreground">{t.app.tagline}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-premium space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">
              {requiresPasswordChange
                ? (tAuth.changePasswordTitle || 'Change your password')
                : (tAuth.loginTitle || 'Sign in')}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {requiresPasswordChange
                ? (tAuth.changePasswordSubtitle || 'The default password must be changed on first access.')
                : (tAuth.loginSubtitle || 'Use local username and password to access the system.')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <User className="h-3 w-3 text-primary/70" /> {tAuth.usernameLabel || 'Username'}
              </label>
              <Input
                type="text"
                placeholder={tAuth.usernamePlaceholder || 'admin'}
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
                disabled={requiresPasswordChange}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-primary/70" /> {tAuth.passwordLabel || 'Password'}
              </label>
              <Input
                type="password"
                placeholder={tAuth.passwordPlaceholder || '********'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={12}
                autoComplete={requiresPasswordChange ? 'current-password' : 'password'}
                disabled={requiresPasswordChange}
              />
            </div>

            {requiresPasswordChange && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-primary/70" /> {tAuth.newPasswordLabel || 'New password'}
                  </label>
                  <Input
                    type="password"
                    placeholder={tAuth.newPasswordPlaceholder || 'Type the new password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={12}
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-primary/70" /> {tAuth.confirmNewPasswordLabel || 'Confirm new password'}
                  </label>
                  <Input
                    type="password"
                    placeholder={tAuth.confirmNewPasswordPlaceholder || 'Repeat the new password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={12}
                    autoComplete="new-password"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {tAuth.passwordPolicyHint || 'Requirements: at least 12 characters with uppercase, lowercase, number, and special character.'}
                </p>
              </>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              {requiresPasswordChange
                ? (tAuth.changePasswordSubmit || 'Update password and sign in')
                : (tAuth.loginSubmit || 'Sign in')}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
