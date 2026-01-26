
import { authService } from './authService';
import { ActivityLog } from '../types';

class ActivityLogService {


    async logAction(action: string): Promise<void> {
        try {
            const session = await authService.getCurrentSession();
            if (!session || !session.user) return;

            const user = session.user;
            const userId = user.id;


            const userName = user.user_metadata?.display_name || user.email || 'Unknown User';


            const role = await authService.getUserRole(userId);
            const roleDisplay = role === 'admin' ? 'Admin' : 'Partner';


            if (!authService.supabase) {
                console.log(`[Mock ActivityLog] Action: ${action} (User: ${userName})`);
                return;
            }


            const { error } = await authService.supabase
                .from('activity_logs')
                .insert({
                    user_id: userId,
                    user_name: userName,
                    user_role: roleDisplay,
                    action_description: action,
                    created_at: new Date().toISOString()
                });

            if (error) {
                console.error("Failed to save log:", error);
            }

        } catch (e) {
            console.error("Error in activityLogService:", e);
        }
    }



    async getAllLogs(): Promise<{ data: ActivityLog[], error: string | null }> {
        try {
            if (!authService.supabase) {
                return { data: [], error: "Supabase client not initialized (Mock Mode)" };
            }
            const { data, error } = await authService.supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return { data: data as ActivityLog[], error: null };
        } catch (e: any) {
            console.error("Failed to fetch logs:", e);
            return { data: [], error: e.message || "Unknown DB Error" };
        }
    }
}

export const activityLogService = new ActivityLogService();
