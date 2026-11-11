export interface AbsenceRecord {
  id: string;
  orderNumber?: number;
  date: string; // YYYY-MM-DD
  dateDisplay: string; // DD/MM/YYYY
  morning: boolean; // Buổi sáng
  afternoon: boolean; // Buổi chiều
  studentName: string;
  studentClass: string;
  teacherName?: string; // Tên Giáo viên chủ nhiệm
  reasonPreset: string;
  reasonDetail: string;
  parentName: string;
  parentPhone: string;
  aiLetter: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentData?: string; // base64 data url
  status: 'pending' | 'approved' | 'noted';
  adminNote?: string;
  createdAt: string;
  createdTime?: string; // HH:mm, ví dụ: 06:45
}

export interface UserSession {
  role: 'admin' | 'parent' | 'teacher';
  name: string;
  phone?: string;
  username?: string;
  assignedClass?: string; // For homeroom teachers
  isHomeroom?: boolean;
  token: string;
}

export interface TeacherAccount {
  id: string;
  orderNumber: number;
  name: string;
  assignedClass?: string; // e.g. "6A1", "7B3", or empty for GV bộ môn
  isHomeroom: boolean;
  username: string;
  password: string;
  createdAt: string;
}

export interface StatsSummary {
  totalAllTime: number;
  todayTotal: number;
  todayMorning: number;
  todayAfternoon: number;
  todayByClass: Record<string, number>;
  pendingCount: number;
}
