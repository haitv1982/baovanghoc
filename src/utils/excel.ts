import * as XLSX from 'xlsx';

function setCellTextFormat(ws: XLSX.WorkSheet, cellAddress: string, value: string) {
  ws[cellAddress] = {
    t: 's',
    v: value,
    z: '@',
  };
}

/**
 * Tạo và tải về file Excel (.xlsx) mẫu cấp tài khoản Phụ Huynh
 * Cấu trúc 4 cột: TT | Họ tên học sinh | Lớp | Số điện thoại
 */
export function downloadParentExcelTemplate() {
  const headers = ['TT', 'Họ tên học sinh', 'Lớp', 'Số điện thoại'];
  const sampleRows: [number, string, string, string][] = [
    [1, 'Nguyễn Gia Bảo', '6A1', '0987654321'],
    [2, 'Lê Minh Anh', '6A2', '0912345678'],
    [3, 'Phạm Tuấn Kiệt', '7B1', '0978112233'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

  // Định dạng cột Số điện thoại (D) dạng văn bản để Excel không mất số 0 ở đầu
  sampleRows.forEach((row, idx) => {
    const excelRowNum = idx + 2;
    setCellTextFormat(ws, `D${excelRowNum}`, row[3]);
  });

  ws['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 12 },
    { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh sách phụ huynh');
  XLSX.writeFile(wb, 'Mau_danh_sach_cap_tai_khoan_phu_huynh.xlsx');
}

/**
 * Tạo và tải về file Excel (.xlsx) mẫu cấp tài khoản Giáo Viên
 * Cấu trúc 3 cột: TT | Họ và tên | Chủ nhiệm lớp
 */
export function downloadTeacherExcelTemplate() {
  const headers = ['TT', 'Họ và tên', 'Chủ nhiệm lớp'];
  const sampleRows: [number, string, string][] = [
    [1, 'Nguyễn Thị Lan', '6A2'],
    [2, 'Trần Văn Bình', '7A1'],
    [3, 'Lê Thị Hồng', ''],
    [4, 'Phạm Minh Đức', '8A2'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh sách giáo viên');
  XLSX.writeFile(wb, 'Mau_danh_sach_cap_tai_khoan_giao_vien.xlsx');
}

/**
 * Đọc tệp Excel (.xlsx, .xls) hoặc CSV/TXT thành chuỗi phân tách bằng tab (\t)
 * để dán vào khung xử lý danh sách hàng loạt.
 */
export async function readSpreadsheetToTabText(file: File): Promise<string> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.csv') || lowerName.endsWith('.txt')) {
    return await file.text();
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return '';

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  return rows
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
    .map((row) => row.map((cell) => String(cell ?? '').replace(/[\r\n]+/g, ' ').trim()).join('\t'))
    .join('\n');
}
