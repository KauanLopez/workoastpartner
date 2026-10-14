import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { Logo, Button, Input, Checkbox, Card, Icon } from '../components/ui';

interface Props {
  initialMode: 'LOGIN' | 'SIGNUP';
  onSuccess: (user: any) => void;
}

const AuthScreen: React.FC<Props> = ({ initialMode, onSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('workoast_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    const timeoutPromise = new Promise<{ user: null; error: any }>((_, reject) =>
      setTimeout(
        () => reject(new Error('Request timed out. Please check your connection and try again.')),
        15000
      )
    );

    try {
      let result;
      if (mode === 'LOGIN') {
        result = await Promise.race([
          authService.signIn(email, password),
          timeoutPromise
        ]);
      } else {
        if (!displayName.trim()) {
          setError('Partner / Organization name is required.');
          setLoading(false);
          return;
        }
        result = await Promise.race([
          authService.signUp(email, password, displayName),
          timeoutPromise
        ]);
      }

      if (result.error) {
        setError(result.error.message || 'Authentication failed. Please try again.');
        setLoading(false);
      } else {
        if (mode === 'LOGIN') {
          if (rememberMe) {
            localStorage.setItem('workoast_remembered_email', email);
          } else {
            localStorage.removeItem('workoast_remembered_email');
          }
        }

        if (mode === 'SIGNUP') {
          setShowConfirmation(true);
          setLoading(false);
        } else {
          onSuccess(result.user);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please check your connection.');
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN');
    setError(null);
  };

  if (showConfirmation) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'var(--bg-app)',
          fontFamily: 'var(--font-sans)'
        }}
      >
        <Card
          style={{
            width: '100%',
            maxWidth: 440,
            padding: '40px 32px',
            textAlign: 'center',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--green-100)',
              color: 'var(--green-800)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}
          >
            <Icon name="circle-check" size={28} />
          </div>

          <h2
            className="v-h2"
            style={{
              margin: '0 0 10px',
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 400
            }}
          >
            Check your inbox
          </h2>

          <p
            className="v-body v-muted"
            style={{
              margin: '0 0 28px',
              fontSize: 14,
              lineHeight: 1.5,
              textWrap: 'pretty'
            }}
          >
            We've sent a confirmation link to <br />
            <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
            <br />
            Please verify your email to access your partner account.
          </p>

          <Button
            variant="brand"
            size="lg"
            fullWidth
            onClick={() => {
              setShowConfirmation(false);
              setMode('LOGIN');
            }}
          >
            Back to sign in
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--bg-app)',
        fontFamily: 'var(--font-sans)'
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 440,
          padding: '36px 32px',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div style={{ display: 'grid', gap: 12, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Logo variant="horizontal" tone="ink-green" height={24} />
            <span
              className="v-label"
              style={{
                color: 'var(--text-tertiary)',
                background: 'var(--surface-sunken)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-pill)'
              }}
            >
              Partner Portal
            </span>
          </div>

          <div style={{ marginTop: 8 }}>
            <h1
              className="v-h2"
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 400,
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)'
              }}
            >
              {mode === 'LOGIN' ? 'Welcome back' : 'Join as Partner'}
            </h1>
            <p
              className="v-body v-muted"
              style={{
                margin: '6px 0 0',
                fontSize: 14,
                color: 'var(--text-secondary)'
              }}
            >
              {mode === 'LOGIN'
                ? 'Sign in to access talent pipelines and positions.'
                : 'Register your talent agency or referral partner account.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          {mode === 'SIGNUP' && (
            <Input
              label="Organization / Partner name"
              placeholder="e.g. Andes Talent Partners"
              iconLeft="building-2"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}

          <Input
            label="Work email"
            type="email"
            placeholder="name@domain.com"
            iconLeft="mail"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            iconLeft="lock"
            required
            autoComplete={mode === 'LOGIN' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 0,
                  padding: 0,
                  cursor: 'pointer',
                  color: 'inherit',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={15} />
              </button>
            }
          />

          {mode === 'LOGIN' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -4 }}>
              <Checkbox
                label="Remember me"
                checked={rememberMe}
                onChange={(c) => setRememberMe(c)}
              />
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--status-danger-bg)',
                color: 'var(--status-danger-fg)',
                border: '1px solid var(--red-100)',
                fontSize: 13,
                lineHeight: 1.4,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Icon name="triangle-alert" size={16} />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="brand"
            size="lg"
            fullWidth
            loading={loading}
            style={{ marginTop: 8 }}
          >
            {mode === 'LOGIN' ? 'Sign in' : 'Create partner account'}
          </Button>
        </form>

        <div
          style={{
            marginTop: 24,
            paddingTop: 18,
            borderTop: '1px solid var(--border-subtle)',
            textAlign: 'center'
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {mode === 'LOGIN' ? "Don't have a partner account? " : 'Already registered? '}
          </span>
          <button
            type="button"
            onClick={!loading ? toggleMode : undefined}
            style={{
              background: 'none',
              border: 0,
              padding: 0,
              cursor: 'pointer',
              color: 'var(--green-700)',
              fontWeight: 600,
              fontSize: 13,
              textDecoration: 'underline',
              textUnderlineOffset: 3
            }}
          >
            {mode === 'LOGIN' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default AuthScreen;