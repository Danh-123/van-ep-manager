import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id, 10);

    if (!Number.isFinite(customerId) || customerId <= 0) {
      return NextResponse.json(
        { error: 'ID khách hàng không hợp lệ' },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Lấy thông tin khách hàng
    const { data: customer, error: customerError } = await supabase
      .from('khach_hang')
      .select('id, ma_khach_hang, ten_khach_hang')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Không tìm thấy khách hàng' },
        { status: 404 },
      );
    }

    // Lấy tất cả phiếu cân (mua)
    const { data: phieuCan, error: phieuCanError } = await supabase
      .from('phieu_can')
      .select('id, ngay_can, so_phieu, khoi_luong_tan, don_gia_ap_dung, thanh_tien, cong_no')
      .eq('khach_hang_id', customerId)
      .order('ngay_can', { ascending: false });

    if (phieuCanError) {
      return NextResponse.json(
        { error: 'Lỗi lấy dữ liệu phiếu cân' },
        { status: 500 },
      );
    }

    // Lấy tất cả phiếu bán
    const { data: phieuBan, error: phieuBanError } = await supabase
      .from('phieu_ban')
      .select(
        'id, so_phieu, ngay_ban, so_khoi, don_gia, thanh_tien, cong_no',
      )
      .eq('khach_hang_id', customerId)
      .order('ngay_ban', { ascending: false });

    if (phieuBanError) {
      return NextResponse.json(
        { error: 'Lỗi lấy dữ liệu phiếu bán' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      customer,
      summary: {
        phieuCanCount: phieuCan?.length ?? 0,
        phieuCanTotal: phieuCan?.reduce((sum, p) => sum + (p.thanh_tien || 0), 0) ?? 0,
        phieuBanCount: phieuBan?.length ?? 0,
        phieuBanTotal: phieuBan?.reduce((sum, p) => sum + (p.thanh_tien || 0), 0) ?? 0,
      },
      details: {
        phieuCan: phieuCan ?? [],
        phieuBan: phieuBan ?? [],
      },
    });
  } catch (error) {
    console.error('Error in DELETE preview:', error);
    return NextResponse.json(
      { error: 'Lỗi máy chủ' },
      { status: 500 },
    );
  }
}
