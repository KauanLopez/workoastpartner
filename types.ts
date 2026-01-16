
export enum CandidateStatus {
  AVAILABLE = 'Available',
  INTERVIEWING = 'Interviewing',
  HIRED = 'Hired',
  OFFER = 'Offer'
}

export interface Candidate {
  id: string;
  name: string;
  role: string;
  location: string;
  status: CandidateStatus;
  visibility: boolean;
  addedAt: string; // ISO date string
  avatarUrl: string;
  interestedCount: number;
  isInterestedByCurrentUser?: boolean; // Local UI state
  isPinned?: boolean; // Local UI state for Pinning

  // New fields from CSV
  reference?: string;
  currentCompany?: string;
  noticePeriod?: string;
  currentSalary?: string;
  expectedSalary?: string;
  owner?: string;
  linkedinUrl?: string;

  // Contact Info Status
  email?: string;
  phone?: string;

  // Education
  university?: string;
  diploma?: string;

  // Source tracking
  source?: string;

  // Manatal Integration
  manatalId?: string;

  // User Link
  createdBy?: string;
  createdByName?: string; // Name of the partner who registered the candidate
}

export interface UserProfile {
  id: string;
  role: 'user' | 'admin';
  created_at: string;
  display_name?: string;
}

export interface ActivityLog {
  id: string;
  user_name: string;
  user_role: string;
  action_description: string;
  created_at: string;
}

export type ViewMode = 'ADMIN' | 'PARTNER' | 'LOGIN' | 'SIGNUP';

export interface NavItem {
  icon: string;
  label: string;
  active?: boolean;
}
