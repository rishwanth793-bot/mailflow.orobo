import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Users,
  Search,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  UserPlus,
  Mail,
  Shield,
  Calendar,
  X,
  Check,
  UserMinus,
  Filter,
} from 'lucide-react';
import { api } from '../api/client';
import type { Group, Member } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

interface GroupsMembersViewProps {
  onNotify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  createGroupModalOpen?: boolean;
  createMemberModalOpen?: boolean;
  onCloseCreateGroupModal?: () => void;
  onCloseCreateMemberModal?: () => void;
}

export const GroupsMembersView: React.FC<GroupsMembersViewProps> = ({
  onNotify,
  createGroupModalOpen = false,
  createMemberModalOpen = false,
  onCloseCreateGroupModal,
  onCloseCreateMemberModal,
}) => {
  const [activeTab, setActiveTab] = useState<'groups' | 'members'>('groups');
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [groupSearch, setGroupSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');

  // Modals state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(createGroupModalOpen);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupFormData, setGroupFormData] = useState({ name: '', description: '' });

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(createMemberModalOpen);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberFormData, setMemberFormData] = useState({
    fullName: '',
    email: '',
    role: 'Member',
    groupIds: [] as string[],
  });

  // Group Details Drawer
  const [viewingGroup, setViewingGroup] = useState<Group | null>(null);
  const [addMemberToGroupSelect, setAddMemberToGroupSelect] = useState('');

  // Delete Confirmations
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Sync external open flags
  useEffect(() => {
    if (createGroupModalOpen) {
      setEditingGroup(null);
      setGroupFormData({ name: '', description: '' });
      setIsGroupModalOpen(true);
    }
  }, [createGroupModalOpen]);

  useEffect(() => {
    if (createMemberModalOpen) {
      setEditingMember(null);
      setMemberFormData({ fullName: '', email: '', role: 'Member', groupIds: [] });
      setIsMemberModalOpen(true);
    }
  }, [createMemberModalOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsData, membersData] = await Promise.all([
        api.getGroups(),
        api.getMembers(),
      ]);
      setGroups(groupsData);
      setMembers(membersData);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to load community data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Groups
  const filteredGroups = groups.filter((g) => {
    const query = groupSearch.toLowerCase();
    return g.name.toLowerCase().includes(query) || (g.description || '').toLowerCase().includes(query);
  });

  // Filtered Members
  const filteredMembers = members.filter((m) => {
    const query = memberSearch.toLowerCase();
    const matchesSearch =
      m.fullName.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query) ||
      (m.role || '').toLowerCase().includes(query);

    const matchesGroup =
      selectedGroupFilter === 'all' ||
      m.groups.some((g) => g.id === selectedGroupFilter);

    return matchesSearch && matchesGroup;
  });

  // Group Form Handlers
  const handleOpenCreateGroup = () => {
    setEditingGroup(null);
    setGroupFormData({ name: '', description: '' });
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroup = (group: Group) => {
    setEditingGroup(group);
    setGroupFormData({ name: group.name, description: group.description || '' });
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormData.name.trim()) {
      onNotify('error', 'Group name cannot be blank.');
      return;
    }

    try {
      setActionLoading(true);
      if (editingGroup) {
        await api.updateGroup(editingGroup.id, groupFormData);
        onNotify('success', `Group "${groupFormData.name}" updated successfully.`);
      } else {
        await api.createGroup(groupFormData);
        onNotify('success', `Group "${groupFormData.name}" created successfully.`);
      }
      setIsGroupModalOpen(false);
      onCloseCreateGroupModal?.();
      await loadData();
      if (viewingGroup && editingGroup && viewingGroup.id === editingGroup.id) {
        const refreshed = await api.getGroup(viewingGroup.id);
        setViewingGroup(refreshed);
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Error saving group.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;
    try {
      setActionLoading(true);
      await api.deleteGroup(deletingGroup.id);
      onNotify('success', `Group "${deletingGroup.name}" deleted successfully.`);
      setDeletingGroup(null);
      if (viewingGroup?.id === deletingGroup.id) {
        setViewingGroup(null);
      }
      await loadData();
    } catch (err: any) {
      onNotify('error', err.message || 'Error deleting group.');
    } finally {
      setActionLoading(false);
    }
  };

  // Member Form Handlers
  const handleOpenCreateMember = () => {
    setEditingMember(null);
    setMemberFormData({ fullName: '', email: '', role: 'Member', groupIds: [] });
    setIsMemberModalOpen(true);
  };

  const handleOpenEditMember = (member: Member) => {
    setEditingMember(member);
    setMemberFormData({
      fullName: member.fullName,
      email: member.email,
      role: member.role || 'Member',
      groupIds: member.groups.map((g) => g.id),
    });
    setIsMemberModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberFormData.fullName.trim()) {
      onNotify('error', 'Full name is required.');
      return;
    }
    if (!memberFormData.email.trim()) {
      onNotify('error', 'Email address is required.');
      return;
    }

    try {
      setActionLoading(true);
      if (editingMember) {
        await api.updateMember(editingMember.id, memberFormData);
        onNotify('success', `Member "${memberFormData.fullName}" updated.`);
      } else {
        await api.createMember(memberFormData);
        onNotify('success', `Member "${memberFormData.fullName}" added.`);
      }
      setIsMemberModalOpen(false);
      onCloseCreateMemberModal?.();
      await loadData();
      if (viewingGroup) {
        const refreshed = await api.getGroup(viewingGroup.id);
        setViewingGroup(refreshed);
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Error saving member.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!deletingMember) return;
    try {
      setActionLoading(true);
      await api.deleteMember(deletingMember.id);
      onNotify('success', `Member "${deletingMember.fullName}" deleted.`);
      setDeletingMember(null);
      await loadData();
      if (viewingGroup) {
        const refreshed = await api.getGroup(viewingGroup.id);
        setViewingGroup(refreshed);
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Error deleting member.');
    } finally {
      setActionLoading(false);
    }
  };

  // Group Details & Enrollment
  const handleOpenGroupDetails = async (group: Group) => {
    try {
      const detailed = await api.getGroup(group.id);
      setViewingGroup(detailed);
      setAddMemberToGroupSelect('');
    } catch (err: any) {
      onNotify('error', 'Could not fetch group details.');
    }
  };

  const handleAddMemberToGroup = async () => {
    if (!viewingGroup || !addMemberToGroupSelect) return;
    try {
      await api.addMemberToGroup(viewingGroup.id, addMemberToGroupSelect);
      onNotify('success', 'Member added to group.');
      setAddMemberToGroupSelect('');
      const refreshed = await api.getGroup(viewingGroup.id);
      setViewingGroup(refreshed);
      await loadData();
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to add member to group.');
    }
  };

  const handleRemoveMemberFromGroup = async (memberId: string) => {
    if (!viewingGroup) return;
    try {
      await api.removeMemberFromGroup(viewingGroup.id, memberId);
      onNotify('success', 'Member removed from group.');
      const refreshed = await api.getGroup(viewingGroup.id);
      setViewingGroup(refreshed);
      await loadData();
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to remove member from group.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Tab Switcher & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'groups'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FolderTree className="w-4 h-4 text-indigo-600" />
            <span>Groups ({groups.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'members'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Members Directory ({members.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab === 'groups' ? (
            <button
              onClick={handleOpenCreateGroup}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Group</span>
            </button>
          ) : (
            <button
              onClick={handleOpenCreateMember}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-colors shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GROUPS TAB                                                               */}
      {/* ========================================================================= */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search groups by name or description..."
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-stone-400">
              <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
              <span>Loading groups...</span>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-stone-200">
              <FolderTree className="w-10 h-10 text-stone-300 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-stone-800">No groups found</h4>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                {groupSearch
                  ? `No groups match the filter "${groupSearch}".`
                  : 'Get started by creating your first recipient community group.'}
              </p>
              {!groupSearch && (
                <button
                  onClick={handleOpenCreateGroup}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Group</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className="rounded-2xl bg-white border border-stone-200/80 p-5 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="text-sm font-semibold text-stone-900 tracking-tight leading-snug">
                        {group.name}
                      </h4>
                      <Badge variant="indigo" size="sm">
                        <Users className="w-3 h-3" />
                        <span>{group.memberCount} members</span>
                      </Badge>
                    </div>

                    <p className="text-xs text-stone-500 leading-relaxed line-clamp-2 mb-4">
                      {group.description || 'No description provided for this group.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-stone-400">
                      Created {new Date(group.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenGroupDetails(group)}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        Manage
                      </button>
                      <button
                        onClick={() => handleOpenEditGroup(group)}
                        className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
                        title="Edit Group"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingGroup(group)}
                        className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Delete Group"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MEMBERS TAB                                                               */}
      {/* ========================================================================= */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search members by name, email, or role..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className="w-full sm:w-48 py-2 px-3 bg-white rounded-xl border border-stone-200 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                <option value="all">All Groups ({members.length})</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.memberCount})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-stone-400">
              <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
              <span>Loading members directory...</span>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-stone-200">
              <Users className="w-10 h-10 text-stone-300 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-stone-800">No members found</h4>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                {memberSearch || selectedGroupFilter !== 'all'
                  ? 'No members match the current filter criteria.'
                  : 'Add members to start building your community announcement directory.'}
              </p>
              {!memberSearch && selectedGroupFilter === 'all' && (
                <button
                  onClick={handleOpenCreateMember}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add First Member</span>
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-stone-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50/70 border-b border-stone-150 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Member Name</th>
                      <th className="px-5 py-3.5">Email Address</th>
                      <th className="px-5 py-3.5">Community Role</th>
                      <th className="px-5 py-3.5">Group Memberships</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-stone-900 whitespace-nowrap">
                          {member.fullName}
                        </td>
                        <td className="px-5 py-3.5 text-stone-600 whitespace-nowrap font-mono text-[11px]">
                          {member.email}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 text-stone-700">
                            <Shield className="w-3 h-3 text-stone-400" />
                            {member.role || 'Member'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {member.groups.length > 0 ? (
                              member.groups.map((g) => (
                                <Badge key={g.id} variant="default" size="sm">
                                  {g.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-stone-400 text-[11px] italic">No groups assigned</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditMember(member)}
                              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                              title="Edit Member"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingMember(member)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* GROUP CREATE / EDIT MODAL                                                 */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => {
          setIsGroupModalOpen(false);
          onCloseCreateGroupModal?.();
        }}
        title={editingGroup ? 'Edit Group' : 'Create Community Group'}
        subtitle={
          editingGroup
            ? 'Update group details and broadcast settings'
            : 'Configure a dedicated group circle to target announcements'
        }
      >
        <form onSubmit={handleSaveGroup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Group Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Core Contributors, Workshop Leads"
              value={groupFormData.name}
              onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Description <span className="text-stone-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Brief description of who belongs in this group and the type of messages they receive..."
              value={groupFormData.description}
              onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => {
                setIsGroupModalOpen(false);
                onCloseCreateGroupModal?.();
              }}
              className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {actionLoading ? 'Saving...' : editingGroup ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MEMBER CREATE / EDIT MODAL                                                */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isMemberModalOpen}
        onClose={() => {
          setIsMemberModalOpen(false);
          onCloseCreateMemberModal?.();
        }}
        title={editingMember ? 'Edit Member' : 'Add Community Member'}
        subtitle="Manage member contact information and group memberships"
      >
        <form onSubmit={handleSaveMember} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alex Morgan"
              value={memberFormData.fullName}
              onChange={(e) => setMemberFormData({ ...memberFormData, fullName: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="alex.m@example.com"
              value={memberFormData.email}
              onChange={(e) => setMemberFormData({ ...memberFormData, email: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Role in Community
            </label>
            <input
              type="text"
              placeholder="e.g. Staff Engineer, Workshop Lead, Active Member"
              value={memberFormData.role}
              onChange={(e) => setMemberFormData({ ...memberFormData, role: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Assigned Groups
            </label>
            <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-stone-50 rounded-xl border border-stone-200">
              {groups.length === 0 ? (
                <p className="text-xs text-stone-400 p-2">No groups created yet.</p>
              ) : (
                groups.map((group) => {
                  const isChecked = memberFormData.groupIds.includes(group.id);
                  return (
                    <label
                      key={group.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-white text-xs cursor-pointer select-none transition-colors"
                    >
                      <span className="font-medium text-stone-800">{group.name}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMemberFormData({
                              ...memberFormData,
                              groupIds: [...memberFormData.groupIds, group.id],
                            });
                          } else {
                            setMemberFormData({
                              ...memberFormData,
                              groupIds: memberFormData.groupIds.filter((id) => id !== group.id),
                            });
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => {
                setIsMemberModalOpen(false);
                onCloseCreateMemberModal?.();
              }}
              className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {actionLoading ? 'Saving...' : editingMember ? 'Save Changes' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* GROUP DETAILS & MEMBERSHIP MANAGEMENT DRAWER/MODAL                        */}
      {/* ========================================================================= */}
      {viewingGroup && (
        <Modal
          isOpen={Boolean(viewingGroup)}
          onClose={() => setViewingGroup(null)}
          title={viewingGroup.name}
          subtitle={viewingGroup.description || 'Community Recipient Group'}
          maxWidth="lg"
        >
          <div className="space-y-5">
            {/* Quick stats and Enroll member form */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-xs text-stone-500 font-medium">Enrolled Members:</span>
                <span className="ml-2 text-sm font-bold text-stone-900">
                  {viewingGroup.members?.length || 0}
                </span>
              </div>

              {/* Add existing member to this group */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={addMemberToGroupSelect}
                  onChange={(e) => setAddMemberToGroupSelect(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white rounded-lg border border-stone-200 text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Enroll existing member...</option>
                  {members
                    .filter((m) => !viewingGroup.members?.some((vm) => vm.id === m.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} ({m.email})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!addMemberToGroupSelect}
                  onClick={handleAddMemberToGroup}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-40 shrink-0"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Members in this group table */}
            <div>
              <h5 className="text-xs font-semibold text-stone-700 mb-2">Group Members List</h5>
              {!viewingGroup.members || viewingGroup.members.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-200/80">
                  <p className="text-xs text-stone-400">
                    This group currently has no members. Enroll members from the dropdown above to send announcements to this group.
                  </p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-xl border border-stone-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-150 text-[11px] font-semibold text-stone-500 uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5">Name</th>
                        <th className="px-4 py-2.5">Email</th>
                        <th className="px-4 py-2.5">Role</th>
                        <th className="px-4 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {viewingGroup.members.map((m) => (
                        <tr key={m.id} className="hover:bg-stone-50/60">
                          <td className="px-4 py-2.5 font-medium text-stone-900">{m.fullName}</td>
                          <td className="px-4 py-2.5 text-stone-500 font-mono text-[11px]">{m.email}</td>
                          <td className="px-4 py-2.5 text-stone-600">{m.role}</td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              onClick={() => handleRemoveMemberFromGroup(m.id)}
                              className="text-stone-400 hover:text-rose-600 p-1 rounded transition-colors"
                              title="Remove from group"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingGroup(null)}
                className="px-4 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Group Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deletingGroup)}
        onClose={() => setDeletingGroup(null)}
        onConfirm={handleDeleteGroup}
        title="Delete Community Group"
        message={`Are you sure you want to delete "${deletingGroup?.name}"? ${
          deletingGroup?.memberCount ? `This group currently has ${deletingGroup.memberCount} enrolled members.` : ''
        } This action will remove group memberships but will not delete member accounts.`}
        confirmLabel="Delete Group"
        isDestructive
        isLoading={actionLoading}
      />

      {/* Delete Member Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deletingMember)}
        onClose={() => setDeletingMember(null)}
        onConfirm={handleDeleteMember}
        title="Delete Member Profile"
        message={`Are you sure you want to delete ${deletingMember?.fullName} (${deletingMember?.email})? They will be removed from all group memberships.`}
        confirmLabel="Delete Member"
        isDestructive
        isLoading={actionLoading}
      />
    </div>
  );
};
