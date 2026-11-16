import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { ParentPortal } from './components/ParentPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { ProofModal } from './components/ProofModal';
import { AbsenceRecord, UserSession } from './types';
import { School, Loader2, CheckCircle2, MonitorCheck } from 'lucide-react';
import { apiFetch } from './utils/api';

const SESSION_STORAGE_KEY = 'school_current_session';
const SCHOOL_NAME = 'Trường THCS Giai Lạc';

export default function App() {
  // Current active session
  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    // Start at null so the landing page with the beautiful AI background image is shown initially
    return null;
  });

  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedProofRecord, setSelectedProofRecord] = useState<AbsenceRecord | null>(null);
  const [isQrAutoLoggingIn, setIsQrAutoLoggingIn] = useState<boolean>(false);
  const [qrAutoLoginError, setQrAutoLoginError] = useState<string>('');
  const [desktopConfirmedSession, setDesktopConfirmedSession] = useState<UserSession | null>(null);

  // Fetch absences from server
  const loadAbsences = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { data } = await apiFetch('/api/absences');
      if (data.success && Array.isArray(data.data)) {
        setAbsences(data.data);
      }
    } catch (err) {
      console.error('Failed to load absences:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAbsences();
    // Auto refresh every 15 seconds for real-time synchronization
    const timer = setInterval(loadAbsences, 15000);
    return () => clearInterval(timer);
  }, [loadAbsences]);

  // Handle Login success
  const handleLoginSuccess = useCallback(
    (newSession: UserSession) => {
      setSession(newSession);
      setQrAutoLoginError('');
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
      } catch {
        // ignore
      }
      loadAbsences();
    },
    [loadAbsences]
  );

  // Auto-confirm desktop login OR direct login when scanning QR code with Zalo
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const parentQr = params.get('parent_qr');
    const qrSession = params.get('qr_session');
    if (!parentQr) return;

    // Clean URL query parameter cleanly without reloading
    try {
      window.history.replaceState({}, '', window.location.pathname);
    } catch {
      // ignore
    }

    let cancelled = false;
    setIsQrAutoLoggingIn(true);
    setQrAutoLoginError('');

    if (qrSession) {
      // Scanned QR displayed on Computer -> Confirm desktop session!
      apiFetch('/api/auth/parent-qr-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: parentQr, sessionId: qrSession }),
      })
        .then(({ ok, data }) => {
          if (cancelled) return;
          if (ok && data.success && data.user) {
            setDesktopConfirmedSession({
              role: 'parent',
              name: data.user.name,
              phone: data.user.phone,
              studentName: data.user.studentName,
              studentClass: data.user.studentClass,
              token: data.token,
            });
          } else {
            setQrAutoLoginError(
              data?.message || 'Mã QR không hợp lệ hoặc đã hết hạn. Vui lòng thử quét lại.'
            );
          }
        })
        .catch(() => {
          if (!cancelled) {
            setQrAutoLoginError('Không thể xác nhận đăng nhập máy tính lúc này. Vui lòng thử lại.');
          }
        })
        .finally(() => {
          if (!cancelled) setIsQrAutoLoggingIn(false);
        });
    } else {
      // Scanned static QR card directly -> Log straight into this device
      apiFetch('/api/auth/parent-qr-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: parentQr }),
      })
        .then(({ ok, data }) => {
          if (cancelled) return;
          if (ok && data.success && data.user) {
            handleLoginSuccess({
              role: 'parent',
              name: data.user.name,
              phone: data.user.phone,
              studentName: data.user.studentName,
              studentClass: data.user.studentClass,
              token: data.token,
            });
          } else {
            setQrAutoLoginError(
              data?.message || 'Mã QR không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ nhà trường.'
            );
          }
        })
        .catch(() => {
          if (!cancelled) {
            setQrAutoLoginError('Không thể xác thực mã QR lúc này. Vui lòng thử lại.');
          }
        })
        .finally(() => {
          if (!cancelled) setIsQrAutoLoggingIn(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [handleLoginSuccess]);

  // Handle Logout -> returns to landing page with AI background
  const handleLogout = () => {
    setSession(null);
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // When parent submits a new absence
  const handleAbsenceSubmitted = (newRec: AbsenceRecord) => {
    setAbsences((prev) => [newRec, ...prev]);
    loadAbsences();
  };

  // When admin updates status
  const handleUpdateStatus = async (
    id: string,
    status: 'approved' | 'noted' | 'pending',
    adminNote?: string
  ) => {
    try {
      const { data } = await apiFetch(`/api/absences/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNote }),
      });
      if (data.success && data.data) {
        setAbsences((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...data.data } : r))
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // When admin deletes record
  const handleDeleteRecord = async (id: string) => {
    try {
      const { data } = await apiFetch(`/api/absences/${id}`, {
        method: 'DELETE',
      });
      if (data.success) {
        setAbsences((prev) => prev.filter((r) => r.id !== id));
      } else {
        console.error('Delete failed:', data.message);
      }
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
  };

  // Filter absences for parent's history
  const parentAbsences = absences.filter(
    (r) => session?.phone && r.parentPhone === session.phone
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Be_Vietnam_Pro',sans-serif] text-slate-800">
      {isQrAutoLoggingIn ? (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white px-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 max-w-sm w-full text-center space-y-3 shadow-2xl">
            <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto" />
            <h2 className="text-base font-extrabold">Đang xác thực mã QR...</h2>
            <p className="text-xs text-slate-300">
              Hệ thống đang xác nhận đăng nhập cho phụ huynh {SCHOOL_NAME}.
            </p>
          </div>
        </div>
      ) : desktopConfirmedSession ? (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white px-4">
          <div className="bg-white text-slate-900 rounded-3xl p-7 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Đăng Nhập Máy Tính Thành Công!
              </h2>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Tài khoản phụ huynh em{' '}
                <b className="text-slate-900">{desktopConfirmedSession.studentName}</b> (Lớp{' '}
                <b>{desktopConfirmedSession.studentClass || '---'}</b>) đã tự động đăng nhập trên màn hình máy tính.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 text-left">
              <MonitorCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Bạn có thể quay lại máy tính để sử dụng hệ thống ngay bây giờ.</span>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const s = desktopConfirmedSession;
                  setDesktopConfirmedSession(null);
                  handleLoginSuccess(s);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition shadow-md"
              >
                Mở cổng phụ huynh ngay trên điện thoại này
              </button>
              <button
                type="button"
                onClick={() => setDesktopConfirmedSession(null)}
                className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition"
              >
                Đóng thông báo
              </button>
            </div>
          </div>
        </div>
      ) : !session ? (
        /* LANDING PAGE WITH AI BACKGROUND PHOTO (Thầy trò và trường học đẹp) & 3 ROLE BUTTONS */
        <AuthModal
          onLoginSuccess={handleLoginSuccess}
          schoolName={SCHOOL_NAME}
          initialError={qrAutoLoginError}
        />
      ) : (
        <>
          {/* Authenticated Header */}
          <Header
            session={session}
            onLogout={handleLogout}
            onRefresh={loadAbsences}
            isRefreshing={isRefreshing}
            schoolName={SCHOOL_NAME}
          />

          {/* Main Content Area based on User Role */}
          <main className="flex-1 pb-16">
            {session.role === 'admin' ? (
              /* Role 1: Quản Trị Nhà Trường */
              <AdminDashboard
                absences={absences}
                onViewProof={(record) => setSelectedProofRecord(record)}
                onUpdateStatus={handleUpdateStatus}
                onDeleteRecord={handleDeleteRecord}
                onRefresh={loadAbsences}
                isRefreshing={isRefreshing}
                schoolName={SCHOOL_NAME}
              />
            ) : session.role === 'teacher' ? (
              /* Role 2: Giáo Viên (Chủ nhiệm & Bộ môn - Chỉ được xem, không được sửa/xóa, có thể đổi mật khẩu) */
              <TeacherDashboard
                session={session}
                absences={absences}
                onViewProof={(record) => setSelectedProofRecord(record)}
                onRefresh={loadAbsences}
                isRefreshing={isRefreshing}
                schoolName={SCHOOL_NAME}
              />
            ) : (
              /* Role 3: Phụ Huynh Học Sinh (Soạn đơn xin nghỉ bằng AI, gửi báo vắng, xem lịch sử) */
              <ParentPortal
                session={session}
                onAbsenceSubmitted={handleAbsenceSubmitted}
                myAbsences={parentAbsences}
                onViewProof={(record) => setSelectedProofRecord(record)}
                schoolName={SCHOOL_NAME}
              />
            )}
          </main>

          {/* Proof & AI Letter Viewer Modal */}
          <ProofModal
            record={selectedProofRecord}
            onClose={() => setSelectedProofRecord(null)}
            schoolName={SCHOOL_NAME}
          />

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-semibold text-slate-700">
                <School className="w-4 h-4 text-blue-600" />
                <span>{SCHOOL_NAME} • Hệ Thống Sổ Báo Vắng & Xin Nghỉ Học Điện Tử</span>
              </div>
              <div className="text-slate-400 text-[11px]">
                Kết nối phụ huynh, giáo viên và Ban Giám Hiệu nhà trường
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
