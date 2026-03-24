'use server';

import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const employeeStatusSchema = z.enum(['DangLam', 'NghiViec']);

const createEmployeeSchema = z.object({
  maCongNhan: z.string().trim().optional(),
  hoTen: z.string().trim().min(2, 'Ho ten phai co it nhat 2 ky tu').max(120),
  soDienThoai: z
    .string()
    .trim()
    .regex(/^[0-9+\-() ]{8,20}$/, 'So dien thoai khong hop le')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean(),
});

const updateEmployeeSchema = z.object({
  id: z.number().int().positive(),
  maCongNhan: z.string().trim().min(2, 'Ma cong nhan khong hop le').max(30),
  hoTen: z.string().trim().min(2, 'Ho ten phai co it nhat 2 ky tu').max(120),
  soDienThoai: z
    .string()
    .trim()
    .regex(/^[0-9+\-() ]{8,20}$/, 'So dien thoai khong hop le')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean(),
});

const importRowSchema = z.object({
  maCongNhan: z.string().trim().min(2).max(30).optional().or(z.literal('')),
  hoTen: z.string().trim().min(2, 'Ho ten bat buoc').max(120),
  soDienThoai: z
    .string()
    .trim()
    .regex(/^[0-9+\-() ]{8,20}$/, 'So dien thoai khong hop le')
    .optional()
    .or(z.literal('')),
  trangThai: employeeStatusSchema.optional(),
});

type EmployeeStatus = z.infer<typeof employeeStatusSchema>;

export type EmployeeItem = {
  id: number;
  maCongNhan: string;
  hoTen: string;
  soDienThoai: string | null;
  trangThai: EmployeeStatus;
  createdAt: string;
};

export type EmployeesQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: EmployeeStatus | 'TatCa';
};

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type ImportRowInput = {
  maCongNhan?: string;
  hoTen: string;
  soDienThoai?: string;
  trangThai?: EmployeeStatus;
};

async function generateEmployeeCode() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('cong_nhan')
    .select('ma_cong_nhan')
    .ilike('ma_cong_nhan', 'CN%')
    .order('ma_cong_nhan', { ascending: false })
    .limit(500);

  let maxNumber = 0;
  (data ?? []).forEach((row) => {
    const ma = (row as { ma_cong_nhan?: string }).ma_cong_nhan ?? '';
    const match = ma.match(/^(?:CN)(\d+)$/i);
    if (!match) return;
    const numericValue = Number(match[1]);
    if (Number.isFinite(numericValue)) {
      maxNumber = Math.max(maxNumber, numericValue);
    }
  });

  return `CN${String(maxNumber + 1).padStart(4, '0')}`;
}

function normalizePhone(phone?: string) {
  const value = phone?.trim();
  return value ? value : null;
}

export async function getEmployees(query: EmployeesQuery = {}): Promise<ActionResult<{
  items: EmployeeItem[];
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
    .from('cong_nhan')
    .select('id, ma_cong_nhan, ho_ten, so_dien_thoai, trang_thai, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end);

  if (query.search?.trim()) {
    dbQuery = dbQuery.ilike('ho_ten', `%${query.search.trim()}%`);
  }

  if (query.status && query.status !== 'TatCa') {
    dbQuery = dbQuery.eq('trang_thai', query.status);
  }

  const { data, error, count } = await dbQuery;

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    success: true,
    data: {
      items: (data ?? []).map((row) => {
        const typed = row as {
          id: number;
          ma_cong_nhan: string;
          ho_ten: string;
          so_dien_thoai: string | null;
          trang_thai: EmployeeStatus;
          created_at: string;
        };

        return {
          id: typed.id,
          maCongNhan: typed.ma_cong_nhan,
          hoTen: typed.ho_ten,
          soDienThoai: typed.so_dien_thoai,
          trangThai: typed.trang_thai,
          createdAt: typed.created_at,
        };
      }),
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

export async function createEmployee(input: z.input<typeof createEmployeeSchema>): Promise<ActionResult<EmployeeItem>> {
  const parsed = createEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le',
    };
  }

  const supabase = await createClient();
  const payload = parsed.data;
  const maCongNhan = payload.maCongNhan?.trim() || (await generateEmployeeCode());

  const { data, error } = await supabase
    .from('cong_nhan')
    .insert({
      ma_cong_nhan: maCongNhan,
      ho_ten: payload.hoTen,
      so_dien_thoai: normalizePhone(payload.soDienThoai),
      trang_thai: payload.isActive ? 'DangLam' : 'NghiViec',
    })
    .select('id, ma_cong_nhan, ho_ten, so_dien_thoai, trang_thai, created_at')
    .single();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  const typed = data as {
    id: number;
    ma_cong_nhan: string;
    ho_ten: string;
    so_dien_thoai: string | null;
    trang_thai: EmployeeStatus;
    created_at: string;
  };

  return {
    success: true,
    data: {
      id: typed.id,
      maCongNhan: typed.ma_cong_nhan,
      hoTen: typed.ho_ten,
      soDienThoai: typed.so_dien_thoai,
      trangThai: typed.trang_thai,
      createdAt: typed.created_at,
    },
  };
}

export async function updateEmployee(input: z.input<typeof updateEmployeeSchema>): Promise<ActionResult<EmployeeItem>> {
  const parsed = updateEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le',
    };
  }

  const payload = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('cong_nhan')
    .update({
      ma_cong_nhan: payload.maCongNhan,
      ho_ten: payload.hoTen,
      so_dien_thoai: normalizePhone(payload.soDienThoai),
      trang_thai: payload.isActive ? 'DangLam' : 'NghiViec',
    })
    .eq('id', payload.id)
    .select('id, ma_cong_nhan, ho_ten, so_dien_thoai, trang_thai, created_at')
    .single();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  const typed = data as {
    id: number;
    ma_cong_nhan: string;
    ho_ten: string;
    so_dien_thoai: string | null;
    trang_thai: EmployeeStatus;
    created_at: string;
  };

  return {
    success: true,
    data: {
      id: typed.id,
      maCongNhan: typed.ma_cong_nhan,
      hoTen: typed.ho_ten,
      soDienThoai: typed.so_dien_thoai,
      trangThai: typed.trang_thai,
      createdAt: typed.created_at,
    },
  };
}

export async function deleteEmployee(id: number): Promise<ActionResult<{ id: number }>> {
  if (!Number.isFinite(id) || id <= 0) {
    return {
      success: false,
      error: 'ID cong nhan khong hop le',
    };
  }

  const supabase = await createClient();
  const attendanceCheck = await supabase
    .from('cham_cong')
    .select('id', { count: 'exact', head: true })
    .eq('cong_nhan_id', id);

  if (attendanceCheck.error) {
    return {
      success: false,
      error: attendanceCheck.error.message,
    };
  }

  if ((attendanceCheck.count ?? 0) > 0) {
    return {
      success: false,
      error: 'Khong the xoa cong nhan da co du lieu cham cong.',
    };
  }

  const { error } = await supabase.from('cong_nhan').delete().eq('id', id);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    data: { id },
  };
}

export async function importEmployees(
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
    const maCongNhan = payload.maCongNhan?.trim() || (await generateEmployeeCode());

    const existing = await supabase
      .from('cong_nhan')
      .select('id')
      .eq('ma_cong_nhan', maCongNhan)
      .maybeSingle();

    if (existing.error) {
      errors.push({ row: index + 1, message: existing.error.message });
      skipped += 1;
      continue;
    }

    if (existing.data) {
      if (duplicateMode === 'skip') {
        skipped += 1;
        continue;
      }

      const updateResult = await supabase
        .from('cong_nhan')
        .update({
          ho_ten: payload.hoTen,
          so_dien_thoai: normalizePhone(payload.soDienThoai),
          trang_thai: payload.trangThai ?? 'DangLam',
        })
        .eq('id', (existing.data as { id: number }).id);

      if (updateResult.error) {
        errors.push({ row: index + 1, message: updateResult.error.message });
        skipped += 1;
      } else {
        updated += 1;
      }

      continue;
    }

    const insertResult = await supabase.from('cong_nhan').insert({
      ma_cong_nhan: maCongNhan,
      ho_ten: payload.hoTen,
      so_dien_thoai: normalizePhone(payload.soDienThoai),
      trang_thai: payload.trangThai ?? 'DangLam',
    });

    if (insertResult.error) {
      errors.push({ row: index + 1, message: insertResult.error.message });
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
