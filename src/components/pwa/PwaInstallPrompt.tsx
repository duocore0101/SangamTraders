'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Sparkles, 
  X, 
  Zap, 
  CheckCircle2, 
  Info,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showManualHint, setShowManualHint] = useState(false);

  useEffect(() => {
    // 1. Check if already running in standalone app mode
    const checkIsStandalone = () => {
      const isRunningStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');

      if (isRunningStandalone) {
        setIsStandalone(true);
        setShowPrompt(false);
        return true;
      }
      return false;
    };

    if (checkIsStandalone()) {
      return;
    }

    // 2. Check early captured prompt from window.__pwaDeferredPrompt
    const win = window as unknown as { 
      __pwaDeferredPrompt?: BeforeInstallPromptEvent | null;
    };

    if (win.__pwaDeferredPrompt) {
      setDeferredPrompt(win.__pwaDeferredPrompt);
    }

    // 3. Listen to beforeinstallprompt event and custom ready event
    const handlePromptReady = (e?: Event) => {
      if (e && 'prompt' in e) {
        e.preventDefault();
        const promptEvent = e as BeforeInstallPromptEvent;
        setDeferredPrompt(promptEvent);
        win.__pwaDeferredPrompt = promptEvent;
      } else if (win.__pwaDeferredPrompt) {
        setDeferredPrompt(win.__pwaDeferredPrompt);
      }
      
      const dismissedThisSession = sessionStorage.getItem('sangam_pwa_dismissed') === 'true';
      if (!dismissedThisSession && !checkIsStandalone()) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handlePromptReady);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);

    // 4. Listen to appinstalled event
    const handleAppInstalled = () => {
      console.log('[PWA] App successfully downloaded and installed!');
      localStorage.setItem('sangam_pwa_installed', 'true');
      setIsStandalone(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      win.__pwaDeferredPrompt = null;
      toast.success('Sangam POS app installed successfully!');
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-app-installed', handleAppInstalled);

    // 5. Allow manual trigger from header button
    const handleManualOpen = () => {
      setShowPrompt(true);
    };
    window.addEventListener('open-pwa-install', handleManualOpen);

    // 6. Standalone display-mode change listener
    const mediaQueryList = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
        setShowPrompt(false);
      }
    };
    mediaQueryList.addEventListener('change', handleDisplayChange);

    // Show popup after 800ms unless dismissed in this tab session or already in standalone
    const timer = setTimeout(() => {
      const dismissedThisSession = sessionStorage.getItem('sangam_pwa_dismissed') === 'true';
      if (!checkIsStandalone() && !dismissedThisSession) {
        setShowPrompt(true);
      }
    }, 800);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePromptReady);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-app-installed', handleAppInstalled);
      window.removeEventListener('open-pwa-install', handleManualOpen);
      mediaQueryList.removeEventListener('change', handleDisplayChange);
      clearTimeout(timer);
    };
  }, []);

  // Primary action: Download / Install App
  const handleInstallClick = async () => {
    const win = window as unknown as { 
      __pwaDeferredPrompt?: BeforeInstallPromptEvent | null;
    };
    const activePrompt = deferredPrompt || win.__pwaDeferredPrompt;

    if (activePrompt) {
      try {
        setIsInstalling(true);
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        if (choice.outcome === 'accepted') {
          console.log('[PWA] User accepted install prompt');
          localStorage.setItem('sangam_pwa_installed', 'true');
          setShowPrompt(false);
          setDeferredPrompt(null);
          win.__pwaDeferredPrompt = null;
          toast.success('Installing Sangam POS app...');
        } else {
          console.log('[PWA] User dismissed install prompt');
        }
      } catch (err) {
        console.error('[PWA] Install error:', err);
        setShowManualHint(true);
      } finally {
        setIsInstalling(false);
      }
    } else {
      // If prompt is not directly callable (e.g. browser requires menu or still registering)
      setShowManualHint(true);
    }
  };

  const handleDismissForSession = () => {
    sessionStorage.setItem('sangam_pwa_dismissed', 'true');
    setShowPrompt(false);
  };

  // If already running standalone or hidden, do not render
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-md bg-gradient-to-b from-[#0f172a] via-[#0b1120] to-[#07090e] border border-blue-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_20px_60px_-15px_rgba(37,99,235,0.35)] text-white overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-20 bg-gradient-to-r from-blue-600/30 via-emerald-500/30 to-teal-500/30 blur-2xl pointer-events-none" />

        {/* Close button for current session */}
        <button
          onClick={handleDismissForSession}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-700/80 transition-colors z-20 cursor-pointer"
          title="Close (will show again next time until downloaded)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* App Logo & Title */}
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
              APP
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
              Install on your Mobile or Laptop for fast counter billing and 1-tap launch.
            </p>
          </div>
        </div>

        {/* Features Row */}
        <div className="mt-4 grid grid-cols-3 gap-2 py-2.5 px-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-center">
          <div className="flex flex-col items-center gap-0.5">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-[11px] font-bold text-slate-200">Instant POS</span>
            <span className="text-[9px] text-slate-400">Zero loading</span>
          </div>

          <div className="flex flex-col items-center gap-0.5 border-x border-slate-800">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-bold text-slate-200">Mobile Phone</span>
            <span className="text-[9px] text-slate-400">Android & iOS</span>
          </div>

          <div className="flex flex-col items-center gap-0.5">
            <Monitor className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-bold text-slate-200">Laptop / PC</span>
            <span className="text-[9px] text-slate-400">Desktop App</span>
          </div>
        </div>

        {/* Browser installation hint if prompt is triggered manually */}
        {showManualHint && (
          <div className="mt-3.5 p-3 rounded-xl bg-blue-950/40 border border-blue-500/40 text-xs text-slate-200 space-y-1.5 animate-in fade-in duration-200">
            <div className="font-bold text-blue-300 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span>How to Install on this browser:</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Open your browser menu (<strong>⋮</strong> at top-right or <strong>Share</strong> button) and tap <strong className="text-emerald-400">&ldquo;Install app&rdquo;</strong> or <strong className="text-emerald-400">&ldquo;Add to Home screen&rdquo;</strong>.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col gap-2 z-10 relative">
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-emerald-600 to-teal-500 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isInstalling ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4 animate-bounce" />
            )}
            <span>{isInstalling ? 'Preparing Download...' : 'Download / Install App'}</span>
          </button>

          <button
            onClick={handleDismissForSession}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700/60 transition-colors text-center cursor-pointer"
          >
            Continue in Browser
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-3 text-center text-[10px] text-slate-500">
          This pop-up will appear until the app is downloaded on this device.
        </div>
      </div>
    </div>
  );
}
