'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { 
  Download, 
  Smartphone, 
  Sparkles, 
  X, 
  Zap, 
  CheckCircle2, 
  Share2, 
  PlusSquare,
  ArrowDown,
  Monitor
} from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function WindowsIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.951-1.801"/>
    </svg>
  );
}

function AppleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.67-.81 1.12-1.94.99-3.07-1 .04-2.19.67-2.88 1.48-.6.69-1.13 1.83-1 2.94 1.11.09 2.22-.57 2.89-1.35z"/>
    </svg>
  );
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showMobileSteps, setShowMobileSteps] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running as installed standalone app
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleMobile = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: boolean }).MSStream;
    setIsIOS(isAppleMobile);

    if (isStandalone) {
      return;
    }

    // Capture early beforeinstallprompt from window.__pwaDeferredPrompt
    const win = window as unknown as { 
      __pwaDeferredPrompt?: BeforeInstallPromptEvent | null;
    };

    if (win.__pwaDeferredPrompt) {
      setDeferredPrompt(win.__pwaDeferredPrompt);
    }

    const handlePromptReady = (e?: Event) => {
      if (e && 'prompt' in e) {
        e.preventDefault();
        const pe = e as BeforeInstallPromptEvent;
        setDeferredPrompt(pe);
        win.__pwaDeferredPrompt = pe;
      } else if (win.__pwaDeferredPrompt) {
        setDeferredPrompt(win.__pwaDeferredPrompt);
      }
      
      const dismissed = sessionStorage.getItem('sangam_pwa_dismissed') === 'true';
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handlePromptReady);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);

    // App installed event
    const handleAppInstalled = () => {
      localStorage.setItem('sangam_pwa_installed', 'true');
      setShowPrompt(false);
      setDeferredPrompt(null);
      win.__pwaDeferredPrompt = null;
      toast.success('Sangam POS app installed successfully!');
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-app-installed', handleAppInstalled);

    // Manual open from header button
    const handleManualOpen = () => {
      setShowPrompt(true);
      setShowMobileSteps(false);
    };
    window.addEventListener('open-pwa-install', handleManualOpen);

    // Auto-show popup after 800ms
    const timer = setTimeout(() => {
      const dismissed = sessionStorage.getItem('sangam_pwa_dismissed') === 'true';
      const installed = localStorage.getItem('sangam_pwa_installed') === 'true';
      if (!dismissed && !installed) {
        setShowPrompt(true);
      }
    }, 800);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePromptReady);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-app-installed', handleAppInstalled);
      window.removeEventListener('open-pwa-install', handleManualOpen);
      clearTimeout(timer);
    };
  }, []);

  // 1. Download Windows App (.url & Chrome prompt)
  const handleWindowsDownload = async () => {
    const win = window as unknown as { 
      __pwaDeferredPrompt?: BeforeInstallPromptEvent | null;
    };
    const activePrompt = deferredPrompt || win.__pwaDeferredPrompt;

    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        if (choice.outcome === 'accepted') {
          localStorage.setItem('sangam_pwa_installed', 'true');
          setShowPrompt(false);
          setDeferredPrompt(null);
          win.__pwaDeferredPrompt = null;
          toast.success('Sangam POS installed on Windows!');
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }

    // Windows Internet Shortcut File (.url)
    try {
      const origin = window.location.origin;
      const ini = `[InternetShortcut]\r\nURL=${origin}\r\nIconIndex=0\r\n`;
      const blob = new Blob([ini], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Sangam-POS.url';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Downloaded Sangam-POS.url for Windows! Drag it to your Desktop.');
    } catch (e) {
      console.error(e);
    }
  };

  // 2. Download Mac App (.webloc)
  const handleMacDownload = () => {
    try {
      const origin = window.location.origin;
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>URL</key>
    <string>${origin}</string>
</dict>
</plist>`;
      const blob = new Blob([xml], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Sangam-POS.webloc';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Downloaded Sangam-POS.webloc for Mac! In Safari top menu, you can also click File > Add to Dock.');
    } catch (e) {
      console.error(e);
    }
  };

  // 3. Mobile Install (Android / iPhone)
  const handleMobileInstall = async () => {
    const win = window as unknown as { 
      __pwaDeferredPrompt?: BeforeInstallPromptEvent | null;
    };
    const activePrompt = deferredPrompt || win.__pwaDeferredPrompt;

    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        if (choice.outcome === 'accepted') {
          localStorage.setItem('sangam_pwa_installed', 'true');
          setShowPrompt(false);
          setDeferredPrompt(null);
          win.__pwaDeferredPrompt = null;
          toast.success('Installing Sangam POS app on your phone...');
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }

    // Show mobile steps
    setShowMobileSteps(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  const handleMarkInstalled = () => {
    localStorage.setItem('sangam_pwa_installed', 'true');
    setShowPrompt(false);
    setShowMobileSteps(false);
    toast.success('Saved! This popup will no longer appear.');
  };

  const handleDismissForSession = () => {
    sessionStorage.setItem('sangam_pwa_dismissed', 'true');
    setShowPrompt(false);
    setShowMobileSteps(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-md bg-gradient-to-b from-[#0f172a] via-[#0b1120] to-[#07090e] border border-blue-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_20px_60px_-15px_rgba(37,99,235,0.35)] text-white overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-20 bg-gradient-to-r from-blue-600/30 via-emerald-500/30 to-teal-500/30 blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismissForSession}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-700/80 transition-colors z-20 cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with App Logo */}
        <div className="flex items-center gap-3.5 z-10 relative">
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 p-1 border-2 border-amber-400/60 shadow-lg shadow-amber-500/10 shrink-0 flex items-center justify-center">
            <Image
              src="/icons/icon-192x192.png"
              alt="Sangam App Logo"
              width={72}
              height={72}
              className="w-full h-full object-contain rounded-xl"
              priority
            />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-[9px] text-slate-950 font-black px-1.5 py-0.5 rounded-full border border-emerald-300 shadow">
              PWA
            </div>
          </div>

          <div className="space-y-0.5 pr-6">
            <div className="flex items-center gap-1 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official App Available</span>
            </div>
            <h3 className="text-lg font-black text-white tracking-tight leading-tight">
              Download Sangam POS App
            </h3>
            <p className="text-xs text-slate-300">
              Install directly on your Windows PC, Mac, or Mobile phone.
            </p>
          </div>
        </div>

        {/* BOTH ICONS: Windows & Mac Side-by-Side Cards */}
        <div className="grid grid-cols-2 gap-3 mt-4 z-10 relative">
          {/* Windows Card Button */}
          <button
            onClick={handleWindowsDownload}
            className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-2xl bg-gradient-to-b from-blue-950/80 to-slate-900/90 hover:from-blue-900/80 hover:to-slate-850 border-2 border-blue-500/50 hover:border-blue-400 text-white font-bold shadow-lg shadow-blue-600/20 transition-all transform active:scale-95 group cursor-pointer text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <WindowsIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-black text-white group-hover:text-blue-300 transition-colors flex items-center justify-center gap-1">
                <span>Windows</span>
                <Download className="w-3 h-3 text-blue-400" />
              </div>
              <div className="text-[10px] text-blue-300/90 font-medium mt-0.5">
                Download for PC
              </div>
            </div>
          </button>

          {/* Mac Card Button */}
          <button
            onClick={handleMacDownload}
            className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border-2 border-slate-600/60 hover:border-slate-400 text-white font-bold shadow-lg shadow-slate-900/40 transition-all transform active:scale-95 group cursor-pointer text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <AppleIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-black text-white group-hover:text-slate-200 transition-colors flex items-center justify-center gap-1">
                <span>Apple Mac</span>
                <Download className="w-3 h-3 text-slate-300" />
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                Download for Mac
              </div>
            </div>
          </button>
        </div>

        {/* Mobile (Phone) Option Button */}
        <div className="mt-2.5 z-10 relative">
          <button
            onClick={handleMobileInstall}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all active:scale-95 cursor-pointer"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Install on Mobile (Android &amp; iPhone)</span>
          </button>
        </div>

        {/* Mobile Instructions Collapsible (Android / iPhone) */}
        {showMobileSteps && (
          <div className="mt-3 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-slate-200 space-y-2 animate-in fade-in duration-200">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Mobile Phone Instructions:</span>
            </div>
            {isIOS ? (
              <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                <li>Tap <strong className="text-white">Share</strong> <Share2 className="w-3 h-3 inline text-blue-400 mx-0.5" /> in Safari bottom toolbar.</li>
                <li>Tap <strong className="text-emerald-400">&ldquo;Add to Home Screen&rdquo;</strong> <PlusSquare className="w-3 h-3 inline text-emerald-400 mx-0.5" />.</li>
                <li>Tap <strong className="text-white">&ldquo;Add&rdquo;</strong> in top-right.</li>
              </ol>
            ) : (
              <p className="text-[11px] text-slate-300">
                In Chrome on Android: Tap the <strong>⋮</strong> menu at top-right $\rightarrow$ select <strong className="text-emerald-400">&ldquo;Install app&rdquo;</strong> or <strong className="text-emerald-400">&ldquo;Add to Home screen&rdquo;</strong>.
              </p>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-3.5 flex flex-col gap-2 z-10 relative">
          {/* Confirmation button to dismiss popup permanently */}
          <button
            onClick={handleMarkInstalled}
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Mark as installed on this device"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>I&apos;ve Installed It (Don&apos;t show again)</span>
          </button>

          <button
            onClick={handleDismissForSession}
            className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700/60 transition-colors text-center cursor-pointer"
          >
            Continue in Browser
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-2.5 text-center text-[10px] text-slate-500">
          This pop-up will appear until the app is installed or confirmed on this device.
        </div>
      </div>
    </div>
  );
}
