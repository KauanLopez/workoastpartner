
import { Candidate, CandidateStatus } from '../types';
import { activityLogService } from './activityLogService';
import { authService } from './authService';

const BASE_URL = 'https://api.manatal.com/open/v3';

interface ManatalResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

interface ProbeStrategy {
    param: string;
    val: string;
    description: string;
}

interface ProbeResult {
    strategy: ProbeStrategy;
    count: number;
    data: any;
    success: boolean;
    error?: any;
}

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    matchedBy: 'email' | 'phone' | 'linkedin' | 'name' | null;
    matchedByLabel: string | null;
    existingCandidate: Partial<Candidate> | null;
}


export class ManatalService {
    private getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    private toTitleCase(str: string): string {
        return str.replace(
            /\w\S*/g,
            text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
        );
    }

    private extractNameFromUrl(url: string): string | null {
        try {
            const match = url.match(/in\/([^\/\?]+)/) || url.match(/\/([^\/\?]+)$/);
            if (match && match[1]) {
                let slug = match[1];
                slug = slug.replace(/-[a-zA-Z0-9]+$/, '');
                slug = slug.replace(/-/g, ' ');
                return this.toTitleCase(slug);
            }
        } catch (e) {
            console.warn("URL Extraction failed", e);
        }
        return null;
    }

    public extractJobIdFromUrl(url: string): string | null {
        try {
            const match = url.match(/\/jobs\/(\d+)/);
            return match ? match[1] : null;
        } catch (e) {
            return null;
        }
    }

    private async fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 25000): Promise<Response> {
        const supabase = authService.supabase;
        if (!supabase) {
            console.error("CRITICAL: Supabase client is null. Check VITE_SUPABASE_URL/KEY in .env");
            throw new Error("Supabase client not initialized");
        }

        const path = url.replace(BASE_URL, '');
        console.log(`[ManatalService] Proxying request: ${options.method || 'GET'} ${path}`);

        const { data, error } = await supabase.functions.invoke('manatal-proxy', {
            body: {
                method: options.method || 'GET',
                path: path,
                body: options.body ? JSON.parse(options.body as string) : undefined
            }
        });

        if (error) {
            throw new Error(`Proxy Invocation Failed: ${error.message}`);
        }


        return {
            ok: data.ok,
            status: data.status,
            text: async () => typeof data.data === 'string' ? data.data : JSON.stringify(data.data),
            json: async () => data.data
        } as unknown as Response;
    }

    private async fetchPage<T>(url: string): Promise<ManatalResponse<T>> {
        const response = await this.fetchWithTimeout(url, {
            method: 'GET',
            headers: this.getHeaders()
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Manatal API Error (${response.status}): ${errorText}`);
        }

        return response.json();
    }

    private mapToCandidate(c: any): Partial<Candidate> {
        if (!c) return {};
        const mId = String(c.id || 'unknown');
        let linkedin = c.linkedin_url || c.social_media_links?.linkedin;
        if (!linkedin && Array.isArray(c.social_media)) {
            const found = c.social_media.find((s: any) => s.social_media?.toLowerCase() === 'linkedin');
            if (found) linkedin = found.social_media_url;
        }
        return {
            id: mId,
            name: c.full_name || c.name || 'Unknown Candidate',
            role: c.current_position || c.position_name || 'Candidate',
            location: c.address || c.city || 'Unknown',
            manatalId: mId,
            status: CandidateStatus.AVAILABLE,
            avatarUrl: c.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.full_name || 'User')}&background=random`,
            addedAt: c.created_at || new Date().toISOString(),
            currentCompany: c.current_company || '',
            linkedinUrl: linkedin || '',
            email: c.email || '',
            phone: c.phone_number || '',
            visibility: true
        };
    }

    private async getLinkedInUrl(candidateId: string): Promise<string | null> {
        try {
            const response = await this.fetchWithTimeout(`${BASE_URL}/candidates/${candidateId}/social-media/`, {
                method: 'GET',
                headers: this.getHeaders()
            }, 3000);
            if (response.ok) {
                const data = await response.json();
                const results = data.results || (Array.isArray(data) ? data : []);
                const found = results.find((s: any) => s.social_media?.toLowerCase() === 'linkedin');
                return found ? found.social_media_url : null;
            }
        } catch (e) {
            return null;
        }
        return null;
    }

    private async upsertSocialMedia(candidateId: string, type: string, url: string) {
        if (!url) return;
        try {
            const getRes = await this.fetchWithTimeout(`${BASE_URL}/candidates/${candidateId}/social-media/`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            let existingId = null;
            if (getRes.ok) {
                const data = await getRes.json();
                const results = data.results || (Array.isArray(data) ? data : []);
                const found = results.find((item: any) => item.social_media?.toLowerCase() === type.toLowerCase());
                if (found) existingId = found.id;
            }
            if (existingId) {
                await this.fetchWithTimeout(`${BASE_URL}/candidates/${candidateId}/social-media/${existingId}/`, {
                    method: 'PATCH',
                    headers: this.getHeaders(),
                    body: JSON.stringify({ social_media_url: url })
                });
            } else {
                await this.fetchWithTimeout(`${BASE_URL}/candidates/${candidateId}/social-media/`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify({ social_media: type, social_media_url: url })
                });
            }
        } catch (e) {
            console.error(`Failed to upsert ${type} link:`, e);
        }
    }

    async getJob(jobId: string): Promise<any> {
        const url = `${BASE_URL}/jobs/${jobId}/`;
        const response = await this.fetchWithTimeout(url, { method: 'GET', headers: this.getHeaders() });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Job not found (${response.status}): ${text}`);
        }
        return response.json();
    }

    async getJobs(): Promise<any[]> {
        const url = `${BASE_URL}/jobs/?page_size=100&ordering=position_name`;
        try {
            const response = await this.fetchWithTimeout(url, { method: 'GET', headers: this.getHeaders() });
            if (!response.ok) return [];
            const data = await response.json();
            const rawResults = data.results || [];
            return rawResults.map((j: any) => ({
                id: j.id,
                position_name: j.position_name || 'Untitled Position',
                organization_name: j.organization_name,
                external_id: j.external_id,
                status: j.status,
                headcount: j.headcount,
                address: j.address
            }));
        } catch (e) {
            return [];
        }
    }

    async createMatch(candidateId: number | string, jobId: number | string): Promise<void> {
        const url = `${BASE_URL}/matches/`;
        const payload = {
            candidate: typeof candidateId === 'string' ? parseInt(candidateId, 10) : candidateId,
            job: typeof jobId === 'string' ? parseInt(jobId, 10) : jobId
        };
        try {
            const response = await this.fetchWithTimeout(url, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Failed to link candidate to job: ${text}`);
            }
            activityLogService.logAction(`Linked candidate ID ${candidateId} to Job ID ${jobId}`);
        } catch (e) {
            throw e;
        }
    }

    async getPipeline(pipelineId: string): Promise<any> {
        const url = `${BASE_URL}/job-pipelines/${pipelineId}/`;
        const response = await this.fetchWithTimeout(url, { method: 'GET', headers: this.getHeaders() });
        if (!response.ok) throw new Error(`Pipeline not found (ID: ${pipelineId})`);
        return response.json();
    }

    async getStagesForJob(jobId: string): Promise<{ stages: any[], job: any }> {
        const job = await this.getJob(jobId);


        try {
            const matchesRes = await this.fetchWithTimeout(
                `${BASE_URL}/jobs/${jobId}/matches/?page_size=200`,
                { headers: this.getHeaders() }
            );

            if (matchesRes.ok) {
                const matchesData = await matchesRes.json();
                const matches = matchesData.results || [];


                const stageMap = new Map<number, any>();
                for (const match of matches) {
                    const jps = match.job_pipeline_stage;
                    if (jps && jps.id && !stageMap.has(jps.id)) {
                        stageMap.set(jps.id, {
                            id: jps.id,
                            name: jps.name,
                            rank: jps.rank ?? 0
                        });
                    }
                }


                const stages = Array.from(stageMap.values()).sort((a, b) => a.rank - b.rank);



                if (stages.length > 0) {
                    return { stages, job };
                }
            }
        } catch (e) { }


        const pipelineId = job.job_pipeline || job.pipeline;
        if (pipelineId) {
            try {
                const pipeline = await this.getPipeline(pipelineId);
                if (pipeline.stages && pipeline.stages.length > 0) {
                    return { stages: pipeline.stages, job };
                }
            } catch (e) { }
        }

        return { stages: [], job };
    }

    async getCandidatesByJobStage(jobId: string, stageId: string): Promise<Partial<Candidate>[]> {
        const url = `${BASE_URL}/jobs/${jobId}/matches/?job_pipeline_stage=${stageId}`;
        const response = await this.fetchWithTimeout(url, { method: 'GET', headers: this.getHeaders() });
        if (!response.ok) throw new Error("Failed to fetch candidates for this stage");
        const data = await response.json();
        const matches = data.results || [];


        const validMatches = matches.filter((m: any) => m.candidate);


        const candidatePromises = validMatches.map(async (m: any) => {
            const candidateData = m.candidate;


            const isIdOnly = typeof candidateData === 'number' || typeof candidateData === 'string';
            const hasIncompleteName = !isIdOnly && !candidateData.full_name && !candidateData.name;

            if (isIdOnly || hasIncompleteName) {

                const candidateId = isIdOnly ? String(candidateData) : String(candidateData.id);
                try {
                    const detailsUrl = `${BASE_URL}/candidates/${candidateId}/`;
                    const detailsResponse = await this.fetchWithTimeout(detailsUrl, {
                        method: 'GET',
                        headers: this.getHeaders()
                    });
                    if (detailsResponse.ok) {
                        const fullDetails = await detailsResponse.json();
                        return this.mapToCandidate(fullDetails);
                    }
                } catch (e) {
                    console.warn(`Failed to fetch details for candidate ${candidateId}:`, e);
                }
            }


            return this.mapToCandidate(candidateData);
        });

        return Promise.all(candidatePromises);
    }

    async getCandidateDetails(manatalId: string, context?: { name?: string }): Promise<any> {
        let targetId = manatalId;
        let url = `${BASE_URL}/candidates/${targetId}/`;
        try {
            let response = await this.fetchWithTimeout(url, { method: 'GET', headers: this.getHeaders() });
            if (response.status === 404 && context?.name) {
                const candidates = await this.searchCandidates(context.name);
                const cleanTargetName = context.name.toLowerCase().trim();
                let match = candidates.find(c => c.name?.toLowerCase().trim() === cleanTargetName);
                if (match && match.manatalId) {
                    targetId = match.manatalId;
                    url = `${BASE_URL}/candidates/${targetId}/`;
                    response = await this.fetchWithTimeout(url, { method: 'GET', headers: this.getHeaders() });
                }
            }
            if (!response.ok) throw new Error("Details Not Found");
            const details = await response.json();
            try {
                const linkedinUrl = await this.getLinkedInUrl(details.id);
                if (linkedinUrl) details.linkedin_url = linkedinUrl;
            } catch (smError) { }
            return details;
        } catch (error) {
            throw error;
        }
    }


    async checkDuplicateCandidate(data: {
        email?: string;
        full_name?: string;
        linkedin_url?: string;
        phone_number?: string;
    }): Promise<DuplicateCheckResult> {
        const noMatch: DuplicateCheckResult = {
            isDuplicate: false,
            matchedBy: null,
            matchedByLabel: null,
            existingCandidate: null
        };


        const strategies: Array<{
            field: 'email' | 'phone' | 'linkedin' | 'name';
            label: string;
            param: string;
            value: string | undefined;
        }> = [
                { field: 'email', label: 'E-mail', param: 'email', value: data.email?.trim() },
                { field: 'phone', label: 'Telefone', param: 'phone_number', value: data.phone_number?.trim() },
                { field: 'linkedin', label: 'LinkedIn URL', param: 'linkedin_url__icontains', value: data.linkedin_url?.trim() },
                { field: 'name', label: 'Nome Completo', param: 'full_name', value: data.full_name?.trim() }
            ];


        for (const strat of strategies) {
            if (!strat.value || strat.value.length < 3) continue;

            try {
                const url = `${BASE_URL}/candidates/?${strat.param}=${encodeURIComponent(strat.value)}`;
                const response = await this.fetchWithTimeout(url, {
                    method: 'GET',
                    headers: this.getHeaders()
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.count > 0 && data.results?.length > 0) {
                        const existing = data.results[0];
                        return {
                            isDuplicate: true,
                            matchedBy: strat.field,
                            matchedByLabel: strat.label,
                            existingCandidate: this.mapToCandidate(existing)
                        };
                    }
                }
            } catch (e) {
                console.warn(`Duplicate check failed for ${strat.field}:`, e);

            }
        }

        return noMatch;
    }

    async createCandidate(data: any): Promise<Partial<Candidate>> {
        const url = `${BASE_URL}/candidates/`;
        const educationNote = (data.university || data.diploma)
            ? `\n\nEDUCATION DETAILS:\nUniversity: ${data.university || 'N/A'}\nDiploma: ${data.diploma || 'N/A'}`
            : '';
        const payload = {
            full_name: data.full_name,
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            phone_number: data.phone_number,
            address: data.address,
            current_position: data.current_position,
            current_company: data.current_company,
            source_details: data.source,
            description: `Candidate registered via Partner Portal.${educationNote}`
        };
        try {
            const response = await this.fetchWithTimeout(url, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`Failed to create candidate`);
            const createdData = await response.json();
            if (data.linkedin_url) {
                await this.upsertSocialMedia(createdData.id, 'linkedin', data.linkedin_url);
                createdData.linkedin_url = data.linkedin_url;
            }
            activityLogService.logAction(`Created new candidate: ${data.full_name}`);
            return this.mapToCandidate(createdData);
        } catch (error) {
            throw error;
        }
    }

    async updateCandidate(manatalId: string, data: any): Promise<Partial<Candidate>> {
        const url = `${BASE_URL}/candidates/${manatalId}/`;
        const payload: any = {
            full_name: data.full_name,
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            phone_number: data.phone_number,
            address: data.address,
            current_position: data.current_position,
            current_company: data.current_company,
            source_details: data.source
        };
        if (data.university || data.diploma) {
            payload.description = `Updated via Partner Portal.\n\nEDUCATION DETAILS:\nUniversity: ${data.university || 'N/A'}\nDiploma: ${data.diploma || 'N/A'}`;
        }
        try {
            const response = await this.fetchWithTimeout(url, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`Failed to update candidate`);
            const updatedData = await response.json();
            if (data.linkedin_url) {
                await this.upsertSocialMedia(manatalId, 'linkedin', data.linkedin_url);
                updatedData.linkedin_url = data.linkedin_url;
            }
            activityLogService.logAction(`Updated candidate: ${data.full_name}`);
            return this.mapToCandidate(updatedData);
        } catch (error) {
            throw error;
        }
    }


    async deleteCandidate(manatalId: string): Promise<void> {
        const url = `${BASE_URL}/candidates/${manatalId}/`;
        try {
            const response = await this.fetchWithTimeout(url, {
                method: 'DELETE',
                headers: this.getHeaders()
            });


            if (response.status === 204) {
                activityLogService.logAction(`Archived candidate in Manatal (ID: ${manatalId})`);
                return;
            }


            if (response.status === 404) {
                console.warn(`Candidate ${manatalId} not found in Manatal during deletion. Proceeding.`);
                return;
            }

            const errorText = await response.text();
            throw new Error(`Manatal Sync Error (${response.status}): ${errorText}`);
        } catch (error) {
            console.error("Sync Error with Manatal:", error);
            throw error;
        }
    }

    async searchCandidates(query: string): Promise<Partial<Candidate>[]> {
        if (!query || query.length < 3) return [];
        const isLink = query.toLowerCase().includes('http') || query.toLowerCase().includes('www.');
        const isEmail = query.includes('@');
        const normalizedQuery = this.toTitleCase(query);
        const strategies: ProbeStrategy[] = [];
        if (isLink) {
            const urlVal = query.trim();
            strategies.push(
                { param: 'linkedin_url__icontains', val: urlVal, description: 'LinkedIn URL' },
                { param: 'social_media_url__icontains', val: urlVal, description: 'Social Media' }
            );
        } else if (isEmail) {
            strategies.push({ param: 'email', val: query.trim(), description: 'Email' });
        } else {
            strategies.push(
                { param: 'full_name', val: normalizedQuery, description: 'Name Exact' },
                { param: 'search', val: query, description: 'Broad Search' }
            );
        }
        try {
            const results = await Promise.all(strategies.map(async (strat): Promise<ProbeResult> => {
                try {
                    const url = `${BASE_URL}/candidates/?${strat.param}=${encodeURIComponent(strat.val)}`;
                    const res = await this.fetchWithTimeout(url, { method: 'GET', headers: this.getHeaders() });
                    if (!res.ok) return { strategy: strat, count: 0, data: null, success: false };
                    const data = await res.json();
                    return { strategy: strat, count: data.count || 0, data, success: true };
                } catch (e) {
                    return { strategy: strat, count: 0, data: null, success: false };
                }
            }));
            const winner = results.find(r => r.success && r.count > 0);
            if (winner) {
                const rawResults = winner.data.results.slice(0, 10);

                return rawResults.map((r: any) => this.mapToCandidate(r));
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async syncAllCandidates(onProgress?: (count: number) => void): Promise<Partial<Candidate>[]> {
        const allCandidates: Partial<Candidate>[] = [];
        let nextUrl: string | null = `${BASE_URL}/candidates/`;
        try {
            while (nextUrl) {
                const data: ManatalResponse<any> = await this.fetchPage(nextUrl);
                const mapped = data.results.map(this.mapToCandidate);
                allCandidates.push(...mapped);
                if (onProgress) onProgress(allCandidates.length);
                nextUrl = data.next;
            }
            return allCandidates;
        } catch (error) {
            throw error;
        }
    }
}

export const manatalService = new ManatalService();
