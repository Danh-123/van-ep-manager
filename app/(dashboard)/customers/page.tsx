import CustomerTab from '@/components/customers/CustomerTab';

export default function CustomersPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Khách hàng</h1>
        <p className="mt-1 text-sm text-slate-600">Quản lý thông tin khách hàng mua và bán</p>
      </header>

      <CustomerTab />
    </div>
  );
}
