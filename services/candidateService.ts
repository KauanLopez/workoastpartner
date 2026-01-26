
import { SupabaseClient } from '@supabase/supabase-js';
import { Candidate, CandidateStatus } from '../types';
import { authService } from './authService';




const INITIAL_CANDIDATES: Candidate[] = [];

const LOCAL_STORAGE_KEY = 'talentflow_local_v1';
const INTERESTS_KEY = 'talentflow_user_interests';


const PINNED_IDS_PREFIX = 'talentflow_pinned_ids_';
const PINNED_DATA_PREFIX = 'talentflow_pinned_data_';

class CandidateService {
  private supabase: SupabaseClient | null = null;
  private useMockData = false;

  constructor() {
    this.supabase = authService.supabase;

    if (!this.supabase) {
      console.warn('Supabase client not available via AuthService. Using Mock Data.');
      this.useMockData = true;
    }

    this.ensureLocalStorageData();
  }

  private ensureLocalStorageData() {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored || JSON.parse(stored).length === 0) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_CANDIDATES));
      }
    } catch (e) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_CANDIDATES));
    }
  }


  private getPinnedIdsKey(userId: string) { return `${PINNED_IDS_PREFIX}${userId}`; }
  private getPinnedDataKey(userId: string) { return `${PINNED_DATA_PREFIX}${userId}`; }


  private mergeWithLocalPreferences(candidates: Candidate[], userId?: string): Candidate[] {
    const interests = JSON.parse(localStorage.getItem(INTERESTS_KEY) || '{}');

    let pinnedIds: Record<string, boolean> = {};
    if (userId) {
      try {
        pinnedIds = JSON.parse(localStorage.getItem(this.getPinnedIdsKey(userId)) || '{}');
      } catch (e) { console.error("Error parsing pinned IDs", e); }
    }

    return candidates.map(c => ({
      ...c,
      isInterestedByCurrentUser: !!interests[c.id],
      isPinned: userId ? (!!pinnedIds[c.id] || (c.manatalId ? !!pinnedIds[c.manatalId] : false)) : false
    }));
  }


  isCandidatePinned(id: string, userId: string | null): boolean {
    if (!userId) return false;
    const pinned = JSON.parse(localStorage.getItem(this.getPinnedIdsKey(userId)) || '{}');
    return !!pinned[id];
  }


  togglePin(candidate: Candidate, userId: string | null): boolean {
    if (!userId) return false;

    const idsKey = this.getPinnedIdsKey(userId);
    const dataKey = this.getPinnedDataKey(userId);

    const pinnedIds = JSON.parse(localStorage.getItem(idsKey) || '{}');
    let pinnedData: Candidate[] = JSON.parse(localStorage.getItem(dataKey) || '[]');

    const primaryId = candidate.manatalId || candidate.id;
    const isCurrentlyPinned = !!pinnedIds[primaryId];
    let newState = false;

    if (isCurrentlyPinned) {

      delete pinnedIds[primaryId];

      if (candidate.id) delete pinnedIds[candidate.id];

      pinnedData = pinnedData.filter(c =>
        (c.manatalId !== candidate.manatalId) && (c.id !== candidate.id)
      );
      newState = false;
    } else {

      pinnedIds[primaryId] = true;
      if (candidate.id) pinnedIds[candidate.id] = true;


      const existsInData = pinnedData.some(c =>
        (c.manatalId && c.manatalId === candidate.manatalId) || (c.id === candidate.id)
      );

      if (!existsInData) {
        pinnedData.push({ ...candidate, isPinned: true });
      }
      newState = true;
    }

    localStorage.setItem(idsKey, JSON.stringify(pinnedIds));
    localStorage.setItem(dataKey, JSON.stringify(pinnedData));
    return newState;
  }

  private getMockData(userId?: string): Candidate[] {
    this.ensureLocalStorageData();
    const data = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    return this.mergeWithLocalPreferences(data, userId);
  }


  async getAll(userId?: string): Promise<Candidate[]> {
    let dbCandidates: Candidate[] = [];


    if (this.useMockData || !this.supabase) {
      dbCandidates = this.getMockData(userId);
    } else {
      try {
        console.time('[CandidateService] getAll');

        const { data, error } = await this.supabase
          .from('candidates')
          .select('*, profiles:created_by(display_name)');
        console.timeEnd('[CandidateService] getAll');

        if (error) throw error;

        if (data) {
          dbCandidates = data.map((d: any) => {

            let creatorName = undefined;
            if (d.profiles) {
              if (Array.isArray(d.profiles)) {
                creatorName = d.profiles[0]?.display_name;
              } else {
                creatorName = d.profiles.display_name;
              }
            }

            return {
              id: d.id,
              name: d.candidate_name || d.name,
              reference: d.candidate_reference || d.reference,
              location: d.candidate_location || d.location,
              role: d.current_position || d.role,
              currentCompany: d.current_company || d.currentCompany,
              noticePeriod: d.notice_period || d.noticePeriod,
              currentSalary: d.current_salary || d.currentSalary,
              expectedSalary: d.expected_salary || d.expectedSalary,
              owner: d.candidate_owner || d.owner,
              addedAt: d.candidate_created_date || d.added_at || d.created_at,
              linkedinUrl: d.linkedin_url,
              email: d.email,
              phone: d.phone_number,
              manatalId: d.manatal_id,
              createdBy: d.created_by,
              createdByName: creatorName,
              status: d.status || 'Available',
              visibility: d.visibility,
              interestedCount: d.interested_count || 0,
              avatarUrl: d.avatar_url || d.avatarUrl,
              university: d.university,
              diploma: d.diploma,
              source: d.source,
            };
          });
        }
      } catch (error: any) {
        console.error('Supabase fetch error, falling back to mock:', error);
        dbCandidates = this.getMockData(userId);
      }
    }


    let pinnedDataCache: Candidate[] = [];
    if (userId) {
      pinnedDataCache = JSON.parse(localStorage.getItem(this.getPinnedDataKey(userId)) || '[]');
    }


    const uniquePinnedExtras = pinnedDataCache.filter(pinned => {
      const existsInDb = dbCandidates.some(dbC =>
        (dbC.manatalId && dbC.manatalId === pinned.manatalId) ||
        (dbC.id === pinned.id)
      );
      return !existsInDb;
    });


    const allCandidates = [...dbCandidates, ...uniquePinnedExtras];


    return this.mergeWithLocalPreferences(allCandidates, userId);
  }


  async getUserCandidates(userId: string): Promise<Candidate[]> {
    if (this.useMockData || !this.supabase) {
      const all = this.getMockData(userId);
      return all.filter(c => c.createdBy === userId);
    }

    try {
      console.time('[CandidateService] getUserCandidates');
      const { data, error } = await this.supabase
        .from('candidates')
        .select('*, profiles:created_by(display_name)')
        .eq('created_by', userId)
        .order('candidate_created_date', { ascending: false });
      console.timeEnd('[CandidateService] getUserCandidates');

      if (error) throw error;
      if (!data) return [];

      const mapped = data.map((d: any) => {
        let creatorName = undefined;
        if (d.profiles) {
          if (Array.isArray(d.profiles)) {
            creatorName = d.profiles[0]?.display_name;
          } else {
            creatorName = d.profiles.display_name;
          }
        }

        return {
          id: d.id,
          name: d.candidate_name,
          role: d.current_position,
          location: d.candidate_location,
          status: d.status || 'Available',
          visibility: d.visibility,
          addedAt: d.candidate_created_date,
          avatarUrl: d.avatar_url,
          reference: d.candidate_reference,
          currentCompany: d.current_company,
          noticePeriod: d.notice_period,
          currentSalary: d.current_salary,
          expectedSalary: d.expected_salary,
          owner: d.candidate_owner,
          linkedinUrl: d.linkedin_url,
          email: d.email,
          phone: d.phone_number,
          manatalId: d.manatal_id,
          createdBy: d.created_by,
          createdByName: creatorName,
          interestedCount: d.interested_count || 0,
          university: d.university,
          diploma: d.diploma,
          source: d.source
        };
      });

      return this.mergeWithLocalPreferences(mapped, userId);

    } catch (e: any) {
      console.error("Error fetching user candidates:", e);
      return [];
    }
  }

  async getVisible(userId?: string): Promise<Candidate[]> {
    const all = await this.getAll(userId);
    return all.filter(c => c.visibility);
  }

  async toggleVisibility(id: string): Promise<void> {
    const candidates = await this.getAll();
    const candidate = candidates.find(c => c.id === id);
    if (!candidate) return;

    const newVisibility = !candidate.visibility;

    if (this.useMockData || !this.supabase) {
      const updated = candidates.map(c => c.id === id ? { ...c, visibility: newVisibility } : c);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('talentflow_update'));
      return;
    }

    try {
      console.time('[CandidateService] toggleVisibility');
      const { error } = await this.supabase
        .from('candidates')
        .update({ visibility: newVisibility })
        .eq('id', id);
      console.timeEnd('[CandidateService] toggleVisibility');

      if (error) throw error;
    } catch (e: any) {
      console.error('Supabase update error:', e.message || e);
      const updated = candidates.map(c => c.id === id ? { ...c, visibility: newVisibility } : c);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('talentflow_update'));
    }
  }

  async updateStatus(id: string, status: CandidateStatus): Promise<void> {
    const candidates = await this.getAll();
    const candidate = candidates.find(c => c.id === id);


    const interests = JSON.parse(localStorage.getItem(INTERESTS_KEY) || '{}');
    if (status === CandidateStatus.HIRED) {
      interests[id] = true;
    } else {
      delete interests[id];
    }
    localStorage.setItem(INTERESTS_KEY, JSON.stringify(interests));

    if (!candidate) return;

    if (this.useMockData || !this.supabase) {
      const updated = candidates.map(c => c.id === id ? { ...c, status: status } : c);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('talentflow_update'));
      return;
    }

    try {
      console.time('[CandidateService] updateStatus (RPC)');
      const { error: rpcError } = await this.supabase.rpc('update_candidate_status', {
        p_id: id,
        p_status: status
      });
      console.timeEnd('[CandidateService] updateStatus (RPC)');

      if (rpcError) {
        console.warn("RPC update failed, trying direct update:", rpcError.message);
        const { error } = await this.supabase
          .from('candidates')
          .update({ status: status })
          .eq('id', id);
        if (error) throw error;
      }
    } catch (e: any) {
      console.error('Supabase status update error:', e.message || e);

      const updated = candidates.map(c => c.id === id ? { ...c, status: status } : c);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('talentflow_update'));
    }
  }

  async updateCandidate(id: string, updates: Partial<Candidate>): Promise<void> {
    const candidates = await this.getAll();
    const candidate = candidates.find(c => c.id === id);
    if (!candidate) return;

    const merged = { ...candidate, ...updates };

    if (this.useMockData || !this.supabase) {
      const updated = candidates.map(c => c.id === id ? merged : c);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('talentflow_update'));
      return;
    }

    try {
      const dbPayload: any = {};
      if (updates.name !== undefined) dbPayload.candidate_name = updates.name;
      if (updates.role !== undefined) dbPayload.current_position = updates.role;
      if (updates.location !== undefined) dbPayload.candidate_location = updates.location;
      if (updates.reference !== undefined) dbPayload.candidate_reference = updates.reference;
      if (updates.currentCompany !== undefined) dbPayload.current_company = updates.currentCompany;
      if (updates.noticePeriod !== undefined) dbPayload.notice_period = updates.noticePeriod;
      if (updates.currentSalary !== undefined) dbPayload.current_salary = updates.currentSalary;
      if (updates.expectedSalary !== undefined) dbPayload.expected_salary = updates.expectedSalary;
      if (updates.owner !== undefined) dbPayload.candidate_owner = updates.owner;
      if (updates.status !== undefined) dbPayload.status = updates.status;
      if (updates.visibility !== undefined) dbPayload.visibility = updates.visibility;
      if (updates.linkedinUrl !== undefined) dbPayload.linkedin_url = updates.linkedinUrl;
      if (updates.email !== undefined) dbPayload.email = updates.email;
      if (updates.phone !== undefined) dbPayload.phone_number = updates.phone;

      const { error } = await this.supabase
        .from('candidates')
        .update(dbPayload)
        .eq('id', id);

      if (error) throw error;
    } catch (e: any) {
      console.error('Supabase update error:', e.message || e);

      const updated = candidates.map(c => c.id === id ? merged : c);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('talentflow_update'));
      throw e;
    }
  }

  async createLocalCandidate(c: Partial<Candidate>, userId: string): Promise<Candidate> {
    const payload = {
      candidate_name: c.name,
      candidate_reference: c.reference || null,
      candidate_location: c.location || null,
      current_position: c.role || null,
      current_company: c.currentCompany || null,
      notice_period: c.noticePeriod || null,
      current_salary: c.currentSalary || null,
      expected_salary: c.expectedSalary || null,
      candidate_owner: c.owner || null,
      candidate_created_date: c.addedAt || new Date().toISOString(),
      linkedin_url: c.linkedinUrl || null,
      manatal_id: c.manatalId || null,
      created_by: userId,
      status: c.status || 'Available',
      visibility: true,
      interested_count: 0,
      avatar_url: c.avatarUrl,

      email: c.email || null,
      phone_number: c.phone || null,
      university: c.university || null,
      diploma: c.diploma || null,
      source: c.source || null
    };

    if (this.useMockData || !this.supabase) {
      const current = this.getMockData(userId);
      const newC: Candidate = {
        ...c,
        id: crypto.randomUUID(),
        status: CandidateStatus.AVAILABLE,
        visibility: true,
        name: c.name || '',
        role: c.role || '',
        location: c.location || '',
        addedAt: payload.candidate_created_date,
        avatarUrl: payload.avatar_url!,
        interestedCount: 0,
        createdBy: userId,
        createdByName: 'Current User',
        email: c.email,
        phone: c.phone
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([newC, ...current]));
      window.dispatchEvent(new Event('talentflow_update'));
      return newC;
    }

    try {
      const { data, error } = await this.supabase
        .from('candidates')
        .insert(payload)
        .select('*, profiles:created_by(display_name)')
        .single();

      if (error) throw error;


      let creatorName = undefined;
      if (data.profiles) {
        if (Array.isArray(data.profiles)) {
          creatorName = data.profiles[0]?.display_name;
        } else {
          creatorName = data.profiles.display_name;
        }
      }

      return {
        ...c,
        id: data.id,
        createdBy: userId,
        createdByName: creatorName
      } as Candidate;

    } catch (e: any) {
      console.error("Failed to create local candidate link:", e.message || e);
      throw e;
    }
  }

  async bulkAddCandidates(rawCandidates: Partial<Candidate>[]): Promise<void> {
    const currentCandidates = await this.getAll();
    const existingNames = new Set(currentCandidates.map(c => c.name.trim().toLowerCase()));

    const uniqueNewCandidates = rawCandidates.filter(c => {
      if (c.manatalId) return true;
      if (!c.name) return false;
      return !existingNames.has(c.name.trim().toLowerCase());
    });

    if (uniqueNewCandidates.length === 0) return;

    const payload = uniqueNewCandidates.map(c => ({
      name: c.name || '',
      role: c.role || '',
      location: c.location || '',
      status: c.status || CandidateStatus.AVAILABLE,
      visibility: true,
      interestedCount: 0,
      addedAt: c.addedAt || new Date().toISOString(),
      avatarUrl: c.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || 'User')}&background=random`,

      reference: c.reference || '',
      currentCompany: c.currentCompany || '',
      noticePeriod: c.noticePeriod || '',
      currentSalary: c.currentSalary || '',
      expectedSalary: c.expectedSalary || '',
      owner: c.owner || '',
      linkedinUrl: c.linkedinUrl || '',
      manatalId: c.manatalId || null
    }));

    if (this.useMockData || !this.supabase) {
      const current = this.getMockData();
      const withIds = payload.map(c => ({ ...c, id: crypto.randomUUID() } as Candidate));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...withIds, ...current]));
      window.dispatchEvent(new Event('talentflow_update'));
      return;
    }

    try {
      const dbPayload = payload.map(c => ({
        candidate_name: c.name,
        candidate_reference: c.reference || null,
        candidate_location: c.location || null,
        current_position: c.role || null,
        current_company: c.currentCompany || null,
        notice_period: c.noticePeriod || null,
        current_salary: c.currentSalary || null,
        expected_salary: c.expectedSalary || null,
        candidate_owner: c.owner || null,
        candidate_created_date: c.addedAt,
        linkedin_url: c.linkedinUrl || null,
        manatal_id: c.manatalId || null,
        status: c.status,
        visibility: c.visibility,
        interested_count: c.interestedCount,
        avatar_url: c.avatarUrl
      }));

      const { error } = await this.supabase.from('candidates').insert(dbPayload);
      if (error) throw error;
    } catch (e: any) {
      console.error('Supabase insert error:', e.message || e);
      throw new Error("Failed to upload candidates to database.");
    }
  }

  async upsertManatalBatch(candidates: Partial<Candidate>[]): Promise<void> {
    if (!this.supabase || this.useMockData) {
      await this.bulkAddCandidates(candidates);
      return;
    }

    try {
      const dbPayload = candidates.map(c => ({
        candidate_name: c.name,
        candidate_location: c.location,
        current_position: c.role,
        current_company: c.currentCompany,
        linkedin_url: c.linkedinUrl,
        manatal_id: c.manatalId,
        avatar_url: c.avatarUrl,
        candidate_created_date: c.addedAt,
        status: c.status || 'Available',
        visibility: true,
      }));

      const { error } = await this.supabase
        .from('candidates')
        .upsert(dbPayload, {
          onConflict: 'manatal_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

    } catch (e: any) {
      console.error("Upsert failed:", e);
      throw e;
    }
  }

  async deleteCandidates(ids: string[]): Promise<void> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validUuids = ids.filter(id => uuidRegex.test(id));

    if (validUuids.length === 0) {
      if (this.useMockData || !this.supabase) {

      } else {
        return;
      }
    }

    if (this.useMockData || !this.supabase) {
      const current = this.getMockData();
      const updated = current.filter(c => !ids.includes(c.id));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('talentflow_update'));
      return;
    }

    try {
      const { error } = await this.supabase.from('candidates').delete().in('id', validUuids);
      if (error) throw error;
    } catch (e: any) {
      console.error('❌ Supabase Delete Error:', e.message || e);
      throw new Error("Failed to delete candidates.");
    }
  }

  subscribe(callback: () => void): () => void {
    if (this.useMockData || !this.supabase) {
      const handler = () => callback();
      window.addEventListener('talentflow_update', handler);
      return () => window.removeEventListener('talentflow_update', handler);
    }

    let channel: any = null;
    try {
      channel = this.supabase
        .channel('public:candidates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, () => {
          callback();
        })
        .subscribe();
    } catch (e) {
      console.warn("Realtime subscription failed.");
    }

    const handler = () => callback();
    window.addEventListener('talentflow_update', handler);

    return () => {
      if (this.supabase && channel) {
        this.supabase.removeChannel(channel).catch(() => { });
      }
      window.removeEventListener('talentflow_update', handler);
    };
  }
}

export const candidateService = new CandidateService();
