'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Radar, MapPin, AlertTriangle, Search,
  Crosshair, ClipboardList, ChevronLeft, ChevronRight, Menu, X,
  Map, MessageSquare
} from 'lucide-react';

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/predict', label: 'Prediction', icon: Radar },
  { href: '/hotspots', label: 'Hotspots', icon: MapPin },
  { href: '/vulnerability', label: 'Vulnerability', icon: AlertTriangle },
  { href: '/similarity', label: 'Similarity', icon: Search },
  { href: '/autopsy', label: 'Autopsy', icon: Crosshair },
  { href: '/corridors', label: 'Corridor Routes', icon: Map },
  { href: '/chatbot', label: 'AI Chatbot', icon: MessageSquare },
  { href: '/resources', label: 'Resources', icon: ClipboardList },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
        {collapsed ? (
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 shadow-sm">
            <img src="/logo.png" alt="Sañcāra logo" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-10 overflow-hidden shrink-0">
            <img src="/wordmark.png" alt="Sañcāra" className="h-full object-contain" />
          </div>
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

      {/* Collapse toggle — desktop only */}
      <div className="p-2.5 border-t border-surface-border hidden lg:block">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-link w-full"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>Collapse</span>}
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
          flex items-center justify-center text-ink-secondary hover:text-ink hover:bg-surface-hover transition-colors"
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
      <aside className={`fixed top-0 left-0 z-50 h-full bg-surface-sidebar
        border-r border-surface-border shadow-sidebar
        transition-all duration-300 flex flex-col
        ${collapsed ? 'w-[68px]' : 'w-64'}
        hidden lg:flex`}>
        {sidebarContent}
      </aside>

      {/* Mobile drawer — slides in from left */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-surface-sidebar
        border-r border-surface-border shadow-card-lg
        transition-transform duration-300 ease-out flex flex-col
        lg:hidden
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </aside>
    </>
  );
}
