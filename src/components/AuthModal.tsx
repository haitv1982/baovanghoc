import React, { useState, useEffect, useRef } from 'react';
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
  QrCode,
  ImagePlus,
  Loader2,
  Smartphone,
} from 'lucide-react';
import { UserSession } from '../types';
import { apiFetch } from '../utils/api';
import {
  buildParentQrUrl,
  decodeQrFromImageFile,
  generateQrDataUrl,
} from '../utils/qr';

interface AuthModalProps {
  onLoginSuccess: (session: UserSession) => void;
  defaultRole?: 'admin' | 'parent' | 'teacher';
  schoolName?: string;
  initialError?: string;
}

interface LookedUpParent {
  id: string;
  studentName: string;
  studentClass: string;
  phone: string;
  qrToken: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onLoginSuccess,
  defaultRole = 'parent',
  schoolName = 'Trường THCS Giai Lạc',
  initialError = '',
}) => {
  const [role, setRole] = useState<'admin' | 'parent' | 'teacher'>(defaultRole);

  // Form states
  const [parentPhone, setParentPhone] = useState<string>('');
  const [lookedUpParent, setLookedUpParent] = useState<LookedUpParent | null>(null);
  const [issuedQrImage, setIssuedQrImage] = useState<string>('');
  const [qrSessionId, setQrSessionId] = useState<string>('');
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle');
  const [isDecodingQr, setIsDecodingQr] = useState<boolean>(false);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);

  const [adminUsername, setAdminUsername] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');

  const [teacherUsername, setTeacherUsername] = useState<string>('');
  const [teacherPassword, setTeacherPassword] = useState<string>('');

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>(initialError);
  const [successNotice, setSuccessNotice] = useState<string>('');

  useEffect(() => {
    if (initialError) {
      setErrorMessage(initialError);
    }
  }, [initialError]);

  // Automatically lookup parent QR code + create a desktop QR challenge session
  useEffect(() => {
    const clean = parentPhone.replace(/[\s.\-()]/g, '').trim();
    if (clean.length < 9) {
      setLookedUpParent(null);
      setIssuedQrImage('');
      setQrSessionId('');
      setLookupStatus('idle');
      return;
    }

    let cancelled = false;
    setLookupStatus('loading');

    const timer = setTimeout(async () => {
      try {
        const { ok, data } = await apiFetch(
          `/api/auth/parent-qr-lookup?phone=${encodeURIComponent(clean)}`
        );
        if (cancelled) return;

        if (ok && data.success && data.found && data.account) {
          const sessRes = await apiFetch('/api/auth/qr-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          if (cancelled) return;

          const activeSessionId =
            sessRes.ok && sessRes.data?.success ? String(sessRes.data.sessionId) : '';

          setLookedUpParent(data.account);
          setQrSessionId(activeSessionId);
          setLookupStatus('found');

          const qrUrl = buildParentQrUrl(data.account.qrToken, activeSessionId || undefined);
          const pngDataUrl = await generateQrDataUrl(qrUrl, 240);
          if (!cancelled) {
            setIssuedQrImage(pngDataUrl);
          }
        } else {
          setLookedUpParent(null);
          setIssuedQrImage('');
          setQrSessionId('');
          setLookupStatus('not_found');
        }
      } catch {
        if (!cancelled) {
          setLookedUpParent(null);
          setIssuedQrImage('');
          setQrSessionId('');
          setLookupStatus('idle');
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [parentPhone]);

  // Poll server while desktop QR code is shown so Zalo scan on phone logs the computer in
  useEffect(() => {
    if (role !== 'parent' || lookupStatus !== 'found' || !qrSessionId) return;

    let cancelled = false;
    const intervalId = setInterval(async () => {
      try {
        const { ok, data } = await apiFetch(
          `/api/auth/qr-session-status?sessionId=${encodeURIComponent(qrSessionId)}`
        );
        if (cancelled) return;

        if (ok && data.success && data.status === 'confirmed' && data.user) {
          clearInterval(intervalId);
          const session: UserSession = {
            role: 'parent',
            name: data.user.name,
            phone: data.user.phone,
            studentName: data.user.studentName,
            studentClass: data.user.studentClass,
            token: data.token,
          };
          setSuccessNotice(
            `Đã xác nhận quét mã QR từ Zalo (${data.user.studentName})! Đang đăng nhập...`
          );
          setTimeout(() => {
            if (!cancelled) onLoginSuccess(session);
          }, 300);
        } else if (ok && data.status === 'expired') {
          // Refresh QR session seamlessly if expired after 15 mins
          const refreshRes = await apiFetch('/api/auth/qr-session', { method: 'POST' });
          if (!cancelled && refreshRes.ok && refreshRes.data?.sessionId && lookedUpParent) {
            const newId = String(refreshRes.data.sessionId);
            setQrSessionId(newId);
            const qrUrl = buildParentQrUrl(lookedUpParent.qrToken, newId);
            const pngDataUrl = await generateQrDataUrl(qrUrl, 240);
            if (!cancelled) setIssuedQrImage(pngDataUrl);
          }
        }
      } catch {
        // ignore transient polling error
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [role, lookupStatus, qrSessionId, lookedUpParent, onLoginSuccess]);

  // Prevent submitting phone-only form without QR scan
  const handleParentFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!parentPhone.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại để hiển thị mã QR hoặc bấm Đăng nhập bằng ảnh QR.');
      return;
    }
    if (lookupStatus === 'found') {
      setErrorMessage(
        'Vui lòng mở Zalo trên điện thoại để quét mã QR trên màn hình, hoặc bấm "Đăng nhập bằng ảnh QR".'
      );
    }
  };

  // 1b. Parent Login by Zalo Personal QR Image upload
  const handleQrImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMessage('');
    setSuccessNotice('');
    setIsDecodingQr(true);

    try {
      const decodedText = await decodeQrFromImageFile(file);

      if (!decodedText.trim()) {
        throw new Error('Không đọc được mã QR hợp lệ từ ảnh đã chọn.');
      }

      const { ok, data } = await apiFetch('/api/auth/parent-qr-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: decodedText.trim(), mode: 'zalo_image' }),
      });

      if (!ok || !data.success) {
        throw new Error(data.message || 'Mã QR Zalo cá nhân không hợp lệ hoặc chưa được cấp.');
      }

      const session: UserSession = {
        role: 'parent',
        name: data.user.name,
        phone: data.user.phone,
        studentName: data.user.studentName,
        studentClass: data.user.studentClass,
        token: data.token,
      };

      setSuccessNotice(`Xác thực QR Zalo thành công (${data.user.studentName})! Đang vào hệ thống...`);
      setTimeout(() => onLoginSuccess(session), 350);
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Không nhận diện được mã QR Zalo cá nhân trong ảnh. Vui lòng chọn ảnh Mã QR Zalo cá nhân của phụ huynh.'
      );
    } finally {
      setIsDecodingQr(false);
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
      const { ok, data } = await apiFetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUsername.trim(),
          password: adminPassword.trim(),
        }),
      });

      if (!ok || !data.success) {
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
      const { ok, data } = await apiFetch('/api/auth/teacher-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: teacherUsername.trim(),
          password: teacherPassword.trim(),
        }),
      });

      if (!ok || !data.success) {
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

            {/* 2. PARENT FORM (QR-only authentication: Zalo scan logs desktop in, or upload QR image on phone) */}
            {role === 'parent' && (
              <form onSubmit={handleParentFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Số điện thoại phụ huynh để lấy mã QR
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={parentPhone}
                      onChange={(e) => {
                        setParentPhone(e.target.value);
                        setErrorMessage('');
                      }}
                      placeholder="Nhập SĐT đã cấp để hiển thị mã QR (VD: 0987654321)"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Live Issued QR Code Box */}
                {lookupStatus === 'loading' && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Đang tạo phiên đăng nhập QR...</span>
                  </div>
                )}

                {lookupStatus === 'found' && lookedUpParent && issuedQrImage && (
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-50/80 to-indigo-50/50 border border-blue-200 text-center space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Đang chờ quét QR bằng Zalo trên điện thoại...
                      </span>
                    </div>

                    <div className="text-xs text-slate-800">
                      <p className="font-extrabold text-slate-900 text-sm">
                        Học sinh: {lookedUpParent.studentName}
                      </p>
                      <p className="text-slate-600 font-semibold">
                        Lớp {lookedUpParent.studentClass || '---'} • SĐT:{' '}
                        <span className="font-mono text-blue-700">{lookedUpParent.phone}</span>
                      </p>
                    </div>

                    <div className="inline-block p-2.5 bg-white rounded-2xl border-2 border-white shadow-md">
                      <img
                        src={issuedQrImage}
                        alt={`Mã QR đăng nhập ${lookedUpParent.phone}`}
                        className="w-44 h-44 mx-auto"
                      />
                    </div>

                    <p className="text-[11px] text-slate-700 leading-relaxed">
                      📱 Mở <b>Zalo</b> trên điện thoại và quét mã QR này — sau ~1 giây <b>trình duyệt máy tính sẽ tự động đăng nhập thẳng vào cổng Phụ huynh</b>.
                    </p>
                  </div>
                )}

                {lookupStatus === 'not_found' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                    ⚠️ Số điện thoại này chưa được Admin nhà trường cấp tài khoản & mã QR. Vui lòng kiểm tra lại SĐT hoặc liên hệ Giáo viên chủ nhiệm / Admin.
                  </div>
                )}

                {lookupStatus === 'idle' && (
                  <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-100 text-[11px] text-blue-900 leading-relaxed space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Hướng dẫn đăng nhập Phụ huynh:</span>
                    </p>
                    <p>
                      1. <b>Quét trên máy tính:</b> Nhập SĐT đã cấp để hiện <b>Mã QR</b>, dùng <b>Zalo</b> trên điện thoại quét mã QR này để vào hệ thống trên máy tính.
                    </p>
                    <p>
                      2. <b>Đăng nhập bằng ảnh QR:</b> Bấm nút bên dưới để chọn ảnh <b>Mã QR Zalo cá nhân</b> của số điện thoại phụ huynh (không dùng ảnh mã QR màn hình đăng nhập).
                    </p>
                  </div>
                )}

                {/* Hidden File Input for Zalo Personal QR Upload */}
                <input
                  ref={qrFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleQrImageSelected}
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={isLoading || isDecodingQr}
                  onClick={() => qrFileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {isDecodingQr ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>ĐANG ĐỌC MÃ QR ZALO...</span>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="w-4 h-4" />
                      <span>ĐĂNG NHẬP BẰNG ẢNH QR ZALO</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-slate-500 flex items-center justify-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Chỉ dùng ảnh Mã QR Zalo cá nhân của phụ huynh (Cá nhân → Mã QR của tôi)</span>
                </p>
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
