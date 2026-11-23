import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";

export const viewport: Viewport = {
  themeColor: "#07090e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Sangam Sales and Sangam Automobiles & Sangam Traders – Management System",
  description: "Hardware, Automobile Spares & Building Materials Billing, Inventory, and Accounting System by Duocore Software",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sangam POS",
  },
  icons: {
    icon: [
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Sangam POS" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Immediate Service Worker Registration
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function(e) {});
                }
                // Early capture of beforeinstallprompt before React hydration
                window.__pwaDeferredPrompt = null;
                window.addEventListener('beforeinstallprompt', function(e) {
                  e.preventDefault();
                  window.__pwaDeferredPrompt = e;
                  window.dispatchEvent(new CustomEvent('pwa-prompt-ready'));
                });
                window.addEventListener('appinstalled', function() {
                  window.__pwaDeferredPrompt = null;
                  try {
                    localStorage.setItem('sangam_pwa_installed', 'true');
                  } catch(e) {}
                  window.dispatchEvent(new CustomEvent('pwa-app-installed'));
                });
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
        {children}
        <PwaInstallPrompt />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
