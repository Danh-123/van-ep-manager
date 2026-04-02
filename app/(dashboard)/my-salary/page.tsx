import { format } from 'date-fns';
import { redirect } from 'next/navigation';

import PersonalSalaryTable from '@/components/salary/PersonalSalaryTable';
import { createClient } from '@/lib/supabase/server';

type MySalaryPageProps = {
  searchParams: Promise<{ month?: string }>;
};

function resolveMonth(monthValue?: string) {
  if (monthValue && /^\d{4}-\d{2}$/.test(monthValue)) {
    return monthValue;
  }

  return format(new Date(), 'yyyy-MM');
}
export default async function MySalaryPage({ searchParams }: MySalaryPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profileResult = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  if (!profileResult.data) {
    return (
      <div className="space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Lương của tôi</h1>
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Không tìm thấy hồ sơ người dùng. Vui lòng liên hệ Admin để kiểm tra dữ liệu.
          </p>
        </header>
      </div>
    );
  }

  if (profileResult.data.role !== 'Viewer') {
    return (
      <div className="space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Lương của tôi</h1>
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tài khoản này không phải Viewer nên không thể xem trang lương cá nhân.
          </p>
        </header>
      </div>
    );
  }

  const params = await searchParams;
  const monthKey = resolveMonth(params.month);

  const workerResult = await supabase
    .from('cong_nhan')
    .select('id, ho_ten, ma_cong_nhan')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!workerResult.data) {
    return (
      <div className="space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Lương của tôi</h1>
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tài khoản chưa được liên kết với công nhân. Vui lòng liên hệ Admin.
          </p>
        </header>
      </div>
    );
  }

  const workerName = (workerResult.data as { ho_ten: string }).ho_ten;
  const workerCode = (workerResult.data as { ma_cong_nhan: string }).ma_cong_nhan;

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Lương của tôi</h1>
        <p className="mt-1 text-sm text-slate-600">Theo dõi lương theo chế độ một tháng hoặc nhiều tháng, có phân trang theo năm.</p>
      </header>

      <PersonalSalaryTable month={monthKey} workerName={workerName} workerCode={workerCode} />
    </div>
  );
}
