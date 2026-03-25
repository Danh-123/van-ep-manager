'use client';

import { useState } from 'react';
import FeatureList from '@/components/help/FeatureList';
import QuickGuide from '@/components/help/QuickGuide';

type TabType = 'overview' | 'features' | 'guide';

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      <section className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900">
              📖 Trợ giúp & Hướng dẫn
            </h1>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Toàn Tâm Phát - Hệ thống quản lý sản xuất gỗ toàn diện
            </p>
            <p className="mt-2 text-slate-500 text-sm">
              Quản lý chấm công, tính lương, theo dõi công nợ, chế độ kế toán tích hợp
            </p>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              👋 Tổng quan hệ thống
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`px-6 py-4 font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'features'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              ✨ Tính năng
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-6 py-4 font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'guide'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              📚 Hướng dẫn nhanh
            </button>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
            {/* System Description */}
            <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">🏭 Hệ thống Toàn Tâm Phát là gì?</h2>
              <div className="mt-6 space-y-4 text-slate-600 leading-relaxed">
                <p>
                  Toàn Tâm Phát là một hệ thống quản lý sản xuất gỗ<strong className="text-slate-900"> toàn diện</strong> được thiết kế riêng cho các xưởng chế biến gỗ. Hệ thống giúp:
                </p>
                <ul className="space-y-2 ml-6 list-disc text-slate-600">
                  <li>✅ <strong>Quản lý công nhân</strong> - Chấm công, tính lương tự động dựa trên sản lượng</li>
                  <li>✅ <strong>Theo dõi sản xuất</strong> - Ghi nhận phiếu cân, loại gỗ, khối lượng từng đơn hàng</li>
                  <li>✅ <strong>Quản lý công nợ</strong> - Tính công nợ tích lũy khách hàng, theo dõi thanh toán</li>
                  <li>✅ <strong>Báo cáo tài chính</strong> - Xuất báo cáo lương, doanh số, công nợ theo tháng</li>
                  <li>✅ <strong>Kiểm soát chất lượng</strong> - Nhật ký kiểm toán tất cả thay đổi dữ liệu</li>
                </ul>

                <p className="pt-4">
                  Với <strong className="text-slate-900">giao diện thân thiện, quy trình làm việc đơn giản</strong>, bạn có thể bắt đầu sử dụng ngay mà không cần đào tạo lâu dài.
                </p>
              </div>
            </div>

            {/* For Different Roles */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
                <h3 className="text-lg font-bold text-blue-900">👨‍💼 Chủ xưởng</h3>
                <p className="mt-3 text-sm text-blue-800 leading-relaxed">
                  Xem dashboard tổng quát, thống kê doanh thu, lương, công nợ hàng ngày. Xuất báo cáo tài chính để quyết định.
                </p>
              </div>

              <div className="rounded-lg border border-green-200 bg-green-50 p-6">
                <h3 className="text-lg font-bold text-green-900">📊 Kế toán</h3>
                <p className="mt-3 text-sm text-green-800 leading-relaxed">
                  Quản lý dữ liệu chấm công, tính lương, theo dõi công nợ, sửa thưởng phạt, xuất Excel báo cáo.
                </p>
              </div>

              <div className="rounded-lg border border-purple-200 bg-purple-50 p-6">
                <h3 className="text-lg font-bold text-purple-900">👨‍🔧 Quản lý sàn</h3>
                <p className="mt-3 text-sm text-purple-800 leading-relaxed">
                  Nhập dữ liệu chấm công công nhân, tạo phiếu cân, quản lý hàng tồn, xem lương của bộ phận.
                </p>
              </div>
            </div>

            {/* Key Features */}
            <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">🎯 Các đặc trưng chính:</h3>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mt-2"></span>
                  <span className="text-slate-700"><strong>Tính lương tự động</strong> từ dữ liệu chấm công theo loại sản phẩm</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mt-2"></span>
                  <span className="text-slate-700"><strong>Công nợ tích lũy</strong> - theo dõi chi tiết từng phiếu cân</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mt-2"></span>
                  <span className="text-slate-700"><strong>Xuất báo cáo Excel</strong> - In sơ đồ lương, công nợ, doanh số</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mt-2"></span>
                  <span className="text-slate-700"><strong>Quyền truy cập</strong> - Phân biệt Admin, Kế toán, Nhân viên</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mt-2"></span>
                  <span className="text-slate-700"><strong>Nhật ký kiểm toán</strong> - Ghi lại ai sửa cái gì, khi nào</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mt-2"></span>
                  <span className="text-slate-700"><strong>Truy cập từ web</strong> - Không cần cài đặt, dùng trình duyệt</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features Tab */}
        {activeTab === 'features' && (
          <div className="bg-white rounded-lg p-8 shadow-sm">
            <FeatureList />
          </div>
        )}

        {/* Guide Tab */}
        {activeTab === 'guide' && (
          <div className="bg-white rounded-lg p-8 shadow-sm">
            <QuickGuide />
          </div>
        )}
      </section>

      {/* Footer */}
      <section className="border-t border-slate-200 bg-white py-8 mt-12">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="text-sm text-slate-600">
            Toàn Tâm Phát v1.0 • {new Date().getFullYear()} • Thiết kế cho xưởng chế biến gỗ
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Liên hệ Admin hệ thống để được hỗ trợ hoặc báo cáo lỗi
          </p>
        </div>
      </section>
    </div>
  );
}
