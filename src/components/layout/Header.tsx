'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Search, ShieldCheck, Database, ShoppingCart, LogOut, ArrowLeftRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { storeService, SyncStatus } from '@/services/store';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { StoreAccount } from '@/types';

export interface HeaderProps {
  onToggleMobileNav: () => void;
  title?: string;
}

export function Header({ onToggleMobileNav, title }: HeaderProps) {
  const router = useRouter();
  const [currentUser] = useState(() => storeService.getCurrentUser());
  const [activeStore, setActiveStore] = useState<StoreAccount>(() => storeService.getActiveStore());
  const [searchQuery, setSearchQuery] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    setActiveStore(storeService.getActiveStore());
    const unsubStore = storeService.subscribe(() => {
      setActiveStore(storeService.getActiveStore());
    });
    const unsubSync = storeService.onSyncStatusChange((status, time) => {
      setSyncStatus(status);
      if (time) setLastSyncTime(time);
    });

    return () => {
      unsubStore();
      unsubSync();
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleLogout = () => {
    storeService.logout();
    router.push('/');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-20 px-3 sm:px-6 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger button */}
        <button
          onClick={onToggleMobileNav}
          className="md:hidden p-1.5 sm:p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none cursor-pointer shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Title & Active Store Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate">
            {title || activeStore.shortName}
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
            {activeStore.shortName}
          </span>
        </div>
      </div>

      {/* Center Search Bar (Desktop) */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-6">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products, SKU, barcode, invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-slate-100/80 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Switch Store Account Pill Button */}
        <Link
          href="/"
          title={`Active: ${activeStore.name}. Click to switch store profile.`}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg border border-slate-200/90 bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 font-bold transition-all shadow-2xs group shrink-0"
        >
          <div className="w-4 h-4 rounded-full overflow-hidden bg-white shrink-0 border border-slate-300 flex items-center justify-center">
            <Image
              src={activeStore.logoUrl}
              alt={activeStore.name}
              width={16}
              height={16}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="hidden md:inline truncate max-w-[120px]">{activeStore.shortName}</span>
          <ArrowLeftRight className="w-3 h-3 text-blue-600 group-hover:rotate-180 transition-transform duration-300 shrink-0" />
        </Link>

        {/* Database Status & Live Cloud Sync Button */}
        <button
          onClick={() => storeService.syncFromSupabase()}
          title={isSupabaseConfigured ? `Cloud Database: Synced with Supabase. Last: ${lastSyncTime || 'Just now'}. Click to sync.` : 'Running in local mode'}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer shadow-2xs transition-colors"
        >
          <RefreshCw className={`w-3 h-3 text-emerald-600 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline font-semibold">{syncStatus === 'syncing' ? 'Syncing...' : 'Cloud Synced'}</span>
          <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`} />
        </button>

        {/* Quick New Bill Link (Desktop & Tablet only; mobile has central bottom-nav button) */}
        <Link href="/billing/new" className="hidden sm:inline-block">
          <Button size="sm" variant="primary" leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}>
            <span>POS Bill</span>
          </Button>
        </Link>

        {/* Admin Role Badge */}
        <div
          title="Administrator / Owner Account (Full Access)"
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg border border-purple-200 bg-purple-50 text-[11px] sm:text-xs text-purple-900 font-bold shadow-2xs shrink-0"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span>Admin</span>
        </div>

        {/* Logout Link */}
        <button
          onClick={handleLogout}
          title="Sign Out to Store Selection"
          className="p-1.5 sm:p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
