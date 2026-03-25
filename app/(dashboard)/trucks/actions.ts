'use server';

import { format } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { getDefaultWoodTypePrice } from '@/lib/wood-types/default-price';

const ticketFilterSchema = z.object({
  date: z.string().optional(),
  truckId: z.number().int().positive().optional(),
  paymentStatus: z.enum(['TatCa', 'ChuaThanhToan', 'ThanhToanMotPhan', 'DaThanhToan']).default('TatCa'),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
});

const createTicketSchema = z.object({
  ngayCan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  xeHangId: z.number().int().positive().optional(),
  xeSoText: z.string().trim().optional().or(z.literal('')),
  loaiVanEpId: z.number().int().positive(),
  khoiLuongKg: z.number().positive('Trong luong phai lon hon 0'),
  donGia: z.number().positive('Don gia phai lon hon 0'),
  khachHang: z.string().trim().min(2, 'Khach hang bat buoc').max(120),
  ghiChu: z.string().max(1000).optional().or(z.literal('')),
  thanhToanNgay: z.boolean(),
  soTienThanhToan: z.number().min(0),
});

const paymentSchema = z.object({
  ticketId: z.number().int().positive(),
  soTien: z.number().positive('So tien thanh toan phai lon hon 0'),
  ngayThanhToan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ghiChu: z.string().max(1000).optional().or(z.literal('')),
});

export type PaymentStatus = 'ChuaThanhToan' | 'ThanhToanMotPhan' | 'DaThanhToan';

export type TicketRow = {
  id: number;
  ngay: string;
  xeSo: string;
  khachHang: string;
  loaiVan: string;
  trongLuongKg: number;
  donGia: number;
  thanhTien: number;
  daTra: number;
  conNo: number;
  paymentStatus: PaymentStatus;
};

export type TicketPaymentHistory = {
  id: number;
  ngayThanhToan: string;
  soTien: number;
  nguoiThu: string;
  ghiChu: string;
};

export type TicketOption = { id: number; label: string };
export type WoodTypeOption = { id: number; label: string; donGia: number; donVi: string };

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
}

function paymentStatusFromAmounts(thanhTien: number, daTra: number): PaymentStatus {
  if (daTra <= 0) return 'ChuaThanhToan';
  if (daTra < thanhTien) return 'ThanhToanMotPhan';
  return 'DaThanhToan';
}

async function getCurrentUserInfo() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Ban chua dang nhap');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  return {
    supabase,
    userId: user.id,
    role: (profile?.role ?? 'Viewer') as 'Admin' | 'KeToan' | 'Viewer',
    fullName: profile?.full_name ?? user.email ?? 'Unknown',
  };
}

async function generateTicketNumber() {
  const { supabase } = await getCurrentUserInfo();

  const todayKey = format(new Date(), 'yyyyMMdd');
  const prefix = `PC${todayKey}`;

  const { data, error } = await supabase
    .from('phieu_can')
    .select('so_phieu')
    .ilike('so_phieu', `${prefix}%`)
    .order('so_phieu', { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  let maxSeq = 0;
  (data ?? []).forEach((row) => {
    const code = (row as { so_phieu?: string }).so_phieu ?? '';
    const match = code.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (!match) return;
    maxSeq = Math.max(maxSeq, Number(match[1]));
  });

  return `${prefix}-${String(maxSeq + 1).padStart(3, '0')}`;
}

export async function getFilterOptions(): Promise<
  ActionResult<{ trucks: TicketOption[]; woodTypes: WoodTypeOption[] }>
> {
  try {
    const { supabase } = await getCurrentUserInfo();

    const [truckRes, woodRes] = await Promise.all([
      supabase
        .from('xe_hang')
        .select('id, bien_so')
        .eq('is_active', true)
        .order('bien_so', { ascending: true }),
      supabase
        .from('loai_van_ep')
        .select('id, ten_loai, don_gia, don_vi')
        .eq('is_active', true)
        .order('ten_loai', { ascending: true }),
    ]);

    if (truckRes.error) return { success: false, error: truckRes.error.message };
    if (woodRes.error) return { success: false, error: woodRes.error.message };

    return {
      success: true,
      data: {
        trucks: (truckRes.data ?? []).map((row) => ({
          id: (row as { id: number }).id,
          label: (row as { bien_so: string }).bien_so,
        })),
        woodTypes: (woodRes.data ?? []).map((row) => ({
          id: (row as { id: number }).id,
          label: (row as { ten_loai: string }).ten_loai,
          donGia: toNumber((row as { don_gia: number | string }).don_gia),
          donVi: (row as { don_vi: string }).don_vi,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the tai bo loc',
    };
  }
}

export async function getTickets(
  rawFilters: z.input<typeof ticketFilterSchema>,
): Promise<
  ActionResult<{
    items: TicketRow[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }>
> {
  const filters = ticketFilterSchema.parse(rawFilters);

  try {
    const { supabase } = await getCurrentUserInfo();

    let query = supabase
      .from('phieu_can')
      .select(
        'id, ngay_can, khoi_luong_tan, don_gia_ap_dung, thanh_tien, so_tien_da_tra, khach_hang, xe_hang:xe_hang_id(bien_so), loai_van_ep:loai_van_ep_id(ten_loai)',
        { count: 'exact' },
      )
      .order('ngay_can', { ascending: false })
      .order('id', { ascending: false });

    if (filters.date) {
      query = query.eq('ngay_can', filters.date);
    }
    if (filters.truckId) {
      query = query.eq('xe_hang_id', filters.truckId);
    }

    const page = Math.max(1, filters.page);
    const pageSize = Math.max(1, filters.pageSize);
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const { data, error, count } = await query.range(start, end);

    if (error) {
      return { success: false, error: error.message };
    }

    const rows = (data ?? [])
      .map((row) => {
        const typed = row as {
          id: number;
          ngay_can: string;
          khoi_luong_tan: number | string;
          don_gia_ap_dung: number | string;
          thanh_tien: number | string;
          so_tien_da_tra?: number | string | null;
          khach_hang?: string | null;
          xe_hang?: { bien_so?: string } | null;
          loai_van_ep?: { ten_loai?: string } | null;
        };

        const thanhTien = toNumber(typed.thanh_tien);
        const daTra = Math.max(0, toNumber(typed.so_tien_da_tra));
        const conNo = Math.max(0, thanhTien - daTra);

        return {
          id: typed.id,
          ngay: typed.ngay_can,
          xeSo: typed.xe_hang?.bien_so ?? '-',
          khachHang: typed.khach_hang ?? 'Khach le',
          loaiVan: typed.loai_van_ep?.ten_loai ?? '-',
          trongLuongKg: toNumber(typed.khoi_luong_tan) * 1000,
          donGia: toNumber(typed.don_gia_ap_dung),
          thanhTien,
          daTra,
          conNo,
          paymentStatus: paymentStatusFromAmounts(thanhTien, daTra),
        } satisfies TicketRow;
      })
      .filter((row) => {
        if (filters.paymentStatus === 'TatCa') return true;
        return row.paymentStatus === filters.paymentStatus;
      });

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      success: true,
      data: {
        items: rows,
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the tai danh sach phieu can',
    };
  }
}

export async function createTicket(
  rawInput: z.input<typeof createTicketSchema>,
): Promise<ActionResult<{ id: number }>> {
  const input = createTicketSchema.parse(rawInput);

  try {
    const userInfo = await getCurrentUserInfo();
    const { supabase } = userInfo;

    let xeHangId = input.xeHangId;

    if (!xeHangId) {
      const bienSo = input.xeSoText?.trim();
      if (!bienSo) {
        return { success: false, error: 'Vui long chon xe so hoac nhap bien so moi' };
      }

      const existingTruck = await supabase
        .from('xe_hang')
        .select('id')
        .ilike('bien_so', bienSo)
        .maybeSingle();

      if (existingTruck.error) {
        return { success: false, error: existingTruck.error.message };
      }

      if (existingTruck.data) {
        xeHangId = (existingTruck.data as { id: number }).id;
      } else {
        const insertTruck = await supabase
          .from('xe_hang')
          .insert({ bien_so: bienSo, is_active: true })
          .select('id')
          .single();

        if (insertTruck.error) {
          return { success: false, error: insertTruck.error.message };
        }

        xeHangId = (insertTruck.data as { id: number }).id;
      }
    }

    const woodDefault = await getDefaultWoodTypePrice({ woodTypeId: input.loaiVanEpId });
    const donGia = input.donGia > 0 ? input.donGia : woodDefault?.donGia ?? 0;

    if (!xeHangId) {
      return { success: false, error: 'Khong xac dinh duoc xe hang' };
    }

    const soPhieu = await generateTicketNumber();

    const khoiLuongTan = input.khoiLuongKg / 1000;
    const soTienThanhToan = input.thanhToanNgay ? Math.min(input.soTienThanhToan, input.khoiLuongKg * donGia) : 0;

    const insertTicket = await supabase
      .from('phieu_can')
      .insert({
        so_phieu: soPhieu,
        ngay_can: input.ngayCan,
        xe_hang_id: xeHangId,
        loai_van_ep_id: input.loaiVanEpId,
        khoi_luong_tan: khoiLuongTan,
        don_gia_ap_dung: donGia,
        khach_hang: input.khachHang,
        so_tien_da_tra: soTienThanhToan,
        ghi_chu: input.ghiChu || null,
        created_by: userInfo.userId,
      })
      .select('id, thanh_tien')
      .single();

    if (insertTicket.error) {
      return { success: false, error: insertTicket.error.message };
    }

    const ticketId = (insertTicket.data as { id: number }).id;

    if (input.thanhToanNgay && soTienThanhToan > 0) {
      const paymentInsert = await supabase.from('lich_su_thanh_toan').insert({
        phieu_can_id: ticketId,
        ngay_thanh_toan: input.ngayCan,
        so_tien: soTienThanhToan,
        nguoi_thu: userInfo.fullName,
        phuong_thuc: 'TienMat',
        ghi_chu: 'Thanh toan ngay khi tao phieu',
        created_by: userInfo.userId,
      });

      if (paymentInsert.error) {
        return { success: false, error: paymentInsert.error.message };
      }
    }

    revalidatePath('/trucks');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: { id: ticketId },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the tao phieu can',
    };
  }
}

export async function updatePayment(
  rawInput: z.input<typeof paymentSchema>,
): Promise<ActionResult<{ ticketId: number; daTra: number; conNo: number }>> {
  const input = paymentSchema.parse(rawInput);

  try {
    const userInfo = await getCurrentUserInfo();
    const { supabase } = userInfo;

    const ticketRes = await supabase
      .from('phieu_can')
      .select('id, thanh_tien, so_tien_da_tra')
      .eq('id', input.ticketId)
      .maybeSingle();

    if (ticketRes.error) return { success: false, error: ticketRes.error.message };
    if (!ticketRes.data) return { success: false, error: 'Khong tim thay phieu can' };

    const ticket = ticketRes.data as { id: number; thanh_tien: number | string; so_tien_da_tra?: number | string };
    const thanhTien = toNumber(ticket.thanh_tien);
    const currentPaid = Math.max(0, toNumber(ticket.so_tien_da_tra));
    const remain = Math.max(0, thanhTien - currentPaid);

    if (input.soTien > remain) {
      return {
        success: false,
        error: `So tien thanh toan vuot qua cong no hien tai (${remain.toLocaleString('vi-VN')} VND)`,
      };
    }

    const nextPaid = currentPaid + input.soTien;

    const updateTicket = await supabase
      .from('phieu_can')
      .update({ so_tien_da_tra: nextPaid })
      .eq('id', input.ticketId);

    if (updateTicket.error) {
      return { success: false, error: updateTicket.error.message };
    }

    const paymentInsert = await supabase.from('lich_su_thanh_toan').insert({
      phieu_can_id: input.ticketId,
      ngay_thanh_toan: input.ngayThanhToan,
      so_tien: input.soTien,
      nguoi_thu: userInfo.fullName,
      phuong_thuc: 'TienMat',
      ghi_chu: input.ghiChu || null,
      created_by: userInfo.userId,
    });

    if (paymentInsert.error) {
      return { success: false, error: paymentInsert.error.message };
    }

    revalidatePath('/trucks');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: {
        ticketId: input.ticketId,
        daTra: nextPaid,
        conNo: Math.max(0, thanhTien - nextPaid),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the cap nhat thanh toan',
    };
  }
}

export async function getPaymentHistory(
  ticketId: number,
): Promise<ActionResult<TicketPaymentHistory[]>> {
  if (!Number.isFinite(ticketId) || ticketId <= 0) {
    return {
      success: false,
      error: 'Ticket khong hop le',
    };
  }

  try {
    const { supabase } = await getCurrentUserInfo();

    const { data, error } = await supabase
      .from('lich_su_thanh_toan')
      .select('id, ngay_thanh_toan, so_tien, nguoi_thu, ghi_chu, created_by, profiles:created_by(full_name)')
      .eq('phieu_can_id', ticketId)
      .order('ngay_thanh_toan', { ascending: false })
      .order('id', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: (data ?? []).map((row) => {
        const typed = row as {
          id: number;
          ngay_thanh_toan: string;
          so_tien: number | string;
          nguoi_thu?: string | null;
          ghi_chu?: string | null;
          profiles?: { full_name?: string | null } | null;
        };

        return {
          id: typed.id,
          ngayThanhToan: typed.ngay_thanh_toan,
          soTien: toNumber(typed.so_tien),
          nguoiThu: typed.nguoi_thu || typed.profiles?.full_name || 'Khong ro',
          ghiChu: typed.ghi_chu ?? '',
        };
      }),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the tai lich su thanh toan',
    };
  }
}
