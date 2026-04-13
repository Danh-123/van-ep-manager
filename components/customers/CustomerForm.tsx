'use client';

import type { CustomerType } from '@/app/(dashboard)/employees/customer-actions';

export type CustomerFormValues = {
  maKhachHang: string;
  tenKhachHang: string;
  loaiKhachHang: CustomerType;
  soDienThoai: string;
  diaChi: string;
};

type CustomerFormProps = {
  value: CustomerFormValues;
  onChange: (next: CustomerFormValues) => void;
  isEditing?: boolean;
};

export default function CustomerForm({ value, onChange, isEditing = false }: CustomerFormProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="maKhachHang">
          Mã khách hàng
        </label>
        <input
          id="maKhachHang"
          value={value.maKhachHang}
          onChange={(event) => onChange({ ...value, maKhachHang: event.target.value })}
          placeholder={isEditing ? 'Giữ nguyên hoặc đổi mã' : 'Để trống để tự động sinh'}
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="tenKhachHang">
          Tên khách hàng *
        </label>
        <input
          id="tenKhachHang"
          value={value.tenKhachHang}
          onChange={(event) => onChange({ ...value, tenKhachHang: event.target.value })}
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="loaiKhachHang">
          Loại khách hàng
        </label>
        <select
          id="loaiKhachHang"
          value={value.loaiKhachHang}
          onChange={(event) => onChange({ ...value, loaiKhachHang: event.target.value as CustomerType })}
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
        >
          <option value="mua">Mua</option>
          <option value="ban">Bán</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="soDienThoai">
          SĐT
        </label>
        <input
          id="soDienThoai"
          value={value.soDienThoai}
          onChange={(event) => onChange({ ...value, soDienThoai: event.target.value })}
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="diaChi">
          Địa chỉ
        </label>
        <textarea
          id="diaChi"
          value={value.diaChi}
          onChange={(event) => onChange({ ...value, diaChi: event.target.value })}
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
        />
      </div>
    </div>
  );
}
