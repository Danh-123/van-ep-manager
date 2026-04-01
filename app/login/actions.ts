'use server';

import { createClient } from '@/lib/supabase/server';

type AppRole = 'Admin' | 'KeToan' | 'Viewer';
type ViewerUserType = 'worker' | 'customer' | 'unknown';

type SignInResult =
  | { success: true; redirectTo: string; role: AppRole }
  | { success: false; error: string };

type UserResult = {
  user: {
    id: string;
    email: string | null;
  } | null;
  role: AppRole | null;
};

function resolveRedirectByRole(role: AppRole, viewerType: ViewerUserType): string {
  if (role !== 'Viewer') {
    return '/dashboard';
  }

  if (viewerType === 'customer') {
    return '/my-debt';
  }

  return '/my-salary';
}

async function resolveViewerUserType(userId: string): Promise<ViewerUserType> {
  const supabase = await createClient();

  const [workerResult, customerResult] = await Promise.all([
    supabase.from('cong_nhan').select('id').eq('user_id', userId).limit(1).maybeSingle(),
    supabase.from('khach_hang').select('id').eq('user_id', userId).limit(1).maybeSingle(),
  ]);

  if (workerResult.error || customerResult.error) {
    return 'unknown';
  }

  if (workerResult.data) {
    return 'worker';
  }

  if (customerResult.data) {
    return 'customer';
  }

  return 'unknown';
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data.user) {
    return { success: false, error: 'Khong tim thay thong tin nguoi dung.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  const role = (profile?.role ?? 'Viewer') as AppRole;
  const viewerType = role === 'Viewer' ? await resolveViewerUserType(data.user.id) : 'unknown';

  return {
    success: true,
    role,
    redirectTo: resolveRedirectByRole(role, viewerType),
  };
}

export async function signOut(): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getCurrentUser(): Promise<UserResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      role: null,
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    role: (profile?.role ?? 'Viewer') as AppRole,
  };
}
