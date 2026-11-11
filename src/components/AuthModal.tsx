import React, { useState } from 'react';
import {
  School,
  User,
  Lock,
  Phone,
  ShieldCheck,
  GraduationCap,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  LogIn,
} from 'lucide-react';
import { UserSession } from '../types';

interface AuthModalProps {
  onLoginSuccess: (session: UserSession) => void;
  defaultRole?: 'admin' | 'parent' | 'teacher';
  schoolName?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onLoginSuccess,
  defaultRole = 'parent',
  schoolName = 'Trường THCS Giai Lạc',
}) => {
  const [role, setRole] = useState<'admin' | 'parent' | 'teacher'>(defaultRole);

  // Form states
  const [parentPhone, setParentPhone] = useState<string>('');
  const [parentPassword, setParentPassword] = useState<string>('');
  const [parentName, setParentName] = useState<string>('');

  const [adminUsername, setAdminUsername] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');

  const [teacherUsername, setTeacherUsername] = useState<string>('');
  const [teacherPassword, setTeacherPassword] = useState<string>('');

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string>('');

  // 1. Parent Auth
  const handleParentAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    if (!parentPhone.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại phụ huynh');
      return;
    }
    if (!parentPassword.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu (tự tạo nếu vào lần đầu)');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/parent-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: parentPhone.trim(),
          password: parentPassword.trim(),
          parentName: parentName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Đăng nhập không thành công');
      }

      const session: UserSession = {
        role: 'parent',
        name: data.user.name,
        phone: data.user.phone,
        token: data.token,
      };

      if (data.isFirstTime) {
        setSuccessNotice('Tạo mật khẩu lần đầu thành công! Đang chuyển vào hệ thống...');
        setTimeout(() => onLoginSuccess(session), 800);
      } else {
        onLoginSuccess(session);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Admin Auth
  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    if (!adminUsername.trim() || !adminPassword.trim()) {
      setErrorMessage('Vui lòng nhập tên đăng nhập và mật khẩu quản trị');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUsername.trim(),
          password: adminPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Tên đăng nhập hoặc mật khẩu quản trị không đúng');
      }

      const session: UserSession = {
        role: 'admin',
        name: data.user.name,
        username: data.user.username,
        token: data.token,
      };

      onLoginSuccess(session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi xác thực quản trị');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Teacher Auth
  const handleTeacherAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    if (!teacherUsername.trim() || !teacherPassword.trim()) {
      setErrorMessage('Vui lòng nhập tên tài khoản và mật khẩu giáo viên');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/teacher-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: teacherUsername.trim(),
          password: teacherPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Tên đăng nhập hoặc mật khẩu giáo viên không đúng');
      }

      const session: UserSession = {
        role: 'teacher',
        name: data.user.name,
        username: data.user.username,
        assignedClass: data.user.assignedClass,
        isHomeroom: data.user.isHomeroom,
        token: data.token,
      };

      onLoginSuccess(session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi xác thực giáo viên');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex flex-col justify-between bg-cover bg-center overflow-hidden"
      style={{
        backgroundImage: "url('/assets/school_bg.jpg')",
      }}
    >
      {/* Dark overlay for rich photographic depth & legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-900/60 to-slate-950/85 backdrop-blur-[2px]"></div>

      {/* Top Bar with 3 role buttons - Flush against the top edge like vnEdu */}
      <header className="relative z-20 w-full bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-xs shrink-0">
              <School className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                {schoolName}
              </span>
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                Sổ Báo Vắng & Xin Nghỉ Học Điện Tử
              </h1>
            </div>
          </div>

          {/* 3 Distinct Buttons: Đăng nhập (Admin), Phụ huynh, Giáo viên */}
          <div className="flex items-center gap-1.5 sm:gap-2 p-1 bg-slate-100 rounded-xl shrink-0">
            {/* 1. Nút Đăng nhập (dành cho quản trị) */}
            <button
              type="button"
              onClick={() => {
                setRole('admin');
                setErrorMessage('');
              }}
              className={`flex items-center gap-1.5 py-2 px-3 sm:px-4 rounded-lg text-xs font-extrabold transition-all ${
                role === 'admin'
                  ? 'bg-indigo-700 text-white shadow-xs scale-[1.02]'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>

            {/* 2. Nút Phụ huynh (dành cho phụ huynh) */}
            <button
              type="button"
              onClick={() => {
                setRole('parent');
                setErrorMessage('');
              }}
              className={`flex items-center gap-1.5 py-2 px-3 sm:px-4 rounded-lg text-xs font-extrabold transition-all ${
                role === 'parent'
                  ? 'bg-blue-600 text-white shadow-xs scale-[1.02]'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Phụ huynh</span>
            </button>

            {/* 3. Nút Giáo viên (dành cho GVCN & GVBM) */}
            <button
              type="button"
              onClick={() => {
                setRole('teacher');
                setErrorMessage('');
              }}
              className={`flex items-center gap-1.5 py-2 px-3 sm:px-4 rounded-lg text-xs font-extrabold transition-all ${
                role === 'teacher'
                  ? 'bg-emerald-600 text-white shadow-xs scale-[1.02]'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Giáo viên</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Login Card in Center */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Card Top Banner */}
          <div
            className={`p-6 text-white text-center transition-colors duration-300 ${
              role === 'admin'
                ? 'bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900'
                : role === 'teacher'
                ? 'bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-900'
                : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-2 text-white shadow-md">
              {role === 'admin' ? (
                <ShieldCheck className="w-7 h-7" />
              ) : role === 'teacher' ? (
                <GraduationCap className="w-7 h-7" />
              ) : (
                <User className="w-7 h-7" />
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide">
              {role === 'admin'
                ? 'Đăng Nhập Quản Trị Nhà Trường'
                : role === 'teacher'
                ? 'Đăng Nhập Cổng Giáo Viên'
                : 'Đăng Nhập Phụ Huynh Học Sinh'}
            </h2>
            <p className="text-xs text-white/80 mt-1">
              {role === 'admin'
                ? 'Dành cho Ban Giám Hiệu & Quản trị viên hệ thống'
                : role === 'teacher'
                ? 'Dành cho Giáo viên chủ nhiệm & Giáo viên bộ môn'
                : 'Dành cho Phụ huynh học sinh báo vắng trực tuyến'}
            </p>
          </div>

          {/* Form Container */}
          <div className="p-6 sm:p-7">
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successNotice && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successNotice}</span>
              </div>
            )}

            {/* 1. ADMIN FORM */}
            {role === 'admin' && (
              <form onSubmit={handleAdminAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tên đăng nhập quản trị <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="Nhập tên đăng nhập (VD: admin)"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mật khẩu quản trị <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Nhập mật khẩu quản trị"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-2xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 mt-4"
                >
                  <span>VÀO HỆ THỐNG</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* 2. PARENT FORM */}
            {role === 'parent' && (
              <form onSubmit={handleParentAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Số điện thoại phụ huynh <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="VD: 0987654321"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Mật khẩu <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-blue-600 font-medium">
                      (Tự đặt nếu vào lần đầu)
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={parentPassword}
                      onChange={(e) => setParentPassword(e.target.value)}
                      placeholder="Nhập hoặc tạo mật khẩu của bạn"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Họ và tên Phụ huynh (tùy chọn)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="VD: Nguyễn Văn Hùng"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
                  💡 Nếu đây là lần đầu đăng nhập, bạn chỉ cần nhập số điện thoại và mật khẩu mong muốn, hệ thống sẽ tự động đăng ký tài khoản cho bạn ngay lập tức!
                </div>

                {/* Thay nút vào hệ thống báo nghỉ bằng Vào hệ thống */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 mt-2"
                >
                  <span>VÀO HỆ THỐNG</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* 3. TEACHER FORM */}
            {role === 'teacher' && (
              <form onSubmit={handleTeacherAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tên đăng nhập giáo viên <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={teacherUsername}
                      onChange={(e) => setTeacherUsername(e.target.value)}
                      placeholder="VD: gv_hoant"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mật khẩu giáo viên <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      placeholder="Nhập mật khẩu do nhà trường cấp"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 text-[11px] text-emerald-900 leading-relaxed">
                  👨‍🏫 <b>Dành cho giáo viên:</b> Sử dụng tài khoản do Admin nhà trường cấp để xem danh sách học sinh vắng trong ngày và điểm danh lớp học.
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 mt-2"
                >
                  <span>VÀO HỆ THỐNG</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 py-4 text-center text-xs text-white/70">
        <p>{schoolName} • Hệ Thống Sổ Báo Vắng & Xin Nghỉ Học Trực Tuyến</p>
      </footer>
    </div>
  );
};
