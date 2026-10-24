import type {
  Group,
  Member,
  Announcement,
  AnnouncementDetail,
  DashboardStats,
  AppSettings,
} from '../types';

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export const api = {
  // Stats & Health
  async getStats(): Promise<DashboardStats> {
    const res = await fetch('/api/dashboard/stats');
    return handleResponse<DashboardStats>(res);
  },

  async getHealth(): Promise<{ status: string; database: string; emailProvider: any; geminiConfigured: boolean }> {
    const res = await fetch('/api/health');
    return handleResponse(res);
  },

  // Groups
  async getGroups(): Promise<Group[]> {
    const res = await fetch('/api/groups');
    return handleResponse<Group[]>(res);
  },

  async getGroup(id: string): Promise<Group> {
    const res = await fetch(`/api/groups/${id}`);
    return handleResponse<Group>(res);
  },

  async createGroup(data: { name: string; description?: string }): Promise<Group> {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Group>(res);
  },

  async updateGroup(id: string, data: { name: string; description?: string }): Promise<{ success: boolean }> {
    const res = await fetch(`/api/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async deleteGroup(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/groups/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async addMemberToGroup(groupId: string, memberId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async removeMemberFromGroup(groupId: string, memberId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean }>(res);
  },

  // Members
  async getMembers(params?: { search?: string; groupId?: string }): Promise<Member[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.groupId) query.set('groupId', params.groupId);
    const res = await fetch(`/api/members?${query.toString()}`);
    return handleResponse<Member[]>(res);
  },

  async createMember(data: {
    fullName: string;
    email: string;
    role?: string;
    groupIds?: string[];
  }): Promise<Member> {
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Member>(res);
  },

  async updateMember(
    id: string,
    data: { fullName: string; email: string; role?: string; groupIds?: string[] }
  ): Promise<{ success: boolean }> {
    const res = await fetch(`/api/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async deleteMember(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/members/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean }>(res);
  },

  // Announcements
  async getAnnouncements(params?: { status?: string; groupId?: string; search?: string }): Promise<Announcement[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.groupId) query.set('groupId', params.groupId);
    if (params?.search) query.set('search', params.search);
    const res = await fetch(`/api/announcements?${query.toString()}`);
    return handleResponse<Announcement[]>(res);
  },

  async getAnnouncement(id: string): Promise<AnnouncementDetail> {
    const res = await fetch(`/api/announcements/${id}`);
    return handleResponse<AnnouncementDetail>(res);
  },

  async createAnnouncement(data: {
    title: string;
    groupId: string;
    subject: string;
    content: string;
  }): Promise<{ id: string }> {
    const res = await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ id: string }>(res);
  },

  async sendAnnouncement(id: string): Promise<{ success: boolean; message: string; result: any }> {
    const res = await fetch(`/api/announcements/${id}/send`, {
      method: 'POST',
    });
    return handleResponse<{ success: boolean; message: string; result: any }>(res);
  },

  async retryAnnouncement(id: string): Promise<{ success: boolean; message: string; result: any }> {
    const res = await fetch(`/api/announcements/${id}/retry`, {
      method: 'POST',
    });
    return handleResponse<{ success: boolean; message: string; result: any }>(res);
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    const res = await fetch('/api/settings');
    return handleResponse<AppSettings>(res);
  },

  async updateSettings(data: { appName?: string; senderName?: string; senderEmail?: string }): Promise<{ success: boolean }> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async sendTestEmail(targetEmail: string): Promise<{ success: boolean; message: string; messageId?: string; previewUrl?: string }> {
    const res = await fetch('/api/settings/test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetEmail }),
    });
    return handleResponse<{ success: boolean; message: string; messageId?: string; previewUrl?: string }>(res);
  },

  // Gemini AI Assistant
  async suggestSubjects(params: { topic?: string; content?: string; groupName?: string }): Promise<string[]> {
    const res = await fetch('/api/gemini/assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'suggest_subjects', ...params }),
    });
    const data = await handleResponse<{ suggestions: string[] }>(res);
    return data.suggestions || [];
  },

  async polishContent(params: {
    content: string;
    action: 'improve_clarity' | 'fix_grammar' | 'warm_tone' | 'urgent_reminder';
    groupName?: string;
  }): Promise<string> {
    const res = await fetch('/api/gemini/assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'polish_content', ...params }),
    });
    const data = await handleResponse<{ polished: string }>(res);
    return data.polished;
  },

  // Reset to seed
  async seedData(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/seed', { method: 'POST' });
    return handleResponse<{ success: boolean; message: string }>(res);
  },
};
