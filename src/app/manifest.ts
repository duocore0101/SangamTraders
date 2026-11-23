import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sangam Enterprises - POS & ERP',
    short_name: 'Sangam POS',
    description: 'Fast GST Billing, Stock & Ledger Management for Sangam Sales and Sangam Automobiles and Sangam Traders',
    start_url: '/',
    scope: '/',
    id: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#07090e',
    theme_color: '#07090e',
    icons: [
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-256x256.png',
        sizes: '256x256',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Sangam Traders Login',
        short_name: 'Traders',
        description: 'Log into Sangam Traders',
        url: '/login?store=sangam-traders',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Sangam Sales and Sangam Automobiles Login',
        short_name: 'Sales & Auto',
        description: 'Log into Sangam Sales and Sangam Automobiles',
        url: '/login?store=sangam-sales-automobiles',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  };
}
