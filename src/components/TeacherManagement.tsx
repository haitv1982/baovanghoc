import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Upload,
  Download,
  Printer,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  GraduationCap,
  KeyRound,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { TeacherAccount } from '../types';

interface TeacherManagementProps {
  schoolName?: string;
}

export const TeacherManagement: React.FC<TeacherManagementProps> = ({
  schoolName = 'Trường THCS Giai Lạc',
}) => {
  const [teachers, setTeachers] = useState<TeacherAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Add Single Teacher Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [singleName, setSingleName] = useState<string>('');
  const [singleClass, setSingleClass] = useState<string>('');

  // Batch Upload / Paste Modal
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchText, setBatchText] = useState<string>('');
  const [batchNotice, setBatchNotice] = useState<string>('');

  // Notification message
  const [toastMessage, setToastMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load teachers from backend
  const loadTeachers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/teachers');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTeachers(data.data);
      }
    } catch (err: any) {
      console.error('Failed to load teachers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Toggle visible password
  const toggleShowPassword = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Copy password or credentials
  const handleCopyCredentials = (t: TeacherAccount) => {
    const text = `Tài khoản GV: ${t.username} | Mật khẩu: ${t.password} (${t.name})`;
    navigator.clipboard.writeText(text);
    setCopiedId(t.id);
    showToast(`Đã sao chép tài khoản của ${t.name}!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Add single teacher
  const handleAddSingleTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim()) return;

    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: singleName.trim(),
          assignedClass: singleClass.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể tạo tài khoản giáo viên.');
      }
      showToast(`Đã cấp tài khoản cho ${singleName}: ${data.data.username}`);
      setSingleName('');
      setSingleClass('');
      setShowAddModal(false);
      loadTeachers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi thêm giáo viên.');
    }
  };

  // Process batch text (TT, Họ tên, Chủ nhiệm lớp)
  const handleProcessBatch = async () => {
    if (!batchText.trim()) {
      setBatchNotice('Vui lòng dán hoặc nhập danh sách giáo viên.');
      return;
    }

    const lines = batchText.trim().split('\n');
    const items: { name: string; assignedClass: string; orderNumber: number }[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Ignore header row if detected
      if (
        trimmed.toLowerCase().includes('họ tên') ||
        trimmed.toLowerCase().includes('họ và tên') ||
        trimmed.toLowerCase().includes('chủ nhiệm')
      ) {
        return;
      }

      // Delimiters can be tab, comma, semicolon, or vertical bar |
      let parts: string[] = [];
      if (trimmed.includes('\t')) {
        parts = trimmed.split('\t');
      } else if (trimmed.includes('|')) {
        parts = trimmed.split('|');
      } else if (trimmed.includes(';')) {
        parts = trimmed.split(';');
      } else if (trimmed.includes(',')) {
        parts = trimmed.split(',');
      } else {
        // Fallback: entire line is name
        parts = [String(index + 1), trimmed, ''];
      }

      parts = parts.map((p) => p.trim());

      let name = '';
      let assignedClass = '';

      if (parts.length >= 3) {
        // [TT, Họ tên, Chủ nhiệm lớp]
        name = parts[1];
        assignedClass = parts[2];
      } else if (parts.length === 2) {
        // [Họ tên, Chủ nhiệm lớp] or [TT, Họ tên]
        if (/^\d+$/.test(parts[0])) {
          name = parts[1];
        } else {
          name = parts[0];
          assignedClass = parts[1];
        }
      } else {
        name = parts[0];
      }

      if (name) {
        items.push({
          orderNumber: items.length + 1,
          name,
          assignedClass: assignedClass.toLowerCase() === 'bộ môn' ? '' : assignedClass,
        });
      }
    });

    if (items.length === 0) {
      setBatchNotice('Không tìm thấy dòng dữ liệu giáo viên hợp lệ.');
      return;
    }

    try {
      const res = await fetch('/api/teachers/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể tạo tài khoản hàng loạt.');
      }
      showToast(`Đã tự sinh tài khoản và mật khẩu thành công cho ${data.count} giáo viên!`);
      setBatchText('');
      setShowBatchModal(false);
      loadTeachers();
    } catch (err: any) {
      setBatchNotice(err.message || 'Lỗi khi xử lý danh sách giáo viên.');
    }
  };

  // Reset teacher password
  const handleResetPassword = async (teacher: TeacherAccount) => {
    try {
      const res = await fetch(`/api/teachers/${teacher.id}/reset-password`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã cấp mật khẩu mới cho ${teacher.name}: ${data.newPassword}`);
        loadTeachers();
      }
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  // Delete teacher
  const handleDeleteTeacher = async (teacher: TeacherAccount) => {
    try {
      const res = await fetch(`/api/teachers/${teacher.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã xóa tài khoản giáo viên ${teacher.name}.`);
        loadTeachers();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['TT', 'Họ và tên', 'Vai trò / Chức vụ', 'Lớp chủ nhiệm', 'Tên đăng nhập', 'Mật khẩu'];
    const rows = [headers.join(',')];

    teachers.forEach((t, idx) => {
      const roleText = t.assignedClass ? `GVCN Lớp ${t.assignedClass}` : 'GV Bộ môn';
      const row = [
        idx + 1,
        `"${t.name.replace(/"/g, '""')}"`,
        `"${roleText}"`,
        `"${t.assignedClass || ''}"`,
        `"${t.username}"`,
        `"${t.password}"`,
      ];
      rows.push(row.join(','));
    });

    const csvContent = '\ufeff' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_sach_tai_khoan_giao_vien_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print Teacher Accounts Sheet
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = teachers
      .map(
        (t, idx) => `
        <tr>
          <td style="text-align: center; border: 1px solid #333; padding: 6px;">${idx + 1}</td>
          <td style="border: 1px solid #333; padding: 6px; font-weight: bold;">${t.name}</td>
          <td style="text-align: center; border: 1px solid #333; padding: 6px;">${t.assignedClass ? `Lớp ${t.assignedClass}` : 'GV Bộ môn'}</td>
          <td style="border: 1px solid #333; padding: 6px; font-family: monospace; font-weight: bold;">${t.username}</td>
          <td style="border: 1px solid #333; padding: 6px; font-family: monospace; font-weight: bold;">${t.password}</td>
          <td style="border: 1px solid #333; padding: 6px; font-size: 9pt; color: #555;">Đăng nhập xem danh sách học sinh vắng</td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Bảng Cấp Tài Khoản Giáo Viên - ${schoolName}</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 25px; line-height: 1.4; }
            h2, h3, p { text-align: center; margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11pt; }
            th { border: 1px solid #333; background: #eee; padding: 7px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div style="font-size: 11pt; font-weight: bold;">
            ${schoolName.toUpperCase()}<br/>
            BAN GIÁM HIỆU NHÀ TRƯỜNG
          </div>
          <h2 style="margin-top: 15px;">BẢNG TỔNG HỢP CẤP TÀI KHOẢN GIÁO VIÊN ĐIỆN TỬ</h2>
          <p style="font-size: 10pt; font-style: italic;">Hệ thống Sổ Báo Vắng & Xin Nghỉ Học Trực Tuyến</p>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">TT</th>
                <th>Họ và tên giáo viên</th>
                <th style="width: 100px;">Chức vụ / Lớp</th>
                <th style="width: 120px;">Tên đăng nhập</th>
                <th style="width: 100px;">Mật khẩu</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div style="margin-top: 30px; text-align: right;">
            <i>Ngày cấp: ${new Date().toLocaleDateString('vi-VN')}</i><br/>
            <b>HIỆU TRƯỞNG / BAN GIÁM HIỆU</b><br/><br/><br/>
            (Ký tên và đóng dấu)
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const homeroomCount = teachers.filter((t) => t.isHomeroom).length;
  const subjectCount = teachers.filter((t) => !t.isHomeroom).length;

  return (
    <div className="space-y-6">
      {/* Toast notice */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Header Actions Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Tự động sinh tài khoản & mật khẩu cho giáo viên</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Quản Lý & Cấp Tài Khoản Giáo Viên</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Bao gồm cả Giáo viên chủ nhiệm và Giáo viên bộ môn. Giáo viên đăng nhập để xem danh sách học sinh vắng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowBatchModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition"
              title="Úp hoặc dán danh sách nhiều giáo viên"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Úp Danh Sách Giáo Viên</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-500" />
              <span>+ Thêm 1 Giáo Viên</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition"
              title="In phiếu cấp tài khoản"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>In Phiếu Cấp</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs font-bold shadow-2xs transition"
              title="Xuất file Excel/CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 pt-4 mt-4 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Tổng số giáo viên:</span>
            <span className="font-extrabold text-slate-900 ml-1.5 text-sm">{teachers.length}</span>
          </div>
          <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200">
            <span className="text-emerald-700 font-medium">GV Chủ nhiệm:</span>
            <span className="font-extrabold text-emerald-800 ml-1.5 text-sm">{homeroomCount}</span>
          </div>
          <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-200">
            <span className="text-blue-700 font-medium">GV Bộ môn:</span>
            <span className="font-extrabold text-blue-800 ml-1.5 text-sm">{subjectCount}</span>
          </div>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 text-center w-12">TT</th>
                <th className="py-3 px-4 min-w-[160px]">Họ và tên giáo viên</th>
                <th className="py-3 px-3 text-center w-36">Chức vụ / Lớp</th>
                <th className="py-3 px-3 min-w-[130px]">Tên đăng nhập</th>
                <th className="py-3 px-3 min-w-[140px]">Mật khẩu</th>
                <th className="py-3 px-3 text-center w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {teachers.map((teacher, idx) => {
                const isPasswordShown = Boolean(visiblePasswords[teacher.id]);
                return (
                  <tr key={teacher.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900">
                      {teacher.name}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {teacher.assignedClass ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <GraduationCap className="w-3 h-3 text-emerald-600" />
                          GVCN {teacher.assignedClass}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          GV Bộ môn
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                      {teacher.username}
                    </td>

                    <td className="py-3 px-3 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {isPasswordShown ? teacher.password : '••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleShowPassword(teacher.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                          title={isPasswordShown ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                          {isPasswordShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyCredentials(teacher)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                          title="Sao chép tài khoản và mật khẩu"
                        >
                          {copiedId === teacher.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleResetPassword(teacher)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                          title="Đặt lại mật khẩu tự động"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(teacher)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Xóa giáo viên"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Add Single Teacher */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              <span>Thêm 1 Giáo Viên & Cấp Tài Khoản</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Hệ thống sẽ tự động sinh Tên đăng nhập và Mật khẩu khởi tạo.
            </p>

            <form onSubmit={handleAddSingleTeacher} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Họ và tên giáo viên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  placeholder="VD: Cô Nguyễn Thị Thu Hà"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lớp chủ nhiệm (nếu không chủ nhiệm thì bỏ trống)
                </label>
                <input
                  type="text"
                  value={singleClass}
                  onChange={(e) => setSingleClass(e.target.value)}
                  placeholder="VD: 6A1 (để trống nếu là GV Bộ môn)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-semibold uppercase"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  * Nếu bỏ trống, hệ thống sẽ gán vai trò Giáo viên Bộ môn.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 px-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition"
                >
                  Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Batch Upload / Paste Teachers */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-600" />
                  <span>Úp / Dán Danh Sách Giáo Viên Tự Động</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Cấu trúc: <b>TT | Họ và tên | Chủ nhiệm lớp</b> (nếu không chủ nhiệm thì bỏ trống).
                </p>
              </div>
            </div>

            {batchNotice && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{batchNotice}</span>
              </div>
            )}

            {/* Quick Sample Button */}
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Dán danh sách vào ô bên dưới:</span>
              <button
                type="button"
                onClick={() => {
                  setBatchText(
                    `1\tNguyễn Thị Lan\t6A2\n2\tTrần Văn Bình\t7A1\n3\tLê Thị Hồng\t\n4\tPhạm Minh Đức\t8A2\n5\tVũ Thanh Tùng\t`
                  );
                }}
                className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
              >
                + Dán ví dụ mẫu
              </button>
            </div>

            <textarea
              rows={8}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={`1\tNguyễn Thị Lan\t6A2\n2\tTrần Văn Bình\t7A1\n3\tLê Thị Hồng\t(để trống nếu dạy bộ môn)`}
              className="w-full mt-1.5 p-3 rounded-xl border border-slate-300 text-xs font-mono leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />

            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 mt-3 leading-relaxed">
              💡 <b>Gợi ý:</b> Bạn có thể copy trực tiếp các cột từ tệp Excel (Cột 1: STT, Cột 2: Họ tên, Cột 3: Lớp chủ nhiệm) rồi bấm Ctrl+V dán vào đây. Hệ thống sẽ tự động tách tên, sinh tên đăng nhập và mật khẩu riêng cho từng thầy cô!
            </div>

            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setShowBatchModal(false);
                  setBatchNotice('');
                }}
                className="flex-1 py-2.5 px-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleProcessBatch}
                className="flex-1 py-2.5 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition"
              >
                Tạo & Cấp Tài Khoản Tự Động
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
