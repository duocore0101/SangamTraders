'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { STORE_ACCOUNTS } from '@/types';
import { Sparkles, ShieldCheck, ArrowRight, Store, Phone, Download } from 'lucide-react';

export default function StartupProfileSelectionPage() {
  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden select-none">
      {/* Background Ambient Glows (Hotstar cinematic atmosphere) */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between z-10 py-2">
        <div className="flex items-center gap-2">
          {/* JioHotstar-style four-point star emblem */}
          <div className="relative flex items-center justify-center w-8 h-8 text-amber-300">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-sm sm:text-base font-black tracking-wider uppercase bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              SANGAM ENTERPRISES
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] text-blue-400 font-semibold uppercase tracking-widest border border-blue-500/30 px-2 py-0.5 rounded-full bg-blue-500/10">
              Hardware & Trading ERP
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-400">
          <button
            onClick={() => {
              try {
                sessionStorage.removeItem('sangam_pwa_dismissed');
                sessionStorage.removeItem('sangam_pwa_dismissed_session');
                localStorage.removeItem('sangam_pwa_installed');
              } catch (e) {
                console.error(e);
              }
              window.dispatchEvent(new CustomEvent('open-pwa-install'));
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
            title="Download & Install Sangam POS App"
          >
            <Download className="w-3.5 h-3.5 animate-bounce" />
            <span>Install App</span>
          </button>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">Secured Owner Login</span>
          </div>
        </div>
      </header>

      {/* Main Profile Selection Center Screen */}
      <main className="flex-1 flex flex-col items-center justify-center my-auto py-6 sm:py-10 z-10 max-w-4xl mx-auto w-full">
        {/* Title & Prompt */}
        <div className="text-center space-y-1.5 mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
            Who&apos;s logging in?
          </h1>
          <p className="text-xs sm:text-base text-slate-400 max-w-md mx-auto">
            Choose your store account to access billing & management
          </p>
        </div>

        {/* The 2 Store Accounts Side by Side (Always 1 row on both mobile & desktop like JioHotstar) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-12 w-full max-w-xl mx-auto px-2">
          {STORE_ACCOUNTS.map((account) => {
            const isAuto = account.id === 'sangam-sales-automobiles';

            return (
              <Link
                key={account.id}
                href={`/login?store=${account.id}`}
                className="group flex flex-col items-center text-center cursor-pointer focus:outline-none"
              >
                {/* Circular Avatar Badge with JioHotstar style ring */}
                <div
                  className={`relative w-28 h-28 sm:w-44 sm:h-44 rounded-full p-2 sm:p-3 bg-slate-900/90 border-2 transition-all duration-300 shadow-xl flex items-center justify-center group-hover:scale-105 active:scale-95 ${
                    isAuto
                      ? 'border-blue-500/60 group-hover:border-blue-400 group-hover:shadow-blue-500/30 group-hover:ring-4 group-hover:ring-blue-500/20'
                      : 'border-emerald-500/60 group-hover:border-emerald-400 group-hover:shadow-emerald-500/30 group-hover:ring-4 group-hover:ring-emerald-500/20'
                  }`}
                >
                  {/* Inner logo white canvas */}
                  <div className="w-full h-full rounded-full bg-white p-2 sm:p-3 flex items-center justify-center overflow-hidden shadow-inner">
                    <Image
                      src={account.logoUrl}
                      alt={account.name}
                      width={160}
                      height={160}
                      className="w-full h-full object-contain rounded-full transition-transform duration-300 group-hover:scale-110"
                      priority
                    />
                  </div>

                  {/* Store Type Badge Overlay on Avatar */}
                  <div
                    className={`absolute -bottom-2 px-2 sm:px-3 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border shadow-md whitespace-nowrap ${
                      isAuto
                        ? 'bg-blue-600 text-white border-blue-400'
                        : 'bg-emerald-600 text-white border-emerald-400'
                    }`}
                  >
                    {isAuto ? 'Auto & Hardware' : 'Materials & Trade'}
                  </div>
                </div>

                {/* Profile Name & Details */}
                <div className="mt-4 sm:mt-5 space-y-1 w-full max-w-[150px] sm:max-w-xs">
                  <h2 className="text-xs sm:text-base font-bold text-slate-200 group-hover:text-white transition-colors tracking-tight text-center leading-snug line-clamp-2">
                    {account.name}
                  </h2>

                  <p className="text-[10px] sm:text-xs text-blue-400/90 font-medium truncate">
                    {account.ownerName}
                  </p>

                  <div className="flex items-center justify-center gap-1 pt-0.5">
                    <span className="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/60">
                      <Phone className="w-2.5 h-2.5 text-slate-400" />
                      {account.mobile}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Instructions Hint */}
        <div className="mt-10 sm:mt-16 text-center">
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-slate-400" />
            Tap any store logo to open its login screen
          </p>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-4 z-10 gap-2">
        <div>
          Sangam Management System • Developed by{' '}
          <span className="text-slate-300 font-semibold">Duocore Software</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Fast Counter POS</span>
          <span>•</span>
          <span>Inventory Control</span>
          <span>•</span>
          <span>GST Billing</span>
        </div>
      </footer>
    </div>
  );
}
