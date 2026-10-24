import React, { useEffect, useState } from 'react';
import {
  Users,
  FolderTree,
  Send,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Plus,
  Sparkles,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api/client';
import type { DashboardStats, ViewType } from '../types';
import { Badge } from '../components/common/Badge';

interface OverviewViewProps {
  onNavigate: (view: ViewType) => void;
  onOpenCreateGroup: () => void;
  onOpenCreateMember: () => void;
  onSelectAnnouncement: (id: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigate,
  onOpenCreateGroup,
  onOpenCreateMember,
  onSelectAnnouncement,
  onNotify,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getStats();
      setStats(data);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSeedData = async () => {
    try {
      setSeeding(true);
      const res = await api.seedData();
      onNotify('success', res.message, 'Database Seeded');
      await fetchStats();
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to seed sample data.');
    } finally {
      setSeeding(false);
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'success';
      case 'partial_failure':
      case 'sending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Delivered';
      case 'partial_failure':
        return 'Partial Delivery';
      case 'sending':
        return 'Sending';
      case 'failed':
        return 'Failed';
      case 'draft':
        return 'Draft';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-900 via-stone-900 to-indigo-950 p-6 sm:p-8 text-white shadow-sm">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
            <Sparkles className="w-3 h-3 text-indigo-300" /> Community Automation
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Community communications, simplified.
          </h2>
          <p className="text-sm text-stone-300 leading-relaxed mb-6">
            Manage your groups and send important announcements from one place with automatic personalization, delivery tracking, and AI writing assistance.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('composer')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white text-xs font-semibold tracking-tight transition-colors shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>Compose announcement</span>
            </button>
            <button
              onClick={() => onNavigate('groups_members')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold tracking-tight transition-colors border border-white/10"
            >
              <Users className="w-4 h-4 text-stone-300" />
              <span>View community directory</span>
            </button>
          </div>
        </div>

        {/* Decorative subtle background grid overlay */}
        <div className="absolute -right-10 -bottom-10 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* 4 Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Groups */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs hover:border-stone-300 transition-colors">
          <div className="flex items-center justify-between text-stone-500 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-400">Total Groups</span>
            <div className="p-2 rounded-xl bg-stone-50 text-stone-600 border border-stone-150">
              <FolderTree className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-stone-900">
            {loading ? <span className="animate-pulse">--</span> : stats?.totalGroups ?? 0}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Configured recipient circles</p>
        </div>

        {/* Total Members */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs hover:border-stone-300 transition-colors">
          <div className="flex items-center justify-between text-stone-500 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-400">Total Members</span>
            <div className="p-2 rounded-xl bg-stone-50 text-stone-600 border border-stone-150">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-stone-900">
            {loading ? <span className="animate-pulse">--</span> : stats?.totalMembers ?? 0}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Enrolled directory profiles</p>
        </div>

        {/* Announcements Sent */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs hover:border-stone-300 transition-colors">
          <div className="flex items-center justify-between text-stone-500 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-400">Announcements Sent</span>
            <div className="p-2 rounded-xl bg-stone-50 text-stone-600 border border-stone-150">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-stone-900">
            {loading ? <span className="animate-pulse">--</span> : stats?.announcementsSent ?? 0}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Dispatched community broadcasts</p>
        </div>

        {/* Successful Deliveries */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs hover:border-stone-300 transition-colors">
          <div className="flex items-center justify-between text-stone-500 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-400">Successful Deliveries</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-150">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-stone-900 flex items-baseline gap-2">
            <span>{loading ? <span className="animate-pulse">--</span> : stats?.successfulDeliveries ?? 0}</span>
            {stats && stats.failedDeliveries > 0 && (
              <span className="text-xs font-medium text-rose-500">
                ({stats.failedDeliveries} failed)
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Verified recipient inboxes</p>
        </div>
      </div>

      {/* Quick Actions & Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Announcements Activity */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4.5 border-b border-stone-150 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-stone-900">Recent Announcements</h3>
              <p className="text-xs text-stone-500">Latest community transmissions and delivery results</p>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
            >
              <span>View full history</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-stone-400 space-y-3">
              <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto" />
              <p>Loading activity logs...</p>
            </div>
          ) : !stats?.recentAnnouncements || stats.recentAnnouncements.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <Send className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-stone-800">No announcements sent yet</h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Select a group and compose your first announcement to reach your community members.
              </p>
              <button
                onClick={() => onNavigate('composer')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Announcement</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {stats.recentAnnouncements.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectAnnouncement(item.id)}
                  className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-stone-50/80 transition-colors cursor-pointer group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-stone-900 group-hover:text-indigo-600 transition-colors truncate">
                        {item.title}
                      </span>
                      <span className="text-xs text-stone-300">·</span>
                      <span className="text-[11px] font-medium text-stone-500 truncate">
                        {item.groupName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-stone-400">
                      <span>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span>·</span>
                      <span>{item.recipientCount} recipients</span>
                      {item.failureCount > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-rose-500 font-medium">{item.failureCount} failed</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={statusVariant(item.status)} size="sm">
                      {statusLabel(item.status)}
                    </Badge>
                    <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Quick Actions & Demonstration Helper */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="rounded-2xl bg-white border border-stone-200/80 shadow-xs p-6">
            <h3 className="text-sm font-semibold tracking-tight text-stone-900 mb-1">Quick Actions</h3>
            <p className="text-xs text-stone-500 mb-4">Fast shortcuts for administrative tasks</p>

            <div className="space-y-2">
              <button
                onClick={onOpenCreateGroup}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-stone-200/80 hover:border-indigo-200 hover:bg-indigo-50/30 text-stone-800 transition-colors text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-stone-100 group-hover:bg-indigo-100 text-stone-600 group-hover:text-indigo-700 transition-colors">
                    <FolderTree className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Create Group</div>
                    <div className="text-[11px] text-stone-500">Define a new community circle</div>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-stone-400 group-hover:text-indigo-600" />
              </button>

              <button
                onClick={onOpenCreateMember}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-stone-200/80 hover:border-indigo-200 hover:bg-indigo-50/30 text-stone-800 transition-colors text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-stone-100 group-hover:bg-indigo-100 text-stone-600 group-hover:text-indigo-700 transition-colors">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Add Member</div>
                    <div className="text-[11px] text-stone-500">Enrol new person into groups</div>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-stone-400 group-hover:text-indigo-600" />
              </button>

              <button
                onClick={() => onNavigate('composer')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-stone-200/80 hover:border-indigo-200 hover:bg-indigo-50/30 text-stone-800 transition-colors text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-stone-100 group-hover:bg-indigo-100 text-stone-600 group-hover:text-indigo-700 transition-colors">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Compose Announcement</div>
                    <div className="text-[11px] text-stone-500">Broadcast with live email preview</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-indigo-600" />
              </button>
            </div>
          </div>

          {/* Seed Demo Data Card */}
          <div className="rounded-2xl bg-stone-50 border border-stone-200 p-5">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-semibold text-stone-900">Demonstration Assistant</h4>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed mb-3">
              Need fresh sample data for testing? Reset or populate realistic groups, active members, and broadcast records.
            </p>
            <button
              onClick={handleSeedData}
              disabled={seeding}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-stone-700 bg-white hover:bg-stone-100 active:bg-stone-200 rounded-xl border border-stone-200/80 transition-colors shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
              <span>{seeding ? 'Populating...' : 'Seed Sample Community Data'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
