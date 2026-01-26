
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
  addedAt: string;
  avatarUrl: string;
  interestedCount: number;
  isInterestedByCurrentUser?: boolean;
  isPinned?: boolean;


  reference?: string;
  currentCompany?: string;
  noticePeriod?: string;
  currentSalary?: string;
  expectedSalary?: string;
  owner?: string;
  linkedinUrl?: string;


  email?: string;
  phone?: string;


  university?: string;
  diploma?: string;


  source?: string;


  manatalId?: string;


  createdBy?: string;
  createdByName?: string;
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
