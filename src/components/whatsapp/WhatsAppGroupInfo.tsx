import React, { useState } from 'react';
import {
  X,
  Users,
  Calendar,
  UserPlus,
  Trash2,
  Send,
  Shield,
  UserMinus,
  Search,
  MoreVertical,
} from 'lucide-react';
import type { Group, Member } from '../../types';
import { api } from '../../api/client';

interface WhatsAppGroupInfoProps {
  group: Group;
  allMembers: Member[];
  onClose: () => void;
  onComposeToGroup: (group: Group) => void;
  onRefresh: () => Promise<void>;
  onDeleteGroup: (group: Group) => void;
  onNotify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const WhatsAppGroupInfo: React.FC<WhatsAppGroupInfoProps> = ({
  group,
  allMembers,
  onClose,
  onComposeToGroup,
  onRefresh,
  onDeleteGroup,
  onNotify,
}) => {
  const [searchMember, setSearchMember] = useState('');
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState('');
  const [adding, setAdding] = useState(false);

  const groupMembers = group.members || [];

  const filteredMembers = groupMembers.filter(
    (m) =>
      m.fullName.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.email.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.role.toLowerCase().includes(searchMember.toLowerCase())
  );

  const availableToAdd = allMembers.filter(
    (m) => !groupMembers.some((gm) => gm.id === m.id)
  );

  const handleAddMember = async () => {
    if (!selectedMemberToAdd) return;
    try {
      setAdding(true);
      await api.addMemberToGroup(group.id, selectedMemberToAdd);
      onNotify('success', 'Participant added to group.');
      setSelectedMemberToAdd('');
      await onRefresh();
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to add participant.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      await api.removeMemberFromGroup(group.id, memberId);
      onNotify('success', `${memberName} removed from group.`);
      await onRefresh();
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to remove participant.');
    }
  };

  // Generate consistent color for avatar based on name
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

  return (
    <div className="w-full md:w-96 bg-white border-l border-[#e9edef] flex flex-col h-full animate-in slide-in-from-right duration-200 shadow-md">
      {/* Header */}
      <div className="h-16 px-4 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 text-[#54656f] hover:text-[#111b21] hover:bg-stone-200/60 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-base font-semibold text-[#111b21]">Group info</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Group Hero Profile */}
        <div className="p-6 bg-white text-center border-b border-[#e9edef]">
          <div
            className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-3xl font-bold shadow-xs mb-3 ${getAvatarColor(
              group.name
            )}`}
          >
            {group.name.substring(0, 2).toUpperCase()}
          </div>
          <h2 className="text-xl font-bold text-[#111b21] tracking-tight">{group.name}</h2>
          <p className="text-xs text-[#667781] mt-1">
            Group · {groupMembers.length} participant{groupMembers.length === 1 ? '' : 's'}
          </p>

          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => onComposeToGroup(group)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-full text-xs font-semibold shadow-xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast to Group</span>
            </button>
          </div>
        </div>

        {/* Group Description */}
        <div className="p-4 bg-white border-b border-[#e9edef]">
          <span className="text-xs font-semibold text-[#008069] uppercase tracking-wider block mb-1">
            Description
          </span>
          <p className="text-xs text-[#3b4a54] leading-relaxed">
            {group.description || 'No description provided for this group.'}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-[#8696a0] mt-3">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              Created {new Date(group.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Add Participant Section */}
        {availableToAdd.length > 0 && (
          <div className="p-4 bg-[#f0f2f5] border-b border-[#e9edef]">
            <span className="text-xs font-semibold text-[#111b21] block mb-2">
              Add Participants
            </span>
            <div className="flex items-center gap-2">
              <select
                value={selectedMemberToAdd}
                onChange={(e) => setSelectedMemberToAdd(e.target.value)}
                className="flex-1 py-1.5 px-3 bg-white rounded-lg border border-[#e9edef] text-xs text-[#111b21] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
              >
                <option value="">Select community contact...</option>
                {availableToAdd.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.email})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddMember}
                disabled={!selectedMemberToAdd || adding}
                className="px-3 py-1.5 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
              >
                {adding ? '...' : 'Add'}
              </button>
            </div>
          </div>
        )}

        {/* Participants List */}
        <div className="p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#111b21]">
              {groupMembers.length} Participants
            </span>
          </div>

          {/* Search participants */}
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-[#8696a0] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search participants..."
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f0f2f5] rounded-lg border-0 text-[#111b21] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
            />
          </div>

          <div className="space-y-1 divide-y divide-[#f0f2f5]">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="pt-2 pb-2 flex items-center justify-between gap-3 group/mem"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${getAvatarColor(
                      member.fullName
                    )}`}
                  >
                    {member.fullName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#111b21] truncate">
                      {member.fullName}
                    </div>
                    <div className="text-[11px] text-[#667781] truncate font-mono">
                      {member.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#e7fce3] text-[#008069] border border-[#d9fdd3]">
                    {member.role || 'Member'}
                  </span>
                  <button
                    onClick={() => handleRemoveMember(member.id, member.fullName)}
                    className="opacity-0 group-hover/mem:opacity-100 p-1 text-[#8696a0] hover:text-rose-600 rounded transition-opacity"
                    title="Remove from group"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delete Group Option */}
        <div className="p-4 bg-white border-t border-[#e9edef] mt-4">
          <button
            onClick={() => onDeleteGroup(group)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-rose-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Community Group</span>
          </button>
        </div>
      </div>
    </div>
  );
};
