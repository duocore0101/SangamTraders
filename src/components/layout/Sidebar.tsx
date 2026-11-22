'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  Package, 
  Tags, 
  Boxes, 
  ArrowLeftRight, 
  SlidersHorizontal, 
  Truck, 
  Users, 
  Building2, 
  CreditCard, 
  BarChart3, 
  Settings, 
  PlusCircle,
  X,
  LogOut
} from 'lucide-react';
import Image from 'next/image';
import { storeService } from '@/services/store';

export interface SidebarProps {
  onCloseMobile?: () => void;
  className?: string;
}

export function Sidebar({ onCloseMobile, className }: SidebarProps) {
  const pathname = usePathname();
  const currentUser = storeService.getCurrentUser();
  const activeStore = storeService.getActiveStore();
  const isAdmin = currentUser.role === 'admin';

  const navSections = [
    {
      title: 'Sales & Billing',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/billing/new', label: 'POS Billing', icon: ShoppingCart, highlight: true },
        { href: '/billing/invoices', label: 'Invoices History', icon: FileText },
      ],
    },
    {
      title: 'Catalog & Inventory',
      items: [
        { href: '/products', label: 'Products', icon: Package },
        { href: '/categories', label: 'Categories', icon: Tags },
        { href: '/inventory', label: 'Stock Overview', icon: Boxes },
        { href: '/inventory/stock-movements', label: 'Stock Ledger', icon: ArrowLeftRight },
        { href: '/inventory/adjustments', label: 'Adjustments', icon: SlidersHorizontal },
      ],
    },
    {
      title: 'Purchases & Partners',
      items: [
        { href: '/purchases', label: 'Purchases', icon: Truck },
        { href: '/customers', label: 'Customers', icon: Users },
        { href: '/suppliers', label: 'Suppliers', icon: Building2 },
        { href: '/payments', label: 'Payments', icon: CreditCard },
      ],
    },
    {
      title: 'Analytics & Admin',
      items: [
        { href: '/reports', label: 'Reports & Export', icon: BarChart3 },
        ...(isAdmin
          ? [{ href: '/settings', label: 'Settings', icon: Settings }]
          : []),
      ],
    },
  ];

  return (
    <aside
      className={cn(
        'w-64 bg-slate-900 text-slate-300 flex flex-col h-screen shrink-0 border-r border-slate-800 z-30 select-none',
        className
      )}
    >
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between">
        <Logo isWhite />
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Quick Action Button */}
      <div className="p-3">
        <Link
          href="/billing/new"
          onClick={onCloseMobile}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-md shadow-blue-600/30 transition-all duration-150"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Sale Bill</span>
        </Link>
      </div>

      {/* Nav Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5 scrollbar-thin scrollbar-thumb-slate-700">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {section.title}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/billing' && item.href !== '/settings');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group',
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 font-semibold border-l-2 border-blue-500 shadow-inner'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white',
                    item.highlight && !isActive && 'text-blue-300'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-transform group-hover:scale-110',
                      isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer User Info & Active Store Switcher */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/70 space-y-2">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-white p-0.5 border border-slate-700 shrink-0">
            <Image
              src={activeStore.logoUrl}
              alt={activeStore.name}
              width={32}
              height={32}
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{activeStore.shortName}</p>
            <p className="text-[10px] text-slate-400 truncate">{currentUser.fullName}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pt-0.5">
          <Link
            href="/"
            onClick={onCloseMobile}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors border border-slate-700/60"
          >
            <ArrowLeftRight className="w-3 h-3 text-blue-400" />
            <span>Switch Store</span>
          </Link>
          <button
            onClick={() => {
              storeService.logout();
              window.location.href = '/';
            }}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 border border-slate-700/60 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

