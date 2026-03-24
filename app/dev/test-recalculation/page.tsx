import { notFound, redirect } from 'next/navigation';

import TestRecalculationClient from '@/app/dev/test-recalculation/TestRecalculationClient';
import { createClient } from '@/lib/supabase/server';

export default async function TestRecalculationPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

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

  return <TestRecalculationClient />;
}
