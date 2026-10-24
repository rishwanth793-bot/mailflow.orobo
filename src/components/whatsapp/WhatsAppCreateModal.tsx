import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { FolderTree, UserPlus, Users } from 'lucide-react';
import type { Group } from '../../types';
import { api } from '../../api/client';

interface WhatsAppCreateModalProps {
  type: 'group' | 'member' | null;
  groups: Group[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const WhatsAppCreateModal: React.FC<WhatsAppCreateModalProps> = ({
  type,
  groups,
  onClose,
  onRefresh,
  onNotify,
}) => {
  // Group fields
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');

  // Member fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Member');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);

  if (!type) return null;

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      onNotify('error', 'Group name is required.');
      return;
    }
    try {
      setLoading(true);
      await api.createGroup({ name: groupName.trim(), description: groupDesc.trim() });
      onNotify('success', `Group "${groupName}" created.`);
      setGroupName('');
      setGroupDesc('');
      onClose();
      await onRefresh();
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to create group.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      onNotify('error', 'Full name and email are required.');
      return;
    }
    try {
      setLoading(true);
      await api.createMember({
        fullName: fullName.trim(),
        email: email.trim(),
        role: role.trim() || 'Member',
        groupIds: selectedGroupIds,
      });
      onNotify('success', `Member "${fullName}" enrolled.`);
      setFullName('');
      setEmail('');
      setRole('Member');
      setSelectedGroupIds([]);
      onClose();
      await onRefresh();
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to add member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(type)}
      onClose={onClose}
      title={type === 'group' ? 'Create Community Group' : 'Add Community Participant'}
      subtitle={
        type === 'group'
          ? 'Configure a new broadcast group circle'
          : 'Enrol a new contact into community groups'
      }
      maxWidth="sm"
    >
      {type === 'group' ? (
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#111b21] mb-1">
              Group Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Core Guild, Mentors"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#f0f2f5] rounded-xl border-0 text-[#111b21] focus:ring-1 focus:ring-[#00a884]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111b21] mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Brief description of this community group..."
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#f0f2f5] rounded-xl border-0 text-[#111b21] focus:ring-1 focus:ring-[#00a884]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-[#54656f] hover:text-[#111b21]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-xl text-xs font-semibold disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleCreateMember} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#111b21] mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Marcus Vance"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#f0f2f5] rounded-xl border-0 text-[#111b21] focus:ring-1 focus:ring-[#00a884]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111b21] mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="marcus@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#f0f2f5] rounded-xl border-0 text-[#111b21] focus:ring-1 focus:ring-[#00a884]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111b21] mb-1">
              Community Role
            </label>
            <input
              type="text"
              placeholder="e.g. Staff Engineer, Contributor"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#f0f2f5] rounded-xl border-0 text-[#111b21] focus:ring-1 focus:ring-[#00a884]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111b21] mb-1">
              Assign to Groups
            </label>
            <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-[#f0f2f5] rounded-xl">
              {groups.map((g) => {
                const checked = selectedGroupIds.includes(g.id);
                return (
                  <label
                    key={g.id}
                    className="flex items-center justify-between p-1.5 text-xs rounded hover:bg-white cursor-pointer"
                  >
                    <span>{g.name}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedGroupIds([...selectedGroupIds, g.id]);
                        } else {
                          setSelectedGroupIds(selectedGroupIds.filter((id) => id !== g.id));
                        }
                      }}
                      className="rounded text-[#00a884] focus:ring-[#00a884]"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-[#54656f] hover:text-[#111b21]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-xl text-xs font-semibold disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Participant'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
