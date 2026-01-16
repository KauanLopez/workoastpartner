import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

// CONFIGURATION (Matches candidateService)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

// Legacy constant for Mock Mode fallback
const MOCK_ADMIN_EMAIL = 'admin@talentflow.com';

export class AuthService {
    // Public to allow CandidateService to share the same instance and auth state
    public supabase: SupabaseClient | null = null;
    private useMockAuth = false;

    constructor() {
        try {
            const isLikelyJWT = SUPABASE_KEY?.startsWith('ey');
            const isPublishableKey = SUPABASE_KEY?.startsWith('sb_publishable');

            if (!SUPABASE_URL || !SUPABASE_KEY || (!isLikelyJWT && !isPublishableKey)) {
                console.warn('AuthService: Invalid Supabase credentials. Using Mock Auth.');
                this.useMockAuth = true;
            } else {
                this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: false
                    }
                });
            }
        } catch (e) {
            console.error('AuthService Init Error:', e);
            this.useMockAuth = true;
        }
    }

    // Fetch the user's role from the 'profiles' table
    async getUserRole(userId: string): Promise<'admin' | 'user'> {
        if (this.useMockAuth || !this.supabase) {
            // Mock Logic: Check local storage session for the specific email
            const session = await this.getCurrentSession();
            if (session?.user?.email === MOCK_ADMIN_EMAIL) return 'admin';
            return 'user';
        }

        try {
            console.time('[AuthService] getUserRole');
            // FIX: Use .maybeSingle() instead of .single() to avoid "Cannot coerce..." error when row is missing
            const { data, error } = await this.supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .maybeSingle();
            console.timeEnd('[AuthService] getUserRole');

            if (error) {
                // If query failed (e.g. RLS denial, or network error handled by Supabase client)
                console.warn("Error fetching profile role (using default 'user'):", error.message);

                // Fallback: If DB query fails but user is the hardcoded admin, allow access
                const session = await this.getCurrentSession();
                if (session?.user?.id === userId && session.user.email === MOCK_ADMIN_EMAIL) {
                    return 'admin';
                }
                return 'user';
            }

            // If data is null (meaning no profile row exists), default to 'user'
            return (data?.role as 'admin' | 'user') || 'user';
        } catch (e: any) {
            // Log as info since this is an expected fallback path during network issues
            console.info("AuthService: defaulting to 'user' role due to error.", e.message || e);

            // EMERGENCY FALLBACK: 
            // If the DB is unreachable, check the email directly from the active session.
            try {
                const session = await this.getCurrentSession();
                // Ensure the session matches the requested userId
                if (session?.user?.id === userId && session.user.email === MOCK_ADMIN_EMAIL) {
                    return 'admin';
                }
            } catch { /* ignore session check error */ }

            return 'user';
        }
    }

    async signIn(email: string, password: string): Promise<{ user: User | null; error: any }> {
        if (this.useMockAuth || !this.supabase) {
            return this.mockAuthResponse(email);
        }

        try {
            console.time('[AuthService] signIn');
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password,
            });
            console.timeEnd('[AuthService] signIn');
            return { user: data.user, error };
        } catch (err: any) {
            return { user: null, error: err };
        }
    }

    async signUp(email: string, password: string, displayName: string): Promise<{ user: User | null; error: any }> {
        if (this.useMockAuth || !this.supabase) {
            return this.mockAuthResponse(email, displayName);
        }

        try {
            console.time('[AuthService] signUp');
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        display_name: displayName,
                    }
                }
            });
            console.timeEnd('[AuthService] signUp');
            return { user: data.user, error };
        } catch (err: any) {
            return { user: null, error: err };
        }
    }

    async signOut(): Promise<void> {
        // Check for mock mode first
        if (this.useMockAuth || !this.supabase) {
            localStorage.removeItem('talentflow_mock_session');
            window.location.reload();
            return;
        }

        // Supabase Mode
        try {
            console.time('[AuthService] signOut');
            await this.supabase.auth.signOut();
            console.timeEnd('[AuthService] signOut');
        } catch (error) {
            console.warn("Sign out completed with warning:", error);
        } finally {
            // ALWAYS Perform Cleanup, regardless of network success
            this.clearLocalSession();

            // Force a reload/redirect to ensure clean state
            // This is the most robust way to fix "stuck loading" states on logout
            window.location.href = '/';
        }
    }

    private clearLocalSession() {
        try {
            if (SUPABASE_URL) {
                const domain = SUPABASE_URL.split('//')[1].split('.')[0];
                const key = `sb-${domain}-auth-token`;
                localStorage.removeItem(key);
            }
            localStorage.removeItem('talentflow_mock_session');
        } catch (e) {
            console.warn("Error clearing local storage", e);
        }
    }

    async getCurrentSession(): Promise<Session | null> {
        if (this.useMockAuth || !this.supabase) {
            const stored = localStorage.getItem('talentflow_mock_session');
            return stored ? JSON.parse(stored) : null;
        }
        // getSession is usually fast as it checks local storage first
        const { data } = await this.supabase.auth.getSession();
        return data.session;
    }

    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
        if (this.useMockAuth || !this.supabase) {
            return { data: { subscription: { unsubscribe: () => { } } } };
        }
        return this.supabase.auth.onAuthStateChange(callback);
    }

    private mockAuthResponse(email: string, displayName?: string) {
        const mockUser: User = {
            id: 'mock-user-id',
            app_metadata: {},
            user_metadata: {
                display_name: displayName
            },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            email: email
        };

        const mockSession: Session = {
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600,
            token_type: 'bearer',
            user: mockUser
        };

        localStorage.setItem('talentflow_mock_session', JSON.stringify(mockSession));
        return Promise.resolve({ user: mockUser, error: null });
    }
}

export const authService = new AuthService();
