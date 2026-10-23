import './globals.css';
import './premium.css';
import './campus.css';
import './marketplace.css';
import './buyer-experience.css';
import type { Metadata } from 'next';
import { Shell } from '@/components/shell';
import { SiteFooter } from '@/components/site-footer';
import { viewer } from '@/server/viewer';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { default: 'MedStash · Find it on campus', template: '%s · MedStash' },
  manifest: '/manifest.webmanifest?v=2',
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/icons/icon-32.png?v=2', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png?v=2', sizes: '180x180' }],
  },
  description:
    'Products, services and wanted adverts from your community. Browse freely and contact advertisers directly.',
};
const themeScript =
  "try{document.documentElement.dataset.theme=localStorage.getItem('ucc-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')}catch(e){}";
export default async function Layout({ children }: { children: React.ReactNode }) {
  const v = await viewer();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/dm-sans-400.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/dm-sans-500.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Shell
          footer={<SiteFooter />}
          user={
            v.user
              ? {
                  name: v.user.name,
                  image: v.user.image,
                  role: v.user.role,
                  sellerActive: v.user.seller_active,
                  buyerMode: v.user.buyer_mode,
                }
              : null
          }
        >
          {children}
        </Shell>
      </body>
    </html>
  );
}
