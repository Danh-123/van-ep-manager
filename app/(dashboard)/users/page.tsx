import { redirect } from 'next/navigation';

import UsersManager from '@/components/users/UsersManager';
import { createClient } from '@/lib/supabase/server';

export default async function UsersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'Admin') {
    redirect('/dashboard');
  }

  return <UsersManager currentUserId={user.id} />;
}
