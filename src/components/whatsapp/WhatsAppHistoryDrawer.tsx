import React, { useState } from 'react';
import {
  X,
  History,
  Search,
  Download,
  RotateCcw,
  ExternalLink,
  Clock,
  ChevronRight,
  Filter,
  CheckCheck,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import type { Announcement, AnnouncementDetail } from '../../types';
import { WhatsAppTicks } from './WhatsAppTicks';
import { api } from '../../api/client';
import { Modal } from '../common/Modal';

interface WhatsAppHistoryDrawerProps {
  announcements: Announcement[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const WhatsAppHistoryDrawer: React.FC<WhatsAppHistoryDrawerProps> = ({
  announcements,
  onClose,
  onRefresh,
  onNotify,
}) => {
  const [search, setSearch] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const filtered = announcements.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.subject.toLowerCase().includes(search.toLowerCase()) ||
      a.groupName.toLowerCase().includes(search.toLowerCase())
  );

  const openDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      const detail = await api.getAnnouncement(id);
      setSelectedAnnouncement(detail);
    } catch (err: any) {
      onNotify('error', 'Failed to load announcement details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRetry = async () => {
    if (!selectedAnnouncement) return;
    try {
      setRetrying(true);
      const res = await api.retryAnnouncement(selectedAnnouncement.id);
      onNotify('success', res.message, 'Retry Complete');
      const refreshed = await api.getAnnouncement(selectedAnnouncement.id);
      setSelectedAnnouncement(refreshed);
      await onRefresh();
    } catch (err: any) {
      onNotify('error', err.message || 'Retry failed.');
    } finally {
      setRetrying(false);
    }
  };

  const handleExportCsv = () => {
    window.location.href = '/api/announcements/export/csv';
    onNotify('info', 'Downloading transmission logs CSV...');
  };

  return (
    <div className="w-full md:w-[460px] bg-white border-l border-[#e9edef] flex flex-col h-full animate-in slide-in-from-right duration-200 shadow-md">
      {/* Header */}
      <div className="h-16 px-4 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 text-[#54656f] hover:text-[#111b21] hover:bg-stone-200/60 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-base font-semibold text-[#111b21]">Delivery Logs</h3>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e7fce3] text-[#008069] hover:bg-[#d9fdd3] rounded-full text-xs font-semibold transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-3 bg-white border-b border-[#e9edef]">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8696a0] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search broadcasts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f0f2f5] rounded-lg border-0 text-[#111b21] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
          />
        </div>
      </div>

      {/* Announcement List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#f0f2f5]">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8696a0]">No broadcasts found.</div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => openDetail(item.id)}
              className="p-3.5 hover:bg-[#f5f6f6] cursor-pointer transition-colors flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-[#111b21] truncate">{item.title}</span>
                  <span className="text-[10px] text-[#8696a0] shrink-0">
                    {item.sentAt
                      ? new Date(item.sentAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
                      : 'Draft'}
                  </span>
                </div>
                <div className="text-xs text-[#667781] truncate mb-1">{item.subject}</div>

                <div className="flex items-center gap-2 text-[11px]">
                  <WhatsAppTicks
                    status={
                      item.failureCount > 0
                        ? 'partial_failure'
                        : item.status === 'sent'
                        ? 'delivered'
                        : item.status
                    }
                    size={14}
                  />
                  <span className="text-[#111b21] font-medium">{item.groupName}</span>
                  <span className="text-[#8696a0]">·</span>
                  <span className="text-[#008069] font-semibold">{item.successCount} delivered</span>
                  {item.failureCount > 0 && (
                    <span className="text-rose-600 font-semibold">({item.failureCount} failed)</span>
                  )}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-[#8696a0] shrink-0" />
            </div>
          ))
        )}
      </div>

      {/* Detailed Modal for Selected Announcement */}
      {selectedAnnouncement && (
        <Modal
          isOpen={Boolean(selectedAnnouncement)}
          onClose={() => setSelectedAnnouncement(null)}
          title={selectedAnnouncement.title}
          subtitle={`Sent to ${selectedAnnouncement.groupName} · ${selectedAnnouncement.recipientCount} Recipients`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3 bg-[#f0f2f5] rounded-xl text-xs space-y-1">
              <div>
                <strong>Subject:</strong> {selectedAnnouncement.subject}
              </div>
              <div>
                <strong>Delivered:</strong> {selectedAnnouncement.successCount} /{' '}
                {selectedAnnouncement.recipientCount}
              </div>
            </div>

            {selectedAnnouncement.failureCount > 0 && (
              <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs">
                <span className="text-rose-800 font-semibold">
                  {selectedAnnouncement.failureCount} recipient(s) failed delivery
                </span>
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold flex items-center gap-1"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
                  <span>{retrying ? 'Retrying...' : 'Safe Retry Failed'}</span>
                </button>
              </div>
            )}

            {/* Recipient list */}
            <div>
              <h5 className="text-xs font-bold text-[#111b21] mb-2">Recipient Status Breakdown</h5>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-[#e9edef] divide-y divide-[#f0f2f5]">
                {selectedAnnouncement.recipients.map((rec) => (
                  <div key={rec.id} className="p-2.5 text-xs flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-[#111b21] truncate">{rec.name}</div>
                      <div className="text-[11px] text-[#667781] font-mono truncate">{rec.email}</div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <WhatsAppTicks status={rec.status} size={15} />
                      {rec.previewUrl && (
                        <a
                          href={rec.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-[#008069] font-bold underline flex items-center gap-0.5"
                        >
                          <span>Email</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {rec.errorMessage && (
                        <span className="text-[10px] text-rose-500 max-w-[120px] truncate" title={rec.errorMessage}>
                          {rec.errorMessage}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-4 py-1.5 bg-[#00a884] text-white rounded-lg text-xs font-semibold"
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
