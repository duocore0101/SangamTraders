'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { storeService } from '@/services/store';
import { StoreAccount } from '@/types';

export function Logo({
  collapsed = false,
  className,
  isWhite = false,
}: {
  collapsed?: boolean;
  className?: string;
  isWhite?: boolean;
}) {
  const [activeStore, setActiveStore] = useState<StoreAccount>(() => storeService.getActiveStore());

  useEffect(() => {
    setActiveStore(storeService.getActiveStore());
  }, []);

  return (
    <Link href="/dashboard" className={cn('flex items-center gap-2.5 select-none group min-w-0', className)}>
      <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-700/50 p-1 shadow-md shrink-0 group-hover:scale-105 transition-transform duration-200 overflow-hidden">
        <Image
          src={activeStore.logoUrl}
          alt={activeStore.name}
          width={40}
          height={40}
          className="w-full h-full object-contain rounded-lg"
          priority
        />
      </div>

      {!collapsed && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            <span
              className={cn(
                'text-xs sm:text-sm font-black tracking-tight leading-tight truncate',
                isWhite ? 'text-white' : 'text-slate-900'
              )}
            >
              {activeStore.id === 'sangam-sales-automobiles' ? (
                <>
                  SANGAM <span className="text-blue-500">SALES & AUTO</span>
                </>
              ) : (
                <>
                  SANGAM <span className="text-emerald-500">TRADERS</span>
                </>
              )}
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-medium tracking-wider text-slate-400 uppercase leading-tight mt-0.5 truncate">
            By Duocore Software
          </span>
        </div>
      )}
    </Link>
  );
}
