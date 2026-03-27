import { redirect } from 'next/navigation';

import Header from '@/components/dashboard/Header';
import Sidebar from '@/components/dashboard/Sidebar';
import { SidebarProvider } from '@/components/dashboard/SidebarContext';
import { createClient } from '@/lib/supabase/server';

type DashboardLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile?.role as string | null) ?? 'Viewer';
  const fullName =
    profile?.full_name?.trim() ||
    user.user_metadata?.full_name ||
    (user.email ? user.email.split('@')[0] : 'Nguoi dung');

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-slate-50">
        <Sidebar role={role} />

        <div className="flex min-h-screen flex-1 flex-col md:pl-72">
          <Header fullName={fullName} role={role} />
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
