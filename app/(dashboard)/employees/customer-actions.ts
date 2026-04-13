'use server';

import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

export type CustomerType = 'mua' | 'ban';

function normalizeCustomerType(value: unknown): CustomerType {
  return value === 'ban' ? 'ban' : 'mua';
}

const createCustomerSchema = z.object({
  maKhachHang: z.string().trim().optional(),
  tenKhachHang: z.string().trim().min(2, 'Ten khach hang phai co it nhat 2 ky tu').max(160),
  loaiKhachHang: z.enum(['mua', 'ban']).optional(),
  soDienThoai: z
    .string()
    .trim()
    .regex(/^[0-9+\-() ]{8,20}$/, 'So dien thoai khong hop le')
    .optional()
    .or(z.literal('')),
  diaChi: z.string().trim().max(240).optional().or(z.literal('')),
});

const updateCustomerSchema = z.object({
  id: z.number().int().positive(),
  maKhachHang: z.string().trim().min(2, 'Ma khach hang khong hop le').max(30),
  tenKhachHang: z.string().trim().min(2, 'Ten khach hang phai co it nhat 2 ky tu').max(160),
  loaiKhachHang: z.enum(['mua', 'ban']).optional(),
  soDienThoai: z
    .string()
    .trim()
    .regex(/^[0-9+\-() ]{8,20}$/, 'So dien thoai khong hop le')
    .optional()
    .or(z.literal('')),
  diaChi: z.string().trim().max(240).optional().or(z.literal('')),
});

const importRowSchema = z.object({
  maKhachHang: z.string().trim().min(2).max(30).optional().or(z.literal('')),
  tenKhachHang: z.string().trim().min(2, 'Ten khach hang bat buoc').max(160),
  loaiKhachHang: z.enum(['mua', 'ban']).optional(),
  soDienThoai: z
    .string()
    .trim()
    .regex(/^[0-9+\-() ]{8,20}$/, 'So dien thoai khong hop le')
    .optional()
    .or(z.literal('')),
  diaChi: z.string().trim().max(240).optional().or(z.literal('')),
});

export type CustomerItem = {
  id: number;
  maKhachHang: string;
  tenKhachHang: string;
  loaiKhachHang: CustomerType;
  soDienThoai: string | null;
  diaChi: string | null;
  createdAt: string;
};

export type CustomersQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
};

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type ImportRowInput = {
  maKhachHang?: string;
  tenKhachHang: string;
  loaiKhachHang?: CustomerType;
  soDienThoai?: string;
  diaChi?: string;
};

function mapDbError(error: unknown) {
  const typed = error as { code?: string; message?: string } | null;
  const code = typed?.code ?? '';
  const message = typed?.message ?? 'Loi CSDL khong xac dinh';

  if (code === '42501') {
    return 'Khong du quyen thao tac bang khach_hang. Vui long kiem tra RLS policy tren Supabase.';
  }

  if (code === '23505') {
    if (message.includes('khach_hang_ten_unique')) {
      return 'Ten khach hang da ton tai. Vui long nhap ten khac.';
    }

    if (message.includes('khach_hang_ma_unique')) {
      return 'Ma khach hang da ton tai. Vui long nhap ma khac.';
    }

    return 'Du lieu bi trung (UNIQUE). Vui long kiem tra ma hoac ten khach hang.';
  }

  return message;
}

function normalizePhone(phone?: string) {
  const value = phone?.trim();
  return value ? value : null;
}

function normalizeAddress(address?: string) {
  const value = address?.trim();
  return value ? value : null;
}

async function generateCustomerCode() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('khach_hang')
    .select('ma_khach_hang')
    .ilike('ma_khach_hang', 'KH%')
    .order('ma_khach_hang', { ascending: false })
    .limit(500);

  let maxNumber = 0;
  (data ?? []).forEach((row) => {
    const ma = (row as { ma_khach_hang?: string }).ma_khach_hang ?? '';
    const match = ma.match(/^(?:KH)(\d+)$/i);
    if (!match) return;
    const numericValue = Number(match[1]);
    if (Number.isFinite(numericValue)) {
      maxNumber = Math.max(maxNumber, numericValue);
    }
  });

  return `KH${String(maxNumber + 1).padStart(4, '0')}`;
}

function mapCustomerRow(row: Record<string, unknown>): CustomerItem {
  return {
    id: Number(row.id),
    maKhachHang:
      (row.ma_khach_hang as string | undefined) ??
      (row.ma as string | undefined) ??
      (row.code as string | undefined) ??
      '',
    tenKhachHang:
      (row.ten_khach_hang as string | undefined) ??
      (row.ten as string | undefined) ??
      (row.name as string | undefined) ??
      (row.ho_ten as string | undefined) ??
      '',
    loaiKhachHang: normalizeCustomerType(row.loai_khach_hang),
    soDienThoai:
      (row.so_dien_thoai as string | undefined) ??
      (row.sdt as string | undefined) ??
      (row.phone as string | undefined) ??
      null,
    diaChi:
      (row.dia_chi as string | undefined) ??
      (row.diachi as string | undefined) ??
      (row.address as string | undefined) ??
      null,
    createdAt: ((row.created_at as string | undefined) ?? new Date().toISOString()),
  };
}

export async function getCustomers(query: CustomersQuery = {}): Promise<ActionResult<{
  items: CustomerItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}>> {
  const supabase = await createClient();

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  let dbQuery = supabase
    .from('khach_hang')
    .select('id, ma_khach_hang, ten_khach_hang, loai_khach_hang, so_dien_thoai, dia_chi, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end);

  if (query.search?.trim()) {
    const search = query.search.trim();
    dbQuery = dbQuery.or(`ma_khach_hang.ilike.%${search}%,ten_khach_hang.ilike.%${search}%,so_dien_thoai.ilike.%${search}%`);
  }

  const { data, error, count } = await dbQuery;

  if (error) {
    return {
      success: false,
      error: mapDbError(error),
    };
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    success: true,
    data: {
      items: (data ?? []).map((row) => mapCustomerRow(row as Record<string, unknown>)),
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

export async function createCustomer(input: z.input<typeof createCustomerSchema>): Promise<ActionResult<CustomerItem>> {
  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le',
    };
  }

  const supabase = await createClient();
  const payload = parsed.data;
  const maKhachHang = payload.maKhachHang?.trim() || (await generateCustomerCode());
  const loaiKhachHang = normalizeCustomerType(payload.loaiKhachHang);

  const { data, error } = await supabase
    .from('khach_hang')
    .insert({
      ma_khach_hang: maKhachHang,
      ten_khach_hang: payload.tenKhachHang,
      loai_khach_hang: loaiKhachHang,
      so_dien_thoai: normalizePhone(payload.soDienThoai),
      dia_chi: normalizeAddress(payload.diaChi),
    })
    .select('id, ma_khach_hang, ten_khach_hang, loai_khach_hang, so_dien_thoai, dia_chi, created_at')
    .single();

  if (error) {
    return {
      success: false,
      error: mapDbError(error),
    };
  }

  return {
    success: true,
    data: mapCustomerRow(data as Record<string, unknown>),
  };
}

export async function updateCustomer(input: z.input<typeof updateCustomerSchema>): Promise<ActionResult<CustomerItem>> {
  const parsed = updateCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le',
    };
  }

  const supabase = await createClient();
  const payload = parsed.data;
  const loaiKhachHang = normalizeCustomerType(payload.loaiKhachHang);

  const { data, error } = await supabase
    .from('khach_hang')
    .update({
      ma_khach_hang: payload.maKhachHang,
      ten_khach_hang: payload.tenKhachHang,
      loai_khach_hang: loaiKhachHang,
      so_dien_thoai: normalizePhone(payload.soDienThoai),
      dia_chi: normalizeAddress(payload.diaChi),
    })
    .eq('id', payload.id)
    .select('id, ma_khach_hang, ten_khach_hang, loai_khach_hang, so_dien_thoai, dia_chi, created_at')
    .single();

  if (error) {
    return {
      success: false,
      error: mapDbError(error),
    };
  }

  return {
    success: true,
    data: mapCustomerRow(data as Record<string, unknown>),
  };
}

export async function deleteCustomer(id: number): Promise<ActionResult<{ id: number }>> {
  if (!Number.isFinite(id) || id <= 0) {
    return {
      success: false,
      error: 'ID khach hang khong hop le',
    };
  }

  const supabase = await createClient();

  // DELETE CÓ CASCADE - Sẽ tự động xóa phiếu cân + phiếu bán
  const { error } = await supabase.from('khach_hang').delete().eq('id', id);

  if (error) {
    return {
      success: false,
      error: mapDbError(error),
    };
  }

  return {
    success: true,
    data: { id },
  };
}

export async function importCustomers(
  rows: ImportRowInput[],
  duplicateMode: 'update' | 'skip',
): Promise<
  ActionResult<{
    inserted: number;
    updated: number;
    skipped: number;
    errors: Array<{ row: number; message: string }>;
  }>
> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      success: false,
      error: 'Khong co du lieu de import',
    };
  }

  const supabase = await createClient();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const parsed = importRowSchema.safeParse(row);

    if (!parsed.success) {
      errors.push({
        row: index + 1,
        message: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le',
      });
      skipped += 1;
      continue;
    }

    const payload = parsed.data;
    const maKhachHang = payload.maKhachHang?.trim() || (await generateCustomerCode());
    const loaiKhachHang = normalizeCustomerType(payload.loaiKhachHang);

    const existing = await supabase
      .from('khach_hang')
      .select('id')
      .eq('ma_khach_hang', maKhachHang)
      .maybeSingle();

    if (existing.error) {
      errors.push({ row: index + 1, message: mapDbError(existing.error) });
      skipped += 1;
      continue;
    }

    if (existing.data) {
      if (duplicateMode === 'skip') {
        skipped += 1;
        continue;
      }

      const updateResult = await supabase
        .from('khach_hang')
        .update({
          ten_khach_hang: payload.tenKhachHang,
          loai_khach_hang: loaiKhachHang,
          so_dien_thoai: normalizePhone(payload.soDienThoai),
          dia_chi: normalizeAddress(payload.diaChi),
        })
        .eq('id', (existing.data as { id: number }).id);

      if (updateResult.error) {
        errors.push({ row: index + 1, message: mapDbError(updateResult.error) });
        skipped += 1;
      } else {
        updated += 1;
      }

      continue;
    }

    const insertResult = await supabase.from('khach_hang').insert({
      ma_khach_hang: maKhachHang,
      ten_khach_hang: payload.tenKhachHang,
      loai_khach_hang: loaiKhachHang,
      so_dien_thoai: normalizePhone(payload.soDienThoai),
      dia_chi: normalizeAddress(payload.diaChi),
    });

    if (insertResult.error) {
      errors.push({ row: index + 1, message: mapDbError(insertResult.error) });
      skipped += 1;
    } else {
      inserted += 1;
    }
  }

  return {
    success: true,
    data: {
      inserted,
      updated,
      skipped,
      errors,
    },
  };
}
