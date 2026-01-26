import React, { useState, useEffect } from 'react';
import { ViewMode } from './types';
import AdminDashboard from './views/AdminDashboard';
import PartnerPortal from './views/PartnerPortal';
import AuthScreen from './views/AuthScreen';
import { authService } from './services/authService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('LOGIN');
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);


  useEffect(() => {
    let mounted = true;


    const safetyTimer = setTimeout(() => {
      if (loading && mounted) {
        console.warn("Loading timed out, forcing UI render.");
        setLoading(false);
      }
    }, 60000);

    const checkSession = async () => {
      try {
        const session = await authService.getCurrentSession();
        if (mounted) {
          await handleRouting(session?.user || null);
        }
      } catch (e) {
        console.error("Session check failed:", e);
        if (mounted) handleRouting(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };


    checkSession();


    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        setLoading(false);
        setUserRole(null);
        handleRouting(null);
      } else if (session?.user) {
        if (currentView === 'LOGIN' || currentView === 'SIGNUP') {

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
      setCurrentView(prev => (prev === 'SIGNUP' ? 'SIGNUP' : 'LOGIN'));
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
      console.error("Error routing user:", error);
      setUserRole('user');
      setCurrentView('PARTNER');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (user: any) => {
    console.log("Login success, transitioning to global loader...");
    setLoading(true);
    await handleRouting(user);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh font-sans antialiased text-gray-900 dark:text-text-primary-dark bg-background-light dark:bg-background-dark selection:bg-primary/30 selection:text-white">


      <div className="fixed bottom-20 right-6 z-50 md:bottom-6">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2.5 rounded-btn bg-white dark:bg-surface-dark shadow-sm text-neutral-medium hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors border border-border-light dark:border-border-dark"
          title="Toggle Dark Mode"
        >
          <span className="material-symbols-outlined text-lg">
            {darkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>


      {currentView === 'LOGIN' && (
        <AuthScreen
          initialMode="LOGIN"
          onSuccess={handleLoginSuccess}
        />
      )}

      {currentView === 'SIGNUP' && (
        <AuthScreen
          initialMode="SIGNUP"
          onSuccess={handleLoginSuccess}
        />
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