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
  Share2, 
  PlusSquare,
  Compass,
  ArrowRight
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

  // Platform detection
  const [isIPhone, setIsIPhone] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [isMacSafari, setIsMacSafari] = useState(false);

  useEffect(() => {
    // 1. Detect if running as installed standalone app (iOS home screen or Desktop PWA)
    const checkIsStandalone = () => {
      const isRunningStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');

      const isStoredInstalled = localStorage.getItem('sangam_pwa_installed') === 'true';

      if (isRunningStandalone || isStoredInstalled) {
        setIsStandalone(true);
        setShowPrompt(false);
        return true;
      }
      return false;
    };

    if (checkIsStandalone()) {
      return;
    }

    // 2. Detect platform & browser
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: boolean }).MSStream;
    const isMacDevice = /macintosh|mac os x/.test(userAgent) && !isIOSDevice;
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|crmo|edg|android/.test(userAgent);

    setIsIPhone(isIOSDevice);
    setIsMac(isMacDevice);
    setIsMacSafari(isMacDevice && isSafari);

    // 3. Early captured prompt from window.__pwaDeferredPrompt (Chromium: Windows, Android, Chrome on Mac)
    const win = window as unknown as { 
      __pwaDeferredPrompt?: BeforeInstallPromptEvent | null;
    };

    if (win.__pwaDeferredPrompt) {
      setDeferredPrompt(win.__pwaDeferredPrompt);
    }

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

    // 4. App installed event
    const handleAppInstalled = () => {
      localStorage.setItem('sangam_pwa_installed', 'true');
      setIsStandalone(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      win.__pwaDeferredPrompt = null;
      toast.success('Sangam POS app installed successfully!');
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-app-installed', handleAppInstalled);

    // 5. Header manual open trigger
    const handleManualOpen = () => {
      setShowPrompt(true);
    };
    window.addEventListener('open-pwa-install', handleManualOpen);

    // 6. Display mode change
    const mediaQueryList = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
        setShowPrompt(false);
      }
    };
    mediaQueryList.addEventListener('change', handleDisplayChange);

    // Show popup after brief delay
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

  // Windows / Android / Chrome 1-click install action
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
          localStorage.setItem('sangam_pwa_installed', 'true');
          setShowPrompt(false);
          setDeferredPrompt(null);
          win.__pwaDeferredPrompt = null;
          toast.success('Installing Sangam POS app...');
        }
      } catch (err) {
        console.error('[PWA] Install error:', err);
      } finally {
        setIsInstalling(false);
      }
    } else {
      toast.info('Follow the on-screen steps to add Sangam POS to your home screen or dock.');
    }
  };

  const handleMarkInstalled = () => {
    localStorage.setItem('sangam_pwa_installed', 'true');
    setIsStandalone(true);
    setShowPrompt(false);
    toast.success('Saved! This popup will no longer appear.');
  };

  const handleDismissForSession = () => {
    sessionStorage.setItem('sangam_pwa_dismissed', 'true');
    setShowPrompt(false);
  };

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
          title="Close (will show again next time until installed)"
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
              <span>Official App</span>
            </div>
            <h3 className="text-lg font-black text-white tracking-tight leading-tight">
              {isIPhone ? 'Install on iPhone' : isMac ? 'Install on Mac' : 'Download Sangam POS'}
            </h3>
            <p className="text-xs text-slate-300">
              Fast counter billing & one-tap launch on your device.
            </p>
          </div>
        </div>

        {/* CASE 1: IPHONE / IPAD (Apple requires native Share -> Add to Home Screen) */}
        {isIPhone && (
          <div className="mt-4 p-4 rounded-2xl bg-blue-950/50 border border-blue-500/40 text-xs text-slate-200 space-y-3 animate-in fade-in duration-200">
            <div className="font-bold text-blue-300 flex items-center gap-2 text-sm">
              <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
              <span>How to Install on iPhone Safari:</span>
            </div>
            
            <div className="space-y-2 text-slate-300 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-400/40 text-blue-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Tap the <strong className="text-white">Share</strong> button <Share2 className="w-3.5 h-3.5 inline text-blue-400 mx-0.5" /> at the bottom bar of Safari.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-400/40 text-blue-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Scroll down and tap <strong className="text-emerald-400">&ldquo;Add to Home Screen&rdquo;</strong> <PlusSquare className="w-3.5 h-3.5 inline text-emerald-400 mx-0.5" />.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-400/40 text-blue-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>Tap <strong className="text-white">&ldquo;Add&rdquo;</strong> in the top-right corner.</span>
              </div>
            </div>

            <button
              onClick={handleMarkInstalled}
              className="w-full mt-2 py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>I&apos;ve Added It to My iPhone</span>
            </button>
          </div>
        )}

        {/* CASE 2: MAC LAPTOP / DESKTOP */}
        {isMac && (
          <div className="mt-4 p-4 rounded-2xl bg-blue-950/50 border border-blue-500/40 text-xs text-slate-200 space-y-3 animate-in fade-in duration-200">
            <div className="font-bold text-blue-300 flex items-center gap-2 text-sm">
              <Monitor className="w-4 h-4 text-blue-400 shrink-0" />
              <span>How to Install on Mac:</span>
            </div>

            {isMacSafari ? (
              <div className="space-y-2 text-slate-300 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-400/40 text-blue-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>In Safari top menu: Click <strong className="text-white">File</strong> $\rightarrow$ <strong className="text-emerald-400">&ldquo;Add to Dock...&rdquo;</strong></span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-400/40 text-blue-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Click <strong className="text-white">&ldquo;Add&rdquo;</strong> — Sangam POS is now an app in your Mac Dock!</span>
                </div>
                <div className="text-[11px] text-slate-400 pt-1">
                  💡 Tip: You can also open this link in <strong className="text-white">Google Chrome on your Mac</strong> to install with 1-click just like Windows!
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-slate-300 text-xs">
                <p>Click <strong className="text-emerald-400">&ldquo;Download / Install App&rdquo;</strong> below, or click the Install icon (⊕) in your Chrome/Edge address bar at the top right.</p>
              </div>
            )}

            <button
              onClick={handleMarkInstalled}
              className="w-full mt-2 py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>I&apos;ve Added It to My Mac</span>
            </button>
          </div>
        )}

        {/* CASE 3: WINDOWS / ANDROID (1-Click Install Supported) */}
        {!isIPhone && !isMac && (
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
              <span className="text-[9px] text-slate-400">Windows & Mac</span>
            </div>
          </div>
        )}

        {/* Action Buttons for non-iPhone (or Chrome on Mac) */}
        {!isIPhone && (!isMac || !isMacSafari) && (
          <div className="mt-4 flex flex-col gap-2 z-10 relative">
            <button
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-emerald-600 to-teal-500 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4 animate-bounce" />
              <span>{isInstalling ? 'Opening Installer...' : 'Download / Install App'}</span>
            </button>
          </div>
        )}

        {/* Dismiss Button */}
        <div className="mt-2.5">
          <button
            onClick={handleDismissForSession}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700/60 transition-colors text-center cursor-pointer"
          >
            Continue in Browser
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-3 text-center text-[10px] text-slate-500">
          This pop-up will appear until the app is installed or saved on this device.
        </div>
      </div>
    </div>
  );
}
