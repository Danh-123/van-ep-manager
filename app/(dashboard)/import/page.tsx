import { redirect } from 'next/navigation';

import ImportManager from '@/components/import/ImportManager';
import { createClient } from '@/lib/supabase/server';

export default async function ImportPage() {
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

  return <ImportManager />;
}
