import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { ParentPortal } from './components/ParentPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { ProofModal } from './components/ProofModal';
import { AbsenceRecord, UserSession } from './types';
import { School } from 'lucide-react';

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

  // Fetch absences from server
  const loadAbsences = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/absences');
      const data = await res.json();
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
  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    } catch {
      // ignore
    }
    loadAbsences();
  };

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
      const res = await fetch(`/api/absences/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNote }),
      });
      const data = await res.json();
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
      const res = await fetch(`/api/absences/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
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
      {!session ? (
        /* LANDING PAGE WITH AI BACKGROUND PHOTO (Thầy trò và trường học đẹp) & 3 ROLE BUTTONS */
        <AuthModal
          onLoginSuccess={handleLoginSuccess}
          schoolName={SCHOOL_NAME}
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
