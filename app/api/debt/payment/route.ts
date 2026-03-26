import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const paymentSchema = z.object({
  phieu_can_id: z.number().int().positive(),
  so_tien: z.number().positive('So tien thanh toan phai lon hon 0'),
  ngay_thanh_toan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngay thanh toan khong hop le'),
  nguoi_thu: z.string().trim().max(255).optional().or(z.literal('')),
});

async function ensureManagerAccess() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, status: 401, error: 'Ban chua dang nhap' };
  }

  const profileResult = await supabase.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return { ok: false as const, status: 403, error: 'Khong the xac thuc quyen truy cap' };
  }

  if (profileResult.data.role === 'Viewer') {
    return { ok: false as const, status: 403, error: 'Ban khong co quyen thanh toan cong no' };
  }

  return {
    ok: true as const,
    supabase,
    userId: user.id,
    fullName: profileResult.data.full_name?.trim() || user.email || 'Người dùng',
  };
}

export async function POST(request: NextRequest) {
  const access = await ensureManagerAccess();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = paymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' },
      { status: 400 },
    );
  }

  try {
    const ticketResult = await access.supabase
      .from('phieu_can')
      .select('id, so_tien_da_tra, thanh_tien, khach_hang_id')
      .eq('id', parsed.data.phieu_can_id)
      .maybeSingle();

    if (ticketResult.error) {
      return NextResponse.json({ success: false, error: ticketResult.error.message }, { status: 500 });
    }

    if (!ticketResult.data) {
      return NextResponse.json({ success: false, error: 'Khong tim thay phieu can' }, { status: 404 });
    }

    const currentPaid = Number((ticketResult.data as { so_tien_da_tra: number | string }).so_tien_da_tra) || 0;
    const totalAmount = Number((ticketResult.data as { thanh_tien: number | string }).thanh_tien) || 0;
    const paidAmount = parsed.data.so_tien;
    const nextPaid = currentPaid + paidAmount;

    if (nextPaid <= currentPaid) {
      return NextResponse.json({ success: false, error: 'So tien thanh toan khong hop le' }, { status: 400 });
    }

    if (nextPaid > totalAmount) {
      return NextResponse.json({ success: false, error: 'So tien thanh toan vuot qua cong no hien tai' }, { status: 400 });
    }

    const updateResult = await access.supabase
      .from('phieu_can')
      .update({ so_tien_da_tra: nextPaid })
      .eq('id', parsed.data.phieu_can_id);

    if (updateResult.error) {
      return NextResponse.json({ success: false, error: updateResult.error.message }, { status: 500 });
    }

    const historyResult = await access.supabase.from('lich_su_thanh_toan').insert({
      phieu_can_id: parsed.data.phieu_can_id,
      ngay_thanh_toan: parsed.data.ngay_thanh_toan,
      so_tien: paidAmount,
      nguoi_thu: parsed.data.nguoi_thu || access.fullName,
      phuong_thuc: 'TienMat',
      ghi_chu: 'Thanh toan tu man hinh cong no',
      created_by: access.userId,
    });

    if (historyResult.error) {
      return NextResponse.json({ success: false, error: historyResult.error.message }, { status: 500 });
    }

    const recalcResult = await access.supabase.rpc('recalculate_all_debt');
    if (recalcResult.error && recalcResult.error.code !== '42883') {
      return NextResponse.json({ success: false, error: recalcResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        phieu_can_id: parsed.data.phieu_can_id,
        so_tien: paidAmount,
        tong_da_tra: nextPaid,
        con_lai: Math.max(0, totalAmount - nextPaid),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Khong the cap nhat thanh toan' },
      { status: 500 },
    );
  }
}
