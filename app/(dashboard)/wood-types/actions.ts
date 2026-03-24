'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const woodTypeSchema = z.object({
  tenLoai: z.string().trim().min(2, 'Ten loai phai co it nhat 2 ky tu').max(120),
  donGia: z.number().positive('Don gia phai lon hon 0'),
  donVi: z.enum(['m2', 'kg']),
});

const updateWoodTypeSchema = woodTypeSchema.extend({
  id: z.number().int().positive(),
});

export type WoodTypeItem = {
  id: number;
  maLoai: string;
  tenLoai: string;
  donGia: number;
  donVi: 'm2' | 'kg';
  createdAt: string;
};

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
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

  return supabase;
}

async function generateWoodTypeCode(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from('loai_van_ep')
    .select('ma_loai')
    .ilike('ma_loai', 'LVE%')
    .order('ma_loai', { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(error.message);
  }

  let maxValue = 0;
  (data ?? []).forEach((row) => {
    const code = (row as { ma_loai?: string }).ma_loai ?? '';
    const match = code.match(/^LVE(\d+)$/i);
    if (!match) return;
    const numericValue = Number(match[1]);
    if (Number.isFinite(numericValue)) {
      maxValue = Math.max(maxValue, numericValue);
    }
  });

  return `LVE${String(maxValue + 1).padStart(4, '0')}`;
}

export async function getWoodTypes(): Promise<ActionResult<WoodTypeItem[]>> {
  try {
    const supabase = await ensureAdmin();

    const { data, error } = await supabase
      .from('loai_van_ep')
      .select('id, ma_loai, ten_loai, don_gia, don_vi, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: (data ?? []).map((row) => {
        const typed = row as {
          id: number;
          ma_loai: string;
          ten_loai: string;
          don_gia: number | string;
          don_vi: string;
          created_at: string;
        };

        return {
          id: typed.id,
          maLoai: typed.ma_loai,
          tenLoai: typed.ten_loai,
          donGia: toNumber(typed.don_gia),
          donVi: typed.don_vi === 'kg' ? 'kg' : 'm2',
          createdAt: typed.created_at,
        };
      }),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the tai danh sach loai van ep',
    };
  }
}

export async function createWoodType(
  input: z.input<typeof woodTypeSchema>,
): Promise<ActionResult<WoodTypeItem>> {
  const parsed = woodTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le',
    };
  }

  try {
    const supabase = await ensureAdmin();
    const payload = parsed.data;

    const existingResult = await supabase
      .from('loai_van_ep')
      .select('id')
      .ilike('ten_loai', payload.tenLoai)
      .maybeSingle();

    if (existingResult.error) {
      return { success: false, error: existingResult.error.message };
    }

    if (existingResult.data) {
      return { success: false, error: 'Ten loai da ton tai' };
    }

    const maLoai = await generateWoodTypeCode(supabase);

    const { data, error } = await supabase
      .from('loai_van_ep')
      .insert({
        ma_loai: maLoai,
        ten_loai: payload.tenLoai,
        don_gia: payload.donGia,
        don_vi: payload.donVi,
        is_active: true,
      })
      .select('id, ma_loai, ten_loai, don_gia, don_vi, created_at')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/wood-types');

    const typed = data as {
      id: number;
      ma_loai: string;
      ten_loai: string;
      don_gia: number | string;
      don_vi: string;
      created_at: string;
    };

    return {
      success: true,
      data: {
        id: typed.id,
        maLoai: typed.ma_loai,
        tenLoai: typed.ten_loai,
        donGia: toNumber(typed.don_gia),
        donVi: typed.don_vi === 'kg' ? 'kg' : 'm2',
        createdAt: typed.created_at,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the tao loai van ep',
    };
  }
}

export async function updateWoodType(
  input: z.input<typeof updateWoodTypeSchema>,
): Promise<ActionResult<WoodTypeItem>> {
  const parsed = updateWoodTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le',
    };
  }

  try {
    const supabase = await ensureAdmin();
    const payload = parsed.data;

    const duplicateResult = await supabase
      .from('loai_van_ep')
      .select('id')
      .ilike('ten_loai', payload.tenLoai)
      .neq('id', payload.id)
      .maybeSingle();

    if (duplicateResult.error) {
      return { success: false, error: duplicateResult.error.message };
    }

    if (duplicateResult.data) {
      return { success: false, error: 'Ten loai da ton tai' };
    }

    const { data, error } = await supabase
      .from('loai_van_ep')
      .update({
        ten_loai: payload.tenLoai,
        don_gia: payload.donGia,
        don_vi: payload.donVi,
      })
      .eq('id', payload.id)
      .select('id, ma_loai, ten_loai, don_gia, don_vi, created_at')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/wood-types');

    const typed = data as {
      id: number;
      ma_loai: string;
      ten_loai: string;
      don_gia: number | string;
      don_vi: string;
      created_at: string;
    };

    return {
      success: true,
      data: {
        id: typed.id,
        maLoai: typed.ma_loai,
        tenLoai: typed.ten_loai,
        donGia: toNumber(typed.don_gia),
        donVi: typed.don_vi === 'kg' ? 'kg' : 'm2',
        createdAt: typed.created_at,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the cap nhat loai van ep',
    };
  }
}

export async function deleteWoodType(id: number): Promise<ActionResult<{ id: number }>> {
  if (!Number.isFinite(id) || id <= 0) {
    return {
      success: false,
      error: 'ID khong hop le',
    };
  }

  try {
    const supabase = await ensureAdmin();

    const { error } = await supabase.from('loai_van_ep').delete().eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return {
          success: false,
          error: 'Khong the xoa vi loai van ep dang duoc su dung trong phieu can.',
        };
      }

      return { success: false, error: error.message };
    }

    revalidatePath('/wood-types');

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the xoa loai van ep',
    };
  }
}

export async function importDefaultWoodTypes(): Promise<
  ActionResult<{ inserted: number; updated: number }>
> {
  try {
    const supabase = await ensureAdmin();

    const defaults: Array<{ tenLoai: string; donGia: number; donVi: 'm2' | 'kg' }> = [
      { tenLoai: 'Van ep 15mm', donGia: 210000, donVi: 'm2' },
      { tenLoai: 'Van ep 18mm', donGia: 245000, donVi: 'm2' },
      { tenLoai: 'Van ep 20mm', donGia: 275000, donVi: 'm2' },
      { tenLoai: 'Van ep phu phim', donGia: 295000, donVi: 'm2' },
      { tenLoai: 'Van ep cong nghiep', donGia: 18000, donVi: 'kg' },
    ];

    let inserted = 0;
    let updated = 0;

    for (const item of defaults) {
      const existing = await supabase
        .from('loai_van_ep')
        .select('id')
        .ilike('ten_loai', item.tenLoai)
        .maybeSingle();

      if (existing.error) {
        return { success: false, error: existing.error.message };
      }

      if (existing.data) {
        const updateResult = await supabase
          .from('loai_van_ep')
          .update({
            don_gia: item.donGia,
            don_vi: item.donVi,
            is_active: true,
          })
          .eq('id', (existing.data as { id: number }).id);

        if (updateResult.error) {
          return { success: false, error: updateResult.error.message };
        }

        updated += 1;
        continue;
      }

      const maLoai = await generateWoodTypeCode(supabase);

      const insertResult = await supabase.from('loai_van_ep').insert({
        ma_loai: maLoai,
        ten_loai: item.tenLoai,
        don_gia: item.donGia,
        don_vi: item.donVi,
        is_active: true,
      });

      if (insertResult.error) {
        return { success: false, error: insertResult.error.message };
      }

      inserted += 1;
    }

    revalidatePath('/wood-types');

    return {
      success: true,
      data: {
        inserted,
        updated,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the import du lieu mac dinh',
    };
  }
}
