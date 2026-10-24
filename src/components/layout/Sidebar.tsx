import React from 'react';
import {
  LayoutDashboard,
  Users2,
  Send,
  History,
  Settings,
  Plus,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import type { ViewType } from '../../types';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  appName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  appName = 'MailFlow',
}) => {
  const navItems = [
    {
      id: 'overview' as ViewType,
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'groups_members' as ViewType,
      label: 'Groups & Members',
      icon: Users2,
    },
    {
      id: 'composer' as ViewType,
      label: 'Compose Announcement',
      icon: Send,
    },
    {
      id: 'history' as ViewType,
      label: 'Announcement History',
      icon: History,
    },
    {
      id: 'settings' as ViewType,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 border-r border-stone-200/80 bg-white flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
      {/* Top Branding & Nav */}
      <div>
        {/* Brand / Logo */}
        <div className="px-5 py-5 border-b border-stone-150 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/20">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm tracking-tight text-stone-900">{appName}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">PRO</span>
              </div>
              <p className="text-[11px] text-stone-400 font-normal">Community Dispatch</p>
            </div>
          </div>
        </div>

        {/* Quick Action Button */}
        <div className="p-3">
          <button
            onClick={() => onNavigate('composer')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Announcement</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 py-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-stone-100 text-stone-900 font-semibold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-indigo-600' : 'text-stone-400'
                  }`}
                />
                <span>{item.label}</span>
                {item.id === 'composer' && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Meta */}
      <div className="p-3 border-t border-stone-150">
        <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-150/80 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center text-xs font-semibold">
            CL
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-xs font-semibold text-stone-800 truncate">Community Lead</p>
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            </div>
            <p className="text-[11px] text-stone-400 truncate">Admin / Organizer</p>
          </div>
        </div>

        <div className="mt-2.5 px-2 flex items-center justify-between text-[11px] text-stone-400">
          <span>MailFlow Core</span>
          <span className="font-mono text-[10px]">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};
