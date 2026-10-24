export interface Group {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  members?: Array<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    joinedAt: string;
  }>;
}

export interface Member {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  groups: Array<{
    id: string;
    name: string;
  }>;
}

export interface Announcement {
  id: string;
  title: string;
  groupId: string;
  groupName: string;
  subject: string;
  content: string;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  status: 'draft' | 'sending' | 'sent' | 'partial_failure' | 'failed';
  createdAt: string;
  sentAt?: string;
}

export interface RecipientRecord {
  id: string;
  memberId?: string;
  email: string;
  name: string;
  status: 'pending' | 'delivered' | 'sent' | 'failed';
  providerMessageId?: string;
  previewUrl?: string;
  errorMessage?: string;
  sentAt?: string;
}

export interface AnnouncementDetail extends Announcement {
  recipients: RecipientRecord[];
}

export interface DashboardStats {
  totalGroups: number;
  totalMembers: number;
  announcementsSent: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  recentAnnouncements: Array<{
    id: string;
    title: string;
    subject: string;
    groupName: string;
    recipientCount: number;
    successCount: number;
    failureCount: number;
    status: string;
    createdAt: string;
    sentAt?: string;
  }>;
}

export interface EmailProviderInfo {
  mode: 'resend' | 'smtp' | 'ethereal';
  name: string;
  configured: boolean;
  description: string;
}

export interface AppSettings {
  appName: string;
  senderName: string;
  senderEmail: string;
  emailProvider: EmailProviderInfo;
  geminiConfigured: boolean;
}

export type ViewType = 'overview' | 'groups_members' | 'composer' | 'history' | 'settings';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}
