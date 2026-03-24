export interface CompanyRecord {
  id: string;
  companyName: string;
  companyType: string;
  location: string;
  employees: string;
  recruiterName: string;
  recruiterRole: string;
  recruiterEmail: string;
  status: 'not_connected' | 'applied' | 'connected';
  logo?: string;
  website?: string;
  connectionNote?: string;
  connectionAttachment?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isMe: boolean;
}
