import React, { useState, useEffect } from 'react';
import {
  Send,
  Eye,
  Edit3,
  Sparkles,
  Users,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Bold,
  Italic,
  Quote,
  List,
  Check,
  RefreshCw,
  Mail,
  Zap,
  Info,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api/client';
import type { Group, Member, ViewType, AppSettings } from '../types';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { buildHtmlEmail } from '../../server/email';

interface ComposerViewProps {
  onNavigate: (view: ViewType) => void;
  onSelectAnnouncement: (id: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const ComposerView: React.FC<ComposerViewProps> = ({
  onNavigate,
  onSelectAnnouncement,
  onNotify,
}) => {
  // Form Data
  const [title, setTitle] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState(
    'Hi {{first_name}},\n\nWe wanted to share an important update regarding our community activities this week.\n\n**Key Highlights:**\n- Community workshop on Thursday at 6:00 PM UTC\n- Early testing access opened for Guild members\n- Open office hours for all questions\n\nPlease let us know your thoughts by replying to this thread.\n\nBest regards,\nThe {{group_name}} Team'
  );

  // Groups and settings
  const [groups, setGroups] = useState<Group[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Group members cache
  const [groupMembers, setGroupMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showRecipientList, setShowRecipientList] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');

  // Active Tab: 'edit' or 'preview'
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // AI Assistant states
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSubjectMenuOpen, setAiSubjectMenuOpen] = useState(false);
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [aiToneMenuOpen, setAiToneMenuOpen] = useState(false);

  // Sending workflow & Confirmation
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentResult, setSentResult] = useState<{
    announcementId: string;
    successful: number;
    failed: number;
    previewUrl?: string;
  } | null>(null);

  // Load initial groups and settings
  useEffect(() => {
    const init = async () => {
      try {
        setLoadingInitial(true);
        const [groupsData, settingsData] = await Promise.all([
          api.getGroups(),
          api.getSettings(),
        ]);
        setGroups(groupsData);
        setSettings(settingsData);

        // Preselect first group with members if available
        if (groupsData.length > 0) {
          const firstWithMembers = groupsData.find((g) => g.memberCount > 0) || groupsData[0];
          setSelectedGroupId(firstWithMembers.id);
        }
      } catch (err: any) {
        onNotify('error', 'Failed to load initial configuration.');
      } finally {
        setLoadingInitial(false);
      }
    };
    init();
  }, []);

  // Whenever selectedGroupId changes, fetch members of this group
  useEffect(() => {
    if (!selectedGroupId) {
      setGroupMembers([]);
      return;
    }

    const fetchGroupMembers = async () => {
      try {
        setLoadingMembers(true);
        const detailed = await api.getGroup(selectedGroupId);
        if (detailed && detailed.members) {
          setGroupMembers(
            detailed.members.map((m) => ({
              id: m.id,
              fullName: m.fullName,
              email: m.email,
              role: m.role,
              createdAt: m.joinedAt,
              updatedAt: m.joinedAt,
              groups: [{ id: detailed.id, name: detailed.name }],
            }))
          );
        } else {
          setGroupMembers([]);
        }
      } catch (err) {
        console.error('Failed to load group members:', err);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchGroupMembers();
  }, [selectedGroupId]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const hasZeroRecipients = groupMembers.length === 0;

  // Insert helper tags into textarea
  const insertTag = (tag: string) => {
    setContent((prev) => prev + tag);
  };

  // Text formatting shortcuts
  const wrapSelection = (before: string, after: string = before) => {
    const textarea = document.getElementById('composer-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);

    const replacement = before + (selected || 'text') + after;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selected.length || 4));
    }, 10);
  };

  // AI: Generate Subject suggestions
  const handleGenerateSubjects = async () => {
    try {
      setIsAiLoading(true);
      setAiSubjectMenuOpen(true);
      const suggestions = await api.suggestSubjects({
        topic: title || 'Community Announcement',
        content,
        groupName: selectedGroup?.name || 'Community',
      });
      setSubjectSuggestions(suggestions);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to generate subject suggestions.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // AI: Polish Content
  const handlePolishContent = async (action: 'improve_clarity' | 'fix_grammar' | 'warm_tone' | 'urgent_reminder') => {
    try {
      setIsAiLoading(true);
      setAiToneMenuOpen(false);
      const polished = await api.polishContent({
        content,
        action,
        groupName: selectedGroup?.name || 'Community',
      });
      setContent(polished);
      onNotify('success', 'Announcement text enhanced with Gemini AI.');
    } catch (err: any) {
      onNotify('error', err.message || 'AI content polishing failed.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Pre-send validation
  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      onNotify('error', 'Please provide an internal announcement title.');
      return;
    }
    if (!selectedGroupId) {
      onNotify('error', 'Please select a target community group.');
      return;
    }
    if (hasZeroRecipients) {
      onNotify('error', 'The selected group has 0 members. Please add members first.');
      return;
    }
    if (!subject.trim()) {
      onNotify('error', 'Please provide an email subject line.');
      return;
    }
    if (!content.trim()) {
      onNotify('error', 'Please enter your announcement message content.');
      return;
    }

    setIsConfirmOpen(true);
  };

  // Actual backend send call
  const handleConfirmSend = async () => {
    try {
      setIsSending(true);

      // 1. Create announcement draft record
      const draft = await api.createAnnouncement({
        title: title.trim(),
        groupId: selectedGroupId,
        subject: subject.trim(),
        content: content.trim(),
      });

      // 2. Dispatch the announcement batch
      const sendRes = await api.sendAnnouncement(draft.id);

      setIsConfirmOpen(false);
      const firstPreview = sendRes.result?.recipients?.find((r: any) => r.previewUrl)?.previewUrl;

      setSentResult({
        announcementId: draft.id,
        successful: sendRes.result.successful,
        failed: sendRes.result.failed,
        previewUrl: firstPreview,
      });

      onNotify(
        'success',
        `Dispatched to ${sendRes.result.successful} member${sendRes.result.successful === 1 ? '' : 's'}.`,
        'Announcement Delivered'
      );
    } catch (err: any) {
      onNotify('error', err.message || 'Announcement delivery encountered an error.');
    } finally {
      setIsSending(false);
    }
  };

  // Compute live rendered preview text
  const previewSampleMember = groupMembers[0] || {
    id: 'sample',
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
  };
  const previewFirstName = previewSampleMember.fullName.split(' ')[0] || 'Jane';
  const previewGroupName = selectedGroup?.name || 'Community';
  const renderedContent = content
    .replace(/\{\{first_name\}\}/gi, previewFirstName)
    .replace(/\{\{full_name\}\}/gi, previewSampleMember.fullName)
    .replace(/\{\{group_name\}\}/gi, previewGroupName);

  const renderedSubject = (subject || 'Community Announcement')
    .replace(/\{\{first_name\}\}/gi, previewFirstName)
    .replace(/\{\{group_name\}\}/gi, previewGroupName);

  // Filtered recipients in dropdown
  const filteredRecipients = groupMembers.filter(
    (m) =>
      m.fullName.toLowerCase().includes(recipientSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(recipientSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-150">
      {/* Success banner if just sent */}
      {sentResult && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold">Announcement successfully sent!</h4>
              <p className="text-xs text-emerald-700">
                Delivered to <strong>{sentResult.successful}</strong> recipients
                {sentResult.failed > 0 && ` (${sentResult.failed} failed)`}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sentResult.previewUrl && (
              <a
                href={sentResult.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-800 hover:bg-emerald-100/50 border border-emerald-300 rounded-xl text-xs font-semibold transition-colors"
              >
                <span>View Ethereal Email Preview</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={() => onSelectAnnouncement(sentResult.announcementId)}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
            >
              View in History
            </button>
            <button
              onClick={() => setSentResult(null)}
              className="px-2.5 py-1.5 text-xs text-emerald-700 hover:text-emerald-950 font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Composer Card */}
      <div className="rounded-2xl bg-white border border-stone-200/80 shadow-xs overflow-hidden">
        {/* Top Header / Mode Switcher */}
        <div className="px-6 py-4 border-b border-stone-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50/50">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-stone-900">
              Announcement Composer
            </h3>
            <p className="text-xs text-stone-500">
              Configure parameters, write message with formatting, and preview before dispatch.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-stone-200/60 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'edit'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Write</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'preview'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Email Preview</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Compose Form */}
        {activeTab === 'edit' && (
          <form onSubmit={handleInitiateSend} className="p-6 space-y-6">
            {/* Row 1: Title and Target Group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Internal Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Town Hall Reminder"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <p className="text-[11px] text-stone-400 mt-1">Used for internal tracking and history</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Recipient Group <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="" disabled>Select a community group...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.memberCount} member{g.memberCount === 1 ? '' : 's'})
                    </option>
                  ))}
                </select>

                {/* Recipient Count Indicator */}
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  {hasZeroRecipients ? (
                    <span className="text-rose-500 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Warning: This group has 0 members. Sending will be disabled.
                    </span>
                  ) : (
                    <span className="text-stone-500">
                      Targeting <strong>{groupMembers.length}</strong> recipient{groupMembers.length === 1 ? '' : 's'}
                    </span>
                  )}

                  {groupMembers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowRecipientList(!showRecipientList)}
                      className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-0.5"
                    >
                      <span>{showRecipientList ? 'Hide' : 'View'} recipients</span>
                      {showRecipientList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Collapsible Recipient Summary List */}
            {showRecipientList && groupMembers.length > 0 && (
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-stone-800">
                    Group Recipients ({groupMembers.length})
                  </span>
                  <input
                    type="text"
                    placeholder="Filter recipients..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="px-2.5 py-1 text-[11px] bg-white rounded-lg border border-stone-200 w-44 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {filteredRecipients.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between py-1 px-2 rounded-md bg-white text-xs border border-stone-150"
                    >
                      <span className="font-medium text-stone-800">{rec.fullName}</span>
                      <span className="font-mono text-[11px] text-stone-500">{rec.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Row 2: Email Subject with Gemini Suggestions */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Email Subject <span className="text-rose-500">*</span>
                </label>

                <div className="relative">
                  <button
                    type="button"
                    onClick={handleGenerateSubjects}
                    disabled={isAiLoading}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200/80 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>{isAiLoading ? 'Thinking...' : 'AI Subject Ideas'}</span>
                  </button>

                  {/* Subject Suggestions Dropdown */}
                  {aiSubjectMenuOpen && subjectSuggestions.length > 0 && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-stone-200 p-2 z-20 animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-stone-500 border-b border-stone-100 mb-1">
                        <span>Gemini Suggestions</span>
                        <button
                          type="button"
                          onClick={() => setAiSubjectMenuOpen(false)}
                          className="text-stone-400 hover:text-stone-700"
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
                              setAiSubjectMenuOpen(false);
                            }}
                            className="w-full text-left p-2 text-xs rounded-lg hover:bg-indigo-50 hover:text-indigo-900 text-stone-700 transition-colors"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <input
                type="text"
                required
                placeholder="e.g. Important Community Announcement: Join Us This Thursday"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Row 3: Message Editor with Toolbar and Gemini Enhancer */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Message Body <span className="text-rose-500">*</span>
                </label>

                {/* Gemini Polish Popover */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAiToneMenuOpen(!aiToneMenuOpen)}
                    disabled={isAiLoading || !content.trim()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200/80 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>{isAiLoading ? 'Polishing...' : 'Enhance with Gemini'}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {aiToneMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-200 p-1.5 z-20 animate-in fade-in zoom-in-95">
                      <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                        Writing Assistance
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePolishContent('improve_clarity')}
                        className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-indigo-50 hover:text-indigo-900 text-stone-700 transition-colors"
                      >
                        Improve Clarity & Flow
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePolishContent('fix_grammar')}
                        className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-indigo-50 hover:text-indigo-900 text-stone-700 transition-colors"
                      >
                        Fix Grammar & Typos
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePolishContent('warm_tone')}
                        className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-indigo-50 hover:text-indigo-900 text-stone-700 transition-colors"
                      >
                        Warm Community Tone
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePolishContent('urgent_reminder')}
                        className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-indigo-50 hover:text-indigo-900 text-stone-700 transition-colors"
                      >
                        Action / Urgent Reminder
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-1 p-2 bg-stone-50 border-t border-x border-stone-200 rounded-t-xl text-stone-600">
                <button
                  type="button"
                  onClick={() => wrapSelection('**')}
                  className="p-1.5 hover:bg-white hover:text-stone-900 rounded-lg transition-colors"
                  title="Bold (**text**)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => wrapSelection('*')}
                  className="p-1.5 hover:bg-white hover:text-stone-900 rounded-lg transition-colors"
                  title="Italic (*text*)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => wrapSelection('> ')}
                  className="p-1.5 hover:bg-white hover:text-stone-900 rounded-lg transition-colors"
                  title="Quote (> text)"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => wrapSelection('- ')}
                  className="p-1.5 hover:bg-white hover:text-stone-900 rounded-lg transition-colors"
                  title="Bullet list (- item)"
                >
                  <List className="w-3.5 h-3.5" />
                </button>

                <div className="h-4 w-px bg-stone-200 mx-1" />

                {/* Personalization Tag Insert Buttons */}
                <span className="text-[11px] text-stone-400 font-medium px-1">Tags:</span>
                <button
                  type="button"
                  onClick={() => insertTag(' {{first_name}} ')}
                  className="px-2 py-0.5 text-[11px] font-mono bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-stone-200 rounded-md transition-colors"
                  title="Insert recipient first name"
                >
                  {'{{first_name}}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertTag(' {{full_name}} ')}
                  className="px-2 py-0.5 text-[11px] font-mono bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-stone-200 rounded-md transition-colors"
                  title="Insert recipient full name"
                >
                  {'{{full_name}}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertTag(' {{group_name}} ')}
                  className="px-2 py-0.5 text-[11px] font-mono bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-stone-200 rounded-md transition-colors"
                  title="Insert target group name"
                >
                  {'{{group_name}}'}
                </button>
              </div>

              {/* Textarea */}
              <textarea
                id="composer-textarea"
                rows={10}
                required
                placeholder="Write your announcement content here. Personalization tags like {{first_name}} will automatically populate for each recipient..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-3 text-xs bg-white rounded-b-xl border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono leading-relaxed"
              />
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-stone-150 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <Info className="w-4 h-4 text-stone-400 shrink-0" />
                <span>
                  Emails are sent individually without revealing member addresses to each other.
                </span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors border border-stone-200"
                >
                  Preview Email
                </button>

                <button
                  type="submit"
                  disabled={hasZeroRecipients || isSending}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Announcement</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Live Responsive Email Preview */}
        {activeTab === 'preview' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-150">
              <div>
                <span className="text-xs font-semibold text-stone-800">
                  Live Recipient Simulation
                </span>
                <p className="text-[11px] text-stone-500">
                  Simulating rendering for recipient:{' '}
                  <strong>{previewSampleMember.fullName}</strong> ({previewSampleMember.email})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center p-0.5 bg-stone-100 rounded-lg text-xs">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      previewDevice === 'desktop' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'
                    }`}
                  >
                    Desktop
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      previewDevice === 'mobile' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'
                    }`}
                  >
                    Mobile
                  </button>
                </div>

                <button
                  onClick={() => setActiveTab('edit')}
                  className="px-3 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  Return to Edit
                </button>
              </div>
            </div>

            {/* Email Canvas Sandbox */}
            <div className="bg-stone-100/70 p-4 sm:p-8 rounded-2xl flex justify-center">
              <div
                className={`bg-white rounded-xl border border-stone-200/90 shadow-md overflow-hidden transition-all duration-200 ${
                  previewDevice === 'desktop' ? 'w-full max-w-xl' : 'w-full max-w-sm'
                }`}
              >
                {/* Simulated Email Client Bar */}
                <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-150 text-[11px] text-stone-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>
                      <strong className="text-stone-800">From:</strong>{' '}
                      {settings?.senderName || 'MailFlow Announcements'} &lt;
                      {settings?.senderEmail || 'announcements@mailflow.app'}&gt;
                    </span>
                    <Badge variant="indigo" size="sm">
                      {previewGroupName}
                    </Badge>
                  </div>
                  <div>
                    <strong className="text-stone-800">To:</strong> {previewSampleMember.fullName} &lt;{previewSampleMember.email}&gt;
                  </div>
                  <div className="text-stone-900 font-semibold pt-1 text-xs">
                    <strong className="text-stone-800 font-medium">Subject:</strong> {renderedSubject}
                  </div>
                </div>

                {/* Email Body Rendering */}
                <div className="p-6 sm:p-8 space-y-4">
                  <h2 className="text-lg font-bold text-stone-900 tracking-tight leading-snug">
                    {renderedSubject}
                  </h2>

                  <div className="text-xs text-stone-700 leading-relaxed space-y-3 whitespace-pre-wrap font-sans">
                    {renderedContent}
                  </div>
                </div>

                {/* Email Footer */}
                <div className="px-6 py-4 bg-stone-50 border-t border-stone-150 text-[11px] text-stone-400 leading-relaxed">
                  <p className="font-semibold text-stone-600">
                    Sent by {settings?.senderName || 'MailFlow Announcements'}
                  </p>
                  <p className="mt-0.5">
                    You received this announcement as a verified member of <strong>{previewGroupName}</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions inside Preview */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-150">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleInitiateSend}
                disabled={hasZeroRecipients || isSending}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm & Send to {groupMembers.length} Members</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog before sending */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSend}
        title="Confirm Announcement Dispatch"
        message={`You are about to dispatch "${subject}" to all ${groupMembers.length} members in "${selectedGroup?.name}". Individual personalized emails will be sent immediately.`}
        confirmLabel={`Send to ${groupMembers.length} Members`}
        isLoading={isSending}
      />
    </div>
  );
};
