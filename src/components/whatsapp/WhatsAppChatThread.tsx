import React, { useState } from 'react';
import {
  Send,
  Sparkles,
  Users,
  Eye,
  ExternalLink,
  Info,
  Clock,
  MoreVertical,
  CheckCheck,
  ChevronDown,
  Paperclip,
  Smile,
  RotateCcw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { Group, Announcement, Member, AppSettings } from '../../types';
import { WhatsAppTicks } from './WhatsAppTicks';
import { api } from '../../api/client';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Modal } from '../common/Modal';

interface WhatsAppChatThreadProps {
  group: Group;
  announcements: Announcement[];
  groupMembers: Member[];
  settings: AppSettings | null;
  onOpenGroupInfo: () => void;
  onRefreshData: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const WhatsAppChatThread: React.FC<WhatsAppChatThreadProps> = ({
  group,
  announcements,
  groupMembers,
  settings,
  onOpenGroupInfo,
  onRefreshData,
  onNotify,
}) => {
  // Composer form state
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Gemini AI Assistant state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);

  // Preview & Confirm
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Retry loading
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Filter announcements for this group
  const groupAnnouncements = announcements.filter(
    (a) => a.groupId === group.id || a.groupName === group.name
  );

  // Subtitle members preview
  const memberNamesPreview = groupMembers.slice(0, 3).map((m) => m.fullName.split(' ')[0]).join(', ');
  const remainingCount = groupMembers.length - 3;
  const subtitle =
    groupMembers.length === 0
      ? '0 participants (click to add)'
      : remainingCount > 0
      ? `${memberNamesPreview}, and ${remainingCount} others`
      : memberNamesPreview;

  // Insert tag helper
  const insertTag = (tag: string) => {
    setContent((prev) => (prev ? prev + ' ' + tag + ' ' : tag + ' '));
  };

  // AI: Generate Subject suggestions
  const handleGenerateSubjects = async () => {
    try {
      setIsAiLoading(true);
      setShowSubjectMenu(true);
      const suggestions = await api.suggestSubjects({
        topic: title || subject || 'Community Announcement',
        content: content || 'Important community announcement and workshop updates.',
        groupName: group.name,
      });
      setSubjectSuggestions(suggestions);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to generate subjects.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // AI: Polish Content
  const handlePolishContent = async (action: 'improve_clarity' | 'fix_grammar' | 'warm_tone' | 'urgent_reminder') => {
    if (!content.trim()) {
      onNotify('info', 'Please write a draft announcement first before enhancing.');
      return;
    }
    try {
      setIsAiLoading(true);
      setAiMenuOpen(false);
      const polished = await api.polishContent({
        content,
        action,
        groupName: group.name,
      });
      setContent(polished);
      onNotify('success', 'Announcement text enhanced with Gemini AI.');
    } catch (err: any) {
      onNotify('error', err.message || 'AI content polishing failed.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Initiate send
  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();

    if (groupMembers.length === 0) {
      onNotify('error', 'Cannot send: This group has 0 participants. Add members in Group Info.');
      return;
    }
    if (!subject.trim()) {
      onNotify('error', 'Please provide an email subject line.');
      setIsExpanded(true);
      return;
    }
    if (!content.trim()) {
      onNotify('error', 'Please enter your announcement message.');
      return;
    }

    setIsConfirmOpen(true);
  };

  // Confirm and send batch
  const handleConfirmSend = async () => {
    try {
      setIsSending(true);
      const autoTitle = title.trim() || subject.trim();

      const draft = await api.createAnnouncement({
        title: autoTitle,
        groupId: group.id,
        subject: subject.trim(),
        content: content.trim(),
      });

      const sendRes = await api.sendAnnouncement(draft.id);

      onNotify(
        'success',
        `Dispatched to ${sendRes.result.successful} member${sendRes.result.successful === 1 ? '' : 's'}.`,
        'Broadcast Delivered'
      );

      // Reset form
      setSubject('');
      setTitle('');
      setContent('');
      setIsExpanded(false);
      setIsConfirmOpen(false);

      await onRefreshData();
    } catch (err: any) {
      onNotify('error', err.message || 'Delivery error.');
    } finally {
      setIsSending(false);
    }
  };

  // Retry failed recipients for an announcement
  const handleRetryFailed = async (announcementId: string) => {
    try {
      setRetryingId(announcementId);
      const res = await api.retryAnnouncement(announcementId);
      onNotify('success', res.message, 'Retry Complete');
      await onRefreshData();
    } catch (err: any) {
      onNotify('error', err.message || 'Retry failed.');
    } finally {
      setRetryingId(null);
    }
  };

  // Preview simulations
  const previewSampleMember = groupMembers[0] || {
    id: 'sample',
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
  };
  const previewFirstName = previewSampleMember.fullName.split(' ')[0] || 'Jane';
  const renderedContent = (content || 'Your announcement body goes here...')
    .replace(/\{\{first_name\}\}/gi, previewFirstName)
    .replace(/\{\{full_name\}\}/gi, previewSampleMember.fullName)
    .replace(/\{\{group_name\}\}/gi, group.name);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#efeae2] relative min-w-0">
      {/* WhatsApp Chat Header */}
      <div className="h-16 px-4 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between shrink-0 select-none z-10 shadow-2xs">
        <div
          onClick={onOpenGroupInfo}
          className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity min-w-0 flex-1"
        >
          <div className="w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
            {group.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#111b21] truncate">{group.name}</h2>
              <span className="text-[10px] font-bold text-[#008069] bg-[#e7fce3] px-1.5 py-0.5 rounded-full border border-[#d9fdd3]">
                GROUP
              </span>
            </div>
            <p className="text-[11px] text-[#667781] truncate">{subtitle}</p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0 text-[#54656f]">
          <button
            onClick={() => {
              if (!content) {
                setContent(
                  'Hi {{first_name}},\n\nHere is an important update for all {{group_name}} members.\n\nPlease check the schedule and let us know your availability.'
                );
                setSubject(`Important Update for ${group.name}`);
              }
              setIsExpanded(true);
            }}
            className="p-2 hover:bg-[#e9edef] text-[#008069] rounded-full transition-colors flex items-center gap-1 text-xs font-semibold"
            title="Compose New Announcement"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">New Broadcast</span>
          </button>

          <button
            onClick={onOpenGroupInfo}
            className="p-2 hover:bg-[#e9edef] rounded-full transition-colors"
            title="Group Information"
          >
            <Users className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* WhatsApp Chat Canvas with Doodle Pattern */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 wa-chat-pattern">
        {/* Security / Community Broadcast Notice Pill */}
        <div className="max-w-md mx-auto my-2 p-2.5 rounded-lg bg-[#ffeecd] border border-[#f5db99] text-[#54656f] text-[11px] text-center shadow-2xs flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#008069] shrink-0" />
          <span>
            Broadcast messages are delivered individually to each member's private email. Contact details remain private.
          </span>
        </div>

        {/* Date Pill */}
        <div className="flex justify-center my-3">
          <span className="px-3 py-1 rounded-md bg-white text-[#54656f] text-[10px] font-semibold uppercase tracking-wider shadow-2xs border border-[#e9edef]">
            COMMUNITY ANNOUNCEMENTS
          </span>
        </div>

        {/* Message Thread List */}
        {groupAnnouncements.length === 0 ? (
          <div className="max-w-md mx-auto my-8 p-6 bg-white/90 backdrop-blur-xs rounded-2xl border border-[#e9edef] text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#e7fce3] text-[#008069] flex items-center justify-center mx-auto mb-3">
              <Send className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#111b21]">No broadcasts yet</h4>
            <p className="text-xs text-[#667781] mt-1 mb-4 leading-relaxed">
              Dispatch your first community announcement to all {groupMembers.length} members using the composer below.
            </p>
            <button
              onClick={() => {
                setSubject(`Welcome to ${group.name}`);
                setContent(
                  'Hello {{first_name}},\n\nWelcome to our official community channel! We are excited to have you with us.\n\nWarm regards,\nThe Team'
                );
                setIsExpanded(true);
              }}
              className="px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-full text-xs font-semibold shadow-xs transition-colors"
            >
              Start First Broadcast
            </button>
          </div>
        ) : (
          groupAnnouncements.map((ann) => (
            <div key={ann.id} className="flex justify-end my-3">
              <div className="max-w-xl w-full sm:w-auto sm:min-w-[320px] rounded-2xl p-4 wa-bubble-out border border-[#d9fdd3] text-[#111b21] shadow-xs">
                {/* Announcement Header */}
                <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#008069]/10 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#008069] bg-white px-2 py-0.5 rounded-md border border-[#008069]/20">
                      📢 Broadcast
                    </span>
                    <span className="text-xs font-bold text-[#111b21] truncate max-w-[200px]">
                      {ann.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-[#667781]">
                    <Clock className="w-3 h-3" />
                    <span>
                      {ann.sentAt
                        ? new Date(ann.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Draft'}
                    </span>
                  </div>
                </div>

                {/* Email Subject */}
                <div className="text-xs font-semibold text-[#111b21] mb-2">
                  <span className="text-[#667781] font-normal">Subject: </span>
                  {ann.subject}
                </div>

                {/* Message Content */}
                <div className="text-xs text-[#111b21] whitespace-pre-wrap leading-relaxed font-sans mb-3 bg-white/40 p-2.5 rounded-xl border border-black/5">
                  {ann.content}
                </div>

                {/* Recipient Delivery Status Bar */}
                <div className="p-2 rounded-lg bg-white/70 border border-[#e9edef] flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <WhatsAppTicks
                      status={
                        ann.failureCount > 0
                          ? 'partial_failure'
                          : ann.status === 'sent'
                          ? 'delivered'
                          : ann.status
                      }
                      size={16}
                    />
                    <span className="font-medium text-[#111b21]">
                      {ann.successCount}/{ann.recipientCount} delivered
                    </span>
                    {ann.failureCount > 0 && (
                      <span className="text-rose-600 font-semibold">
                        ({ann.failureCount} failed)
                      </span>
                    )}
                  </div>

                  {ann.failureCount > 0 && (
                    <button
                      onClick={() => handleRetryFailed(ann.id)}
                      disabled={retryingId === ann.id}
                      className="px-2 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className={`w-3 h-3 ${retryingId === ann.id ? 'animate-spin' : ''}`} />
                      <span>{retryingId === ann.id ? 'Retrying...' : 'Retry Failed'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* WhatsApp Composer Bar at Bottom */}
      <div className="p-3 bg-[#f0f2f5] border-t border-[#e9edef] shrink-0">
        <form onSubmit={handleInitiateSend} className="max-w-4xl mx-auto space-y-2">
          {/* Expandable Parameters Drawer (Subject, Title, Tags, Gemini) */}
          {isExpanded && (
            <div className="p-3 bg-white rounded-xl border border-[#e9edef] shadow-xs space-y-2.5 animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#111b21] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#00a884]" />
                  <span>Announcement Headers</span>
                </span>

                {/* Gemini AI Subject Ideas */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleGenerateSubjects}
                    disabled={isAiLoading}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-[#008069] bg-[#e7fce3] hover:bg-[#d9fdd3] rounded-lg border border-[#00a884]/30 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#00a884]" />
                    <span>{isAiLoading ? 'Thinking...' : 'AI Subject Ideas'}</span>
                  </button>

                  {showSubjectMenu && subjectSuggestions.length > 0 && (
                    <div className="absolute right-0 bottom-full mb-2 w-72 bg-white rounded-xl shadow-xl border border-[#e9edef] p-2 z-30 animate-in zoom-in-95">
                      <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#667781] border-b border-[#e9edef] mb-1">
                        <span>Gemini Suggestions</span>
                        <button
                          type="button"
                          onClick={() => setShowSubjectMenu(false)}
                          className="text-[#667781] hover:text-[#111b21]"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="space-y-1">
                        {subjectSuggestions.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSubject(item);
                              setShowSubjectMenu(false);
                            }}
                            className="w-full text-left p-1.5 text-xs rounded-lg hover:bg-[#e7fce3] text-[#111b21] transition-colors"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Email Subject Line *"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#f0f2f5] rounded-lg border-0 text-[#111b21] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                />
                <input
                  type="text"
                  placeholder="Internal Title (Optional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#f0f2f5] rounded-lg border-0 text-[#111b21] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                />
              </div>

              {/* Tag inserters & Gemini Polish */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#f0f2f5]">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[#667781] font-medium mr-1">Insert Tags:</span>
                  <button
                    type="button"
                    onClick={() => insertTag('{{first_name}}')}
                    className="px-2 py-0.5 text-[10px] font-mono bg-[#f0f2f5] hover:bg-[#e7fce3] text-[#111b21] rounded-md transition-colors"
                  >
                    {'{{first_name}}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag('{{group_name}}')}
                    className="px-2 py-0.5 text-[10px] font-mono bg-[#f0f2f5] hover:bg-[#e7fce3] text-[#111b21] rounded-md transition-colors"
                  >
                    {'{{group_name}}'}
                  </button>
                </div>

                {/* Gemini Polish Popover */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAiMenuOpen(!aiMenuOpen)}
                    disabled={isAiLoading || !content}
                    className="text-[11px] font-semibold text-[#008069] hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Enhance Tone</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {aiMenuOpen && (
                    <div className="absolute right-0 bottom-full mb-2 w-52 bg-white rounded-xl shadow-xl border border-[#e9edef] p-1.5 z-30 animate-in zoom-in-95">
                      <button
                        type="button"
                        onClick={() => handlePolishContent('improve_clarity')}
                        className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-[#e7fce3] text-[#111b21]"
                      >
                        Improve Clarity & Structure
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePolishContent('fix_grammar')}
                        className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-[#e7fce3] text-[#111b21]"
                      >
                        Fix Grammar & Typos
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePolishContent('warm_tone')}
                        className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-[#e7fce3] text-[#111b21]"
                      >
                        Warm Community Tone
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePolishContent('urgent_reminder')}
                        className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-[#e7fce3] text-[#111b21]"
                      >
                        Urgent / Action Reminder
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Primary WhatsApp Message Input Bar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={`p-2.5 rounded-full transition-colors ${
                isExpanded ? 'bg-[#00a884] text-white' : 'text-[#54656f] hover:bg-[#e9edef]'
              }`}
              title="Headers & Subject settings"
            >
              <Zap className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="p-2.5 text-[#54656f] hover:bg-[#e9edef] rounded-full transition-colors"
              title="Preview Email Output"
            >
              <Eye className="w-5 h-5" />
            </button>

            {/* Main Text Input Box */}
            <div className="flex-1 min-w-0">
              <textarea
                rows={isExpanded ? 3 : 1}
                placeholder={
                  subject ? `Type announcement for "${subject}"...` : 'Type announcement message (click ⚡ for subject)...'
                }
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => {
                  if (!subject) setIsExpanded(true);
                }}
                className="w-full py-2.5 px-4 bg-white rounded-lg border-0 text-sm text-[#111b21] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884] resize-none leading-relaxed"
              />
            </div>

            {/* Circular WhatsApp Green Send Button */}
            <button
              type="submit"
              disabled={isSending || groupMembers.length === 0}
              className="w-11 h-11 rounded-full bg-[#00a884] hover:bg-[#008f6f] active:bg-[#007458] text-white flex items-center justify-center shrink-0 shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
              title={`Broadcast to all ${groupMembers.length} participants`}
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Email Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Email Delivery Simulation"
        subtitle={`Simulating recipient email for: ${previewSampleMember.fullName} (${previewSampleMember.email})`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#111b21]">Device Preview:</span>
            <div className="flex items-center p-0.5 bg-[#f0f2f5] rounded-lg text-xs">
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`px-3 py-1 rounded-md text-xs font-semibold ${
                  previewDevice === 'desktop' ? 'bg-white text-[#111b21] shadow-2xs' : 'text-[#667781]'
                }`}
              >
                Desktop
              </button>
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`px-3 py-1 rounded-md text-xs font-semibold ${
                  previewDevice === 'mobile' ? 'bg-white text-[#111b21] shadow-2xs' : 'text-[#667781]'
                }`}
              >
                Mobile
              </button>
            </div>
          </div>

          <div className="bg-[#f0f2f5] p-4 sm:p-6 rounded-2xl flex justify-center">
            <div
              className={`bg-white rounded-xl border border-[#e9edef] shadow-sm overflow-hidden ${
                previewDevice === 'desktop' ? 'w-full max-w-lg' : 'w-full max-w-sm'
              }`}
            >
              <div className="p-4 bg-white border-b border-[#f0f2f5] text-xs space-y-1">
                <div>
                  <strong>From:</strong> {settings?.senderName || 'MailFlow Announcements'} &lt;
                  {settings?.senderEmail || 'announcements@mailflow.app'}&gt;
                </div>
                <div>
                  <strong>To:</strong> {previewSampleMember.fullName} &lt;{previewSampleMember.email}&gt;
                </div>
                <div className="font-bold text-[#111b21] pt-1 text-sm">
                  <strong>Subject:</strong> {subject || 'Community Announcement'}
                </div>
              </div>
              <div className="p-6 text-xs text-[#111b21] whitespace-pre-wrap leading-relaxed font-sans min-h-[140px]">
                {renderedContent}
              </div>
              <div className="p-4 bg-[#f0f2f5] border-t border-[#e9edef] text-[11px] text-[#8696a0]">
                Sent via MailFlow Community Email Automation to <strong>{group.name}</strong>.
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setShowPreviewModal(false)}
              className="px-4 py-2 bg-[#00a884] text-white rounded-xl text-xs font-semibold hover:bg-[#008f6f]"
            >
              Done Previewing
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSend}
        title="Broadcast Announcement"
        message={`Send "${subject}" to all ${groupMembers.length} participants in ${group.name}? Personalized individual emails will be dispatched immediately.`}
        confirmLabel={`Broadcast to ${groupMembers.length} Members`}
        isLoading={isSending}
      />
    </div>
  );
};
