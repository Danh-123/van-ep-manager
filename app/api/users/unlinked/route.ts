import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type AppUser = {
  id: string;
  email: string;
  full_name: string;
};

async function ensureManagerAccess() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, status: 401, error: 'Ban chua dang nhap' };
  }

  const profileResult = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return { ok: false as const, status: 403, error: 'Khong the xac thuc quyen truy cap' };
  }

  if (profileResult.data.role === 'Viewer') {
    return { ok: false as const, status: 403, error: 'Ban khong co quyen truy cap chuc nang nay' };
  }

  return { ok: true as const };
}

export async function GET() {
  const access = await ensureManagerAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const supabaseAdmin = createAdminClient();

  try {
    const users: AppUser[] = [];
    let page = 1;

    while (true) {
      const listResult = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (listResult.error) {
        return NextResponse.json({ error: listResult.error.message }, { status: 500 });
      }

      const current = listResult.data.users;
      if (!current || current.length === 0) {
        break;
      }

      current.forEach((user) => {
        users.push({
          id: user.id,
          email: user.email ?? '',
          full_name:
            (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
            (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
            '',
        });
      });

      if (current.length < 1000) {
        break;
      }

      page += 1;
    }

    const supabase = await createClient();
    const linkedResult = await supabase.from('cong_nhan').select('user_id').not('user_id', 'is', null);

    if (linkedResult.error) {
      return NextResponse.json({ error: linkedResult.error.message }, { status: 500 });
    }

    const linkedIds = new Set(
      ((linkedResult.data as Array<{ user_id: string | null }> | null) ?? [])
        .map((row) => row.user_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    );

    const unlinkedUsers = users
      .filter((user) => !linkedIds.has(user.id))
      .filter((user) => !!user.email)
      .sort((a, b) => a.email.localeCompare(b.email));

    return NextResponse.json({ users: unlinkedUsers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Khong the tai danh sach tai khoan chua lien ket' },
      { status: 500 },
    );
  }
}
