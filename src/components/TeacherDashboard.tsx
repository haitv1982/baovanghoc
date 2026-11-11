import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  Clock,
  Sun,
  Moon,
  FileText,
  Image as ImageIcon,
  Printer,
  Download,
  Eye,
  UserCheck,
  KeyRound,
  GraduationCap,
  Layers,
  Phone,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { AbsenceRecord, UserSession } from '../types';

interface TeacherDashboardProps {
  session: UserSession;
  absences: AbsenceRecord[];
  onViewProof: (record: AbsenceRecord) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  schoolName?: string;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  session,
  absences,
  onViewProof,
  onRefresh,
  isRefreshing = false,
  schoolName = 'Trường THCS Giai Lạc',
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Filter states (GVCN defaults to their class, or 'all')
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(todayStr);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [passwordSuccess, setPasswordSuccess] = useState<string>('');
  const [isChangingPass, setIsChangingPass] = useState<boolean>(false);

  // Extract distinct classes from records
  const allClasses = useMemo(() => {
    const set = new Set<string>();
    absences.forEach((a) => {
      if (a.studentClass) set.add(a.studentClass);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [absences]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return absences.filter((rec) => {
      if (selectedDateFilter !== 'all' && rec.date !== selectedDateFilter) {
        return false;
      }
      if (selectedClass !== 'all' && rec.studentClass.toLowerCase() !== selectedClass.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = rec.studentName.toLowerCase().includes(q);
        const matchesClass = rec.studentClass.toLowerCase().includes(q);
        const matchesReason = (rec.reasonPreset + ' ' + rec.reasonDetail).toLowerCase().includes(q);
        const matchesParent = rec.parentName.toLowerCase().includes(q);
        if (!matchesName && !matchesClass && !matchesReason && !matchesParent) {
          return false;
        }
      }
      return true;
    });
  }, [absences, selectedDateFilter, selectedClass, searchQuery]);

  // Stats calculation
  const stats = useMemo(() => {
    const targetDateRecords = selectedDateFilter === 'all'
      ? absences
      : absences.filter((r) => r.date === selectedDateFilter);

    const total = targetDateRecords.length;
    const morningCount = targetDateRecords.filter((r) => r.morning).length;
    const afternoonCount = targetDateRecords.filter((r) => r.afternoon).length;
    const fulldayCount = targetDateRecords.filter((r) => r.morning && r.afternoon).length;

    return { total, morningCount, afternoonCount, fulldayCount };
  }, [absences, selectedDateFilter]);

  // Handle teacher password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (newPassword.length < 3) {
      setPasswordError('Mật khẩu mới phải có ít nhất 3 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await fetch('/api/auth/teacher-change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: session.username,
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể đổi mật khẩu.');
      }
      setPasswordSuccess('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.message || 'Lỗi khi đổi mật khẩu.');
    } finally {
      setIsChangingPass(false);
    }
  };

  // Print attendance report
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const dateTitle = selectedDateFilter === 'all' ? 'TẤT CẢ CÁC NGÀY' : `NGÀY ${selectedDateFilter.split('-').reverse().join('/')}`;

    const rows = filteredRecords
      .map(
        (r, idx) => `
        <tr>
          <td style="text-align: center; border: 1px solid #333; padding: 6px;">${idx + 1}</td>
          <td style="text-align: center; border: 1px solid #333; padding: 6px;">${r.dateDisplay}<br/><span style="font-size: 8.5pt; color: #1d4ed8;">(Gửi: ${r.createdTime || '07:00'})</span></td>
          <td style="text-align: center; border: 1px solid #333; padding: 6px;">${r.morning ? 'X' : ''}</td>
          <td style="text-align: center; border: 1px solid #333; padding: 6px;">${r.afternoon ? 'X' : ''}</td>
          <td style="border: 1px solid #333; padding: 6px; font-weight: bold;">${r.studentName}</td>
          <td style="text-align: center; border: 1px solid #333; padding: 6px;">${r.studentClass}</td>
          <td style="border: 1px solid #333; padding: 6px;">${r.reasonPreset} ${r.reasonDetail ? `(${r.reasonDetail})` : ''}</td>
          <td style="border: 1px solid #333; padding: 6px;">${r.parentName} (${r.parentPhone})</td>
          <td style="text-align: center; border: 1px solid #333; padding: 6px;">${r.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}</td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Danh Sách Báo Vắng Học Sinh - ${schoolName}</title>
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
            SỔ ĐIỂM DANH BÁO VẮNG
          </div>
          <h2 style="margin-top: 15px;">DANH SÁCH HỌC SINH NGHỈ HỌC CÓ PHÉP</h2>
          <h3>(${dateTitle})</h3>
          <p style="font-size: 10pt; font-style: italic;">Giáo viên theo dõi: ${session.name} ${session.assignedClass ? `(Chủ nhiệm lớp ${session.assignedClass})` : '(Giáo viên Bộ môn)'}</p>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">STT</th>
                <th style="width: 90px;">Ngày tháng</th>
                <th style="width: 50px;">Sáng</th>
                <th style="width: 50px;">Chiều</th>
                <th>Họ và tên học sinh</th>
                <th style="width: 60px;">Lớp</th>
                <th>Lý do xin phép</th>
                <th>Phụ huynh & SĐT</th>
                <th style="width: 80px;">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="9" style="text-align:center; padding: 15px;">Không có học sinh nào vắng trong ngày này.</td></tr>'}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['STT', 'Ngày', 'Buổi sáng', 'Buổi chiều', 'Họ tên học sinh', 'Lớp', 'GVCN', 'Lý do', 'Phụ huynh', 'SĐT', 'Trạng thái'];
    const csvRows = [headers.join(',')];

    filteredRecords.forEach((r, idx) => {
      const row = [
        idx + 1,
        `"${r.dateDisplay}"`,
        r.morning ? 'Có' : 'Không',
        r.afternoon ? 'Có' : 'Không',
        `"${r.studentName.replace(/"/g, '""')}"`,
        `"${r.studentClass}"`,
        `"${(r.teacherName || '').replace(/"/g, '""')}"`,
        `"${(r.reasonPreset + ' ' + (r.reasonDetail || '')).replace(/"/g, '""')}"`,
        `"${r.parentName.replace(/"/g, '""')}"`,
        `"${r.parentPhone}"`,
        `"${r.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}"`,
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = '\ufeff' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_sach_hoc_sinh_vang_${selectedDateFilter}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Teacher Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-emerald-100 backdrop-blur-xs mb-2">
            <GraduationCap className="w-4 h-4 text-emerald-200" />
            <span>CỔNG THEO DÕI ĐIỂM DANH GIÁO VIÊN</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <span>Xin chào, {session.name}</span>
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1 flex items-center gap-2">
            <span>Chức vụ:</span>
            <span className="font-bold text-white bg-white/20 px-2 py-0.5 rounded">
              {session.assignedClass ? `Giáo viên Chủ nhiệm Lớp ${session.assignedClass}` : 'Giáo viên Bộ môn'}
            </span>
            <span className="text-emerald-200 italic text-xs hidden sm:inline">
              (Chế độ chỉ xem danh sách học sinh vắng điểm danh)
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition shadow-xs"
            title="Đổi mật khẩu tài khoản"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Đổi Mật Khẩu</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold shadow-md transition"
            title="Cập nhật danh sách mới nhất"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Làm Mới</span>
          </button>
        </div>
      </div>

      {/* 2. Summary stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Tổng vắng ngày chọn
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {stats.total} <span className="text-xs font-normal text-slate-400">học sinh</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <Sun className="w-3.5 h-3.5" />
            Vắng buổi sáng
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
            {stats.morningCount} <span className="text-xs font-normal text-slate-400">em</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
            <Moon className="w-3.5 h-3.5" />
            Vắng buổi chiều
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 mt-1">
            {stats.afternoonCount} <span className="text-xs font-normal text-slate-400">em</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Vắng cả ngày
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">
            {stats.fulldayCount} <span className="text-xs font-normal text-slate-400">em</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Xem danh sách theo ngày:
            </span>

            <button
              onClick={() => setSelectedDateFilter(todayStr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedDateFilter === todayStr
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Hôm nay ({todayStr.split('-').reverse().slice(0, 2).join('/')})
            </button>

            <button
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setSelectedDateFilter(tomorrow.toISOString().split('T')[0]);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedDateFilter === new Date(Date.now() + 86400000).toISOString().split('T')[0]
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Ngày mai
            </button>

            <button
              onClick={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                setSelectedDateFilter(yesterday.toISOString().split('T')[0]);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedDateFilter === new Date(Date.now() - 86400000).toISOString().split('T')[0]
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Hôm qua
            </button>

            <button
              onClick={() => setSelectedDateFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedDateFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tất cả các ngày
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Hoặc ngày cụ thể:</span>
            <input
              type="date"
              value={selectedDateFilter === 'all' ? '' : selectedDateFilter}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDateFilter(e.target.value);
                }
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Filter controls row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên học sinh, lớp, lý do nghỉ..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50 focus:bg-white transition"
            />
          </div>

          {/* Class Select */}
          <div className="flex gap-2">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
            >
              <option value="all">Tất cả các lớp ({allClasses.length} lớp)</option>
              {allClasses.map((cls) => (
                <option key={cls} value={cls}>
                  Lớp {cls} {session.assignedClass === cls ? '(Lớp bạn chủ nhiệm)' : ''}
                </option>
              ))}
            </select>

            {session.assignedClass && (
              <button
                onClick={() => setSelectedClass(selectedClass === session.assignedClass ? 'all' : session.assignedClass!)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  selectedClass === session.assignedClass
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                }`}
                title={`Xem nhanh lớp ${session.assignedClass} bạn chủ nhiệm`}
              >
                Lớp {session.assignedClass}
              </button>
            )}
          </div>
        </div>

        {/* Action bar for printing / exporting */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium">
            Hiển thị <span className="font-bold text-slate-900">{filteredRecords.length}</span> học sinh vắng
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-2xs transition"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>In danh sách</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-semibold shadow-2xs transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN DATA TABLE (Read-Only: Giáo viên chỉ được xem danh sách, không được sửa/xóa) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Danh Sách Học Sinh Nghỉ Học Có Phép
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              {filteredRecords.length} học sinh
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Giáo viên xem thông tin để điểm danh lớp học
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700">Không có học sinh nào báo vắng</p>
            <p className="text-xs text-slate-400 mt-1">
              {selectedDateFilter !== 'all'
                ? `Không có học sinh nào báo nghỉ vào ngày ${selectedDateFilter.split('-').reverse().join('/')}.`
                : 'Hiện chưa có dữ liệu báo vắng phù hợp với bộ lọc.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-3 text-center w-12">Thứ tự</th>
                  <th className="py-3.5 px-3 w-32">Ngày tháng</th>
                  <th className="py-3.5 px-3 text-center w-24">Buổi sáng</th>
                  <th className="py-3.5 px-3 text-center w-24">Buổi chiều</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Tên học sinh</th>
                  <th className="py-3.5 px-3 text-center w-20">Lớp</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Lý do xin nghỉ</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Phụ huynh & SĐT</th>
                  <th className="py-3.5 px-3 text-center min-w-[140px]">Minh chứng / Đơn</th>
                  <th className="py-3.5 px-3 text-center w-28">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRecords.map((rec, index) => {
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-emerald-50/30 transition-colors"
                    >
                      {/* 1. STT */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-500">
                        {index + 1}
                      </td>

                      {/* 2. Ngày tháng + Giờ gửi */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-extrabold text-slate-900 block text-xs">{rec.dateDisplay}</span>
                        <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold">
                          <Clock className="w-3 h-3 text-blue-600" />
                          <span>Gửi lúc: {rec.createdTime || (rec.createdAt ? new Date(rec.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '07:00')}</span>
                        </div>
                        {rec.date === todayStr && (
                          <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                            • Hôm nay
                          </span>
                        )}
                      </td>

                      {/* 3. Buổi sáng */}
                      <td className="py-3.5 px-3 text-center">
                        {rec.morning ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Sun className="w-3 h-3 text-amber-600" />
                            Nghỉ Sáng
                          </span>
                        ) : (
                          <span className="text-slate-300 font-bold">-</span>
                        )}
                      </td>

                      {/* 4. Buổi chiều */}
                      <td className="py-3.5 px-3 text-center">
                        {rec.afternoon ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            <Moon className="w-3 h-3 text-indigo-600" />
                            Nghỉ Chiều
                          </span>
                        ) : (
                          <span className="text-slate-300 font-bold">-</span>
                        )}
                      </td>

                      {/* 5. Tên học sinh */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {rec.studentName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Mã: {rec.id.replace('abs-', '#')}
                        </div>
                      </td>

                      {/* 6. Lớp */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-lg font-black text-xs bg-slate-900 text-white shadow-xs">
                          {rec.studentClass}
                        </span>
                        {rec.teacherName && (
                          <div className="text-[10px] text-slate-500 font-medium mt-1 truncate max-w-[120px] mx-auto">
                            GVCN: {rec.teacherName}
                          </div>
                        )}
                      </td>

                      {/* 7. Lý do */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{rec.reasonPreset}</div>
                        {rec.reasonDetail && (
                          <div className="text-[11px] text-slate-500 line-clamp-2 italic mt-0.5">
                            "{rec.reasonDetail}"
                          </div>
                        )}
                        {rec.adminNote && (
                          <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-1 border border-emerald-100 font-medium">
                            Lời nhắn nhà trường: {rec.adminNote}
                          </div>
                        )}
                      </td>

                      {/* 8. Phụ huynh & SĐT */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{rec.parentName}</div>
                        {rec.parentPhone && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-slate-600 font-mono font-medium">
                              {rec.parentPhone}
                            </span>
                            <a
                              href={`tel:${rec.parentPhone}`}
                              className="p-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 transition"
                              title="Gọi cho phụ huynh"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </td>

                      {/* 9. Nút xem Minh chứng / File Word */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => onViewProof(rec)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-all shadow-2xs hover:shadow-xs"
                          title="Xem minh chứng ảnh hoặc đơn xin phép"
                        >
                          {rec.attachmentType?.startsWith('image/') || rec.attachmentName?.match(/\.(jpg|jpeg|png)$/i) ? (
                            <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span>Xem Đơn</span>
                        </button>
                      </td>

                      {/* 10. Trạng thái (Chỉ hiển thị, không được sửa/xóa) */}
                      <td className="py-3.5 px-3 text-center">
                        {rec.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="w-3 h-3" />
                            Đã Duyệt
                          </span>
                        ) : rec.status === 'noted' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Đã Tiếp Nhận
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Chờ BGH Duyệt
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Password Change Modal for Teacher */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 text-center">
              Đổi Mật Khẩu Giáo Viên
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Tài khoản: <span className="font-bold text-slate-800">{session.username}</span> ({session.name})
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4 mt-5">
              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mật khẩu hiện tại <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2.5 px-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="flex-1 py-2.5 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isChangingPass ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
