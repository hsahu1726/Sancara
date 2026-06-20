'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Radar, MapPin, AlertTriangle, Search,
  Crosshair, ClipboardList, ChevronLeft, ChevronRight, Menu, X,
  Map, MessageSquare, Sun, Moon, Radio, Globe, Calendar, Sliders, CalendarDays
} from 'lucide-react';

const links = [
  { href: '/',           label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/predict',    label: 'Prediction',        icon: Radar },
  { href: '/hotspots',   label: 'Hotspots',          icon: MapPin },
  { href: '/heatmap',    label: 'Hotspot Map',        icon: Globe },
  { href: '/vulnerability', label: 'Vulnerability',  icon: AlertTriangle },
  { href: '/similarity', label: 'Similarity',        icon: Search },
  { href: '/autopsy',    label: 'Response Replay',   icon: Crosshair },
  { href: '/corridors',  label: 'Corridor Routes',   icon: Map },
  { href: '/planned',    label: 'Planned Events',    icon: Calendar },
  { href: '/simulator',  label: 'What-If Simulator', icon: Sliders },
  { href: '/calendar',   label: 'Risk Calendar',     icon: CalendarDays },
  { href: '/broadcast',  label: 'ಕನ್ನಡ Broadcast',   icon: Radio },
  { href: '/chatbot',    label: 'AI Chatbot',        icon: MessageSquare },
  { href: '/resources',  label: 'Resources',         icon: ClipboardList },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-surface-border shrink-0">
        {!collapsed && (
          <button onClick={() => setMobileOpen(false)} className="lg:hidden mr-1 p-1 -ml-1 rounded-lg hover:bg-surface-hover">
            <X size={20} className="text-ink-secondary" />
          </button>
        )}
        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-sm">
          <img src="/wordmark.png" alt="San̄cāra logo" className="w-full h-full object-cover" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-ink tracking-tight select-none">San̄cāra</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={active ? 'sidebar-link-active' : 'sidebar-link'}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer controls */}
      <div className="p-2.5 border-t border-surface-border">
        <button
          onClick={toggleTheme}
          className="sidebar-link w-full flex items-center gap-3"
          title={collapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
        >
          {theme === 'dark' ? <Sun size={18} className="text-amber-500 shrink-0" /> : <Moon size={18} className="text-ink-secondary dark:text-slate-400 shrink-0" />}
          {!collapsed && <span className="truncate">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-link w-full hidden lg:flex items-center gap-3 mt-1"
        >
          {collapsed ? <ChevronRight size={18} className="shrink-0" /> : <ChevronLeft size={18} className="shrink-0" />}
          {!collapsed && <span className="truncate">Collapse</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-40 lg:hidden w-9 h-9 rounded-lg bg-surface-card border border-surface-border shadow-card
          flex items-center justify-center text-ink-secondary hover:text-ink hover:bg-surface-hover transition-colors
          dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar — always visible */}
      <aside className={`fixed top-0 left-0 z-50 h-full bg-surface-sidebar dark:bg-slate-900/95
        border-r border-surface-border dark:border-slate-800/80 shadow-sidebar dark:shadow-none
        transition-all duration-300 flex flex-col
        ${collapsed ? 'w-[68px]' : 'w-64'}
        hidden lg:flex`}>
        {sidebarContent}
      </aside>

      {/* Mobile drawer — slides in from left */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-surface-sidebar dark:bg-slate-900/95
        border-r border-surface-border dark:border-slate-800/80 shadow-card-lg dark:shadow-none
        transition-transform duration-300 ease-out flex flex-col
        lg:hidden
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </aside>
    </>
  );
}
