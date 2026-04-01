import { redirect } from 'next/navigation';

import PersonalDebtTable from '@/components/debt/PersonalDebtTable';
import { createClient } from '@/lib/supabase/server';

export default async function MyDebtPage() {
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

  if (!profileResult.data || profileResult.data.role !== 'Viewer') {
    redirect('/dashboard');
  }

  const workerResult = await supabase.from('cong_nhan').select('id').eq('user_id', user.id).limit(1).maybeSingle();

  if (workerResult.error) {
    throw new Error(workerResult.error.message);
  }

  if (workerResult.data) {
    redirect('/my-salary');
  }

  const customerResult = await supabase
    .from('khach_hang')
    .select('id, ten_khach_hang')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (customerResult.error) {
    throw new Error(customerResult.error.message);
  }

  if (!customerResult.data) {
    return (
      <div className="space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Công nợ của tôi</h1>
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tài khoản chưa được liên kết với khách hàng. Vui lòng liên hệ Admin.
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Công nợ của tôi</h1>
        <p className="mt-1 text-sm text-slate-600">Theo dõi các phiếu còn nợ và số tiền cần thanh toán.</p>
      </header>

      <PersonalDebtTable customerName={(customerResult.data as { ten_khach_hang: string }).ten_khach_hang} />
    </div>
  );
}
