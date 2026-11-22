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
  ArrowDownToLine,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMacSafari, setIsMacSafari] = useState(false);
  const [isWindows, setIsWindows] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [downloadedShortcut, setDownloadedShortcut] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      });
    }

    // 2. Check if already installed / running in standalone mode
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      
      const storedInstalled = localStorage.getItem('sangam_pwa_installed') === 'true';

      setIsStandalone(isStandaloneMode || storedInstalled);

      // If already installed or running as installed app, do NOT show popup
      if (isStandaloneMode || storedInstalled) {
        setShowPrompt(false);
        return true;
      }
      return false;
    };

    if (checkStandalone()) {
      return;
    }

    // 3. Platform & Browser detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleMobile = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: boolean }).MSStream;
    const isAppleMac = /macintosh|mac os x/.test(userAgent);
    const isSafariBrowser = /safari/.test(userAgent) && !/chrome|crios|crmo|edg|android/.test(userAgent);
    const isWin = /win|windows/.test(userAgent);

    setIsIOS(isAppleMobile);
    setIsMac(isAppleMac);
    setIsMacSafari(isAppleMac && isSafariBrowser);
    setIsWindows(isWin);

    // 4. Capture 'beforeinstallprompt' for Chromium browsers (Desktop Chrome/Edge & Android Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      // Show prompt immediately when ready if not dismissed in this single tab session
      const dismissedThisSession = sessionStorage.getItem('sangam_pwa_dismissed_session') === 'true';
      if (!dismissedThisSession) {
        setShowPrompt(true);
      }
    };

    // 5. Capture 'appinstalled' event when user completes installation
    const handleAppInstalled = () => {
      console.log('[PWA] App successfully installed on device/PC');
      localStorage.setItem('sangam_pwa_installed', 'true');
      setIsStandalone(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      toast.success('Sangam POS app installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const handleManualOpen = () => {
      setShowPrompt(true);
    };
    window.addEventListener('open-pwa-install', handleManualOpen);

    // Listen to display-mode media query change (e.g. if opened inside PWA later)
    const mediaQueryList = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        localStorage.setItem('sangam_pwa_installed', 'true');
        setIsStandalone(true);
        setShowPrompt(false);
      }
    };
    mediaQueryList.addEventListener('change', handleDisplayModeChange);

    // Show prompt after brief delay unless dismissed in this session
    const timer = setTimeout(() => {
      const dismissedThisSession = sessionStorage.getItem('sangam_pwa_dismissed_session') === 'true';
      if (!checkStandalone() && !dismissedThisSession) {
        setShowPrompt(true);
      }
    }, 1000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('open-pwa-install', handleManualOpen);
      mediaQueryList.removeEventListener('change', handleDisplayModeChange);
      clearTimeout(timer);
    };
  }, []);

  // Trigger downloading a native desktop app shortcut (.webloc for Mac, .url for Windows)
  const triggerDesktopFileDownload = () => {
    const origin = window.location.origin;

    if (isMac || isMacSafari) {
      // macOS Web Bookmark file (.webloc)
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
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Sangam-POS.webloc';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloadedShortcut(true);
      toast.success('Downloaded Mac Desktop Shortcut (Sangam-POS.webloc)! Double click it on your Mac to launch.');
    } else {
      // Windows Internet Shortcut file (.url)
      const ini = `[InternetShortcut]\r\nURL=${origin}\r\nIconIndex=0\r\n`;
      const blob = new Blob([ini], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Sangam-POS.url';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloadedShortcut(true);
      toast.success('Downloaded Windows Desktop Shortcut (Sangam-POS.url)! Move it to your desktop to launch.');
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Native browser install prompt supported (Chrome, Edge, Android)
      try {
        setIsInstalling(true);
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          console.log('[PWA] User accepted the install prompt');
          localStorage.setItem('sangam_pwa_installed', 'true');
          setShowPrompt(false);
          setDeferredPrompt(null);
          toast.success('Installing Sangam POS app...');
        } else {
          console.log('[PWA] User dismissed the install prompt');
        }
      } catch (err) {
        console.error('[PWA] Install prompt error:', err);
      } finally {
        setIsInstalling(false);
      }
    } else if (isMacSafari) {
      // Mac Safari: Trigger instant desktop shortcut file download
      triggerDesktopFileDownload();
    } else if (isIOS) {
      // iOS Safari guide
      toast.info('Tap the Share icon at the bottom of Safari, then choose "Add to Home Screen".');
    } else {
      // Desktop without deferredPrompt yet: download desktop file shortcut
      triggerDesktopFileDownload();
    }
  };

  const handleMarkInstalled = () => {
    localStorage.setItem('sangam_pwa_installed', 'true');
    setIsStandalone(true);
    setShowPrompt(false);
    toast.success('Saved! This popup will no longer appear on this device.');
  };

  const handleDismissForSession = () => {
    sessionStorage.setItem('sangam_pwa_dismissed_session', 'true');
    setShowPrompt(false);
  };

  // If already running standalone or installed, never render
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-lg bg-gradient-to-b from-[#0f172a] via-[#0b1120] to-[#07090e] border border-blue-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_20px_60px_-15px_rgba(37,99,235,0.35)] text-white overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-24 bg-gradient-to-r from-blue-600/30 via-emerald-500/30 to-amber-500/30 blur-2xl pointer-events-none" />

        {/* Close button for current session */}
        <button
          onClick={handleDismissForSession}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-700/80 transition-colors z-20 cursor-pointer"
          title="Continue in browser (remind next time)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with App Logo and Badges */}
        <div className="flex items-start gap-4 z-10 relative">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 p-1.5 border-2 border-amber-400/60 shadow-lg shadow-amber-500/10 shrink-0 flex items-center justify-center">
            <Image
              src="/icons/icon-192x192.png"
              alt="Sangam App Logo"
              width={80}
              height={80}
              className="w-full h-full object-contain rounded-xl"
            />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-[10px] text-slate-950 font-black px-1.5 py-0.5 rounded-full border border-emerald-300 shadow">
              PWA
            </div>
          </div>

          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-1.5 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official App Available</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
              Download Sangam POS App
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Install directly to your PC desktop or Mobile home screen for fast counter billing.
            </p>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-5 grid grid-cols-3 gap-2 py-3 px-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-center">
          <div className="flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-200">Instant POS</span>
            <span className="text-[9px] text-slate-400">Zero loading delay</span>
          </div>

          <div className="flex flex-col items-center gap-1 border-x border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Monitor className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-200">PC & Laptop</span>
            <span className="text-[9px] text-slate-400">Desktop shortcut</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-200">Mobile Phone</span>
            <span className="text-[9px] text-slate-400">Android & iOS</span>
          </div>
        </div>

        {/* Mac Safari Specific Instructions */}
        {isMacSafari && (
          <div className="mt-4 p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/40 text-xs text-slate-200 space-y-2 animate-in fade-in duration-200">
            <div className="font-bold text-blue-300 flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-blue-400" />
              How to Install as App on Mac Safari:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
              <li>In Safari top menu: Click <strong className="text-white">File</strong> $\rightarrow$ <strong className="text-white">&ldquo;Add to Dock...&rdquo;</strong></li>
              <li>Or click the <strong className="text-white">Share</strong> button <Share2 className="w-3 h-3 inline text-blue-400" /> in Safari toolbar $\rightarrow$ <strong className="text-white">&ldquo;Add to Dock&rdquo;</strong></li>
              <li>Click <strong className="text-white">&ldquo;Add&rdquo;</strong> — Sangam POS is now an app in your Mac Dock!</li>
            </ol>
          </div>
        )}

        {/* iOS Specific Instructions */}
        {isIOS && (
          <div className="mt-4 p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/40 text-xs text-slate-200 space-y-2 animate-in fade-in duration-200">
            <div className="font-bold text-blue-300 flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-blue-400" />
              How to Install on iPhone / iPad:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
              <li>Tap the <strong className="text-white">Share</strong> button <Share2 className="w-3 h-3 inline text-blue-400" /> in Safari&apos;s bottom bar.</li>
              <li>Scroll down and tap <strong className="text-white">&ldquo;Add to Home Screen&rdquo;</strong> <PlusSquare className="w-3 h-3 inline text-emerald-400" />.</li>
              <li>Tap <strong className="text-white">&ldquo;Add&rdquo;</strong> in the top right.</li>
            </ol>
          </div>
        )}

        {/* Chrome / Edge on PC/Laptop instructions if native prompt is ready or in address bar */}
        {!isMacSafari && !isIOS && !deferredPrompt && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-slate-200 space-y-1.5 animate-in fade-in duration-200">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-emerald-400" />
              Install on Laptop / PC (Chrome or Edge):
            </div>
            <p className="text-[11px] text-slate-300">
              Click <strong className="text-white">&ldquo;Download App / Shortcut&rdquo;</strong> below to download the Desktop Shortcut, or click the <strong className="text-white">Install App</strong> icon (⊞ / ⊕) in your browser address bar at the top right.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex flex-col gap-2 z-10 relative">
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-emerald-600 to-teal-500 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isInstalling ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowDownToLine className="w-4 h-4 animate-bounce" />
            )}
            <span>
              {deferredPrompt
                ? 'Install App Now'
                : isMacSafari || isMac
                ? 'Download Mac Desktop Shortcut (.webloc)'
                : isWindows
                ? 'Download Windows Desktop Shortcut (.url)'
                : 'Download / Install App'}
            </span>
          </button>

          <div className="flex gap-2">
            {/* If user downloaded or installed, they can click "I've Installed It" to permanently dismiss */}
            <button
              onClick={handleMarkInstalled}
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Save installation on this laptop so this popup never appears again"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>I&apos;ve Installed It (Don&apos;t show again)</span>
            </button>

            <button
              onClick={handleDismissForSession}
              className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700/60 transition-colors text-center cursor-pointer"
            >
              Continue in Browser
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-3 text-center text-[10px] text-slate-500">
          This pop-up appears on this device until the app is installed or saved.
        </div>
      </div>
    </div>
  );
}
