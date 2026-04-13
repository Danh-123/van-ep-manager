import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface DeletePreviewData {
  customer?: {
    id: number;
    ma_khach_hang: string;
    ten_khach_hang: string;
  };
  employee?: {
    id: number;
    ma_cong_nhan: string;
    ho_ten: string;
  };
  summary: {
    phieuCanCount?: number;
    phieuCanTotal?: number;
    phieuBanCount?: number;
    phieuBanTotal?: number;
    chamCongCount?: number;
    luongThangCount?: number;
    luongThangTotal?: number;
  };
  details: {
    phieuCan?: Array<{
      id: number;
      ngay_can: string;
      so_phieu: string;
      khoi_luong_tan: number;
      thanh_tien: number;
    }>;
    phieuBan?: Array<{
      id: number;
      so_phieu: string;
      ngay_ban: string;
      so_khoi: number;
      thanh_tien: number;
    }>;
    chamCong?: Array<{
      id: number;
      ngay: string;
      trang_thai: string;
    }>;
    luongThang?: Array<{
      id: number;
      thang: string;
      tong_luong: number;
    }>;
  };
}

interface DeleteConfirmationModalProps {
  open: boolean;
  loading: boolean;
  data: DeletePreviewData | null;
  onConfirm: () => void;
  onCancel: () => void;
  type: 'customer' | 'employee';
}

export function DeleteConfirmationModal({
  open,
  loading,
  data,
  onConfirm,
  onCancel,
  type,
}: DeleteConfirmationModalProps) {
  if (!data) return null;

  const isCustomer = type === 'customer';
  const name = isCustomer
    ? `${data.customer?.ma_khach_hang} - ${data.customer?.ten_khach_hang}`
    : `${data.employee?.ma_cong_nhan} - ${data.employee?.ho_ten}`;

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-h-[90vh] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-red-600">
              ⚠️ XÁC NHẬN XÓA
            </Dialog.Title>
            <button
              onClick={onCancel}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Dialog.Description className="text-sm text-slate-700">
            Bạn sắp xóa: <strong>{name}</strong>
          </Dialog.Description>

          <div className="mt-4 space-y-4">
          {/* Dữ liệu sẽ bị xóa */}
          {isCustomer && data.summary.phieuCanCount !== undefined && (
            <>
              <div className="rounded-lg bg-red-50 p-4">
                <h3 className="mb-3 font-semibold text-red-900">🗑️ PHIẾU CÂN (Mua) SẼ BỊ XÓA:</h3>
                {data.summary.phieuCanCount > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-red-700">
                      <strong>{data.summary.phieuCanCount} phiếu</strong> - Tổng tiền:{' '}
                      <strong>
                        {data.summary.phieuCanTotal?.toLocaleString('vi-VN', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}{' '}
                        đ
                      </strong>
                    </p>
                    <div className="max-h-40 overflow-y-auto rounded bg-white p-2 text-xs">
                      {data.details.phieuCan?.map((p) => (
                        <div key={p.id} className="border-b py-1 last:border-b-0">
                          <div>{p.so_phieu}</div>
                          <div className="text-gray-600">
                            {p.ngay_can} - {p.khoi_luong_tan}t -{' '}
                            {p.thanh_tien?.toLocaleString('vi-VN', {
                              minimumFractionDigits: 0,
                            })}{' '}
                            đ
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Không có phiếu cân</p>
                )}
              </div>

              <div className="rounded-lg bg-red-50 p-4">
                <h3 className="mb-3 font-semibold text-red-900">🗑️ PHIẾU BÁN (Bán) SẼ BỊ XÓA:</h3>
                {data.summary.phieuBanCount !== undefined && data.summary.phieuBanCount > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-red-700">
                      <strong>{data.summary.phieuBanCount} phiếu</strong> - Tổng tiền:{' '}
                      <strong>
                        {data.summary.phieuBanTotal?.toLocaleString('vi-VN', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}{' '}
                        đ
                      </strong>
                    </p>
                    <div className="max-h-40 overflow-y-auto rounded bg-white p-2 text-xs">
                      {data.details.phieuBan?.map((p) => (
                        <div key={p.id} className="border-b py-1 last:border-b-0">
                          <div>{p.so_phieu}</div>
                          <div className="text-gray-600">
                            {p.ngay_ban} - {p.so_khoi}khối -{' '}
                            {p.thanh_tien?.toLocaleString('vi-VN', {
                              minimumFractionDigits: 0,
                            })}{' '}
                            đ
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Không có phiếu bán</p>
                )}
              </div>
            </>
          )}

          {!isCustomer && data.summary.chamCongCount !== undefined && (
            <>
              <div className="rounded-lg bg-red-50 p-4">
                <h3 className="mb-3 font-semibold text-red-900">🗑️ CHẤM CÔNG SẼ BỊ XÓA:</h3>
                {data.summary.chamCongCount > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-red-700">
                      <strong>{data.summary.chamCongCount} ngày</strong> chấm công
                    </p>
                    <div className="max-h-40 overflow-y-auto rounded bg-white p-2 text-xs">
                      {data.details.chamCong?.map((c) => (
                        <div key={c.id} className="border-b py-1 last:border-b-0">
                          <div>
                            {c.ngay} - {c.trang_thai}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Không có chấm công</p>
                )}
              </div>

              <div className="rounded-lg bg-red-50 p-4">
                <h3 className="mb-3 font-semibold text-red-900">🗑️ LƯƠNG THÁNG SẼ BỊ XÓA:</h3>
                {data.summary.luongThangCount !== undefined && data.summary.luongThangCount > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-red-700">
                      <strong>{data.summary.luongThangCount} tháng</strong> - Tổng lương:{' '}
                      <strong>
                        {data.summary.luongThangTotal?.toLocaleString('vi-VN', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}{' '}
                        đ
                      </strong>
                    </p>
                    <div className="max-h-40 overflow-y-auto rounded bg-white p-2 text-xs">
                      {data.details.luongThang?.map((l) => (
                        <div key={l.id} className="border-b py-1 last:border-b-0">
                          <div>
                            {new Date(l.thang).toLocaleDateString('vi-VN')} -{' '}
                            {l.tong_luong?.toLocaleString('vi-VN', {
                              minimumFractionDigits: 0,
                            })}{' '}
                            đ
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Không có lương tháng</p>
                )}
              </div>
            </>
          )}

          {/* Cảnh báo */}
          <div className="rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800">
            <strong>⚠️ LƯU Ý:</strong> Tất cả dữ liệu trên sẽ bị <strong>XÓA VĨNH VIỄN</strong> và không thể
            khôi phục. Hãy chắc chắn trước khi xóa!
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Hủy bỏ
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? 'Đang xóa...' : 'Xác nhận xóa'}
            </button>
          </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
