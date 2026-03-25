'use client';

import {
  BarChart3,
  Book,
  Clock,
  FileText,
  Lightbulb,
  PackageOpen,
  PhoneOff,
  Printer,
  Rocket,
  Target,
  Users,
  Zap,
} from 'lucide-react';

const FEATURES = [
  {
    title: 'Tổng quan',
    description: 'Xem thống kê doanh thu, lương, công nợ của tháng và ngày',
    icon: BarChart3,
    color: 'from-blue-500 to-blue-600',
    tags: ['Thống kê', 'Dashboard'],
  },
  {
    title: 'Quản lý chấm công',
    description: 'Điểm danh công nhân, tính lương ngày tự động với các hạng mục sản phẩm',
    icon: Clock,
    color: 'from-green-500 to-green-600',
    tags: ['Chấm công', 'Tính lương'],
  },
  {
    title: 'Quản lý lương tháng',
    description: 'Xem lương tháng chi tiết, thêm thưởng/phạt, xuất Excel nhiều tháng',
    icon: Printer,
    color: 'from-purple-500 to-purple-600',
    tags: ['Lương', 'Excel'],
  },
  {
    title: 'Quản lý xe hàng',
    description: 'Tạo phiếu cân, quản lý công nợ tích lũy của từng phiếu, lịch sử thanh toán',
    icon: Zap,
    color: 'from-amber-500 to-amber-600',
    tags: ['Phiếu cân', 'Công nợ'],
  },
  {
    title: 'Kiểm kê công nợ khách hàng',
    description: 'Xem tổng nợ của từng khách hàng, xuất báo cáo, lọc theo quá hạn',
    icon: Target,
    color: 'from-red-500 to-red-600',
    tags: ['Công nợ', 'Khách hàng'],
  },
  {
    title: 'Quản lý công nhân',
    description: 'Thêm, sửa, xóa thông tin công nhân, quản lý trạng thái làm việc',
    icon: Users,
    color: 'from-indigo-500 to-indigo-600',
    tags: ['Nhân sự', 'Quản lý'],
  },
  {
    title: 'Quản lý người dùng',
    description: 'Quản lý tài khoản đăng nhập, phân quyền (Admin, Kế toán, Nhân viên)',
    icon: FileText,
    color: 'from-cyan-500 to-cyan-600',
    tags: ['Tài khoản', 'Phân quyền'],
  },
  {
    title: 'Báo cáo tổng hợp',
    description: 'Xuất báo cáo Excel chi tiết về doanh số, chi phí, lương, khoán',
    icon: BarChart3,
    color: 'from-teal-500 to-teal-600',
    tags: ['Báo cáo', 'Export'],
  },
  {
    title: 'Nhật ký kiểm toán',
    description: 'Theo dõi lịch sử thay đổi dữ liệu, ai đó đã sửa gì, khi nào',
    icon: Book,
    color: 'from-slate-500 to-slate-600',
    tags: ['Kiểm toán', 'Lịch sử'],
  },
];

export default function FeatureList() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">✨ Tính năng đã có</h2>
        <p className="mt-2 text-slate-600">Các tính năng hiện đang hoạt động đầy đủ trong hệ thống</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-lg hover:border-slate-300"
            >
              {/* Icon Section */}
              <div className={`mb-3 inline-flex rounded-lg bg-gradient-to-r ${feature.color} p-2.5 text-white`}>
                <Icon className="h-6 w-6" />
              </div>

              {/* Title */}
              <h3 className="font-semibold text-slate-900">{feature.title}</h3>

              {/* Description */}
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{feature.description}</p>

              {/* Tags */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {feature.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Coming Soon */}
      <div className="mt-10 space-y-4">
        <h3 className="text-lg font-bold text-slate-900">🚀 Tính năng sắp phát triển</h3>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <Rocket className="mt-1 h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-amber-900">Nhập Excel hàng loạt</h4>
              <p className="mt-1 text-sm text-amber-800">Nhập dữ liệu công nhân, phiếu cân từ file Excel</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <PhoneOff className="mt-1 h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-green-900">Thông báo Zalo tự động</h4>
              <p className="mt-1 text-sm text-green-800">Gửi thông báo lương, công nợ qua Zalo</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <Lightbulb className="mt-1 h-5 w-5 text-blue-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900">Kết nối cân điện tử</h4>
              <p className="mt-1 text-sm text-blue-800">Tự động đọc dữ liệu từ cân điện tử RS-232/USB</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-purple-200 bg-purple-50 p-4">
            <FileText className="mt-1 h-5 w-5 text-purple-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-purple-900">Báo cáo thuế GTGT</h4>
              <p className="mt-1 text-sm text-purple-800">Xuất báo cáo thuế giá trị gia tăng định kỳ</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4 md:col-span-2">
            <PackageOpen className="mt-1 h-5 w-5 text-indigo-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-indigo-900">Quản lý kho nguyên liệu</h4>
              <p className="mt-1 text-sm text-indigo-800">Quản lý tồn kho, chi tiêu, nhập xuất nguyên liệu</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
