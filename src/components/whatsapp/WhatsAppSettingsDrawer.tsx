import React, { useState } from 'react';
import {
  X,
  Mail,
  Server,
  Sparkles,
  Database,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import type { AppSettings } from '../../types';
import { api } from '../../api/client';

interface WhatsAppSettingsDrawerProps {
  settings: AppSettings | null;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const WhatsAppSettingsDrawer: React.FC<WhatsAppSettingsDrawerProps> = ({
  settings,
  onClose,
  onRefresh,
  onNotify,
}) => {
  const [appName, setAppName] = useState(settings?.appName || 'MailFlow');
  const [senderName, setSenderName] = useState(settings?.senderName || 'MailFlow Announcements');
  const [senderEmail, setSenderEmail] = useState(settings?.senderEmail || 'announcements@mailflow.app');
  const [saving, setSaving] = useState(false);

  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    previewUrl?: string;
    error?: string;
  } | null>(null);

  // Seed sample data
  const [seeding, setSeeding] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateSettings({ appName, senderName, senderEmail });
      onNotify('success', 'Settings updated successfully.');
      await onRefresh();
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes('@')) {
      onNotify('error', 'Please enter a valid recipient email address.');
      return;
    }
    try {
      setTesting(true);
      setTestResult(null);
      const res = await api.sendTestEmail(testEmail.trim());
      setTestResult(res);
      onNotify('success', res.message, 'Test Email Dispatched');
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
      onNotify('error', err.message || 'Test send failed.');
    } finally {
      setTesting(false);
    }
  };

  const handleSeed = async () => {
    try {
      setSeeding(true);
      const res = await api.seedData();
      onNotify('success', res.message, 'Database Reset');
      await onRefresh();
    } catch (err: any) {
      onNotify('error', err.message || 'Seed failed.');
    } finally {
      setSeeding(false);
    }
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
          <h3 className="text-base font-semibold text-[#111b21]">Settings</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Sender Identity Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#008069]">
            <Mail className="w-4 h-4" />
            <span>Sender Identity</span>
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#111b21] mb-1">
                Application Brand
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-[#f0f2f5] rounded-lg border-0 text-[#111b21] focus:ring-1 focus:ring-[#00a884]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#111b21] mb-1">
                Sender Display Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-[#f0f2f5] rounded-lg border-0 text-[#111b21] focus:ring-1 focus:ring-[#00a884]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#111b21] mb-1">
                From Email Address
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-[#f0f2f5] rounded-lg border-0 text-[#111b21] focus:ring-1 focus:ring-[#00a884]"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </form>
        </div>

        {/* Email Engine Status */}
        <div className="space-y-3 pt-4 border-t border-[#e9edef]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#008069]">
              <Server className="w-4 h-4" />
              <span>Delivery Engine</span>
            </div>
            <span className="text-[10px] font-bold text-[#008069] bg-[#e7fce3] px-2 py-0.5 rounded-full">
              {settings?.emailProvider.name || 'Sandbox Active'}
            </span>
          </div>

          <p className="text-xs text-[#667781] leading-relaxed">
            {settings?.emailProvider.description}
          </p>

          {/* Test Sender */}
          <form onSubmit={handleSendTestEmail} className="pt-2 space-y-2">
            <label className="block text-[11px] font-semibold text-[#111b21]">
              Pipeline Verification (Test Send)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="test.recipient@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-[#f0f2f5] rounded-lg border-0 text-[#111b21] focus:ring-1 focus:ring-[#00a884]"
              />
              <button
                type="submit"
                disabled={testing}
                className="px-3 py-1.5 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-lg text-xs font-semibold shrink-0 disabled:opacity-50"
              >
                {testing ? 'Sending...' : 'Send Test'}
              </button>
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 ${
                  testResult.success
                    ? 'bg-[#e7fce3] text-[#008069]'
                    : 'bg-rose-50 text-rose-800'
                }`}
              >
                <span>{testResult.message || testResult.error}</span>
                {testResult.previewUrl && (
                  <a
                    href={testResult.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold underline flex items-center gap-0.5"
                  >
                    <span>Preview</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Gemini AI Status */}
        <div className="space-y-3 pt-4 border-t border-[#e9edef]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#008069]">
              <Sparkles className="w-4 h-4" />
              <span>Google Gemini AI</span>
            </div>
            <span className="text-[10px] font-bold text-[#008069] bg-[#e7fce3] px-2 py-0.5 rounded-full">
              gemini-3.8-flash
            </span>
          </div>
          <p className="text-xs text-[#667781] leading-relaxed">
            Powers smart subject line ideation, grammar and clarity correction, and tone calibration. Requests run securely server-side.
          </p>
        </div>

        {/* Database & Demo Reset */}
        <div className="space-y-3 pt-4 border-t border-[#e9edef]">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#008069]">
            <Database className="w-4 h-4" />
            <span>Database Management</span>
          </div>

          <div className="p-3 bg-[#f0f2f5] rounded-xl flex items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-semibold text-[#111b21]">Reset Demonstration Data</div>
              <div className="text-[11px] text-[#667781]">
                Populate fresh groups, members, and announcements.
              </div>
            </div>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="px-3 py-1.5 bg-white text-[#111b21] hover:bg-stone-200 rounded-lg text-xs font-semibold shadow-2xs border border-[#e9edef] shrink-0 disabled:opacity-50 flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
              <span>{seeding ? 'Resetting...' : 'Reset Data'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
