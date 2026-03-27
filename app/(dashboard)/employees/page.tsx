'use client';

import * as Tabs from '@radix-ui/react-tabs';

import CustomerTab from '@/components/customers/CustomerTab';
import EmployeeTab from '@/components/employees/EmployeeTab';

export default function EmployeesPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Danh sách</h1>
        <p className="mt-1 text-sm text-slate-600">Quản lý công nhân và khách hàng</p>
      </header>

      <Tabs.Root defaultValue="employees" className="space-y-4">
        <Tabs.List className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <Tabs.Trigger
            value="employees"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 data-[state=active]:bg-[#2E7D32] data-[state=active]:text-white"
          >
            Công nhân
          </Tabs.Trigger>
          <Tabs.Trigger
            value="customers"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 data-[state=active]:bg-[#2E7D32] data-[state=active]:text-white"
          >
            Khách hàng
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="employees">
          <EmployeeTab />
        </Tabs.Content>

        <Tabs.Content value="customers">
          <CustomerTab />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
