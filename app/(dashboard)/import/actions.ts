'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import {
  type AttendanceValidatedRow,
  type DebtValidatedRow,
  type SalaryValidatedRow,
  type TicketValidatedRow,
  duplicateModeSchema,
  validateAttendanceRows,
  validateDebtRows,
  validateSalaryRows,
  validateTicketRows,
} from '@/lib/import/validator';

type DuplicateMode = 'update' | 'skip';

type ImportResult<TPreview> = {
  successCount: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  preview: TPreview[];
};

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type AttendanceRawRow = {
  date: string;
  worker: string;
  status: string;
  note?: string;
};

type TicketRawRow = {
  ticketNo?: string;
  date: string;
  truckNo: string;
  customer: string;
  weightKg: string | number;
  unitPrice: string | number;
  woodType?: string;
  note?: string;
};

type SalaryRawRow = {
  month: string | number;
  year: string | number;
  worker: string;
  totalSalary: string | number;
  paidSalary?: string | number;
  status?: string;
};

type DebtRawRow = {
  ticketNo: string;
  paymentDate: string;
  amount: string | number;
  collector?: string;
  method?: string;
  note?: string;
};

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
    .select('full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile || profile.role !== 'Admin') {
    throw new Error('Chi Admin moi co quyen import du lieu');
  }

  return {
    supabase,
    userId: user.id,
    fullName: profile.full_name || user.email || 'Import User',
  };
}

async function writeImportAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  changedBy: string,
  importType: string,
  result: {
    dryRun: boolean;
    rows: number;
    successCount: number;
    inserted: number;
    updated: number;
    skipped: number;
    errorCount: number;
  },
) {
  await supabase.from('audit_log').insert({
    table_name: 'import',
    record_id: `${importType}-${Date.now()}`,
    hanh_dong: 'INSERT',
    new_data: {
      importType,
      ...result,
    },
    changed_by: changedBy,
  });
}

function buildMeta(status: string, note: string) {
  return JSON.stringify({ status, note });
}

function buildTicketCode(index: number) {
  return `IMP${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(index + 1).padStart(4, '0')}-${randomUUID().slice(0, 6)}`;
}

async function checkAttendanceExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: AttendanceValidatedRow,
) {
  const existing = await supabase
    .from('cham_cong')
    .select('id')
    .eq('cong_nhan_id', row.congNhanId)
    .eq('ngay', row.ngay)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  return Boolean(existing.data);
}

export async function importAttendance(
  rows: AttendanceRawRow[],
  options: { duplicateMode?: DuplicateMode; dryRun?: boolean } = {},
): Promise<ActionResult<ImportResult<AttendanceValidatedRow>>> {
  try {
    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: 'Khong co du lieu de import cham cong' };
    }

    const duplicateMode = duplicateModeSchema.parse(options.duplicateMode ?? 'update');
    const dryRun = options.dryRun ?? false;

    const { supabase, userId } = await ensureAdmin();

    const workersRes = await supabase
      .from('cong_nhan')
      .select('id, ma_cong_nhan, ho_ten')
      .order('id', { ascending: true });

    if (workersRes.error) {
      return { success: false, error: workersRes.error.message };
    }

    const { validRows, errors } = validateAttendanceRows(
      rows,
      (workersRes.data ?? []) as Array<{ id: number; ma_cong_nhan: string; ho_ten: string }>,
    );

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    if (!dryRun) {
      for (const row of validRows) {
        try {
          const soLuong = row.status === 'CoMat' || row.status === 'LamThem' ? 1 : 0;
          const record = {
            cong_nhan_id: row.congNhanId,
            ngay: row.ngay,
            so_luong: soLuong,
            don_gia: 0,
            ghi_chu: buildMeta(row.status, row.note),
            created_by: userId,
          };

          if (duplicateMode === 'skip') {
            const exists = await checkAttendanceExists(supabase, row);
            if (exists) {
              skipped += 1;
              continue;
            }

            const insertResult = await supabase.from('cham_cong').insert(record);
            if (insertResult.error) {
              errors.push({ row: row.row, message: insertResult.error.message });
              skipped += 1;
              continue;
            }

            inserted += 1;
            continue;
          }

          const upsertResult = await supabase
            .from('cham_cong')
            .upsert(record, { onConflict: 'cong_nhan_id,ngay' });

          if (upsertResult.error) {
            errors.push({ row: row.row, message: upsertResult.error.message });
            skipped += 1;
            continue;
          }

          updated += 1;
        } catch (error) {
          errors.push({ row: row.row, message: error instanceof Error ? error.message : 'Loi khong xac dinh' });
          skipped += 1;
        }
      }
    }

    const successCount = dryRun ? validRows.length : inserted + updated;

    await writeImportAudit(supabase, userId, 'attendance', {
      dryRun,
      rows: rows.length,
      successCount,
      inserted,
      updated,
      skipped,
      errorCount: errors.length,
    });

    if (!dryRun) {
      revalidatePath('/attendance');
      revalidatePath('/dashboard');
      revalidatePath('/import');
    }

    return {
      success: true,
      data: {
        successCount,
        inserted,
        updated,
        skipped,
        errors,
        preview: validRows,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the import cham cong',
    };
  }
}

export async function importTickets(
  rows: TicketRawRow[],
  options: { duplicateMode?: DuplicateMode; dryRun?: boolean } = {},
): Promise<ActionResult<ImportResult<TicketValidatedRow>>> {
  try {
    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: 'Khong co du lieu de import phieu can' };
    }

    const duplicateMode = duplicateModeSchema.parse(options.duplicateMode ?? 'update');
    const dryRun = options.dryRun ?? false;

    const { supabase, userId } = await ensureAdmin();

    const [trucksRes, woodTypesRes] = await Promise.all([
      supabase.from('xe_hang').select('id, bien_so').order('id', { ascending: true }),
      supabase.from('loai_van_ep').select('id').eq('is_active', true).order('id', { ascending: true }).limit(1),
    ]);

    if (trucksRes.error) return { success: false, error: trucksRes.error.message };
    if (woodTypesRes.error) return { success: false, error: woodTypesRes.error.message };

    const defaultWoodTypeId = (woodTypesRes.data?.[0] as { id: number } | undefined)?.id;
    if (!defaultWoodTypeId) {
      return { success: false, error: 'Khong co loai van ep nao dang hoat dong de import phieu can' };
    }

    const { validRows, errors } = validateTicketRows(
      rows,
      (trucksRes.data ?? []) as Array<{ id: number; bien_so: string }>,
      defaultWoodTypeId,
    );

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    if (!dryRun) {
      for (let index = 0; index < validRows.length; index += 1) {
        const row = validRows[index];

        let existingId: number | null = null;
        try {
          if (row.soPhieu) {
            const existing = await supabase
              .from('phieu_can')
              .select('id')
              .eq('so_phieu', row.soPhieu)
              .maybeSingle();

            if (existing.error) {
              throw new Error(existing.error.message);
            }

            existingId = ((existing.data as { id: number } | null)?.id ?? null);
          } else {
            const existing = await supabase
              .from('phieu_can')
              .select('id')
              .eq('ngay_can', row.ngayCan)
              .eq('xe_hang_id', row.xeHangId)
              .eq('khach_hang', row.khachHang)
              .maybeSingle();

            if (existing.error) {
              throw new Error(existing.error.message);
            }

            existingId = ((existing.data as { id: number } | null)?.id ?? null);
          }

          if (existingId && duplicateMode === 'skip') {
            skipped += 1;
            continue;
          }

          if (existingId) {
            const updateResult = await supabase
              .from('phieu_can')
              .update({
                ngay_can: row.ngayCan,
                xe_hang_id: row.xeHangId,
                loai_van_ep_id: row.loaiVanEpId,
                khoi_luong_tan: row.khoiLuongTan,
                don_gia_ap_dung: row.donGiaApDung,
                khach_hang: row.khachHang,
                ghi_chu: row.note || null,
              })
              .eq('id', existingId);

            if (updateResult.error) {
              errors.push({ row: row.row, message: updateResult.error.message });
              skipped += 1;
            } else {
              updated += 1;
            }

            continue;
          }

          const soPhieu = row.soPhieu ?? buildTicketCode(index);

          const insertResult = await supabase.from('phieu_can').insert({
            so_phieu: soPhieu,
            ngay_can: row.ngayCan,
            xe_hang_id: row.xeHangId,
            loai_van_ep_id: row.loaiVanEpId,
            khoi_luong_tan: row.khoiLuongTan,
            don_gia_ap_dung: row.donGiaApDung,
            khach_hang: row.khachHang,
            ghi_chu: row.note || null,
            created_by: userId,
          });

          if (insertResult.error) {
            errors.push({ row: row.row, message: insertResult.error.message });
            skipped += 1;
          } else {
            inserted += 1;
          }
        } catch (error) {
          errors.push({ row: row.row, message: error instanceof Error ? error.message : 'Loi khong xac dinh' });
          skipped += 1;
        }
      }
    }

    const successCount = dryRun ? validRows.length : inserted + updated;

    await writeImportAudit(supabase, userId, 'tickets', {
      dryRun,
      rows: rows.length,
      successCount,
      inserted,
      updated,
      skipped,
      errorCount: errors.length,
    });

    if (!dryRun) {
      revalidatePath('/trucks');
      revalidatePath('/dashboard');
      revalidatePath('/debt');
      revalidatePath('/import');
    }

    return {
      success: true,
      data: {
        successCount,
        inserted,
        updated,
        skipped,
        errors,
        preview: validRows,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the import phieu can',
    };
  }
}

export async function importSalary(
  rows: SalaryRawRow[],
  options: { dryRun?: boolean } = {},
): Promise<ActionResult<ImportResult<SalaryValidatedRow>>> {
  try {
    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: 'Khong co du lieu de import luong' };
    }

    const dryRun = options.dryRun ?? false;
    const { supabase, userId } = await ensureAdmin();

    const workersRes = await supabase
      .from('cong_nhan')
      .select('id, ma_cong_nhan, ho_ten')
      .order('id', { ascending: true });

    if (workersRes.error) return { success: false, error: workersRes.error.message };

    const { validRows, errors } = validateSalaryRows(
      rows,
      (workersRes.data ?? []) as Array<{ id: number; ma_cong_nhan: string; ho_ten: string }>,
    );

    const inserted = 0;
    let updated = 0;
    let skipped = 0;

    if (!dryRun) {
      for (const row of validRows) {
        const upsertResult = await supabase
          .from('luong_thang')
          .upsert(
            {
              cong_nhan_id: row.congNhanId,
              thang: row.thang,
              nam: row.nam,
              tong_tien_cong: row.tongTienCong,
              tong_da_thanh_toan: row.tongDaThanhToan,
              trang_thai: row.trangThai,
            },
            { onConflict: 'cong_nhan_id,thang,nam' },
          )
          .select('id');

        if (upsertResult.error) {
          errors.push({ row: row.row, message: upsertResult.error.message });
          skipped += 1;
        } else {
          updated += 1;
        }
      }
    }

    const successCount = dryRun ? validRows.length : inserted + updated;

    await writeImportAudit(supabase, userId, 'salary', {
      dryRun,
      rows: rows.length,
      successCount,
      inserted,
      updated,
      skipped,
      errorCount: errors.length,
    });

    if (!dryRun) {
      revalidatePath('/salary');
      revalidatePath('/dashboard');
      revalidatePath('/import');
    }

    return {
      success: true,
      data: {
        successCount,
        inserted,
        updated,
        skipped,
        errors,
        preview: validRows,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the import luong',
    };
  }
}

export async function importDebt(
  rows: DebtRawRow[],
  options: { dryRun?: boolean } = {},
): Promise<ActionResult<ImportResult<DebtValidatedRow>>> {
  try {
    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: 'Khong co du lieu de import cong no' };
    }

    const dryRun = options.dryRun ?? false;
    const { supabase, userId, fullName } = await ensureAdmin();

    const ticketsRes = await supabase
      .from('phieu_can')
      .select('id, so_phieu')
      .order('id', { ascending: true });

    if (ticketsRes.error) return { success: false, error: ticketsRes.error.message };

    const { validRows, errors } = validateDebtRows(
      rows,
      (ticketsRes.data ?? []) as Array<{ id: number; so_phieu: string }>,
    );

    let inserted = 0;
    const updated = 0;
    let skipped = 0;

    if (!dryRun) {
      for (const row of validRows) {
        const ticketRes = await supabase
          .from('phieu_can')
          .select('id, thanh_tien, so_tien_da_tra')
          .eq('id', row.phieuCanId)
          .maybeSingle();

        if (ticketRes.error || !ticketRes.data) {
          errors.push({ row: row.row, message: ticketRes.error?.message ?? 'Khong tim thay phieu can' });
          skipped += 1;
          continue;
        }

        const ticket = ticketRes.data as {
          id: number;
          thanh_tien: number | string;
          so_tien_da_tra: number | string | null;
        };

        const thanhTien = Number(ticket.thanh_tien);
        const daTra = Number(ticket.so_tien_da_tra ?? 0);
        const remain = Math.max(0, thanhTien - daTra);

        if (row.soTien > remain) {
          errors.push({
            row: row.row,
            message: `So tien thanh toan vuot qua cong no hien tai (${remain.toLocaleString('vi-VN')} VND)`,
          });
          skipped += 1;
          continue;
        }

        const paymentInsert = await supabase.from('lich_su_thanh_toan').insert({
          phieu_can_id: row.phieuCanId,
          ngay_thanh_toan: row.ngayThanhToan,
          so_tien: row.soTien,
          nguoi_thu: row.nguoiThu || fullName,
          phuong_thuc: row.phuongThuc,
          ghi_chu: row.ghiChu,
          created_by: userId,
        });

        if (paymentInsert.error) {
          errors.push({ row: row.row, message: paymentInsert.error.message });
          skipped += 1;
          continue;
        }

        const nextPaid = daTra + row.soTien;
        const ticketUpdate = await supabase
          .from('phieu_can')
          .update({ so_tien_da_tra: nextPaid })
          .eq('id', row.phieuCanId);

        if (ticketUpdate.error) {
          errors.push({ row: row.row, message: ticketUpdate.error.message });
          skipped += 1;
          continue;
        }

        inserted += 1;
      }
    }

    const successCount = dryRun ? validRows.length : inserted + updated;

    await writeImportAudit(supabase, userId, 'debt', {
      dryRun,
      rows: rows.length,
      successCount,
      inserted,
      updated,
      skipped,
      errorCount: errors.length,
    });

    if (!dryRun) {
      revalidatePath('/debt');
      revalidatePath('/trucks');
      revalidatePath('/dashboard');
      revalidatePath('/import');
    }

    return {
      success: true,
      data: {
        successCount,
        inserted,
        updated,
        skipped,
        errors,
        preview: validRows,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the import cong no',
    };
  }
}
