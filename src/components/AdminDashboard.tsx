import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Sun,
  Moon,
  FileText,
  Image as ImageIcon,
  Phone,
  MessageSquare,
  Printer,
  Download,
  Trash2,
  Check,
  Eye,
  AlertCircle,
  School,
  Users,
  ChevronDown,
  Layers,
  Sparkles,
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import { AbsenceRecord } from '../types';
import { TeacherManagement } from './TeacherManagement';

interface AdminDashboardProps {
  absences: AbsenceRecord[];
  onViewProof: (record: AbsenceRecord) => void;
  onUpdateStatus: (id: string, status: 'approved' | 'noted' | 'pending', adminNote?: string) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onRefresh: () => void;
  isRefreshing?: boolean;
  schoolName?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  absences,
  onViewProof,
  onUpdateStatus,
  onDeleteRecord,
  onRefresh,
  isRefreshing = false,
  schoolName = 'Trường Phổ Thông Tri Thức',
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Filter states
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(todayStr); // specific date or 'all'
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Quick note modal
  const [editingNoteRecord, setEditingNoteRecord] = useState<AbsenceRecord | null>(null);
  const [quickNoteText, setQuickNoteText] = useState<string>('');

  // Admin sub-tab: 'absences' or 'teachers'
  const [adminSubTab, setAdminSubTab] = useState<'absences' | 'teachers'>('absences');

  // Change Admin Password Modal
  const [showAdminPassModal, setShowAdminPassModal] = useState<boolean>(false);
  const [adminCurrentPass, setAdminCurrentPass] = useState<string>('');
  const [adminNewPass, setAdminNewPass] = useState<string>('');
  const [adminConfirmPass, setAdminConfirmPass] = useState<string>('');
  const [adminPassError, setAdminPassError] = useState<string>('');
  const [adminPassSuccess, setAdminPassSuccess] = useState<string>('');
  const [isChangingAdminPass, setIsChangingAdminPass] = useState<boolean>(false);

  // Delete confirmation modal (fixes window.confirm being blocked in iframe)
  const [recordToDelete, setRecordToDelete] = useState<AbsenceRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Extract all distinct classes
  const allClasses = useMemo(() => {
    const set = new Set<string>();
    absences.forEach((a) => {
      if (a.studentClass) set.add(a.studentClass);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [absences]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return absences.filter((rec) => {
      // Date filter
      if (selectedDateFilter !== 'all' && rec.date !== selectedDateFilter) {
        return false;
      }
      // Class filter
      if (selectedClass !== 'all' && rec.studentClass.toLowerCase() !== selectedClass.toLowerCase()) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'all' && rec.status !== selectedStatus) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = rec.studentName.toLowerCase().includes(q);
        const matchesClass = rec.studentClass.toLowerCase().includes(q);
        const matchesParent = rec.parentName.toLowerCase().includes(q);
        const matchesPhone = rec.parentPhone.includes(q);
        const matchesTeacher = (rec.teacherName || '').toLowerCase().includes(q);
        const matchesReason = (rec.reasonPreset + ' ' + rec.reasonDetail).toLowerCase().includes(q);
        if (!matchesName && !matchesClass && !matchesParent && !matchesPhone && !matchesTeacher && !matchesReason) {
          return false;
        }
      }
      return true;
    });
  }, [absences, selectedDateFilter, selectedClass, selectedStatus, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    // Current active filter date records
    const targetDateRecords = selectedDateFilter === 'all'
      ? absences
      : absences.filter((r) => r.date === selectedDateFilter);

    const total = targetDateRecords.length;
    const morningCount = targetDateRecords.filter((r) => r.morning).length;
    const afternoonCount = targetDateRecords.filter((r) => r.afternoon).length;
    const fulldayCount = targetDateRecords.filter((r) => r.morning && r.afternoon).length;
    const pendingCount = absences.filter((r) => r.status === 'pending').length;

    // Breakdown by class
    const classCountMap: Record<string, number> = {};
    targetDateRecords.forEach((r) => {
      classCountMap[r.studentClass] = (classCountMap[r.studentClass] || 0) + 1;
    });

    return { total, morningCount, afternoonCount, fulldayCount, pendingCount, classCountMap };
  }, [absences, selectedDateFilter]);

  // Print attendance report
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateTitle = selectedDateFilter === 'all' ? 'TẤT CẢ CÁC NGÀY' : `NGÀY ${selectedDateFilter.split('-').reverse().join('/')}`;

    const rows = filteredRecords
      .map(
        (r, idx) => `
        <tr>
          <td style="text-align: center; border: 1px solid #333; padding: 6px;">${idx + 1}</td>
          <td style="text-align: center; border: 1px solid #333; padding: 6px;">${r.dateDisplay}<br/><span style="font-size: 8.5pt; color: #1d4ed8; font-weight: bold;">(Gửi: ${r.createdTime || '07:00'})</span></td>
          <td style="text-align: center; border: 1px solid #333; padding: 6px;">${r.morning ? 'X' : ''}</td>
          <td style="text-align: center; border: 1px solid #333; padding: 6px;">${r.afternoon ? 'X' : ''}</td>
          <td style="border: 1px solid #333; padding: 6px; font-weight: bold;">${r.studentName}</td>
          <td style="text-align: center; border: 1px solid #333; padding: 6px;">${r.studentClass}<br/><span style="font-size: 9pt; font-weight: normal; color: #555;">${r.teacherName ? `GV: ${r.teacherName}` : ''}</span></td>
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
          <title>Báo Cáo Điểm Danh Báo Vắng Học Sinh - ${schoolName}</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 25px; line-height: 1.4; }
            h2, h3, p { text-align: center; margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11pt; }
            th { border: 1px solid #333; background: #eee; padding: 7px; font-weight: bold; }
            .header-box { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .sig-box { margin-top: 30px; display: flex; justify-content: space-between; text-align: center; }
          </style>
        </head>
        <body>
          <div style="text-align: left; font-size: 11pt; font-weight: bold;">
            ${schoolName.toUpperCase()}<br/>
            BỘ PHẬN GIÁM THỊ - BAN GIÁM HIỆU
          </div>
          <h2 style="margin-top: 15px;">TỔNG HỢP DANH SÁCH HỌC SINH NGHỈ HỌC CÓ PHÉP</h2>
          <h3>(${dateTitle})</h3>
          <p style="font-size: 10pt; font-style: italic;">Tổng số học sinh vắng: ${filteredRecords.length} em (Sáng: ${stats.morningCount}, Chiều: ${stats.afternoonCount})</p>
          
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">STT</th>
                <th style="width: 85px;">Ngày tháng</th>
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
              ${rows || '<tr><td colspan="9" style="text-align:center; padding: 15px;">Không có học sinh nào báo vắng trong ngày này.</td></tr>'}
            </tbody>
          </table>

          <div style="margin-top: 35px; width: 100%; display: table;">
            <div style="display: table-cell; width: 50%; text-align: center;">
              <b>GIÁO VIÊN BÁO CÁO / GIÁM THỊ</b><br/>
              <i>(Ký và ghi rõ họ tên)</i>
            </div>
            <div style="display: table-cell; width: 50%; text-align: center;">
              <b>BAN GIÁM HIỆU PHÊ DUYỆT</b><br/>
              <i>(Ký tên và đóng dấu)</i>
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['STT', 'Ngày', 'Buổi sáng', 'Buổi chiều', 'Họ tên học sinh', 'Lớp', 'GVCN', 'Lý do', 'Chi tiết', 'Phụ huynh', 'SĐT', 'Trạng thái'];
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
        `"${r.reasonPreset.replace(/"/g, '""')}"`,
        `"${r.reasonDetail.replace(/"/g, '""')}"`,
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
    link.download = `Danh_sach_bao_vang_${selectedDateFilter}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle Admin Password Change
  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPassError('');
    setAdminPassSuccess('');

    if (!adminCurrentPass) {
      setAdminPassError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (adminNewPass.length < 4) {
      setAdminPassError('Mật khẩu mới phải có ít nhất 4 ký tự.');
      return;
    }
    if (adminNewPass !== adminConfirmPass) {
      setAdminPassError('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    setIsChangingAdminPass(true);
    try {
      const res = await fetch('/api/auth/admin-change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: adminCurrentPass,
          newPassword: adminNewPass,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể đổi mật khẩu quản trị.');
      }
      setAdminPassSuccess('Đổi mật khẩu Quản trị thành công!');
      setAdminCurrentPass('');
      setAdminNewPass('');
      setAdminConfirmPass('');
      setTimeout(() => {
        setShowAdminPassModal(false);
        setAdminPassSuccess('');
      }, 1500);
    } catch (err: any) {
      setAdminPassError(err.message || 'Lỗi khi đổi mật khẩu.');
    } finally {
      setIsChangingAdminPass(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 0. Top Admin Navigation: Switch between Absences and Teacher Management */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAdminSubTab('absences')}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition ${
              adminSubTab === 'absences'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Danh Sách Báo Vắng Học Sinh</span>
          </button>

          <button
            onClick={() => setAdminSubTab('teachers')}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition ${
              adminSubTab === 'teachers'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Cấp Tài Khoản Giáo Viên</span>
          </button>
        </div>

        <button
          onClick={() => setShowAdminPassModal(true)}
          className="inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-2xs"
          title="Đổi mật khẩu tài khoản quản trị"
        >
          <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
          <span>Đổi Mật Khẩu Admin</span>
        </button>
      </div>

      {adminSubTab === 'teachers' ? (
        <TeacherManagement schoolName={schoolName} />
      ) : (
        <>
      {/* 1. Header & Summary Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
              CỔNG QUẢN TRỊ NHÀ TRƯỜNG
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Cập nhật trực tiếp thời gian thực
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Tổng Hợp Báo Vắng Học Sinh
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Theo dõi, phê duyệt đơn xin phép nghỉ học và tổng hợp sĩ số học sinh hàng ngày
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-xs transition"
            title="In danh sách báo vắng chuẩn A4"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            In Báo Cáo
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-xs transition"
            title="Xuất file Excel / CSV"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Xuất Excel
          </button>
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Làm Mới
          </button>
        </div>
      </div>

      {/* 2. Top Statistic Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total absent */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {selectedDateFilter === 'all' ? 'Tổng số vắng' : 'Vắng trong ngày'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{stats.total}</span>
            <span className="text-xs text-slate-500">học sinh</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>{selectedDateFilter === 'all' ? 'Tất cả các ngày' : `Ngày ${selectedDateFilter.split('-').reverse().join('/')}`}</span>
          </div>
        </div>

        {/* Card 2: Morning absent */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Vắng Buổi Sáng
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Sun className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600">{stats.morningCount}</span>
            <span className="text-xs text-slate-500">học sinh</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Nghỉ tiết học buổi sáng
          </div>
        </div>

        {/* Card 3: Afternoon absent */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              Vắng Buổi Chiều
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Moon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-600">{stats.afternoonCount}</span>
            <span className="text-xs text-slate-500">học sinh</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Nghỉ tiết học buổi chiều
          </div>
        </div>

        {/* Card 4: Pending review */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Cần Duyệt Ngay
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-600">{stats.pendingCount}</span>
            <span className="text-xs text-slate-500">đơn mới gửi</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Cần Ban Giám Hiệu xác nhận
          </div>
        </div>
      </div>

      {/* 3. Filter Bar (Date Selector, Class, Search, Status) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* NÚT XEM DANH SÁCH THEO NGÀY (Key Requirement) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              Xem danh sách theo ngày:
            </span>

            {/* Quick buttons */}
            <button
              onClick={() => setSelectedDateFilter(todayStr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedDateFilter === todayStr
                  ? 'bg-blue-600 text-white shadow-xs'
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
                  ? 'bg-blue-600 text-white shadow-xs'
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
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Hôm qua
            </button>

            <button
              onClick={() => setSelectedDateFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedDateFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tất cả các ngày
            </button>
          </div>

          {/* Date Picker input */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Hoặc chọn ngày cụ thể:</span>
            <input
              type="date"
              value={selectedDateFilter === 'all' ? '' : selectedDateFilter}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDateFilter(e.target.value);
                }
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Filter row: Search, Class dropdown, Status dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên học sinh, lớp, lý do, số điện thoại..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 focus:bg-white transition"
            />
          </div>

          {/* Filter by Class */}
          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="all">Tất cả các lớp ({allClasses.length} lớp)</option>
              {allClasses.map((cls) => (
                <option key={cls} value={cls}>Lớp {cls}</option>
              ))}
            </select>
          </div>

          {/* Filter by Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ xác nhận</option>
              <option value="approved">Đã duyệt nghỉ</option>
              <option value="noted">Đã tiếp nhận</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. MAIN DATA TABLE (Exactly meeting all user specifications) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Danh Sách Học Sinh Được Phụ Huynh Báo Vắng
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              {filteredRecords.length} kết quả
            </span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Click vào nút minh chứng để xem đơn và file Word
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700">Không tìm thấy học sinh nào báo vắng</p>
            <p className="text-xs text-slate-400 mt-1">
              {selectedDateFilter !== 'all'
                ? `Không có học sinh nào báo nghỉ vào ngày ${selectedDateFilter.split('-').reverse().join('/')}.`
                : 'Hiện chưa có dữ liệu báo vắng phù hợp với bộ lọc.'}
            </p>
            {selectedDateFilter !== 'all' && (
              <button
                onClick={() => setSelectedDateFilter('all')}
                className="mt-3 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition"
              >
                Xem tất cả các ngày
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-3 text-center w-12">Thứ tự</th>
                  <th className="py-3.5 px-3 w-28">Ngày tháng</th>
                  <th className="py-3.5 px-3 text-center w-24">Buổi sáng</th>
                  <th className="py-3.5 px-3 text-center w-24">Buổi chiều</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Tên học sinh</th>
                  <th className="py-3.5 px-3 text-center w-20">Lớp</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Lý do xin nghỉ</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Tên phụ huynh & SĐT</th>
                  <th className="py-3.5 px-3 text-center min-w-[140px]">Minh chứng / File Word</th>
                  <th className="py-3.5 px-3 text-center w-36">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRecords.map((rec, index) => {
                  const hasProof = Boolean(rec.attachmentName || rec.attachmentData || rec.aiLetter);
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* 1. Thứ tự (STT) */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-500">
                        {index + 1}
                      </td>

                      {/* 2. Ngày tháng & Giờ gửi giấy bên dưới */}
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-2xs">
                            <Moon className="w-3 h-3 text-indigo-600" />
                            Nghỉ Chiều
                          </span>
                        ) : (
                          <span className="text-slate-300 font-bold">-</span>
                        )}
                      </td>

                      {/* 5. Tên học sinh */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                          {rec.studentName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Mã: {rec.id.replace('abs-', '#')}
                        </div>
                      </td>

                      {/* 6. Lớp & GVCN */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-lg font-black text-xs bg-slate-900 text-white shadow-xs">
                          {rec.studentClass}
                        </span>
                        {rec.teacherName && (
                          <div className="text-[10px] text-slate-500 font-medium mt-1 truncate max-w-[120px] mx-auto" title={`GVCN: ${rec.teacherName}`}>
                            GV: {rec.teacherName}
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
                            Phản hồi: {rec.adminNote}
                          </div>
                        )}
                      </td>

                      {/* 8. Tên phụ huynh & SĐT */}
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
                            <a
                              href={`https://zalo.me/${rec.parentPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500 hover:bg-blue-600 text-white transition"
                              title="Nhắn Zalo"
                            >
                              Zalo
                            </a>
                          </div>
                        )}
                      </td>

                      {/* 9. Nút kèm minh chứng ảnh hoặc file word giấy xin phép nghỉ học */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => onViewProof(rec)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-all shadow-2xs hover:shadow-xs"
                          title="Xem minh chứng ảnh hoặc file Word đơn xin phép"
                        >
                          {rec.attachmentType?.startsWith('image/') || rec.attachmentName?.match(/\.(jpg|jpeg|png)$/i) ? (
                            <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          <span>Xem Minh Chứng</span>
                        </button>
                      </td>

                      {/* 10. Thao tác duyệt / ghi chú / xóa */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {rec.status === 'approved' ? (
                            <button
                              onClick={() => onUpdateStatus(rec.id, 'noted')}
                              className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
                              title="Đã duyệt nghỉ học (Bấm để đổi trạng thái)"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onUpdateStatus(rec.id, 'approved', 'Ban Giám Hiệu đã duyệt nghỉ.')}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition"
                              title="Duyệt đơn nghỉ này"
                            >
                              Duyệt
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setEditingNoteRecord(rec);
                              setQuickNoteText(rec.adminNote || '');
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition"
                            title="Thêm phản hồi cho phụ huynh"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setRecordToDelete(rec)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Xóa bản ghi học sinh này"
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
        )}
      </div>

      {/* 5. Class Distribution Summary Widget */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          Phân Bố Số Học Sinh Vắng Theo Từng Lớp Trong Ngày
        </h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.classCountMap).map(([cls, count]) => (
            <div
              key={cls}
              onClick={() => setSelectedClass(selectedClass === cls ? 'all' : cls)}
              className={`cursor-pointer px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
                selectedClass === cls
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>Lớp {cls}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedClass === cls ? 'bg-white/30 text-white' : 'bg-blue-100 text-blue-800'}`}>
                {count} vắng
              </span>
            </div>
          ))}
          {Object.keys(stats.classCountMap).length === 0 && (
            <span className="text-xs text-slate-400 italic">Chưa có học sinh nào vắng hôm nay.</span>
          )}
        </div>
      </div>

      {/* Quick Admin Note Modal */}
      {editingNoteRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Ghi chú phản hồi cho Phụ huynh
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Học sinh: <span className="font-bold text-slate-800">{editingNoteRecord.studentName}</span> (Lớp {editingNoteRecord.studentClass})
            </p>

            <textarea
              rows={3}
              value={quickNoteText}
              onChange={(e) => setQuickNoteText(e.target.value)}
              placeholder="VD: Đã tiếp nhận đơn, chúc em mau chóng bình phục sức khỏe."
              className="w-full text-xs sm:text-sm p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
            />

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setEditingNoteRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onUpdateStatus(editingNoteRecord.id, editingNoteRecord.status, quickNoteText);
                  setEditingNoteRecord(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition"
              >
                Lưu phản hồi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (In-App Dialog, works reliably in iframe) */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 text-center">
              Xác Nhận Xóa Bản Ghi?
            </h3>
            <p className="text-xs text-slate-500 text-center mt-2 leading-relaxed">
              Bạn có chắc chắn muốn xóa đơn báo vắng của em{' '}
              <span className="font-bold text-slate-900">{recordToDelete.studentName}</span> (Lớp {recordToDelete.studentClass}) ngày {recordToDelete.dateDisplay}?
            </p>
            <p className="text-[11px] text-red-500 text-center mt-1">
              * Hành động này sẽ gỡ bỏ bản ghi khỏi hệ thống báo vắng của nhà trường.
            </p>

            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setRecordToDelete(null)}
                className="flex-1 py-2.5 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    await onDeleteRecord(recordToDelete.id);
                  } finally {
                    setIsDeleting(false);
                    setRecordToDelete(null);
                  }
                }}
                className="flex-1 py-2.5 px-3 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-500/20 transition disabled:opacity-50"
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Admin Change Password Modal */}
      {showAdminPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 text-center">
              Đổi Mật Khẩu Quản Trị Nhà Trường
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Áp dụng cho tài khoản Admin Ban Giám Hiệu
            </p>

            <form onSubmit={handleChangeAdminPassword} className="space-y-4 mt-5">
              {adminPassError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{adminPassError}</span>
                </div>
              )}

              {adminPassSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{adminPassSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mật khẩu hiện tại <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={adminCurrentPass}
                  onChange={(e) => setAdminCurrentPass(e.target.value)}
                  placeholder="Nhập mật khẩu admin hiện tại"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={adminNewPass}
                  onChange={(e) => setAdminNewPass(e.target.value)}
                  placeholder="Nhập mật khẩu mới (tối thiểu 4 ký tự)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={adminConfirmPass}
                  onChange={(e) => setAdminConfirmPass(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-semibold"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminPassModal(false)}
                  className="flex-1 py-2.5 px-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isChangingAdminPass}
                  className="flex-1 py-2.5 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isChangingAdminPass ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
