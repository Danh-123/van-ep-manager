import type { createClient } from '@/lib/supabase/server';
import { calculateDebt, type DebtCalculatedRow, type DebtInputRow } from '@/lib/trucks/debtCalculator';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function recalculateAllDebt(supabase: SupabaseServerClient): Promise<DebtCalculatedRow[]> {
  const result = await supabase
    .from('phieu_can')
    .select('id, ngay_can, khoi_luong_tan, don_gia_ap_dung, cong_no_dau, so_tien_da_tra, khach_hang, ghi_chu, xe_hang:xe_hang_id(bien_so)')
    .order('ngay_can', { ascending: true })
    .order('id', { ascending: true });

  if (result.error) {
    throw new Error(result.error.message);
  }

  const inputRows: DebtInputRow[] = (result.data ?? []).map((row) => {
    const typed = row as {
      id: number;
      ngay_can: string;
      khoi_luong_tan: number | string;
      don_gia_ap_dung: number | string;
      cong_no_dau: number | string | null;
      so_tien_da_tra: number | string;
      khach_hang: string | null;
      ghi_chu: string | null;
      xe_hang?: { bien_so?: string } | null;
    };

    return {
      id: typed.id,
      ngay: typed.ngay_can,
      bienSo: typed.xe_hang?.bien_so ?? '-',
      soTan: Number(typed.khoi_luong_tan) || 0,
      donGia: Number(typed.don_gia_ap_dung) || 0,
      congNoDau: Number(typed.cong_no_dau) || 0,
      thanhToan: Number(typed.so_tien_da_tra) || 0,
      khachHang: typed.khach_hang ?? 'Khách lẻ',
      ghiChu: typed.ghi_chu ?? '',
    };
  });

  return calculateDebt(inputRows);
}
