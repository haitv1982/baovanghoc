import React, { useState, useEffect } from 'react';
import { School, ShieldCheck, UserCheck, LogOut, Bell, Clock, RefreshCw } from 'lucide-react';
import { UserSession } from '../types';

interface HeaderProps {
  session: UserSession | null;
  onLogout: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  schoolName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  onLogout,
  onRefresh,
  isRefreshing = false,
  schoolName = 'Trường THCS Giai Lạc',
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      };
      setTimeStr(now.toLocaleDateString('vi-VN', options));
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & School Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <School className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {schoolName}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Hệ thống trực tuyến
                </span>
              </div>
              <h1 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Sổ Báo Vắng & Xin Nghỉ Học Điện Tử
              </h1>
            </div>
          </div>

          {/* Right session info & actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Clock */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{timeStr}</span>
            </div>

            {/* Refresh button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200"
                title="Làm mới dữ liệu tức thì"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            )}

            {session ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  {session.role === 'admin' ? (
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  ) : session.role === 'teacher' ? (
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      <UserCheck className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      <UserCheck className="w-4 h-4" />
                    </div>
                  )}
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      {session.role === 'admin'
                        ? 'Quản Trị Nhà Trường'
                        : session.role === 'teacher'
                        ? session.name
                        : session.name}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-none mt-0.5">
                      {session.role === 'admin'
                        ? 'Ban Giám Hiệu / Giám thị'
                        : session.role === 'teacher'
                        ? session.assignedClass
                          ? `GVCN Lớp ${session.assignedClass}`
                          : 'Giáo viên Bộ môn'
                        : `SĐT: ${session.phone}`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 sm:px-3 py-2 rounded-lg transition border border-red-200"
                  title="Đăng xuất khỏi hệ thống"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
