'use client';

export type AttendanceStatus = 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem';

export type AttendanceRowData = {
  congNhanId: number;
  hoTen: string;
  status: AttendanceStatus;
};

type AttendanceRowProps = {
  row: AttendanceRowData;
  onChangeStatus: (congNhanId: number, status: AttendanceStatus) => void;
};

export default function AttendanceRow({ row, onChangeStatus }: AttendanceRowProps) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-3 py-2.5 text-slate-800">{row.hoTen}</td>
      <td className="px-3 py-2.5">
        <select
          value={row.status}
          onChange={(event) => onChangeStatus(row.congNhanId, event.target.value as AttendanceStatus)}
          className="h-10 w-full max-w-[220px] rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
        >
          <option value="CoMat">Có mặt</option>
          <option value="Nghi">Nghỉ</option>
          <option value="NghiPhep">Nghỉ phép</option>
          <option value="LamThem">Làm thêm</option>
        </select>
      </td>
    </tr>
  );
}
