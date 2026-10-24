import React, { useState, useEffect } from 'react';
import type { Group, Announcement, Member, AppSettings, ToastItem } from './types';
import { api } from './api/client';
import { WhatsAppSidebar } from './components/whatsapp/WhatsAppSidebar';
import { WhatsAppChatThread } from './components/whatsapp/WhatsAppChatThread';
import { WhatsAppGroupInfo } from './components/whatsapp/WhatsAppGroupInfo';
import { WhatsAppHistoryDrawer } from './components/whatsapp/WhatsAppHistoryDrawer';
import { WhatsAppSettingsDrawer } from './components/whatsapp/WhatsAppSettingsDrawer';
import { WhatsAppCreateModal } from './components/whatsapp/WhatsAppCreateModal';
import { ToastContainer } from './components/common/Toast';
import { Send, Users, ShieldCheck, MessageSquare, Plus } from 'lucide-react';

export default function App() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Active right drawers: 'none' | 'info' | 'history' | 'settings'
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'info' | 'history' | 'settings'>('none');

  // Create Modal: 'group' | 'member' | null
  const [createModalType, setCreateModalType] = useState<'group' | 'member' | null>(null);

  // Global Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showNotification = (
    type: 'success' | 'error' | 'info',
    message: string,
    title?: string
  ) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = { id, type, title, message };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch all initial data
  const loadData = async () => {
    try {
      const [groupsData, announcementsData, membersData, settingsData] = await Promise.all([
        api.getGroups(),
        api.getAnnouncements(),
        api.getMembers(),
        api.getSettings(),
      ]);
      setGroups(groupsData);
      setAnnouncements(announcementsData);
      setAllMembers(membersData);
      setSettings(settingsData);

      // Preselect first group if none selected
      if (!selectedGroupId && groupsData.length > 0) {
        setSelectedGroupId(groupsData[0].id);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to sync community records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  // Members belonging to currently selected group
  const currentGroupMembers = allMembers.filter((m) =>
    m.groups.some((g) => g.id === selectedGroupId)
  );

  return (
    <div className="h-screen w-screen bg-[#111b21] flex flex-col justify-center overflow-hidden antialiased">
      {/* WhatsApp Web Outer Canvas Box */}
      <div className="flex-1 w-full max-w-[1720px] mx-auto md:p-3 lg:p-4 flex h-full">
        <div className="w-full h-full bg-white md:rounded-2xl shadow-2xl overflow-hidden flex border border-[#e9edef] relative">
          {/* Left Sidebar: Chats / Circles List */}
          <WhatsAppSidebar
            groups={groups}
            announcements={announcements}
            selectedGroupId={selectedGroupId}
            onSelectGroup={(id) => {
              setSelectedGroupId(id);
              if (activeDrawer === 'info') setActiveDrawer('none');
            }}
            onOpenCreateGroup={() => setCreateModalType('group')}
            onOpenCreateMember={() => setCreateModalType('member')}
            onOpenHistory={() => setActiveDrawer('history')}
            onOpenSettings={() => setActiveDrawer('settings')}
            settings={settings}
          />

          {/* Center Pane: Active Conversation / Thread View */}
          {selectedGroup ? (
            <WhatsAppChatThread
              key={selectedGroup.id}
              group={selectedGroup}
              announcements={announcements}
              groupMembers={currentGroupMembers}
              settings={settings}
              onOpenGroupInfo={() =>
                setActiveDrawer(activeDrawer === 'info' ? 'none' : 'info')
              }
              onRefreshData={loadData}
              onNotify={showNotification}
            />
          ) : (
            /* WhatsApp Web Blank Splash Screen when no chat selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#f0f2f5] border-b-[6px] border-[#25d366] text-center select-none">
              <div className="w-20 h-20 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-lg mb-4">
                <Send className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-[#111b21] tracking-tight mb-2">
                MailFlow for Community Dispatch
              </h2>
              <p className="text-sm text-[#667781] max-w-md leading-relaxed mb-6">
                Send personalized community announcements, organize broadcast circles, and track verified email deliveries with WhatsApp ease.
              </p>
              <button
                onClick={() => setCreateModalType('group')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-full text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Community Circle</span>
              </button>
            </div>
          )}

          {/* Right Sliding Drawers */}
          {activeDrawer === 'info' && selectedGroup && (
            <WhatsAppGroupInfo
              group={selectedGroup}
              allMembers={allMembers}
              onClose={() => setActiveDrawer('none')}
              onComposeToGroup={() => setActiveDrawer('none')}
              onRefresh={loadData}
              onDeleteGroup={async (g) => {
                try {
                  await api.deleteGroup(g.id);
                  showNotification('success', `Group "${g.name}" deleted.`);
                  setActiveDrawer('none');
                  await loadData();
                  if (groups.length > 1) {
                    setSelectedGroupId(groups.find((x) => x.id !== g.id)?.id || '');
                  }
                } catch (err: any) {
                  showNotification('error', 'Failed to delete group.');
                }
              }}
              onNotify={showNotification}
            />
          )}

          {activeDrawer === 'history' && (
            <WhatsAppHistoryDrawer
              announcements={announcements}
              onClose={() => setActiveDrawer('none')}
              onRefresh={loadData}
              onNotify={showNotification}
            />
          )}

          {activeDrawer === 'settings' && (
            <WhatsAppSettingsDrawer
              settings={settings}
              onClose={() => setActiveDrawer('none')}
              onRefresh={loadData}
              onNotify={showNotification}
            />
          )}
        </div>
      </div>

      {/* Creation Modal for Group / Member */}
      <WhatsAppCreateModal
        type={createModalType}
        groups={groups}
        onClose={() => setCreateModalType(null)}
        onRefresh={loadData}
        onNotify={showNotification}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
