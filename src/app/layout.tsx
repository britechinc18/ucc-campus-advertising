import './globals.css';
import './premium.css';
import './campus.css';
import type { Metadata } from 'next';
import { Shell } from '@/components/shell';
import { viewer } from '@/server/viewer';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { default: 'MedStash · Find it on campus', template: '%s · MedStash' },
  description:
    'Products, services and wanted adverts for the University of Cape Coast medical-student community. Browse freely and contact advertisers directly.',
};
const themeScript =
  "try{document.documentElement.dataset.theme=localStorage.getItem('ucc-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')}catch(e){}";
export default async function Layout({ children }: { children: React.ReactNode }) {
  const v = await viewer();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Shell
          user={
            v.user
              ? { name: v.user.name, role: v.user.role, sellerActive: v.user.seller_active }
              : null
          }
        >
          {children}
        </Shell>
      </body>
    </html>
  );
}
