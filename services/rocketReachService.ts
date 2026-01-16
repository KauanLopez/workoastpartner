import { authService } from './authService';

interface RocketReachEmail {
  email: string;
  type: string;
  smtp_valid: string;
}

interface RocketReachPhone {
  number: string;
  type: string;
}

interface RocketReachProfile {
  id: number;
  status: 'complete' | 'searching' | 'progress' | 'failed' | 'waiting' | 'not queued';
  emails?: RocketReachEmail[];
  phones?: RocketReachPhone[];
  error?: string; // API error message
  detail?: string; // Detailed API error
  [key: string]: any;
}

export class RocketReachService {

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async lookupContactInfo(linkedinUrl: string): Promise<{ email?: string; phone?: string; error?: string }> {
    // ENABLE DEBUG MODE
    console.group("🚀 RocketReach Debug (Edge Function)");
    console.log("Target URL:", linkedinUrl);

    if (!linkedinUrl) {
      console.warn("Aborted: Missing URL");
      console.groupEnd();
      return { error: "LinkedIn URL is required." };
    }

    try {
      const supabase = authService.supabase;
      if (!supabase) throw new Error("Supabase client not initialized.");

      // 1. Initial Lookup Request via Edge Function
      console.log("Step 1: Invoking Edge Function 'rocketreach-proxy'...");

      const { data: profile, error: fnError } = await supabase.functions.invoke('rocketreach-proxy', {
        body: {
          action: 'lookup',
          params: { linkedin_url: linkedinUrl }
        }
      });

      if (fnError) {
        console.error("❌ Edge Function Invocation Error:", fnError);
        console.groupEnd();
        return { error: `Connection Error: ${fnError.message || JSON.stringify(fnError)}` };
      }

      console.log("Edge Function Response:", profile);

      // === DIAGNOSTIC BLOCK ===
      if (!profile) {
        console.error("❌ Response Empty");
        console.groupEnd();
        throw new Error("No data returned from lookup service (Empty Response).");
      }

      // Check for RocketReach API Errors wrapped in response
      if (profile.error || profile.detail || (profile.status && typeof profile.status === 'number' && profile.status >= 400)) {
        const status = profile.status || 'Unknown';
        const msg = profile.error || profile.detail || profile.message || JSON.stringify(profile);

        console.error(`❌ API Logic Error [${status}]:`, msg);

        if (status === 403) {
          console.groupEnd();
          return { error: "Access Denied (403). Verify RocketReach Credits or API Key." };
        }
        if (status === 401) {
          console.groupEnd();
          return { error: "Unauthorized (401). Invalid RocketReach API Key." };
        }
        if (status === 404) {
          console.groupEnd();
          return { error: "Profile not found in RocketReach database." };
        }

        console.groupEnd();
        return { error: `API Error [${status}]: ${msg}` };
      }
      // =================================

      let currentProfile: RocketReachProfile = profile;

      // 2. Handle Asynchronous Status (Polling)
      if (['searching', 'progress', 'waiting'].includes(currentProfile.status)) {
        console.log(`Status is '${currentProfile.status}'. Starting poll...`);
        currentProfile = await this.pollForCompletion(currentProfile.id);
      }

      if (currentProfile.status === 'failed') {
        console.warn("RocketReach Status: FAILED");
        console.groupEnd();
        return { error: "RocketReach lookup failed to resolve data." };
      }

      // Accept 'not queued' as success (cached or immediate result)
      if (currentProfile.status !== 'complete' && currentProfile.status !== 'not queued') {
        // Fallback attempt to extract anyway if data exists
        if (!currentProfile.emails && !currentProfile.phones) {
          console.warn(`Timeout/Incomplete. Status: ${currentProfile.status}`);
          console.groupEnd();
          return { error: `Lookup incomplete (Status: ${currentProfile.status}). Try again later.` };
        }
      }

      // 3. Extract Best Contact Info
      const result = this.extractContactData(currentProfile);
      console.log("✅ Extraction Result:", result);
      console.groupEnd();
      return result;

    } catch (error: any) {
      console.error("💥 Service Exception:", error);
      console.groupEnd();
      return { error: error.message || "Unknown error occurred during lookup." };
    }
  }

  /**
   * Polls the check_status endpoint via Edge Function
   */
  private async pollForCompletion(profileId: number): Promise<RocketReachProfile> {
    const MAX_RETRIES = 10;
    const POLL_INTERVAL_MS = 3000;
    const supabase = authService.supabase;

    try {
      for (let i = 0; i < MAX_RETRIES; i++) {
        await this.sleep(POLL_INTERVAL_MS);
        console.log(`Polling attempt ${i + 1}/${MAX_RETRIES}...`);

        if (!supabase) throw new Error("Supabase client disconnected.");

        const { data, error } = await supabase.functions.invoke('rocketreach-proxy', {
          body: {
            action: 'check_status',
            params: { id: profileId }
          }
        });

        if (error) {
          console.warn("Poll Function Error:", error);
          continue;
        }

        let updatedProfile: RocketReachProfile | undefined;

        // Edge function returns the direct object usually, but let's handle array just in case
        if (Array.isArray(data)) {
          updatedProfile = data.find((p: any) => p.id === profileId);
        } else {
          updatedProfile = data && (data[profileId] || data);
        }

        if (updatedProfile) {
          console.log(`Poll Status: ${updatedProfile.status}`);
          if (['complete', 'failed', 'not queued'].includes(updatedProfile.status)) {
            return updatedProfile;
          }
        }
      }
    } catch (e) {
      console.error("Polling Exception", e);
    }

    throw new Error("Polling timed out before completion.");
  }

  private extractContactData(profile: RocketReachProfile) {
    // Extract best email (prioritize personal)
    let foundEmail = '';
    if (profile.emails && profile.emails.length > 0) {
      const personal = profile.emails.find(e => e.type === 'personal');
      const professional = profile.emails.find(e => e.type === 'professional');
      foundEmail = (personal || professional || profile.emails[0]).email;
    }

    // Extract best phone
    let foundPhone = '';
    if (profile.phones && profile.phones.length > 0) {
      foundPhone = profile.phones[0].number;
    }

    if (!foundEmail && !foundPhone) {
      return { error: "Profile processed, but no public contact info found." };
    }

    return { email: foundEmail, phone: foundPhone };
  }
}

export const rocketReachService = new RocketReachService();