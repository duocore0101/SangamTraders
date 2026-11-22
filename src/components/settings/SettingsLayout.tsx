'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Building2, Receipt, Boxes, Users, ShieldAlert } from 'lucide-react';
import { storeService } from '@/services/store';

export function SettingsLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const pathname = usePathname();
  const currentUser = storeService.getCurrentUser();
  const isAdmin = currentUser.role === 'admin';

  const tabs = [
    { href: '/settings/business', label: 'Business Profile', icon: Building2 },
    { href: '/settings/billing', label: 'Billing & Invoicing', icon: Receipt },
    { href: '/settings/inventory', label: 'Inventory Rules', icon: Boxes },
    { href: '/settings/users', label: 'User Roles & Access', icon: Users },
  ];

  if (!isAdmin) {
    return (
      <AppShell title="Restricted Area">
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Access Restricted to Store Admin</h3>
          <p className="text-xs text-slate-500">
            You are currently signed in as <strong>{currentUser.fullName} ({currentUser.role.toUpperCase()})</strong>.
            Configuration of business profiles, tax rates, and role permissions is restricted to Owners and Administrators.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={title}>
      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="pt-2">{children}</div>
    </AppShell>
  );
}

