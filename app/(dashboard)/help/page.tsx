'use client'

import { ChevronDown, FileText, HelpCircle, Mail, Phone, PlayCircle, Search } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface FAQItem {
  category: string
  question: string
  answer: string
}

const faqData: FAQItem[] = [
  {
    category: 'Đăng nhập & Tài khoản',
    question: 'Mất mật khẩu phải làm sao?',
    answer: 'Vào trang đăng nhập, nhấp "Quên mật khẩu?", nhập email. Hệ thống sẽ gửi link reset qua email. Check thư rác nếu không thấy. Click link & đặt mật khẩu mới.'
  },
  {
    category: 'Đăng nhập & Tài khoản',
    question: 'Tài khoản của tôi bị khóa, phải làm sao?',
    answer: 'Liên hệ Admin hoặc phòng IT để mở khóa tài khoản. Cung cấp email hoặc mã công nhân của bạn.'
  },
  {
    category: 'Lương & Chấm công',
    question: 'Cách xem lương tháng này?',
    answer: 'Menu sidebar → "Lương của tôi" → Chọn tháng từ dropdown → Xem chi tiết lương từng ngày.'
  },
  {
    category: 'Lương & Chấm công',
    question: 'Làm sao xuất báo cáo lương?',
    answer: 'Vào "Lương của tôi" → Chọn tháng → Nhấp "Xuất Excel" → File .xlsx sẽ download về máy tính.'
  },
  {
    category: 'Lương & Chấm công',
    question: 'Chấm công chính xác không? Sao lương khác tháng trước?',
    answer: 'Lương được tính dựa trên chấm công hàng ngày. Nếu bạn thấy không đúng, liên hệ Kế toán để kiểm tra.'
  },
  {
    category: 'Lương & Chấm công',
    question: 'Lương làm thêm được tính cao hơn không?',
    answer: 'Tùy cấu hình công ty. Hỏi Kế toán hoặc Admin về quy định lương làm thêm.'
  },
  {
    category: 'Import dữ liệu',
    question: 'Import dữ liệu cũ như thế nào?',
    answer: 'Menu → "Import du liệu" (Admin only) → Chọn file Excel → Map cột → Xác thực → Dry-run xem trước → Import.'
  },
  {
    category: 'Import dữ liệu',
    question: 'Import bị lỗi định dạng ngày, sửa thế nào?',
    answer: 'Kiểm tra file Excel, đảm bảo ngày ở format DD/MM/YYYY hoặc YYYY-MM-DD. Sửa lại file, re-upload.'
  },
  {
    category: 'Tính năng khác',
    question: 'Phiếu cân dùng để làm gì?',
    answer: 'Phiếu cân ghi lại khối lượng hàng được cân. Công ty dùng để quản lý sản lượng và audit hàng hoá.'
  },
  {
    category: 'Tính năng khác',
    question: 'Thanh toán lương những cách nào?',
    answer: 'Hệ thống hỗ trợ 3 cách: Tiền mặt, Chuyển khoản, Khác. Kế toán sẽ chọn hình thức khi thanh toán.'
  },
  {
    category: 'Admin',
    question: 'Cách tạo tài khoản mới cho nhân viên?',
    answer: 'Menu → "Quản lý người dùng" (Admin only) → "Thêm người dùng" → Nhập email, tên, role → "Tạo".'
  },
  {
    category: 'Admin',
    question: 'Backup dữ liệu như thế nào?',
    answer: 'Menu → Cấu hình → Backup. Hoặc xuất toàn bộ data thành Excel. Hoặc liên hệ IT để backup tự động.'
  },
  {
    category: 'Admin',
    question: 'Sửa lương tháng trước có ảnh hưởng gì không?',
    answer: 'Có. Sửa dữ liệu ngày cũ sẽ tính lại lương tháng đó tự động. Hệ thống sẽ cập nhật dashboard.'
  }
]

const categoryIcons: Record<string, string> = {
  'Đăng nhập & Tài khoản': '🔐',
  'Lương & Chấm công': '💰',
  'Import dữ liệu': '📥',
  'Tính năng khác': '⚙️',
  'Admin': '👨‍💼'
}

export default function HelpPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  const categories = Array.from(new Set(faqData.map((item) => item.category)))

  const filteredFAQ = faqData.filter((item) => {
    const matchesCategory = !selectedCategory || item.category === selectedCategory
    const matchesSearch = !searchQuery || item.question.toLowerCase().includes(searchQuery.toLowerCase()) || item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedItems(newExpanded)
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50'>
      {/* Header */}
      <div className='bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-12'>
        <div className='container mx-auto px-4'>
          <div className='flex items-center gap-3 mb-4'>
            <HelpCircle size={32} />
            <h1 className='text-4xl font-bold'>Trung tâm Hỗ trợ</h1>
          </div>
          <p className='text-blue-100 text-lg'>Tìm câu trả lời cho câu hỏi của bạn</p>
        </div>
      </div>

      {/* Main Content */}
      <div className='container mx-auto px-4 py-12'>
        {/* Search Bar */}
        <div className='mb-8'>
          <div className='relative'>
            <Search className='absolute left-4 top-3 text-gray-400' size={20} />
            <input
              type='text'
              placeholder='Tìm kiếm câu hỏi...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
            />
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-4 gap-8'>
          {/* Sidebar - Categories */}
          <div className='lg:col-span-1'>
            <div className='bg-white rounded-lg shadow-md p-6 sticky top-4'>
              <h2 className='font-bold text-lg mb-4 text-gray-800'>Danh mục</h2>
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-4 py-2 rounded-lg mb-2 transition-colors ${
                  selectedCategory === null
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                Tất cả
              </button>

              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full text-left px-4 py-2 rounded-lg mb-2 transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className='mr-2'>{categoryIcons[category] || '📌'}</span>
                  {category}
                </button>
              ))}
            </div>

            {/* Quick Links */}
            <div className='bg-white rounded-lg shadow-md p-6 mt-6'>
              <h2 className='font-bold text-lg mb-4 text-gray-800'>Tài liệu</h2>
              <div className='space-y-3'>
                <Link
                  href='https://github.com/your-repo/blob/main/USER_GUIDE.md'
                  target='_blank'
                  className='flex items-center gap-3 text-gray-700 hover:text-blue-600 transition-colors'
                >
                  <FileText size={18} />
                  <span className='text-sm'>Hướng dẫn sử dụng</span>
                </Link>
                <Link
                  href='https://github.com/your-repo/blob/main/ADMIN_GUIDE.md'
                  target='_blank'
                  className='flex items-center gap-3 text-gray-700 hover:text-blue-600 transition-colors'
                >
                  <FileText size={18} />
                  <span className='text-sm'>Hướng dẫn Admin</span>
                </Link>
                <Link
                  href='https://github.com/your-repo/blob/main/TECHNICAL_GUIDE.md'
                  target='_blank'
                  className='flex items-center gap-3 text-gray-700 hover:text-blue-600 transition-colors'
                >
                  <FileText size={18} />
                  <span className='text-sm'>Hướng dẫn kỹ thuật</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Main Content - FAQ */}
          <div className='lg:col-span-3'>
            {/* FAQ Items */}
            <div className='space-y-4'>
              {filteredFAQ.length > 0 ? (
                filteredFAQ.map((item, index) => (
                  <div
                    key={index}
                    className='bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow'
                  >
                    <button
                      onClick={() => toggleExpanded(index)}
                      className='w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors'
                    >
                      <div className='flex items-center gap-3 text-left flex-1'>
                        <span className='text-2xl'>{categoryIcons[item.category] || '📌'}</span>
                        <h3 className='font-semibold text-gray-800 text-lg'>{item.question}</h3>
                      </div>
                      <ChevronDown
                        size={20}
                        className={`text-gray-400 transition-transform ${
                          expandedItems.has(index) ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {expandedItems.has(index) && (
                      <div className='px-6 py-4 bg-gray-50 border-t border-gray-200'>
                        <p className='text-gray-700 leading-relaxed'>{item.answer}</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className='bg-white rounded-lg shadow-md p-8 text-center'>
                  <HelpCircle size={48} className='mx-auto text-gray-300 mb-4' />
                  <p className='text-gray-500 text-lg'>
                    Không tìm thấy kết quả cho: &quot;{searchQuery}&quot;
                  </p>
                  <p className='text-gray-400 mt-2'>Thử tìm kiếm với từ khóa khác</p>
                </div>
              )}
            </div>

            {/* Tutorial Section */}
            <div className='mt-12 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-8 border border-green-200'>
              <div className='flex items-center gap-3 mb-4'>
                <PlayCircle size={28} className='text-green-600' />
                <h2 className='text-2xl font-bold text-gray-800'>Video hướng dẫn</h2>
              </div>
              <p className='text-gray-700 mb-6'>
                Xem các video hướng dẫn chi tiết về cách sử dụng hệ thống
              </p>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {[
                  { title: 'Cách đăng nhập', duration: '2:15', status: 'coming-soon' },
                  { title: 'Xem lương cá nhân', duration: '3:45', status: 'coming-soon' },
                  { title: 'Xuất báo cáo Excel', duration: '5:20', status: 'coming-soon' },
                  { title: 'Import dữ liệu', duration: '8:30', status: 'coming-soon' }
                ].map((video, idx) => (
                  <div
                    key={idx}
                    className='bg-white rounded-lg p-4 flex items-center gap-4 hover:shadow-md transition-shadow'
                  >
                    <div className='bg-gray-200 rounded-lg p-3 flex-shrink-0'>
                      <PlayCircle size={24} className='text-gray-600' />
                    </div>
                    <div className='flex-1'>
                      <p className='font-semibold text-gray-800'>{video.title}</p>
                      <p className='text-sm text-gray-500'>{video.duration}</p>
                    </div>
                    {video.status === 'coming-soon' && (
                      <span className='text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded'>
                        Sắp có
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Section */}
            <div className='mt-12 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-8 border border-orange-200'>
              <h2 className='text-2xl font-bold text-gray-800 mb-4'>Không tìm thấy câu trả lời?</h2>
              <p className='text-gray-700 mb-6'>Liên hệ với phòng IT hoặc Admin để nhận hỗ trợ trực tiếp</p>

              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div className='bg-white rounded-lg p-4 flex items-center gap-3 hover:shadow-md transition-shadow'>
                  <Mail size={24} className='text-blue-600 flex-shrink-0' />
                  <div>
                    <p className='font-semibold text-gray-800'>Email</p>
                    <p className='text-sm text-gray-600'>support@company.com</p>
                  </div>
                </div>

                <div className='bg-white rounded-lg p-4 flex items-center gap-3 hover:shadow-md transition-shadow'>
                  <Phone size={24} className='text-green-600 flex-shrink-0' />
                  <div>
                    <p className='font-semibold text-gray-800'>Điện thoại</p>
                    <p className='text-sm text-gray-600'>028-1234-5678</p>
                  </div>
                </div>

                <div className='bg-white rounded-lg p-4 flex items-center gap-3 hover:shadow-md transition-shadow'>
                  <HelpCircle size={24} className='text-purple-600 flex-shrink-0' />
                  <div>
                    <p className='font-semibold text-gray-800'>Giờ làm việc</p>
                    <p className='text-sm text-gray-600'>Thứ 2-6: 8:00-17:00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className='bg-gray-100 border-t border-gray-200 py-8 mt-12'>
        <div className='container mx-auto px-4 text-center'>
          <p className='text-gray-600'>
            Phiên bản hệ thống: 1.0 • Cập nhật lần cuối: Tháng 3/2026
          </p>
          <p className='text-sm text-gray-500 mt-2'>
            © 2026 Van EP Manager. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
