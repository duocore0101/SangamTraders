'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Package, FileText, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/products', label: 'Catalog', icon: Package },
    { href: '/billing/new', label: 'POS Bill', icon: ShoppingCart, highlight: true },
    { href: '/billing/invoices', label: 'Bills', icon: FileText },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg safe-bottom">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

        if (item.highlight) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center -mt-5"
            >
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 active:scale-95 transition-transform">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-blue-600 mt-1">New Bill</span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors',
              isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <Icon className={cn('w-5 h-5 mb-0.5', isActive ? 'text-blue-600' : 'text-slate-400')} />
            <span>{item.label}</span>
          </Link>
        );
      })}

      <button
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium text-slate-500 hover:text-slate-800"
      >
        <Menu className="w-5 h-5 mb-0.5 text-slate-400" />
        <span>More</span>
      </button>
    </div>
  );
}

