import { redirect } from 'next/navigation';

import WoodTypesManager from '@/components/wood-types/WoodTypesManager';
import { createClient } from '@/lib/supabase/server';

export default async function WoodTypesPage() {
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

  return <WoodTypesManager />;
}
