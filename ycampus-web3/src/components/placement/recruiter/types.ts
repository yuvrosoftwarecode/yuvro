export type ConnectionStatus = 'not_connected' | 'applied' | 'connected';

export interface ChatMessage {
  id: string;
  sender: 'placement_officer' | 'recruiter';
  text: string;
  timestamp: string;
}

export interface CompanyRecord {
  id: string;
  companyName: string;
  companyType: string;
  headcount: string;
  location: string;
  website: string;
  about: string;
  hiringFocus: string;
  rolesOffered: string[];
  recruiterName: string;
  recruiterEmail: string;
  recruiterDesignation: string;
  status: ConnectionStatus;
  chatMessages: ChatMessage[];
  connectionNote?: string;
  connectionAttachment?: string;
}

export const statusColors: Record<ConnectionStatus, string> = {
  not_connected: 'bg-muted text-muted-foreground',
  applied: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  connected: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export const statusLabels: Record<ConnectionStatus, string> = {
  not_connected: 'Not Connected',
  applied: 'Applied',
  connected: 'Connected',
};
