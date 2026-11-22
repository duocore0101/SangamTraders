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
  ArrowDown,
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
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSArrow, setShowIOSArrow] = useState(false);

  // Platform detection
  const [isIOS, setIsIOS] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    // Check standalone mode (running as installed PWA)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    // Detect platform
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleMobile = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: boolean }).MSStream;
    const isAppleMac = /macintosh|mac os x/.test(ua) && !isAppleMobile;

    setIsIOS(isAppleMobile);
    setIsMac(isAppleMac);

    // If running in standalone mode (already installed & opened from home screen/dock), do not auto-popup
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

    // Manual open event from "Install App" button in header
    const handleManualOpen = () => {
      setShowPrompt(true);
      setShowIOSArrow(false);
    };
    window.addEventListener('open-pwa-install', handleManualOpen);

    // Auto-show popup after 800ms unless dismissed in this session
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

  // Primary action: Download / Install
  const handleInstallClick = async () => {
    const win = window as unknown as { 
      __pwaDeferredPrompt?: BeforeInstallPromptEvent | null;
    };
    const activePrompt = deferredPrompt || win.__pwaDeferredPrompt;

    // 1. If native Chromium install prompt is ready (Windows Chrome/Edge, Android, Mac Chrome)
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
        console.error('[PWA] prompt error:', err);
      } finally {
        setIsInstalling(false);
      }
      return;
    }

    // 2. If on iPhone / iPad (iOS): Apple requires Safari Share Sheet
    if (isIOS) {
      setShowIOSArrow(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      toast.info('Tap the Share button at the bottom of Safari, then choose "Add to Home Screen".');
      return;
    }

    // 3. If on Mac (Safari or desktop where prompt is unavailable):
    // Directly download the Mac Desktop App Launcher (.webloc)
    if (isMac) {
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
        toast.success('Downloaded Mac Desktop App Launcher! In Safari top menu, you can also click File > Add to Dock.');
      } catch (e) {
        console.error(e);
      }
      return;
    }

    // 4. Windows / Other PC fallback: download Windows Internet Shortcut (.url)
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
      toast.success('Downloaded Windows Desktop Shortcut! Move to your desktop to launch.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkInstalled = () => {
    localStorage.setItem('sangam_pwa_installed', 'true');
    setShowPrompt(false);
    setShowIOSArrow(false);
    toast.success('Saved! This popup will no longer appear.');
  };

  const handleDismissForSession = () => {
    sessionStorage.setItem('sangam_pwa_dismissed', 'true');
    setShowPrompt(false);
    setShowIOSArrow(false);
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
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-20 bg-gradient-to-r from-blue-600/30 via-emerald-500/30 to-teal-500/30 blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismissForSession}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-700/80 transition-colors z-20 cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* App Title & Icon */}
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
              {isIOS ? 'Install on iPhone' : isMac ? 'Download Mac App' : 'Download Sangam POS'}
            </h3>
            <p className="text-xs text-slate-300">
              Fast counter billing & one-tap launch on your device.
            </p>
          </div>
        </div>

        {/* iPhone / iPad Step-by-Step Instructions */}
        {isIOS && (
          <div className="mt-4 p-4 rounded-2xl bg-blue-950/60 border border-blue-500/50 text-xs text-slate-200 space-y-3 animate-in fade-in duration-200">
            <div className="font-bold text-blue-300 flex items-center gap-2 text-sm">
              <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
              <span>How to Install on iPhone:</span>
            </div>
            
            <div className="space-y-2.5 text-slate-200 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600/40 border border-blue-400 text-blue-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Tap the <strong className="text-white">Share</strong> button <Share2 className="w-3.5 h-3.5 inline text-blue-400 mx-0.5" /> at the bottom of Safari.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600/40 border border-blue-400 text-blue-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Scroll down and tap <strong className="text-emerald-400">&ldquo;Add to Home Screen&rdquo;</strong> <PlusSquare className="w-3.5 h-3.5 inline text-emerald-400 mx-0.5" />.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600/40 border border-blue-400 text-blue-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>Tap <strong className="text-white">&ldquo;Add&rdquo;</strong> in the top-right corner.</span>
              </div>
            </div>

            {showIOSArrow && (
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs flex items-center gap-2 animate-bounce">
                <ArrowDown className="w-4 h-4 shrink-0 text-amber-300" />
                <span>Look at the bottom toolbar of Safari and tap the Share button!</span>
              </div>
            )}
          </div>
        )}

        {/* Mac Instructions */}
        {isMac && (
          <div className="mt-4 p-4 rounded-2xl bg-blue-950/60 border border-blue-500/50 text-xs text-slate-200 space-y-2.5 animate-in fade-in duration-200">
            <div className="font-bold text-blue-300 flex items-center gap-2 text-sm">
              <Laptop className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Install on Mac:</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              Click <strong className="text-emerald-400">&ldquo;Download Mac App Launcher&rdquo;</strong> below to download the shortcut directly to your Mac, or in Safari top menu click <strong className="text-white">File &gt; Add to Dock...</strong>.
            </p>
            <p className="text-[11px] text-slate-400">
              💡 Tip: In Google Chrome on Mac, you can also install directly via the Install icon (⊕) in the address bar!
            </p>
          </div>
        )}

        {/* Features Row for Windows/Android */}
        {!isIOS && !isMac && (
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

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col gap-2 z-10 relative">
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-emerald-600 to-teal-500 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4 animate-bounce" />
            <span>
              {isInstalling 
                ? 'Opening Installer...' 
                : isIOS 
                ? 'Show iPhone Install Steps' 
                : isMac 
                ? 'Download Mac App Launcher' 
                : 'Download / Install App'}
            </span>
          </button>

          {/* Confirmation button to dismiss popup permanently */}
          <button
            onClick={handleMarkInstalled}
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Mark as installed on this device"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>I&apos;ve Added It to My Device (Don&apos;t show again)</span>
          </button>

          <button
            onClick={handleDismissForSession}
            className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700/60 transition-colors text-center cursor-pointer"
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
