import React from 'react';
import { Menu, Zap } from 'lucide-react';
import type { ViewType } from '../../types';
import { Badge } from '../common/Badge';

interface HeaderProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  onOpenMobileMenu: () => void;
  emailProviderMode?: 'resend' | 'smtp' | 'ethereal';
  primaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onOpenMobileMenu,
  emailProviderMode = 'ethereal',
  primaryAction,
}) => {
  const titles: Record<ViewType, { title: string; subtitle: string }> = {
    overview: {
      title: 'Overview',
      subtitle: 'Monitor community engagement, membership counts, and recent announcements.',
    },
    groups_members: {
      title: 'Groups & Members',
      subtitle: 'Organize community directories, configure groups, and curate recipient lists.',
    },
    composer: {
      title: 'Compose Announcement',
      subtitle: 'Draft personalized broadcast messages with live previews and AI refinement.',
    },
    history: {
      title: 'Announcement History',
      subtitle: 'Review dispatched transmissions, per-recipient delivery statuses, and retry failed sends.',
    },
    settings: {
      title: 'Settings & Integrations',
      subtitle: 'Manage email sender identities, SMTP credentials, and Gemini AI connectivity.',
    },
  };

  const currentMeta = titles[currentView] || {
    title: 'Dashboard',
    subtitle: 'MailFlow Community Communications',
  };

  const providerLabel = {
    resend: 'Resend Live',
    smtp: 'SMTP Live',
    ethereal: 'Sandbox Mode',
  }[emailProviderMode];

  const providerVariant = {
    resend: 'success' as const,
    smtp: 'success' as const,
    ethereal: 'indigo' as const,
  }[emailProviderMode];

  return (
    <header className="sticky top-0 z-30 bg-[#fafafa]/90 backdrop-blur-md border-b border-stone-200/80 px-6 sm:px-8 py-4 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & titles */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 -ml-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 truncate">
                {currentMeta.title}
              </h1>
              <Badge variant={providerVariant} size="sm" className="hidden sm:inline-flex">
                <Zap className="w-3 h-3" />
                <span>{providerLabel}</span>
              </Badge>
            </div>
            <p className="text-xs text-stone-500 hidden sm:block mt-0.5 truncate">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-all shadow-xs"
            >
              {primaryAction.icon}
              <span>{primaryAction.label}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
