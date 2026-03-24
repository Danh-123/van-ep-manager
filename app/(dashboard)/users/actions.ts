'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const userRoleSchema = z.enum(['Admin', 'KeToan', 'Viewer']);

const userFilterSchema = z.object({
  search: z.string().optional(),
  role: userRoleSchema.or(z.literal('TatCa')).optional(),
});

const createUserSchema = z.object({
  email: z.string().trim().email('Email khong hop le'),
  fullName: z.string().trim().min(2, 'Ho ten phai co it nhat 2 ky tu').max(120),
  password: z.string().min(8, 'Mat khau tam thoi phai co it nhat 8 ky tu').max(128),
  role: userRoleSchema,
});

const updateUserSchema = z.object({
  id: z.string().uuid('ID nguoi dung khong hop le'),
  fullName: z.string().trim().min(2, 'Ho ten phai co it nhat 2 ky tu').max(120),
  role: userRoleSchema,
});

const deleteUserSchema = z.object({
  id: z.string().uuid('ID nguoi dung khong hop le'),
});

const resetPasswordSchema = z.object({
  id: z.string().uuid('ID nguoi dung khong hop le'),
  email: z.string().trim().email('Email khong hop le'),
});

export type UserRole = z.infer<typeof userRoleSchema>;

export type UserItem = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function toUserItem(row: {
  id: string;
  email: string | null;
  full_name: string;
  role: string;
  is_active: boolean | null;
  created_at: string;
}): UserItem {
  const role = row.role === 'Admin' || row.role === 'KeToan' || row.role === 'Viewer' ? row.role : 'Viewer';

  return {
    id: row.id,
    email: row.email ?? '',
    fullName: row.full_name,
    role,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
  };
}

async function ensureAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Ban chua dang nhap');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile || profile.role !== 'Admin') {
    throw new Error('Chi Admin moi co quyen truy cap');
  }

  return {
    supabase,
    currentUserId: user.id,
  };
}

async function hasRelatedData(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const [workersRes, attendanceRes, ticketsRes, paymentsRes, auditRes] = await Promise.all([
    supabase.from('cong_nhan').select('id', { head: true, count: 'exact' }).eq('created_by', userId),
    supabase.from('cham_cong').select('id', { head: true, count: 'exact' }).eq('created_by', userId),
    supabase.from('phieu_can').select('id', { head: true, count: 'exact' }).eq('created_by', userId),
    supabase.from('lich_su_thanh_toan').select('id', { head: true, count: 'exact' }).eq('created_by', userId),
    supabase.from('audit_log').select('id', { head: true, count: 'exact' }).eq('changed_by', userId),
  ]);

  const errors = [workersRes, attendanceRes, ticketsRes, paymentsRes, auditRes]
    .map((item) => item.error?.message)
    .filter(Boolean);

  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  const totalRelated =
    (workersRes.count ?? 0) +
    (attendanceRes.count ?? 0) +
    (ticketsRes.count ?? 0) +
    (paymentsRes.count ?? 0) +
    (auditRes.count ?? 0);

  return totalRelated > 0;
}

export async function getUsers(
  rawFilters: z.input<typeof userFilterSchema> = {},
): Promise<ActionResult<UserItem[]>> {
  const filters = userFilterSchema.parse(rawFilters);

  try {
    const { supabase } = await ensureAdmin();

    let query = supabase
      .from('profiles')
      .select('id, email, full_name, role, is_active, created_at')
      .order('created_at', { ascending: false });

    if (filters.search?.trim()) {
      const search = filters.search.trim();
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    if (filters.role && filters.role !== 'TatCa') {
      query = query.eq('role', filters.role);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: (data ?? []).map((row) =>
        toUserItem(
          row as {
            id: string;
            email: string | null;
            full_name: string;
            role: string;
            is_active: boolean | null;
            created_at: string;
          },
        ),
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the tai danh sach nguoi dung',
    };
  }
}

export async function createUser(
  rawInput: z.input<typeof createUserSchema>,
): Promise<ActionResult<UserItem>> {
  const parsed = createUserSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le',
    };
  }

  try {
    const { supabase } = await ensureAdmin();
    const payload = parsed.data;
    const email = payload.email.toLowerCase();

    const adminClient = createAdminClient();

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.fullName,
      },
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    const authUserId = authData.user?.id;
    if (!authUserId) {
      return { success: false, error: 'Khong the tao tai khoan Auth' };
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: authUserId,
          email,
          full_name: payload.fullName,
          role: payload.role,
          is_active: true,
        },
        { onConflict: 'id' },
      )
      .select('id, email, full_name, role, is_active, created_at')
      .single();

    if (error) {
      await adminClient.auth.admin.deleteUser(authUserId);
      return { success: false, error: error.message };
    }

    revalidatePath('/users');

    return {
      success: true,
      data: toUserItem(
        data as {
          id: string;
          email: string | null;
          full_name: string;
          role: string;
          is_active: boolean | null;
          created_at: string;
        },
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the tao nguoi dung',
    };
  }
}

export async function updateUser(
  rawInput: z.input<typeof updateUserSchema>,
): Promise<ActionResult<UserItem>> {
  const parsed = updateUserSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le',
    };
  }

  try {
    const { supabase, currentUserId } = await ensureAdmin();
    const payload = parsed.data;

    const { data: existing, error: existingError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, is_active, created_at')
      .eq('id', payload.id)
      .maybeSingle();

    if (existingError) {
      return { success: false, error: existingError.message };
    }

    if (!existing) {
      return { success: false, error: 'Nguoi dung khong ton tai' };
    }

    const existingRole = (existing as { role: string }).role;
    if (currentUserId === payload.id && existingRole !== payload.role) {
      return {
        success: false,
        error: 'Khong the thay doi vai tro cua chinh minh',
      };
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: payload.fullName,
        role: payload.role,
      })
      .eq('id', payload.id)
      .select('id, email, full_name, role, is_active, created_at')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/users');

    return {
      success: true,
      data: toUserItem(
        data as {
          id: string;
          email: string | null;
          full_name: string;
          role: string;
          is_active: boolean | null;
          created_at: string;
        },
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the cap nhat nguoi dung',
    };
  }
}

export async function resetPassword(
  rawInput: z.input<typeof resetPasswordSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = resetPasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le',
    };
  }

  try {
    const { supabase } = await ensureAdmin();
    const payload = parsed.data;

    const { data: existing, error: existingError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', payload.id)
      .maybeSingle();

    if (existingError) {
      return { success: false, error: existingError.message };
    }

    if (!existing) {
      return { success: false, error: 'Nguoi dung khong ton tai' };
    }

    const redirectBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
    const redirectTo = redirectBase ? `${redirectBase}/login` : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(payload.email, {
      redirectTo,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: { id: payload.id },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the gui email reset mat khau',
    };
  }
}

export async function deleteUser(
  rawInput: z.input<typeof deleteUserSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = deleteUserSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le',
    };
  }

  try {
    const { supabase, currentUserId } = await ensureAdmin();
    const payload = parsed.data;

    if (payload.id === currentUserId) {
      return {
        success: false,
        error: 'Khong the tu xoa tai khoan cua chinh minh',
      };
    }

    const { data: existing, error: existingError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', payload.id)
      .maybeSingle();

    if (existingError) {
      return { success: false, error: existingError.message };
    }

    if (!existing) {
      return { success: false, error: 'Nguoi dung khong ton tai' };
    }

    const relatedDataExists = await hasRelatedData(supabase, payload.id);
    if (relatedDataExists) {
      return {
        success: false,
        error: 'Khong the xoa nguoi dung vi da co du lieu lien quan',
      };
    }

    const adminClient = createAdminClient();
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(payload.id);

    if (authDeleteError) {
      return { success: false, error: authDeleteError.message };
    }

    const { error: cleanupError } = await supabase.from('profiles').delete().eq('id', payload.id);
    if (cleanupError && cleanupError.code !== 'PGRST116') {
      return { success: false, error: cleanupError.message };
    }

    revalidatePath('/users');

    return {
      success: true,
      data: { id: payload.id },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the xoa nguoi dung',
    };
  }
}
