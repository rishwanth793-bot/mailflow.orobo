import React, { useState, useEffect } from 'react';
import {
  Settings,
  Mail,
  Database,
  Sparkles,
  Server,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Save,
  Shield,
  Key,
} from 'lucide-react';
import { api } from '../api/client';
import type { AppSettings } from '../types';
import { Badge } from '../components/common/Badge';

interface SettingsViewProps {
  onNotify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNotify }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable settings
  const [appName, setAppName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');

  // Test email pipeline state
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    messageId?: string;
    previewUrl?: string;
    error?: string;
  } | null>(null);

  // Re-seed data state
  const [seeding, setSeeding] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(data);
      setAppName(data.appName);
      setSenderName(data.senderName);
      setSenderEmail(data.senderEmail);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to load application settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateSettings({ appName, senderName, senderEmail });
      onNotify('success', 'Application settings saved successfully.');
      await loadSettings();
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      onNotify('error', 'Please enter a valid recipient email address.');
      return;
    }

    try {
      setTestingEmail(true);
      setTestResult(null);
      const res = await api.sendTestEmail(testEmailAddress.trim());
      setTestResult(res);
      onNotify('success', res.message, 'Test Email Dispatched');
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
      onNotify('error', err.message || 'Failed to dispatch test email.');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleSeedData = async () => {
    try {
      setSeeding(true);
      const res = await api.seedData();
      onNotify('success', res.message, 'Database Reset');
      await loadSettings();
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to seed sample data.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-150">
      {/* Sender & Application Identity Form */}
      <div className="rounded-2xl bg-white border border-stone-200/80 p-6 shadow-xs">
        <div className="flex items-center gap-2.5 mb-1">
          <Mail className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold tracking-tight text-stone-900">
            Sender & Brand Identity
          </h3>
        </div>
        <p className="text-xs text-stone-500 mb-6">
          Configure how community members identify broadcasts in their inboxes.
        </p>

        {loading ? (
          <div className="py-8 text-center text-xs text-stone-400">Loading settings...</div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Application Name
                </label>
                <input
                  type="text"
                  required
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Default Sender Email (From Address)
              </label>
              <input
                type="email"
                required
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <p className="text-[11px] text-stone-400 mt-1">
                For production delivery, ensure this domain matches your configured Resend or SMTP sender identity.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Email Delivery Pipeline Status */}
      <div className="rounded-2xl bg-white border border-stone-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold tracking-tight text-stone-900">
              Email Delivery Service
            </h3>
          </div>
          {settings && (
            <Badge
              variant={settings.emailProvider.configured ? 'success' : 'indigo'}
              size="sm"
            >
              {settings.emailProvider.mode === 'resend'
                ? 'Resend API Active'
                : settings.emailProvider.mode === 'smtp'
                ? 'Custom SMTP Active'
                : 'Ethereal Sandbox Active'}
            </Badge>
          )}
        </div>
        <p className="text-xs text-stone-500 mb-5">
          Backend delivery pipeline handles multi-recipient batching, TLS security, and delivery logging.
        </p>

        {/* Current Provider Description */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-800">Active Provider:</span>
            <span className="text-xs font-mono font-bold text-indigo-700">
              {settings?.emailProvider.name || 'Sandbox Provider'}
            </span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            {settings?.emailProvider.description}
          </p>

          <div className="pt-2 text-[11px] text-stone-500 border-t border-stone-200/70 space-y-1">
            <p>
              To enable live external delivery, set <code className="text-stone-800 font-semibold font-mono">RESEND_API_KEY</code> or{' '}
              <code className="text-stone-800 font-semibold font-mono">SMTP_HOST / SMTP_USER / SMTP_PASS</code> in environment variables.
            </p>
          </div>
        </div>

        {/* Test Email Form */}
        <form onSubmit={handleSendTestEmail} className="pt-2 border-t border-stone-150 space-y-3">
          <h4 className="text-xs font-semibold text-stone-800">Pipeline Verification Tool</h4>
          <p className="text-[11px] text-stone-500">
            Dispatch a test email to verify credentials and inspect HTML formatting.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="email"
              required
              placeholder="recipient@example.com"
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              className="w-full sm:flex-1 px-3.5 py-2 text-xs bg-white rounded-xl border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <button
              type="submit"
              disabled={testingEmail}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs disabled:opacity-50 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{testingEmail ? 'Sending Test...' : 'Send Test Email'}</span>
            </button>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testResult.message || testResult.error}</span>
              </div>

              {testResult.previewUrl && (
                <a
                  href={testResult.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-800 underline hover:text-emerald-950 shrink-0"
                >
                  <span>Open Ethereal Preview</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Google AI Studio (Gemini) Integration */}
      <div className="rounded-2xl bg-white border border-stone-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold tracking-tight text-stone-900">
              Google AI Studio (Gemini)
            </h3>
          </div>
          <Badge
            variant={settings?.geminiConfigured ? 'success' : 'default'}
            size="sm"
          >
            {settings?.geminiConfigured ? 'Connected & Active' : 'Fallback Mode'}
          </Badge>
        </div>
        <p className="text-xs text-stone-500 mb-4">
          Integrated with <code className="font-mono text-stone-700">@google/genai</code> using{' '}
          <code className="font-mono text-stone-700">gemini-3.8-flash</code> on the server.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-150">
            <div className="font-semibold text-stone-800 mb-0.5">Subject Suggestions</div>
            <div className="text-[11px] text-stone-500 leading-relaxed">
              Generates high-open-rate subject lines tailored to your community group.
            </div>
          </div>
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-150">
            <div className="font-semibold text-stone-800 mb-0.5">Grammar & Clarity</div>
            <div className="text-[11px] text-stone-500 leading-relaxed">
              Refines punctuation, structure, and readability while preserving tags.
            </div>
          </div>
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-150">
            <div className="font-semibold text-stone-800 mb-0.5">Tone Calibration</div>
            <div className="text-[11px] text-stone-500 leading-relaxed">
              Adapts copy between Warm Community, Concise, and Action/Urgent Reminders.
            </div>
          </div>
        </div>
      </div>

      {/* Database Management & Demonstration Seed */}
      <div className="rounded-2xl bg-white border border-stone-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold tracking-tight text-stone-900">
              Database & Demonstration Data
            </h3>
          </div>
          <Badge variant="indigo" size="sm">
            SQLite (Relational Engine)
          </Badge>
        </div>
        <p className="text-xs text-stone-500 mb-5">
          Relational tables for groups, members, memberships, announcements, recipients, and audit logs.
        </p>

        <div className="flex items-center justify-between p-4 rounded-xl bg-stone-50 border border-stone-200">
          <div>
            <div className="text-xs font-semibold text-stone-800">
              Reset / Seed Demonstration Data
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">
              Populates realistic groups, members, and historical announcements for testing.
            </div>
          </div>
          <button
            onClick={handleSeedData}
            disabled={seeding}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-stone-700 bg-white hover:bg-stone-100 rounded-xl border border-stone-200 transition-colors shadow-2xs disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
            <span>{seeding ? 'Resetting...' : 'Seed Sample Data'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
