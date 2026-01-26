import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';


const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;


const MOCK_ADMIN_EMAIL = 'admin@talentflow.com';

export class AuthService {

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


    async getUserRole(userId: string): Promise<'admin' | 'user'> {
        if (this.useMockAuth || !this.supabase) {

            const session = await this.getCurrentSession();
            if (session?.user?.email === MOCK_ADMIN_EMAIL) return 'admin';
            return 'user';
        }

        try {
            console.time('[AuthService] getUserRole');

            const { data, error } = await this.supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .maybeSingle();
            console.timeEnd('[AuthService] getUserRole');

            if (error) {

                console.warn("Error fetching profile role (using default 'user'):", error.message);


                const session = await this.getCurrentSession();
                if (session?.user?.id === userId && session.user.email === MOCK_ADMIN_EMAIL) {
                    return 'admin';
                }
                return 'user';
            }


            return (data?.role as 'admin' | 'user') || 'user';
        } catch (e: any) {

            console.info("AuthService: defaulting to 'user' role due to error.", e.message || e);


            try {
                const session = await this.getCurrentSession();

                if (session?.user?.id === userId && session.user.email === MOCK_ADMIN_EMAIL) {
                    return 'admin';
                }
            } catch { }

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

        if (this.useMockAuth || !this.supabase) {
            localStorage.removeItem('talentflow_mock_session');
            window.location.reload();
            return;
        }


        try {
            console.time('[AuthService] signOut');
            await this.supabase.auth.signOut();
            console.timeEnd('[AuthService] signOut');
        } catch (error) {
            console.warn("Sign out completed with warning:", error);
        } finally {

            this.clearLocalSession();


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
