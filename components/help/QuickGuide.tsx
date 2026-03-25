'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

const QUICK_GUIDES = [
  {
    title: 'Cách nhập dữ liệu chấm công hàng ngày',
    steps: [
      {
        number: 1,
        action: 'Vào trang Chấm công',
        details: 'Từ menu Tống quan → Chấm công',
      },
      {
        number: 2,
        action: 'Chọn ngày và công nhân',
        details: 'Chọn ngày cần nhập, chọn công nhân từ danh sách dropdown',
      },
      {
        number: 3,
        action: 'Nhập số lượng sản phẩm',
        details: 'Nhập số tấn (hoặc m³ tùy loại hàng), chọn loại gỗ, nhập khối lượng/chiều dài',
      },
      {
        number: 4,
        action: 'Nhập hoặc bỏ qua phụ cấp',
        details: 'Tùy chọn: nhập tiền phụ cấp, tiền ăn, tiền đi lại nếu có',
      },
      {
        number: 5,
        action: 'Nhấn Lưu',
        details: 'Nhấn nút Lưu để ghi nhận dữ liệu, lương sẽ tính toán tự động',
      },
    ],
    tips: ['Mỗi công nhân chỉ nhập 1 lần/ngày', 'Dữ liệu được lưu ngay khi nhấn Lưu', 'Có thể sửa lại sau bằng cách nhấn vào dòng cần sửa'],
  },
  {
    title: 'Cách tạo phiếu cân mới và quản lý công nợ',
    steps: [
      {
        number: 1,
        action: 'Vào trang Xe hàng / Phiếu cân',
        details: 'Từ menu Tống quan → Xe hàng',
      },
      {
        number: 2,
        action: 'Nhấn nút Thêm phiếu cân',
        details: 'Cửa sổ form thêm mới sẽ hiện lên',
      },
      {
        number: 3,
        action: 'Nhập thông tin phiếu',
        details: 'Chọn khách hàng, nhập ngày, loại gỗ, số tấn, đơn giá, tiền đã trả',
      },
      {
        number: 4,
        action: 'Kiểm tra công nợ tích lũy',
        details: 'Hệ thống tính: Công nợ = (Số tấn × Đơn giá) + Công nợ cũ - Tiền đã trả',
      },
      {
        number: 5,
        action: 'Nhấn Lưu hoặc Hủy',
        details: 'Nhấn Lưu để ghi nhận, hoặc Hủy để không lưu',
      },
      {
        number: 6,
        action: 'Xem công nợ khách hàng',
        details: 'Vào trang Công nợ để xem tổng nợ theo khách hàng tính từ tất cả phiếu',
      },
    ],
    tips: ['Tổng công nợ = Tất cả phiếu chưa thanh toán', 'Dễ dàng sửa/xóa phiếu trong bảng', 'Xuất Excel báo cáo công nợ để in hoặc gửi khách'],
  },
  {
    title: 'Cách xem lương tháng và xuất báo cáo',
    steps: [
      {
        number: 1,
        action: 'Vào trang Lương tháng',
        details: 'Từ menu Tống quan → Lương',
      },
      {
        number: 2,
        action: 'Chọn tháng, năm',
        details: 'Bộ lọc ở trên cùng giúp chọn tháng/năm cần xem',
      },
      {
        number: 3,
        action: 'Xem lương chi tiết từng công nhân',
        details: 'Bảng hiển thị: lương công, thưởng, phạt, tổng cộng, thực lĩnh',
      },
      {
        number: 4,
        action: 'Sửa thưởng/phạt nếu cần',
        details: 'Nhấn vào hàng công nhân, sửa ô thưởng/phạt, nhấn Cập nhật',
      },
      {
        number: 5,
        action: 'Xuất Excel báo cáo lương',
        details: 'Nhấn nút Xuất Excel, chọn tháng từ → đến, tự động tải file tên là Salary_VanEpManager_[tháng].xlsx',
      },
      {
        number: 6,
        action: 'In hoặc gửi báo cáo',
        details: 'File Excel có thể in trực tiếp hoặc gửi cho kế toán/chủ quản',
      },
    ],
    tips: ['Lương công tính từ dữ liệu chấm công trong tháng', 'Thưởng/phạt có thể sửa bất kỳ lúc nào', 'Xuất Excel chứa đầy đủ thông tin để in A4'],
  },
];

interface ExpandableGuideProps {
  guide: (typeof QUICK_GUIDES)[0];
}

function ExpandableGuide({ guide }: ExpandableGuideProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg bg-white transition-all">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <h3 className="font-semibold text-slate-900 text-left">{guide.title}</h3>
        <ChevronDown
          className={`h-5 w-5 text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-t border-slate-200 px-4 py-4 space-y-4 bg-slate-50">
          {/* Steps */}
          <div className="space-y-3">
            {guide.steps.map((step) => (
              <div key={step.number} className="flex gap-4">
                {/* Number Circle */}
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white font-semibold text-sm">
                    {step.number}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <h4 className="font-semibold text-slate-900">{step.action}</h4>
                  <p className="mt-1 text-sm text-slate-600">{step.details}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          {guide.tips.length > 0 && (
            <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-sm font-semibold text-blue-900 mb-2">💡 Mẹo hữu ích:</p>
              <ul className="space-y-1">
                {guide.tips.map((tip, idx) => (
                  <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function QuickGuide() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">📚 Hướng dẫn nhanh</h2>
        <p className="mt-2 text-slate-600">Các bước hướng dẫn từng tính năng để bạn nhanh chóng làm quen</p>
      </div>

      <div className="space-y-4">
        {QUICK_GUIDES.map((guide) => (
          <ExpandableGuide key={guide.title} guide={guide} />
        ))}
      </div>

      {/* Support Section */}
      <div className="mt-10 rounded-lg border border-amber-200 bg-amber-50 p-6">
        <h3 className="font-semibold text-amber-900">🆘 Cần hỗ trợ thêm?</h3>
        <p className="mt-2 text-sm text-amber-800">
          Nếu bạn gặp vấn đề hoặc có câu hỏi không được trả lời ở trên, vui lòng liên hệ với:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-amber-800">
          <li>
            <strong>✉️ Email:</strong> Gửi email với mô tả vấn đề
          </li>
          <li>
            <strong>👤 Admin:</strong> Liên hệ Admin hệ thống để được cấp quyền truy cập hoặc hỗ trợ kỹ thuật
          </li>
          <li>
            <strong>📋 Nhật ký kiểm toán:</strong> Xem trang Nhật ký kiểm toán để theo dõi các thay đổi nếu cần
          </li>
        </ul>
      </div>
    </section>
  );
}
