import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const employeeId = parseInt(id, 10);

    if (!Number.isFinite(employeeId) || employeeId <= 0) {
      return NextResponse.json(
        { error: 'ID công nhân không hợp lệ' },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Lấy thông tin công nhân
    const { data: employee, error: employeeError } = await supabase
      .from('cong_nhan')
      .select('id, ma_cong_nhan, ho_ten')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: 'Không tìm thấy công nhân' },
        { status: 404 },
      );
    }

    // Lấy tất cả chấm công
    const { data: chamCong, error: chamCongError } = await supabase
      .from('cham_cong')
      .select('id, ngay, trang_thai')
      .eq('cong_nhan_id', employeeId)
      .order('ngay', { ascending: false });

    if (chamCongError) {
      return NextResponse.json(
        { error: 'Lỗi lấy dữ liệu chấm công' },
        { status: 500 },
      );
    }

    // Lấy tất cả lương tháng
    const { data: luongThang, error: luongThangError } = await supabase
      .from('luong_thang')
      .select('id, thang, tong_luong')
      .eq('cong_nhan_id', employeeId)
      .order('thang', { ascending: false });

    if (luongThangError) {
      return NextResponse.json(
        { error: 'Lỗi lấy dữ liệu lương tháng' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      employee,
      summary: {
        chamCongCount: chamCong?.length ?? 0,
        luongThangCount: luongThang?.length ?? 0,
        luongThangTotal: luongThang?.reduce((sum, l) => sum + (l.tong_luong || 0), 0) ?? 0,
      },
      details: {
        chamCong: chamCong ?? [],
        luongThang: luongThang ?? [],
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
