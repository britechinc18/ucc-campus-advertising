import { requireViewer } from '@/server/viewer';
import { AdminShell } from '@/components/admin-shell';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireViewer('/admin', true);
  return <AdminShell>{children}</AdminShell>;
}
