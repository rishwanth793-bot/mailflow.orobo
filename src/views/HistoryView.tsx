import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  X,
  Mail,
  Zap,
} from 'lucide-react';
import { api } from '../api/client';
import type { Announcement, AnnouncementDetail, Group } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

interface HistoryViewProps {
  onNotify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  selectedAnnouncementId?: string | null;
  onClearSelectedAnnouncement?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  onNotify,
  selectedAnnouncementId,
  onClearSelectedAnnouncement,
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');

  // Detail Modal
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const [annData, groupsData] = await Promise.all([
        api.getAnnouncements({
          search: search.trim() || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          groupId: groupFilter !== 'all' ? groupFilter : undefined,
        }),
        api.getGroups(),
      ]);
      setAnnouncements(annData);
      setGroups(groupsData);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to fetch announcement history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [statusFilter, groupFilter]);

  // Handle direct open from another screen
  useEffect(() => {
    if (selectedAnnouncementId) {
      openDetail(selectedAnnouncementId);
    }
  }, [selectedAnnouncementId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAnnouncements();
  };

  const openDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      const detail = await api.getAnnouncement(id);
      setSelectedAnnouncement(detail);
    } catch (err: any) {
      onNotify('error', 'Failed to fetch announcement details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!selectedAnnouncement) return;
    try {
      setRetrying(true);
      const res = await api.retryAnnouncement(selectedAnnouncement.id);
      onNotify('success', res.message, 'Retry Execution Finished');
      // Refresh details
      const refreshed = await api.getAnnouncement(selectedAnnouncement.id);
      setSelectedAnnouncement(refreshed);
      // Refresh list
      await fetchAnnouncements();
    } catch (err: any) {
      onNotify('error', err.message || 'Retry operation failed.');
    } finally {
      setRetrying(false);
    }
  };

  const handleExportCsv = () => {
    window.location.href = '/api/announcements/export/csv';
    onNotify('info', 'Downloading CSV export file...');
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
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, subject, or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 bg-white rounded-xl border border-stone-200 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Statuses</option>
            <option value="sent">Delivered</option>
            <option value="partial_failure">Partial Delivery</option>
            <option value="failed">Failed</option>
            <option value="draft">Draft</option>
          </select>

          {/* Group Filter */}
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="py-2 px-3 bg-white rounded-xl border border-stone-200 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-50 rounded-xl border border-stone-200 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Announcements Table Card */}
      <div className="rounded-2xl bg-white border border-stone-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-stone-400">
            <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
            <span>Loading announcement history...</span>
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center bg-white">
            <History className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-stone-800">No announcements found</h4>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {search || statusFilter !== 'all' || groupFilter !== 'all'
                ? 'No transmissions matched your filter criteria.'
                : 'Dispatched announcements and recipient delivery records will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/70 border-b border-stone-150 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Announcement</th>
                  <th className="px-5 py-3.5">Target Group</th>
                  <th className="px-5 py-3.5">Recipients</th>
                  <th className="px-5 py-3.5">Delivery Status</th>
                  <th className="px-5 py-3.5">Sent Timestamp</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {announcements.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => openDetail(item.id)}
                    className="hover:bg-stone-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-stone-900 group-hover:text-indigo-600 transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-stone-400 truncate max-w-sm mt-0.5">
                        {item.subject}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="font-medium text-stone-800">{item.groupName}</span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-800">{item.recipientCount}</span>
                        {item.failureCount > 0 ? (
                          <span className="text-[11px] text-rose-500 font-medium">
                            ({item.successCount} delivered, {item.failureCount} failed)
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-600">
                            ({item.successCount} delivered)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Badge variant={statusVariant(item.status)} size="sm">
                        {statusLabel(item.status)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-stone-400 text-[11px]">
                      {item.sentAt
                        ? new Date(item.sentAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Not sent'}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button className="text-stone-400 group-hover:text-indigo-600 p-1 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <Modal
          isOpen={Boolean(selectedAnnouncement)}
          onClose={() => {
            setSelectedAnnouncement(null);
            onClearSelectedAnnouncement?.();
          }}
          title={selectedAnnouncement.title}
          subtitle={`Dispatched to ${selectedAnnouncement.groupName} · ${selectedAnnouncement.recipientCount} Recipients`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Top Stat Summary Cards */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200 text-center">
              <div>
                <span className="text-[11px] text-stone-400 uppercase font-semibold">Intended</span>
                <p className="text-lg font-bold text-stone-900 mt-0.5">
                  {selectedAnnouncement.recipientCount}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-emerald-600 uppercase font-semibold">Delivered</span>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">
                  {selectedAnnouncement.successCount}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-rose-500 uppercase font-semibold">Failed</span>
                <p className="text-lg font-bold text-rose-600 mt-0.5">
                  {selectedAnnouncement.failureCount}
                </p>
              </div>
            </div>

            {/* Email Metadata */}
            <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-2 text-xs">
              <div>
                <span className="font-semibold text-stone-800">Email Subject:</span>{' '}
                <span className="text-stone-700">{selectedAnnouncement.subject}</span>
              </div>
              <div>
                <span className="font-semibold text-stone-800">Sent At:</span>{' '}
                <span className="text-stone-600 font-mono text-[11px]">
                  {selectedAnnouncement.sentAt
                    ? new Date(selectedAnnouncement.sentAt).toLocaleString()
                    : 'Draft'}
                </span>
              </div>
            </div>

            {/* Recipient-level Results Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-stone-800">
                  Recipient Inboxes ({selectedAnnouncement.recipients.length})
                </h4>

                {/* Safe Retry Failed Button */}
                {selectedAnnouncement.failureCount > 0 && (
                  <button
                    onClick={handleRetryFailed}
                    disabled={retrying}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
                    <span>{retrying ? 'Retrying...' : `Retry Failed (${selectedAnnouncement.failureCount})`}</span>
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto rounded-xl border border-stone-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-150 text-[11px] font-semibold text-stone-500 uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5">Recipient</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Preview / Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {selectedAnnouncement.recipients.map((rec) => (
                      <tr key={rec.id} className="hover:bg-stone-50/50">
                        <td className="px-4 py-2.5 font-medium text-stone-900">{rec.name}</td>
                        <td className="px-4 py-2.5 text-stone-500 font-mono text-[11px]">{rec.email}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <Badge variant={statusVariant(rec.status)} size="sm">
                            {statusLabel(rec.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          {rec.previewUrl ? (
                            <a
                              href={rec.previewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              <span>View Email</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : rec.errorMessage ? (
                            <span className="text-[11px] text-rose-500 truncate max-w-xs block" title={rec.errorMessage}>
                              {rec.errorMessage}
                            </span>
                          ) : (
                            <span className="text-[11px] text-stone-400 font-mono">
                              {rec.providerMessageId ? rec.providerMessageId.substring(0, 16) + '...' : 'Delivered'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Announcement Message Content */}
            <div>
              <h4 className="text-xs font-semibold text-stone-800 mb-2">Message Body Preview</h4>
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-mono">
                {selectedAnnouncement.content}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-150">
              <button
                type="button"
                onClick={() => {
                  setSelectedAnnouncement(null);
                  onClearSelectedAnnouncement?.();
                }}
                className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
