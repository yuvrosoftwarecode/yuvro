export interface ChatMessage {
  id: string;
  sender: 'tpo' | 'recruiter';
  text: string;
  timestamp: string;
}

export interface CompanyRecord {
  id: string;
  companyName: string;
  companyType: string;
  location: string;
  headcount: string;
  about: string;
  hiringFocus: string;
  rolesOffered: string[];
  recruiterName: string;
  recruiterDesignation: string;
  recruiterEmail: string;
  status: 'not_connected' | 'applied' | 'connected';
  logo?: string;
  website?: string;
  connectionNote?: string;
  connectionAttachment?: string;
  chatMessages: ChatMessage[];
}

export const statusColors: Record<string, string> = {
  connected: 'bg-emerald-500 text-white',
  applied: 'bg-amber-500 text-white',
  not_connected: 'bg-white0 text-white',
};

export const statusLabels: Record<string, string> = {
  connected: 'Connected',
  applied: 'Applied',
  not_connected: 'Not Connected',
};
