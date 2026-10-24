import React, { useState } from 'react';
import {
  MessageSquare,
  Users,
  History,
  Settings,
  Plus,
  Search,
  CheckCheck,
  Zap,
  MoreVertical,
  ShieldCheck,
  FolderTree,
  Mail,
  UserPlus,
} from 'lucide-react';
import type { Group, Announcement, Member, AppSettings } from '../../types';
import { WhatsAppTicks } from './WhatsAppTicks';

interface WhatsAppSidebarProps {
  groups: Group[];
  announcements: Announcement[];
  selectedGroupId: string;
  onSelectGroup: (groupId: string) => void;
  onOpenCreateGroup: () => void;
  onOpenCreateMember: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  settings: AppSettings | null;
}

export const WhatsAppSidebar: React.FC<WhatsAppSidebarProps> = ({
  groups,
  announcements,
  selectedGroupId,
  onSelectGroup,
  onOpenCreateGroup,
  onOpenCreateMember,
  onOpenHistory,
  onOpenSettings,
  settings,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'groups' | 'recent'>('all');
  const [menuOpen, setMenuOpen] = useState(false);

  // Filter groups
  const filteredGroups = groups.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.description || '').toLowerCase().includes(search.toLowerCase());

    if (filter === 'groups') return matchesSearch;
    return matchesSearch;
  });

  // Helper for avatar colors
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-[#00a884] text-white',
      'bg-[#34b7f1] text-white',
      'bg-[#8b5cf6] text-white',
      'bg-[#ec4899] text-white',
      'bg-[#f59e0b] text-white',
      'bg-[#10b981] text-white',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Find latest announcement for a group
  const getLatestAnnouncement = (groupId: string, groupName: string) => {
    return announcements.find((a) => a.groupId === groupId || a.groupName === groupName);
  };

  return (
    <div className="w-full md:w-[380px] lg:w-[420px] bg-white border-r border-[#e9edef] flex flex-col h-full shrink-0 select-none">
      {/* Top Header Bar */}
      <div className="h-16 px-4 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-[#008069] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              CL
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25d366] border-2 border-white" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-[#111b21] tracking-tight">MailFlow</span>
              <span className="text-[10px] font-bold text-[#008069] bg-[#e7fce3] px-1.5 py-0.5 rounded-full border border-[#d9fdd3]">
                COMMUNITY
              </span>
            </div>
            <p className="text-[11px] text-[#667781]">Community Lead</p>
          </div>
        </div>

        {/* WhatsApp Top Navigation Icons */}
        <div className="flex items-center gap-1 text-[#54656f]">
          <button
            onClick={onOpenCreateMember}
            className="p-2 hover:bg-[#e9edef] hover:text-[#111b21] rounded-full transition-colors"
            title="Add Member Profile"
          >
            <UserPlus className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenCreateGroup}
            className="p-2 hover:bg-[#e9edef] hover:text-[#111b21] rounded-full transition-colors"
            title="Create Community Group"
          >
            <Plus className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenHistory}
            className="p-2 hover:bg-[#e9edef] hover:text-[#111b21] rounded-full transition-colors"
            title="Transmission History & Logs"
          >
            <History className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 hover:bg-[#e9edef] hover:text-[#111b21] rounded-full transition-colors"
              title="Menu & Settings"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-[#e9edef] p-1.5 z-40 animate-in zoom-in-95">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenCreateGroup();
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-[#f0f2f5] text-[#111b21] font-medium"
                >
                  New Community Group
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenCreateMember();
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-[#f0f2f5] text-[#111b21] font-medium"
                >
                  Add Community Member
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenHistory();
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-[#f0f2f5] text-[#111b21] font-medium"
                >
                  Delivery Logs & CSV
                </button>
                <div className="h-px bg-[#e9edef] my-1" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-[#f0f2f5] text-[#111b21] font-medium"
                >
                  Settings & Integrations
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp Search Bar */}
      <div className="p-2.5 bg-white border-b border-[#e9edef] space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search or start new announcement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#f0f2f5] rounded-lg text-xs text-[#111b21] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884] border-0"
          />
        </div>

        {/* WhatsApp Filter Chips */}
        <div className="flex items-center gap-1.5 px-0.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-[#e7fce3] text-[#008069]'
                : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'
            }`}
          >
            All Circles
          </button>
          <button
            onClick={() => setFilter('groups')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              filter === 'groups'
                ? 'bg-[#e7fce3] text-[#008069]'
                : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'
            }`}
          >
            Groups ({groups.length})
          </button>
          <button
            onClick={onOpenHistory}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef] transition-all"
          >
            Broadcasts ({announcements.length})
          </button>
        </div>
      </div>

      {/* Group & Channel Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#f0f2f5]">
        {filteredGroups.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8696a0] space-y-2">
            <FolderTree className="w-8 h-8 mx-auto text-[#d1d7db]" />
            <p className="font-medium text-[#111b21]">No community circles found</p>
            <p className="text-[11px] text-[#667781]">Click the + button above to create a group.</p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isSelected = selectedGroupId === group.id;
            const latest = getLatestAnnouncement(group.id, group.name);

            return (
              <div
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors relative ${
                  isSelected ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'
                }`}
              >
                {/* Avatar with WhatsApp styling */}
                <div
                  className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center font-bold text-sm shadow-2xs ${getAvatarColor(
                    group.name
                  )}`}
                >
                  {group.name.substring(0, 2).toUpperCase()}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-sm font-semibold text-[#111b21] truncate">{group.name}</h3>
                    <span className="text-[11px] text-[#8696a0] shrink-0">
                      {latest?.sentAt
                        ? new Date(latest.sentAt).toLocaleDateString([], { month: 'numeric', day: 'numeric' })
                        : `${group.memberCount} members`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-[#667781] truncate">
                      {latest && (
                        <WhatsAppTicks
                          status={
                            latest.failureCount > 0
                              ? 'partial_failure'
                              : latest.status === 'sent'
                              ? 'delivered'
                              : latest.status
                          }
                          size={15}
                        />
                      )}
                      <span className="truncate">
                        {latest ? latest.subject || latest.title : group.description || 'Tap to compose broadcast'}
                      </span>
                    </div>

                    {/* Member Count Pill in WhatsApp green */}
                    <span className="shrink-0 text-[10px] font-bold text-[#008069] bg-[#e7fce3] px-1.5 py-0.5 rounded-full border border-[#d9fdd3]">
                      {group.memberCount}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Service Status Footer */}
      <div className="px-4 py-2.5 bg-[#f0f2f5] border-t border-[#e9edef] flex items-center justify-between text-xs text-[#54656f]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#25d366]" />
          <span className="text-[11px] font-medium text-[#111b21]">
            {settings?.emailProvider?.mode === 'resend'
              ? 'Resend API Active'
              : settings?.emailProvider?.mode === 'smtp'
              ? 'SMTP Server Active'
              : 'Ethereal Sandbox Mode'}
          </span>
        </div>
        <button
          onClick={onOpenSettings}
          className="text-[11px] font-bold text-[#008069] hover:underline"
        >
          Settings
        </button>
      </div>
    </div>
  );
};
