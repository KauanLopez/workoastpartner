import React, { useState, useEffect } from 'react';
import { ViewMode } from './types';
import AdminDashboard from './views/AdminDashboard';
import PartnerPortal from './views/PartnerPortal';
import AuthScreen from './views/AuthScreen';
import { authService } from './services/authService';
import { IconButton, Icon, Logo } from './components/ui';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('LOGIN');
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    let mounted = true;

    const safetyTimer = setTimeout(() => {
      if (loading && mounted) {
        console.warn('Loading timed out, forcing UI render.');
        setLoading(false);
      }
    }, 10000);

    const checkSession = async () => {
      try {
        const session = await authService.getCurrentSession();
        if (mounted) {
          await handleRouting(session?.user || null);
        }
      } catch (e) {
        console.error('Session check failed:', e);
        if (mounted) handleRouting(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    const {
      data: { subscription }
    } = authService.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        setLoading(false);
        setUserRole(null);
        handleRouting(null);
      } else if (session?.user) {
        if (currentView === 'LOGIN' || currentView === 'SIGNUP') {
          await handleRouting(session.user);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [currentView]);

  const handleRouting = async (user: any) => {
    if (!user) {
      setCurrentView((prev) => (prev === 'SIGNUP' ? 'SIGNUP' : 'LOGIN'));
      setUserRole(null);
      setLoading(false);
      return;
    }

    try {
      const role = await authService.getUserRole(user.id);
      setUserRole(role);

      setCurrentView((prev) => {
        if (prev === 'ADMIN' || prev === 'PARTNER') return prev;
        return 'PARTNER';
      });
    } catch (error) {
      console.error('Error routing user:', error);
      setUserRole('user');
      setCurrentView('PARTNER');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (user: any) => {
    setLoading(true);
    await handleRouting(user);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: 'var(--bg-app)',
          fontFamily: 'var(--font-sans)'
        }}
      >
        <Logo variant="mark" tone="green" height={44} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', fontSize: 13 }}>
          <Icon name="loader-circle" size={18} style={{ animation: 'v-spin 0.9s linear infinite', color: 'var(--green-700)' }} />
          <span>Starting session...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-app)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)'
      }}
    >
      {/* Floating Theme Toggle in corner */}
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 900 }}>
        <IconButton
          icon={darkMode ? 'sun' : 'moon'}
          label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          variant="secondary"
          size="md"
          onClick={() => setDarkMode(!darkMode)}
          style={{
            boxShadow: 'var(--shadow-md)',
            background: 'var(--surface-raised)'
          }}
        />
      </div>

      {currentView === 'LOGIN' && (
        <AuthScreen initialMode="LOGIN" onSuccess={handleLoginSuccess} />
      )}

      {currentView === 'SIGNUP' && (
        <AuthScreen initialMode="SIGNUP" onSuccess={handleLoginSuccess} />
      )}

      {currentView === 'ADMIN' && (
        <AdminDashboard onNavigate={setCurrentView} />
      )}

      {currentView === 'PARTNER' && (
        <PartnerPortal
          onNavigate={setCurrentView}
          isAdmin={userRole === 'admin'}
        />
      )}
    </div>
  );
};

export default App;