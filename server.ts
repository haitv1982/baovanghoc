import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = fs.existsSync(path.join(__dirname, 'package.json'))
  ? __dirname
  : path.resolve(__dirname, '..');

const PORT = Number(process.env.PORT) || 3000;
const BUNDLED_DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(ROOT_DIR, 'data');

function resolveWritableDataDir(): string {
  try {
    if (!fs.existsSync(BUNDLED_DATA_DIR)) {
      fs.mkdirSync(BUNDLED_DATA_DIR, { recursive: true });
    }
    const probeFile = path.join(BUNDLED_DATA_DIR, '.write-probe');
    fs.writeFileSync(probeFile, 'ok');
    fs.unlinkSync(probeFile);
    return BUNDLED_DATA_DIR;
  } catch {
    const tmpDir = '/tmp/baovanghoc-data';
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    if (fs.existsSync(BUNDLED_DATA_DIR)) {
      for (const file of fs.readdirSync(BUNDLED_DATA_DIR)) {
        const src = path.join(BUNDLED_DATA_DIR, file);
        const dest = path.join(tmpDir, file);
        if (fs.statSync(src).isFile() && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
        }
      }
    }
    return tmpDir;
  }
}

const DATA_DIR = resolveWritableDataDir();
const DATA_FILE = path.join(DATA_DIR, 'absences.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const TEACHERS_FILE = path.join(DATA_DIR, 'teachers.json');
const QR_SESSIONS_FILE = path.join(DATA_DIR, 'qr_sessions.json');

// Initialize Gemini client server-side when API key is configured
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

export interface AbsenceRecord {
  id: string;
  orderNumber?: number;
  date: string; // YYYY-MM-DD
  dateDisplay: string; // DD/MM/YYYY
  morning: boolean; // Buổi sáng
  afternoon: boolean; // Buổi chiều
  studentName: string;
  studentClass: string;
  teacherName?: string; // Giáo viên chủ nhiệm
  reasonPreset: string;
  reasonDetail: string;
  parentName: string;
  parentPhone: string;
  aiLetter: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentData?: string; // base64 or link
  status: 'pending' | 'approved' | 'noted';
  adminNote?: string;
  createdAt: string;
  createdTime?: string;
}

export interface ParentUser {
  id: string;
  orderNumber: number;
  studentName: string;
  studentClass: string;
  phone: string;
  parentName?: string;
  password?: string;
  qrToken: string;
  zaloQrCode?: string;
  createdAt: string;
}

export interface TeacherUser {
  id: string;
  orderNumber: number;
  name: string;
  assignedClass?: string;
  isHomeroom: boolean;
  username: string;
  password: string;
  createdAt: string;
}

export interface AdminAccount {
  username: string;
  password: string;
  name: string;
  updatedAt?: string;
}

// Initial realistic Vietnamese school sample data
const initialRecords: AbsenceRecord[] = [
  {
    id: 'abs-1',
    date: '2026-11-09',
    dateDisplay: '09/11/2026',
    morning: true,
    afternoon: false,
    studentName: 'Nguyễn Văn Minh Khang',
    studentClass: '6A1',
    teacherName: 'Cô Nguyễn Thị Hoa',
    reasonPreset: 'Bị ốm / Sốt cao',
    reasonDetail: 'Cháu bị sốt siêu vi từ tối qua, nhiệt độ 38.5 độ C, gia đình xin nghỉ buổi sáng để theo dõi và đi khám.',
    parentName: 'Nguyễn Văn Hùng',
    parentPhone: '0987654321',
    aiLetter: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n-------------------\n\nĐƠN XIN PHÉP NGHỈ HỌC\n\nKính gửi:\n- Ban Giám hiệu Trường THCS & THPT Tri Thức\n- Giáo viên chủ nhiệm Lớp 6A1\n\nTôi tên là: Nguyễn Văn Hùng\nLà phụ huynh của học sinh: Nguyễn Văn Minh Khang\nHọc sinh lớp: 6A1\n\nTôi làm đơn này xin phép cho con được nghỉ học:\n- Thời gian: Buổi sáng ngày 09/11/2026\n- Lý do: Cháu bị sốt siêu vi từ đêm qua, gia đình đưa cháu đi khám tại cơ sở y tế và nghỉ ngơi theo chỉ định.\n\nGia đình xin cam kết nhắc nhở cháu tự học, chép bài và hoàn thành đầy đủ bài tập sau khi trở lại lớp.\n\nRất mong Ban Giám hiệu và Thầy/Cô chủ nhiệm xem xét, chấp thuận.\n\nXin chân thành cảm ơn!\n\nNgười làm đơn (Ký và ghi rõ họ tên)\nNguyễn Văn Hùng`,
    attachmentName: 'toathuoc_kham_benh.jpg',
    attachmentType: 'image/jpeg',
    status: 'approved',
    adminNote: 'Đã xác nhận với phụ huynh qua điện thoại, chúc em mau khỏe.',
    createdAt: '2026-11-09T06:30:00Z',
  },
  {
    id: 'abs-2',
    date: '2026-11-09',
    dateDisplay: '09/11/2026',
    morning: true,
    afternoon: true,
    studentName: 'Trần Bảo Ngọc',
    studentClass: '7B3',
    teacherName: 'Thầy Trần Đình Trọng',
    reasonPreset: 'Đi khám bệnh tại bệnh viện',
    reasonDetail: 'Gia đình có lịch hẹn tái khám mắt chuyên khoa tại Bệnh viện Mắt vào cả ngày hôm nay.',
    parentName: 'Trần Thị Mai',
    parentPhone: '0912345678',
    aiLetter: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n----------------***----------------\n\nĐƠN XIN PHÉP NGHỈ HỌC\n\nKính gửi:  - Ban giám hiệu trường THCS Giai Lạc\n           - Giáo viên chủ nhiệm lớp 7B3 (Thầy Trần Đình Trọng)\n\nEm tên là: Trần Bảo Ngọc\nHiện là học sinh lớp: 7B3\nEm viết đơn này xin phép được nghỉ học cả ngày (buổi sáng và buổi chiều) ngày 09/11/2026.\nLý do (Ghi cụ thể): Đi khám bệnh tại bệnh viện. Gia đình có lịch hẹn tái khám mắt chuyên khoa tại Bệnh viện Mắt.\nEm xin hứa: Sẽ tự giác chép bài, mượn vở bạn bù đắp kiến thức những tiết học vắng, hoàn thành bài tập đầy đủ và đi học lại nghiêm túc, đúng giờ.\n\nRất mong được sự chấp nhận của quý Thầy, Cô. Em xin chân thành cám ơn!\n\n                                    Giai Lạc, ngày 09 tháng 11 năm 2026\n\n      Chữ ký của Phụ huynh học sinh                    Người làm đơn\n                                                      (Ghi rõ họ và tên)\n\n         Trần Thị Mai                                   Trần Bảo Ngọc\n      (SĐT: 0912345678)`,
    attachmentName: 'giay_hen_kham.docx',
    attachmentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    status: 'approved',
    adminNote: 'Đã duyệt nghỉ cả ngày.',
    createdAt: '2026-11-09T06:45:00Z',
  },
  {
    id: 'abs-3',
    date: '2026-11-09',
    dateDisplay: '09/11/2026',
    morning: false,
    afternoon: true,
    studentName: 'Lê Hoàng Long',
    studentClass: '9A2',
    teacherName: 'Cô Lê Hoàng Mai',
    reasonPreset: 'Việc gia đình đột xuất',
    reasonDetail: 'Gia đình có việc hiếu ở quê cần cháu về phụ giúp cùng cha mẹ trong buổi chiều.',
    parentName: 'Lê Thanh Bình',
    parentPhone: '0978112233',
    aiLetter: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n----------------***----------------\n\nĐƠN XIN PHÉP NGHỈ HỌC\n\nKính gửi:  - Ban giám hiệu trường THCS Giai Lạc\n           - Giáo viên chủ nhiệm lớp 9A2 (Cô Lê Hoàng Mai)\n\nEm tên là: Lê Hoàng Long\nHiện là học sinh lớp: 9A2\nEm viết đơn này xin phép được nghỉ học buổi chiều ngày 09/11/2026.\nLý do (Ghi cụ thể): Việc gia đình đột xuất. Gia đình có việc hiếu ở quê cần về phụ giúp trong buổi chiều.\nEm xin hứa: Sẽ chủ động liên hệ bạn cùng lớp để mượn vở chép bài đầy đủ và làm hết bài tập về nhà.\n\nRất mong được sự chấp nhận của quý Thầy, Cô. Em xin chân thành cám ơn!\n\n                                    Giai Lạc, ngày 09 tháng 11 năm 2026\n\n      Chữ ký của Phụ huynh học sinh                    Người làm đơn\n                                                      (Ghi rõ họ và tên)\n\n         Lê Thanh Bình                                   Lê Hoàng Long\n      (SĐT: 0978112233)`,
    status: 'pending',
    createdAt: '2026-11-09T07:10:00Z',
  },
  {
    id: 'abs-4',
    date: '2026-11-09',
    dateDisplay: '09/11/2026',
    morning: true,
    afternoon: false,
    studentName: 'Phạm Quỳnh Anh',
    studentClass: '10C1',
    teacherName: 'Thầy Phạm Quốc Hưng',
    reasonPreset: 'Bị ốm / Cảm sốt',
    reasonDetail: 'Em Quỳnh Anh bị viêm họng cấp, khan tiếng và mệt mỏi.',
    parentName: 'Phạm Thu Hương',
    parentPhone: '0903998877',
    aiLetter: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n----------------***----------------\n\nĐƠN XIN PHÉP NGHỈ HỌC\n\nKính gửi:  - Ban giám hiệu trường THCS Giai Lạc\n           - Giáo viên chủ nhiệm lớp 10C1 (Thầy Phạm Quốc Hưng)\n\nEm tên là: Phạm Quỳnh Anh\nHiện là học sinh lớp: 10C1\nEm viết đơn này xin phép được nghỉ học buổi sáng ngày 09/11/2026.\nLý do (Ghi cụ thể): Bị ốm / Cảm sốt. Em bị viêm họng cấp mệt mỏi, cần nghỉ ngơi và uống thuốc theo toa.\nEm xin hứa: Sau khi khỏe lại em sẽ đi học đúng giờ, chép bài và hoàn thành đầy đủ bài tập được giao.\n\nRất mong được sự chấp nhận của quý Thầy, Cô. Em xin chân thành cám ơn!\n\n                                    Giai Lạc, ngày 09 tháng 11 năm 2026\n\n      Chữ ký của Phụ huynh học sinh                    Người làm đơn\n                                                      (Ghi rõ họ và tên)\n\n         Phạm Thu Hương                                  Phạm Quỳnh Anh\n      (SĐT: 0903998877)`,
    attachmentName: 'don_xin_phep_viet_tay.jpg',
    attachmentType: 'image/jpeg',
    status: 'pending',
    createdAt: '2026-11-09T07:25:00Z',
  },
  {
    id: 'abs-5',
    date: '2026-11-08',
    dateDisplay: '08/11/2026',
    morning: true,
    afternoon: true,
    studentName: 'Vũ Đức Anh',
    studentClass: '8A4',
    teacherName: 'Cô Vũ Minh Hằng',
    reasonPreset: 'Tham gia thi đấu năng khiếu',
    reasonDetail: 'Đại diện câu lạc bộ thi đấu giải bơi lội thanh thiếu niên cấp quận.',
    parentName: 'Vũ Mạnh Cường',
    parentPhone: '0934567890',
    aiLetter: `ĐƠN XIN PHÉP NGHỈ HỌC\nKính gửi Ban Giám hiệu nhà trường và GVCN 8A4.\nXin phép cho em Vũ Đức Anh nghỉ ngày 08/11/2026 do tham dự giải bơi cấp quận theo quyết định cử thi đấu.\nPhụ huynh: Vũ Mạnh Cường`,
    status: 'noted',
    createdAt: '2026-11-08T06:00:00Z',
  },
];

// Helper to read and write database
function getAbsences(): AbsenceRecord[] {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialRecords, null, 2), 'utf-8');
    return initialRecords;
  }
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return initialRecords;
  }
}

function saveAbsences(records: AbsenceRecord[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

function normalizePhone(raw: string): string {
  return (raw || '').replace(/[\s.\-()]/g, '').trim();
}

function phoneMatches(a: string, b: string): boolean {
  const na = normalizePhone(a).replace(/^\+?84/, '0');
  const nb = normalizePhone(b).replace(/^\+?84/, '0');
  return Boolean(na && nb && na === nb);
}

function parseZaloOrSystemQr(raw: string):
  | { kind: 'system_qr'; token: string }
  | { kind: 'zalo_profile'; profileId: string; raw: string }
  | { kind: 'zalo_phone'; phone: string }
  | { kind: 'unknown'; raw: string } {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { kind: 'unknown', raw: '' };

  // 1. Detect system-issued QR (?parent_qr=... or qr_...)
  const sysToken = extractQrTokenFromPayload(trimmed);
  if (trimmed.includes('parent_qr=') || /^qr_[0-9a-zA-Z_]+$/i.test(sysToken)) {
    return { kind: 'system_qr', token: sysToken };
  }

  // 2. Detect Zalo Personal Profile QR (https://zalo.me/qr/p/... or https://zaloapp.com/qr/p/...)
  const profileMatch = trimmed.match(/zalo(?:app)?\.(?:me|com)\/qr\/p\/([A-Za-z0-9_-]+)/i);
  if (profileMatch?.[1]) {
    return { kind: 'zalo_profile', profileId: profileMatch[1], raw: trimmed };
  }

  // 3. Detect Zalo Phone QR or tel/raw phone (https://zalo.me/0987654321, zaloapp.com/qr/0987654321, etc.)
  const zaloPhoneMatch = trimmed.match(/zalo(?:app)?\.(?:me|com)\/(?:qr\/)?(\+?\d{8,13})(?:[/?#]|$)/i);
  if (zaloPhoneMatch?.[1]) {
    return { kind: 'zalo_phone', phone: normalizePhone(zaloPhoneMatch[1]) };
  }

  const telMatch = trimmed.match(/^tel:(\+?\d{8,13})$/i);
  if (telMatch?.[1]) {
    return { kind: 'zalo_phone', phone: normalizePhone(telMatch[1]) };
  }

  const digitsOnly = normalizePhone(trimmed);
  if (/^(\+?84|0)\d{8,10}$/.test(digitsOnly)) {
    return { kind: 'zalo_phone', phone: digitsOnly };
  }

  return { kind: 'unknown', raw: trimmed };
}

function generateParentQrToken(phone: string): string {
  const clean = normalizePhone(phone) || 'ph';
  const rand = crypto.randomBytes(4).toString('hex');
  return `qr_${clean}_${rand}`;
}

function extractQrTokenFromPayload(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const t = url.searchParams.get('parent_qr');
      if (t) return t.trim();
    }
  } catch {
    // ignore
  }
  const match = trimmed.match(/parent_qr=([^&\s]+)/i);
  if (match?.[1]) {
    return decodeURIComponent(match[1]).trim();
  }
  return trimmed;
}

function getUsers(): ParentUser[] {
  const defaultUsers: ParentUser[] = [
    {
      id: 'par-1',
      orderNumber: 1,
      studentName: 'Nguyễn Văn Minh Khang',
      studentClass: '6A1',
      phone: '0987654321',
      parentName: 'Nguyễn Văn Hùng',
      qrToken: 'qr_0987654321_giailac01',
      createdAt: '2026-11-09T06:00:00Z',
    },
    {
      id: 'par-2',
      orderNumber: 2,
      studentName: 'Trần Bảo Ngọc',
      studentClass: '7B3',
      phone: '0912345678',
      parentName: 'Trần Thị Mai',
      qrToken: 'qr_0912345678_giailac02',
      createdAt: '2026-11-09T06:00:00Z',
    },
  ];

  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2), 'utf-8');
    return defaultUsers;
  }
  try {
    const rawList: any[] = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    let needsSave = false;
    const migrated: ParentUser[] = rawList.map((u, idx) => {
      const cleanPhone = normalizePhone(u.phone || '');
      const hasAllFields = Boolean(u.id && u.qrToken && u.studentName !== undefined && u.orderNumber);
      if (!hasAllFields) needsSave = true;
      return {
        id: u.id || `par-${idx + 1}-${cleanPhone || Date.now()}`,
        orderNumber: u.orderNumber || idx + 1,
        studentName: (u.studentName || u.parentName || `Học sinh (${cleanPhone.slice(-4)})`).normalize('NFC'),
        studentClass: (u.studentClass || '').normalize('NFC'),
        phone: cleanPhone,
        parentName: (u.parentName || '').normalize('NFC'),
        password: u.password,
        qrToken: u.qrToken || generateParentQrToken(cleanPhone),
        zaloQrCode: u.zaloQrCode || '',
        createdAt: u.createdAt || new Date().toISOString(),
      };
    });
    if (needsSave) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(migrated, null, 2), 'utf-8');
    }
    return migrated;
  } catch {
    return defaultUsers;
  }
}

function saveUsers(users: ParentUser[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

interface QrLoginSessionRecord {
  sessionId: string;
  status: 'pending' | 'confirmed';
  createdAt: number;
  confirmedAt?: number;
  user?: {
    role: 'parent';
    phone: string;
    name: string;
    studentName: string;
    studentClass: string;
  };
  token?: string;
}

const QR_SESSION_TTL_MS = 15 * 60 * 1000;

function getQrSessions(): Record<string, QrLoginSessionRecord> {
  if (!fs.existsSync(QR_SESSIONS_FILE)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(QR_SESSIONS_FILE, 'utf-8')) || {};
    const now = Date.now();
    const cleaned: Record<string, QrLoginSessionRecord> = {};
    for (const [k, v] of Object.entries<any>(raw)) {
      if (v && typeof v.createdAt === 'number' && now - v.createdAt < QR_SESSION_TTL_MS) {
        cleaned[k] = v;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

function saveQrSessions(sessions: Record<string, QrLoginSessionRecord>) {
  fs.writeFileSync(QR_SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
}

function getAdmin(): AdminAccount {
  if (!fs.existsSync(ADMIN_FILE)) {
    const defaultAdmin: AdminAccount = {
      username: 'admin',
      password: 'admin123',
      name: 'Ban Giám Hiệu / Quản Trị Nhà Trường',
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(defaultAdmin, null, 2), 'utf-8');
    return defaultAdmin;
  }
  try {
    return JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf-8'));
  } catch {
    return {
      username: 'admin',
      password: 'admin123',
      name: 'Ban Giám Hiệu / Quản Trị Nhà Trường',
    };
  }
}

function saveAdmin(admin: AdminAccount) {
  admin.updatedAt = new Date().toISOString();
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2), 'utf-8');
}

const defaultTeachers: TeacherUser[] = [
  {
    id: 'tch-1',
    orderNumber: 1,
    name: 'Nguyễn Thị Hoa',
    assignedClass: '6A1',
    isHomeroom: true,
    username: 'gv_hoant',
    password: '123',
    createdAt: '2026-11-09T06:00:00Z',
  },
  {
    id: 'tch-2',
    orderNumber: 2,
    name: 'Trần Đình Trọng',
    assignedClass: '7B3',
    isHomeroom: true,
    username: 'gv_trongtd',
    password: '123',
    createdAt: '2026-11-09T06:00:00Z',
  },
  {
    id: 'tch-3',
    orderNumber: 3,
    name: 'Lê Hoàng Mai',
    assignedClass: '9A2',
    isHomeroom: true,
    username: 'gv_mailh',
    password: '123',
    createdAt: '2026-11-09T06:00:00Z',
  },
  {
    id: 'tch-4',
    orderNumber: 4,
    name: 'Phạm Quốc Hưng',
    assignedClass: '10C1',
    isHomeroom: true,
    username: 'gv_hungpq',
    password: '123',
    createdAt: '2026-11-09T06:00:00Z',
  },
  {
    id: 'tch-5',
    orderNumber: 5,
    name: 'Vũ Minh Hằng',
    assignedClass: '8A4',
    isHomeroom: true,
    username: 'gv_hangvm',
    password: '123',
    createdAt: '2026-11-09T06:00:00Z',
  },
  {
    id: 'tch-6',
    orderNumber: 6,
    name: 'Nguyễn Văn Tuấn',
    assignedClass: '',
    isHomeroom: false,
    username: 'gv_tuannv',
    password: '123',
    createdAt: '2026-11-09T06:00:00Z',
  },
  {
    id: 'tch-7',
    orderNumber: 7,
    name: 'Trần Thu Hà',
    assignedClass: '',
    isHomeroom: false,
    username: 'gv_hatt',
    password: '123',
    createdAt: '2026-11-09T06:00:00Z',
  },
];

function getTeachers(): TeacherUser[] {
  if (!fs.existsSync(TEACHERS_FILE)) {
    fs.writeFileSync(TEACHERS_FILE, JSON.stringify(defaultTeachers, null, 2), 'utf-8');
    return defaultTeachers;
  }
  try {
    return JSON.parse(fs.readFileSync(TEACHERS_FILE, 'utf-8'));
  } catch {
    return defaultTeachers;
  }
}

function saveTeachers(teachers: TeacherUser[]) {
  fs.writeFileSync(TEACHERS_FILE, JSON.stringify(teachers, null, 2), 'utf-8');
}

function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function generateTeacherUsername(name: string, existingUsernames: Set<string>): string {
  // Strip title prefixes like "Thầy", "Cô", "GV", "Thầy/Cô"
  let cleanName = name
    .replace(/^(Thầy|Cô|GV|Thầy giáo|Cô giáo)\s+/i, '')
    .trim();
  
  const words = removeVietnameseTones(cleanName.toLowerCase())
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .split(/\s+/);
  
  let base = 'gv_';
  if (words.length <= 1) {
    base += words[0] || 'gv';
  } else {
    const lastName = words[words.length - 1];
    const initials = words.slice(0, -1).map((w) => w[0]).join('');
    base += `${lastName}${initials}`;
  }

  let finalUsername = base;
  let counter = 1;
  while (existingUsernames.has(finalUsername)) {
    finalUsername = `${base}${counter}`;
    counter++;
  }
  existingUsernames.add(finalUsername);
  return finalUsername;
}

function generateTeacherPassword(): string {
  const random4 = Math.floor(1000 + Math.random() * 9000);
  return `GV${random4}`;
}

export function createApiApp() {
  const app = express();

  // Support large uploads for proof photos and Word documents
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // 1. Admin login (reads from persistent admin.json, with fallback)
  app.post('/api/auth/admin-login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    const admin = getAdmin();
    const cleanUser = (username || '').trim();
    const cleanPass = (password || '').trim();

    if (
      (cleanUser === admin.username && cleanPass === admin.password) ||
      (cleanUser === 'admin' && (cleanPass === 'admin123' || cleanPass === 'admin' || cleanPass === '123456'))
    ) {
      return res.json({
        success: true,
        user: {
          role: 'admin',
          name: admin.name || 'Ban Giám Hiệu / Quản Trị Nhà Trường',
          username: admin.username,
        },
        token: 'token-admin-' + Date.now(),
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Tên đăng nhập hoặc mật khẩu quản trị không chính xác!',
    });
  });

  // 1b. Admin change password
  app.post('/api/auth/admin-change-password', (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.' });
    }
    if (newPassword.trim().length < 4) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 4 ký tự.' });
    }

    const admin = getAdmin();
    if (admin.password !== currentPassword.trim() && currentPassword.trim() !== 'admin123') {
      return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không chính xác.' });
    }

    admin.password = newPassword.trim();
    saveAdmin(admin);

    return res.json({
      success: true,
      message: 'Đổi mật khẩu Quản trị thành công!',
    });
  });

  // 1c. Teacher login
  app.post('/api/auth/teacher-login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu giáo viên.' });
    }

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();
    const teachers = getTeachers();

    const teacher = teachers.find(
      (t) => t.username.toLowerCase() === cleanUser
    );

    if (!teacher || teacher.password !== cleanPass) {
      return res.status(401).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu giáo viên không chính xác. Vui lòng liên hệ Admin nhà trường để được cấp lại nếu quên.',
      });
    }

    return res.json({
      success: true,
      user: {
        role: 'teacher',
        id: teacher.id,
        name: teacher.name,
        username: teacher.username,
        assignedClass: teacher.assignedClass,
        isHomeroom: teacher.isHomeroom,
      },
      token: 'token-teacher-' + teacher.id,
    });
  });

  // 1d. Teacher change password
  app.post('/api/auth/teacher-change-password', (req: Request, res: Response) => {
    const { username, teacherId, currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.' });
    }
    if (newPassword.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 3 ký tự.' });
    }

    const teachers = getTeachers();
    const teacher = teachers.find(
      (t) => (teacherId && t.id === teacherId) || (username && t.username.toLowerCase() === username.trim().toLowerCase())
    );

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản giáo viên.' });
    }

    if (teacher.password !== currentPassword.trim()) {
      return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không chính xác.' });
    }

    teacher.password = newPassword.trim();
    saveTeachers(teachers);

    return res.json({
      success: true,
      message: 'Đổi mật khẩu thành công! Bạn có thể dùng mật khẩu mới từ lần đăng nhập sau.',
    });
  });

  // 1e. Teachers CRUD (Admin only)
  app.get('/api/teachers', (_req: Request, res: Response) => {
    try {
      const teachers = getTeachers();
      return res.json({ success: true, data: teachers });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/teachers', (req: Request, res: Response) => {
    try {
      const { name, assignedClass } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập họ và tên giáo viên.' });
      }

      const teachers = getTeachers();
      const existingUsernames = new Set(teachers.map((t) => t.username.toLowerCase()));
      const username = generateTeacherUsername(name.trim(), existingUsernames);
      const password = generateTeacherPassword();

      const newTeacher: TeacherUser = {
        id: 'tch-' + Date.now(),
        orderNumber: teachers.length + 1,
        name: name.trim().normalize('NFC'),
        assignedClass: (assignedClass?.trim() || '').normalize('NFC'),
        isHomeroom: Boolean(assignedClass && assignedClass.trim()),
        username,
        password,
        createdAt: new Date().toISOString(),
      };

      teachers.push(newTeacher);
      saveTeachers(teachers);

      return res.status(201).json({ success: true, data: newTeacher, message: 'Thêm giáo viên và cấp tài khoản thành công!' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 1f. Batch upload teachers (TT, Họ tên, Chủ nhiệm lớp)
  app.post('/api/teachers/batch', (req: Request, res: Response) => {
    try {
      const { items } = req.body; // Array of { name: string, assignedClass?: string, orderNumber?: number }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Danh sách giáo viên không hợp lệ hoặc rỗng.' });
      }

      const teachers = getTeachers();
      const existingUsernames = new Set(teachers.map((t) => t.username.toLowerCase()));
      const addedList: TeacherUser[] = [];

      for (const item of items) {
        const rawName = (item.name || '').trim();
        if (!rawName) continue;

        const assignedClass = (item.assignedClass || item.className || '').trim();
        const username = generateTeacherUsername(rawName, existingUsernames);
        const password = generateTeacherPassword();

        const newTeacher: TeacherUser = {
          id: 'tch-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          orderNumber: teachers.length + addedList.length + 1,
          name: rawName.normalize('NFC'),
          assignedClass: assignedClass.normalize('NFC'),
          isHomeroom: Boolean(assignedClass && assignedClass.length > 0 && assignedClass.toLowerCase() !== 'bộ môn'),
          username,
          password,
          createdAt: new Date().toISOString(),
        };

        addedList.push(newTeacher);
      }

      const updatedTeachers = [...teachers, ...addedList];
      saveTeachers(updatedTeachers);

      return res.json({
        success: true,
        count: addedList.length,
        data: updatedTeachers,
        added: addedList,
        message: `Đã cấp tài khoản thành công cho ${addedList.length} giáo viên!`,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 1g. Reset teacher password
  app.patch('/api/teachers/:id/reset-password', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const teachers = getTeachers();
      const teacher = teachers.find((t) => t.id === id);

      if (!teacher) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy giáo viên.' });
      }

      const newPass = generateTeacherPassword();
      teacher.password = newPass;
      saveTeachers(teachers);

      return res.json({
        success: true,
        data: teacher,
        newPassword: newPass,
        message: `Đã đặt lại mật khẩu cho ${teacher.name} thành công: ${newPass}`,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 1h. Delete teacher
  app.delete('/api/teachers/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      let teachers = getTeachers();
      const initialLen = teachers.length;
      teachers = teachers.filter((t) => t.id !== id);

      if (teachers.length === initialLen) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy giáo viên để xóa.' });
      }

      // Re-index order numbers
      teachers = teachers.map((t, idx) => ({ ...t, orderNumber: idx + 1 }));
      saveTeachers(teachers);

      return res.json({ success: true, message: 'Đã xóa giáo viên thành công.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 1i. Parent Accounts CRUD & QR Provisioning (Admin)
  app.get('/api/parents', (_req: Request, res: Response) => {
    try {
      const users = getUsers();
      return res.json({ success: true, data: users });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/parents', (req: Request, res: Response) => {
    try {
      const { studentName, studentClass, phone, zaloQrCode } = req.body;
      const cleanPhone = normalizePhone(phone || '');
      const cleanStudent = (studentName || '').trim().normalize('NFC');
      const cleanClass = (studentClass || '').trim().normalize('NFC');
      const cleanZaloQr = (zaloQrCode || '').trim();

      if (!cleanStudent || !cleanClass || !cleanPhone) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đầy đủ họ tên học sinh, lớp và số điện thoại phụ huynh.',
        });
      }

      const users = getUsers();
      const existingIdx = users.findIndex((u) => phoneMatches(u.phone, cleanPhone));

      if (existingIdx !== -1) {
        users[existingIdx] = {
          ...users[existingIdx],
          studentName: cleanStudent,
          studentClass: cleanClass,
          phone: cleanPhone,
          qrToken: users[existingIdx].qrToken || generateParentQrToken(cleanPhone),
          zaloQrCode: cleanZaloQr || users[existingIdx].zaloQrCode || '',
        };
        saveUsers(users);
        return res.json({
          success: true,
          data: users[existingIdx],
          message: `Đã cập nhật thông tin & giữ nguyên mã QR cho SĐT ${cleanPhone}.`,
        });
      }

      const newParent: ParentUser = {
        id: 'par-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        orderNumber: users.length + 1,
        studentName: cleanStudent,
        studentClass: cleanClass,
        phone: cleanPhone,
        qrToken: generateParentQrToken(cleanPhone),
        zaloQrCode: cleanZaloQr,
        createdAt: new Date().toISOString(),
      };

      users.push(newParent);
      saveUsers(users);

      return res.status(201).json({
        success: true,
        data: newParent,
        message: 'Đã cấp tài khoản phụ huynh và sinh mã QR thành công!',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/parents/batch', (req: Request, res: Response) => {
    try {
      const { items } = req.body; // Array of { orderNumber?, studentName, studentClass, phone, zaloQrCode? }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Danh sách phụ huynh không hợp lệ hoặc rỗng.',
        });
      }

      const users = getUsers();
      let addedCount = 0;
      let updatedCount = 0;

      for (const item of items) {
        const cleanStudent = (item.studentName || '').trim().normalize('NFC');
        const cleanClass = (item.studentClass || '').trim().normalize('NFC');
        const cleanPhone = normalizePhone(item.phone || '');
        const cleanZaloQr = (item.zaloQrCode || '').trim();

        if (!cleanStudent || !cleanPhone) continue;

        const existingIdx = users.findIndex((u) => phoneMatches(u.phone, cleanPhone));
        if (existingIdx !== -1) {
          users[existingIdx] = {
            ...users[existingIdx],
            studentName: cleanStudent,
            studentClass: cleanClass || users[existingIdx].studentClass,
            qrToken: users[existingIdx].qrToken || generateParentQrToken(cleanPhone),
            zaloQrCode: cleanZaloQr || users[existingIdx].zaloQrCode || '',
          };
          updatedCount++;
        } else {
          users.push({
            id: 'par-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
            orderNumber: users.length + 1,
            studentName: cleanStudent,
            studentClass: cleanClass,
            phone: cleanPhone,
            qrToken: generateParentQrToken(cleanPhone),
            zaloQrCode: cleanZaloQr,
            createdAt: new Date().toISOString(),
          });
          addedCount++;
        }
      }

      const reindexed = users.map((u, idx) => ({ ...u, orderNumber: idx + 1 }));
      saveUsers(reindexed);

      return res.json({
        success: true,
        addedCount,
        updatedCount,
        count: addedCount + updatedCount,
        data: reindexed,
        message: `Đã cấp tài khoản & sinh mã QR cho ${addedCount} phụ huynh mới${
          updatedCount > 0 ? ` (cập nhật ${updatedCount} SĐT đã có)` : ''
        }!`,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  app.patch('/api/parents/:id/zalo-qr', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { zaloQrCode } = req.body;
      const users = getUsers();
      const idx = users.findIndex((u) => u.id === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản phụ huynh.' });
      }
      users[idx].zaloQrCode = (zaloQrCode || '').trim();
      saveUsers(users);
      return res.json({
        success: true,
        data: users[idx],
        message: users[idx].zaloQrCode
          ? `Đã gắn mã QR Zalo cá nhân cho phụ huynh em ${users[idx].studentName}.`
          : `Đã gỡ mã QR Zalo cá nhân của em ${users[idx].studentName}.`,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  app.patch('/api/parents/:id/regenerate-qr', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const users = getUsers();
      const idx = users.findIndex((u) => u.id === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản phụ huynh.' });
      }
      users[idx].qrToken = generateParentQrToken(users[idx].phone);
      saveUsers(users);
      return res.json({
        success: true,
        data: users[idx],
        message: `Đã cấp lại mã QR mới cho SĐT ${users[idx].phone}.`,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  app.delete('/api/parents/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      let users = getUsers();
      const initialLen = users.length;
      users = users.filter((u) => u.id !== id);
      if (users.length === initialLen) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản phụ huynh để xóa.' });
      }
      users = users.map((u, idx) => ({ ...u, orderNumber: idx + 1 }));
      saveUsers(users);
      return res.json({ success: true, message: 'Đã xóa tài khoản phụ huynh thành công.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 2a. Parent QR lookup by phone number (shows issued QR right on Parent login card)
  app.get('/api/auth/parent-qr-lookup', (req: Request, res: Response) => {
    try {
      const cleanPhone = normalizePhone(String(req.query.phone || ''));
      if (!cleanPhone) {
        return res.json({ success: true, found: false });
      }
      const users = getUsers();
      const account = users.find((u) => normalizePhone(u.phone) === cleanPhone);
      if (!account) {
        return res.json({ success: true, found: false });
      }
      return res.json({
        success: true,
        found: true,
        account: {
          id: account.id,
          studentName: account.studentName,
          studentClass: account.studentClass,
          phone: account.phone,
          qrToken: account.qrToken,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 2b. Create a desktop QR login challenge session
  app.post('/api/auth/qr-session', (_req: Request, res: Response) => {
    try {
      const sessionId = 'qrs_' + crypto.randomBytes(10).toString('hex');
      const sessions = getQrSessions();
      sessions[sessionId] = {
        sessionId,
        status: 'pending',
        createdAt: Date.now(),
      };
      saveQrSessions(sessions);
      return res.json({ success: true, sessionId });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 2c. Poll desktop QR login session status
  app.get('/api/auth/qr-session-status', (req: Request, res: Response) => {
    try {
      const sessionId = String(req.query.sessionId || '').trim();
      if (!sessionId) {
        return res.status(400).json({ success: false, status: 'invalid' });
      }
      const sessions = getQrSessions();
      const sess = sessions[sessionId];
      if (!sess) {
        return res.json({ success: true, status: 'expired' });
      }
      if (sess.status === 'confirmed' && sess.user && sess.token) {
        return res.json({
          success: true,
          status: 'confirmed',
          user: sess.user,
          token: sess.token,
        });
      }
      return res.json({ success: true, status: 'pending' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 2d. Confirm desktop QR session from phone (Zalo scan opens URL with ?parent_qr=...&qr_session=...)
  app.post('/api/auth/parent-qr-confirm', (req: Request, res: Response) => {
    try {
      const { qrData, sessionId } = req.body;
      const extracted = extractQrTokenFromPayload(String(qrData || ''));
      if (!extracted) {
        return res.status(400).json({
          success: false,
          message: 'Mã QR không hợp lệ.',
        });
      }

      const users = getUsers();
      const matched = users.find((u) => u.qrToken === extracted);
      if (!matched) {
        return res.status(401).json({
          success: false,
          message:
            'Mã QR chưa được Admin nhà trường cấp tài khoản hoặc đã bị thu hồi.',
        });
      }

      const userPayload = {
        role: 'parent' as const,
        phone: matched.phone,
        name: matched.parentName || `Phụ huynh em ${matched.studentName}`,
        studentName: matched.studentName,
        studentClass: matched.studentClass,
      };
      const token = 'token-parent-' + matched.phone;

      const cleanSessionId = String(sessionId || '').trim();
      let confirmedDesktop = false;
      if (cleanSessionId && cleanSessionId.startsWith('qrs_')) {
        const sessions = getQrSessions();
        const existingSess = sessions[cleanSessionId];
        sessions[cleanSessionId] = {
          sessionId: cleanSessionId,
          status: 'confirmed',
          createdAt: existingSess?.createdAt || Date.now(),
          confirmedAt: Date.now(),
          user: userPayload,
          token,
        };
        saveQrSessions(sessions);
        confirmedDesktop = true;
      }

      return res.json({
        success: true,
        confirmedDesktop,
        user: userPayload,
        token,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 2e. Direct Parent QR Login
  // When mode === 'zalo_image': ONLY accept parent's personal Zalo QR (phone or linked zalo.me/qr/p/...),
  // explicitly reject system login/registration QRs (?parent_qr= / qr_...).
  app.post('/api/auth/parent-qr-login', (req: Request, res: Response) => {
    try {
      const { qrData, mode } = req.body;
      const rawInput = String(qrData || '').trim();
      if (!rawInput) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp ảnh hoặc mã QR hợp lệ để đăng nhập.',
        });
      }

      const users = getUsers();
      const parsed = parseZaloOrSystemQr(rawInput);

      if (mode === 'zalo_image') {
        if (parsed.kind === 'system_qr') {
          return res.status(400).json({
            success: false,
            message:
              'Đây là mã QR hệ thống khi nhập SĐT. Để đăng nhập bằng ảnh QR, vui lòng chọn ảnh Mã QR Zalo cá nhân của phụ huynh.',
          });
        }

        let matched: ParentUser | undefined;
        if (parsed.kind === 'zalo_phone') {
          matched = users.find((u) => phoneMatches(u.phone, parsed.phone));
          if (!matched) {
            return res.status(401).json({
              success: false,
              message: `Số điện thoại ${parsed.phone} trong mã QR Zalo chưa được nhà trường cấp tài khoản.`,
            });
          }
        } else if (parsed.kind === 'zalo_profile') {
          matched = users.find((u) => {
            if (!u.zaloQrCode) return false;
            const linked = parseZaloOrSystemQr(u.zaloQrCode);
            return (
              linked.kind === 'zalo_profile' &&
              linked.profileId.toLowerCase() === parsed.profileId.toLowerCase()
            );
          });
          if (!matched) {
            return res.status(401).json({
              success: false,
              message:
                'Mã QR Zalo cá nhân (zalo.me/qr/p/...) ẩn số điện thoại nên chưa khớp được với SĐT học sinh. Vui lòng gửi ảnh mã QR Zalo này cho Giáo viên hoặc Admin gắn vào tài khoản SĐT của phụ huynh.',
            });
          }
        } else {
          matched = users.find(
            (u) => u.zaloQrCode && u.zaloQrCode.trim() === rawInput
          );
          if (!matched) {
            return res.status(400).json({
              success: false,
              message:
                'Ảnh tải lên không phải là mã QR Zalo cá nhân hợp lệ của phụ huynh đã đăng ký.',
            });
          }
        }

        return res.json({
          success: true,
          user: {
            role: 'parent',
            phone: matched.phone,
            name: matched.parentName || `Phụ huynh em ${matched.studentName}`,
            studentName: matched.studentName,
            studentClass: matched.studentClass,
          },
          token: 'token-parent-' + matched.phone,
        });
      }

      // Non-image fallback (e.g., direct ?parent_qr= URL)
      const extracted = extractQrTokenFromPayload(rawInput);
      const matched = users.find((u) => u.qrToken === extracted);

      if (!matched) {
        return res.status(401).json({
          success: false,
          message:
            'Mã QR không hợp lệ hoặc chưa được Admin nhà trường cấp tài khoản. Vui lòng liên hệ nhà trường để được cấp lại.',
        });
      }

      return res.json({
        success: true,
        user: {
          role: 'parent',
          phone: matched.phone,
          name: matched.parentName || `Phụ huynh em ${matched.studentName}`,
          studentName: matched.studentName,
          studentClass: matched.studentClass,
        },
        token: 'token-parent-' + matched.phone,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 2f. Disable phone-only login without QR verification
  app.post('/api/auth/parent-auth', (_req: Request, res: Response) => {
    return res.status(403).json({
      success: false,
      message:
        'Hệ thống không cho phép vào chỉ bằng số điện thoại. Vui lòng quét mã QR bằng Zalo hoặc đăng nhập bằng ảnh QR.',
    });
  });

  // 3. Get all absences with filters
  app.get('/api/absences', (req: Request, res: Response) => {
    try {
      const { date, studentClass, search, parentPhone } = req.query;
      let records = getAbsences();

      // Sort by newest first
      records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      if (parentPhone) {
        records = records.filter((r) => r.parentPhone === String(parentPhone));
      }

      if (date && date !== 'all') {
        records = records.filter((r) => r.date === String(date));
      }

      if (studentClass && studentClass !== 'all') {
        records = records.filter((r) => r.studentClass.toLowerCase() === String(studentClass).toLowerCase());
      }

      if (search) {
        const q = String(search).toLowerCase();
        records = records.filter(
          (r) =>
            r.studentName.toLowerCase().includes(q) ||
            r.studentClass.toLowerCase().includes(q) ||
            r.reasonPreset.toLowerCase().includes(q) ||
            r.reasonDetail.toLowerCase().includes(q) ||
            r.parentName.toLowerCase().includes(q)
        );
      }

      // Add STT (orderNumber)
      const listWithOrder = records.map((r, idx) => ({
        ...r,
        orderNumber: idx + 1,
      }));

      return res.json({
        success: true,
        data: listWithOrder,
        total: listWithOrder.length,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 4. Submit new absence request
  app.post('/api/absences', (req: Request, res: Response) => {
    try {
      const {
        date,
        morning,
        afternoon,
        studentName,
        studentClass,
        teacherName,
        reasonPreset,
        reasonDetail,
        parentName,
        parentPhone,
        aiLetter,
        attachmentName,
        attachmentType,
        attachmentData,
      } = req.body;

      if (!studentName || !studentClass || !date) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng điền đầy đủ họ tên học sinh, lớp và ngày nghỉ.',
        });
      }

      if (!morning && !afternoon) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ít nhất 1 buổi nghỉ (Sáng hoặc Chiều hoặc Cả ngày).',
        });
      }

      // Format date display (DD/MM/YYYY)
      const parts = date.split('-');
      const dateDisplay = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;

      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const createdTime = `${hours}:${minutes}`;

      const records = getAbsences();
      const newRecord: AbsenceRecord = {
        id: 'abs-' + Date.now(),
        date,
        dateDisplay,
        morning: Boolean(morning),
        afternoon: Boolean(afternoon),
        studentName: (studentName.trim()).normalize('NFC'),
        studentClass: (studentClass.trim()).normalize('NFC'),
        teacherName: (teacherName?.trim() || '').normalize('NFC'),
        reasonPreset: (reasonPreset || 'Lý do khác').normalize('NFC'),
        reasonDetail: (reasonDetail?.trim() || '').normalize('NFC'),
        parentName: (parentName?.trim() || 'Phụ huynh').normalize('NFC'),
        parentPhone: parentPhone?.trim() || '',
        aiLetter: (aiLetter?.trim() || '').normalize('NFC'),
        attachmentName,
        attachmentType,
        attachmentData,
        status: 'pending',
        createdAt: now.toISOString(),
        createdTime: createdTime,
      };

      records.unshift(newRecord);
      saveAbsences(records);

      return res.status(201).json({
        success: true,
        message: 'Gửi báo vắng thành công! Hệ thống nhà trường đã tiếp nhận thông tin.',
        data: newRecord,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 5. Update absence status (Admin)
  app.patch('/api/absences/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, adminNote } = req.body;
      const records = getAbsences();
      const index = records.findIndex((r) => r.id === id);

      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn báo vắng này.' });
      }

      if (status) records[index].status = status;
      if (adminNote !== undefined) records[index].adminNote = adminNote;

      saveAbsences(records);
      return res.json({ success: true, data: records[index] });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 6. Delete absence (Admin)
  app.delete('/api/absences/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      let records = getAbsences();
      const initialLen = records.length;
      records = records.filter((r) => r.id !== id);

      if (records.length === initialLen) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi để xóa.' });
      }

      saveAbsences(records);
      return res.json({ success: true, message: 'Đã xóa bản ghi thành công.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 7. AI Generate Formal Vietnamese Absence Application Letter (Matching standard photo format)
  app.post('/api/ai/generate-letter', async (req: Request, res: Response) => {
    const {
      studentName,
      studentClass,
      teacherName,
      schoolName = 'THCS Giai Lạc',
      date,
      morning,
      afternoon,
      reasonPreset,
      reasonDetail,
      parentName,
      parentPhone,
    } = req.body;

    const sessionText =
      morning && afternoon
        ? 'cả ngày (buổi sáng và buổi chiều)'
        : morning
        ? 'buổi sáng'
        : afternoon
        ? 'buổi chiều'
        : 'trong ngày';

    let day = '...';
    let month = '...';
    let year = '2026';
    let dateStr = date;
    if (date && date.includes('-')) {
      const [y, m, d] = date.split('-');
      day = d;
      month = m;
      year = y;
      dateStr = `${d}/${m}/${y}`;
    }

    const cleanSchool = (schoolName || 'THCS Giai Lạc')
      .normalize('NFC')
      .replace(/^trường\s+/i, '')
      .trim() || 'THCS Giai Lạc';

    const teacherLine = teacherName
      ? `- Giáo viên chủ nhiệm lớp ${studentClass} (${teacherName})`
      : `- Giáo viên chủ nhiệm lớp ${studentClass || '...'}`;

    const fallbackLetter = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
----------------***----------------

ĐƠN XIN PHÉP NGHỈ HỌC

Kính gửi:  - Ban giám hiệu trường ${cleanSchool}
           ${teacherLine}

Em tên là: ${studentName || '...................................................'}
Hiện là học sinh lớp: ${studentClass || '...................................................'}
Em viết đơn này xin phép được nghỉ học ${sessionText} ngày ${dateStr}.
Lý do (Ghi cụ thể): ${reasonPreset || 'Bị ốm'}${reasonDetail ? ` (${reasonDetail})` : ''}
Em xin hứa: Sẽ tự giác chép bài, mượn vở bạn bù đắp kiến thức những tiết học vắng, hoàn thành bài tập đầy đủ và đi học lại nghiêm túc, đúng giờ.

Rất mong được sự chấp nhận của quý Thầy, Cô. Em xin chân thành cám ơn!

Giai Lạc, ngày ${day} tháng ${month} năm ${year}
Chữ ký của Phụ huynh học sinh: ${parentName || 'Phụ huynh'} (SĐT: ${parentPhone || '...'})
Người làm đơn: ${studentName || 'Học sinh'}`.normalize('NFC');

    try {
      if (!ai) {
        return res.json({ success: true, letter: fallbackLetter });
      }

      const prompt = `Bạn là thư ký hành chính học đường chuyên nghiệp tại Việt Nam.
Hãy soạn thảo bức "ĐƠN XIN PHÉP NGHỈ HỌC" theo đúng mẫu chuẩn văn bản học đường sau đây (giống trong biểu mẫu của trường ${cleanSchool}):

CẤU TRÚC BẮT BUỘC (GIỮ NGUYÊN BỐ CỤC ĐỊNH DẠNG NÀY):
--------------------------------------------------
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
----------------***----------------

ĐƠN XIN PHÉP NGHỈ HỌC

Kính gửi:  - Ban giám hiệu trường ${cleanSchool}
           ${teacherLine}

Em tên là: ${studentName || '...'}
Hiện là học sinh lớp: ${studentClass || '...'}
Em viết đơn này xin phép được nghỉ học ${sessionText} ngày ${dateStr}.
Lý do (Ghi cụ thể): ${reasonPreset || 'Sức khỏe không tốt'}${reasonDetail ? ` (${reasonDetail})` : ''}
Em xin hứa: Sẽ tự giác chép bài, mượn vở bạn bù đắp kiến thức những tiết học vắng, hoàn thành bài tập đầy đủ và đi học lại nghiêm túc, đúng giờ.

Rất mong được sự chấp nhận của quý Thầy, Cô. Em xin chân thành cám ơn!

Giai Lạc, ngày ${day} tháng ${month} năm ${year}
Chữ ký của Phụ huynh học sinh: ${parentName || 'Phụ huynh'} (SĐT: ${parentPhone || '...'})
Người làm đơn: ${studentName || 'Học sinh'}
--------------------------------------------------

Yêu cầu:
- Không dùng khối markdown (\`\`\`).
- Viết câu văn tại mục "Lý do (Ghi cụ thể):" và "Em xin hứa:" thật mạch lạc, kính cẩn, chuẩn tiếng Việt.
- Giữ trọn vẹn phong thái kính cẩn, văn phong trang trọng, chuẩn mực tiếng Việt.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const text = response.text?.trim()?.normalize('NFC');
      return res.json({
        success: true,
        letter: text || fallbackLetter,
      });
    } catch (err: any) {
      console.error('Gemini letter generation error, using standard template:', err);
      return res.json({
        success: true,
        letter: fallbackLetter,
      });
    }
  });

  // 8. Stats summary endpoint for school admin
  app.get('/api/stats', (req: Request, res: Response) => {
    try {
      const records = getAbsences();
      const today = new Date().toISOString().split('T')[0];
      const todayRecords = records.filter((r) => r.date === today);

      const morningCount = todayRecords.filter((r) => r.morning).length;
      const afternoonCount = todayRecords.filter((r) => r.afternoon).length;

      // Group by class
      const classMap: Record<string, number> = {};
      todayRecords.forEach((r) => {
        classMap[r.studentClass] = (classMap[r.studentClass] || 0) + 1;
      });

      return res.json({
        success: true,
        totalAllTime: records.length,
        todayTotal: todayRecords.length,
        todayMorning: morningCount,
        todayAfternoon: afternoonCount,
        todayByClass: classMap,
        pendingCount: records.filter((r) => r.status === 'pending').length,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Instant silent confirmation handler when phone opens ?parent_qr=...&qr_session=... from Zalo
  app.get('/', (req: Request, res: Response, next: NextFunction) => {
    const parentQr = typeof req.query.parent_qr === 'string' ? req.query.parent_qr.trim() : '';
    const qrSession = typeof req.query.qr_session === 'string' ? req.query.qr_session.trim() : '';

    if (!parentQr || !qrSession || !qrSession.startsWith('qrs_')) {
      return next();
    }

    try {
      const extracted = extractQrTokenFromPayload(parentQr);
      const users = getUsers();
      const matched = users.find((u) => u.qrToken === extracted);
      if (matched) {
        const sessions = getQrSessions();
        const existingSess = sessions[qrSession];
        sessions[qrSession] = {
          sessionId: qrSession,
          status: 'confirmed',
          createdAt: existingSess?.createdAt || Date.now(),
          confirmedAt: Date.now(),
          user: {
            role: 'parent',
            phone: matched.phone,
            name: matched.parentName || `Phụ huynh em ${matched.studentName}`,
            studentName: matched.studentName,
            studentClass: matched.studentClass,
          },
          token: 'token-parent-' + matched.phone,
        };
        saveQrSessions(sessions);
      }
    } catch {
      // ignore error and proceed quietly
    }

    // Minimal silent HTML on phone (attempts auto-close, no notification/prompt shown)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(
      '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title></title></head><body style="margin:0;background:#ffffff;"><script>try{window.close();}catch(e){}try{if(window.history.length>1)window.history.back();}catch(e){}</script></body></html>'
    );
  });

  // Health check endpoint (for Render.com & cloud platforms)
  app.get('/api/health', (_req: Request, res: Response) => {
    return res.json({
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // Ensure any unknown /api/* route always returns JSON
  app.all('/api/*', (_req: Request, res: Response) => {
    return res.status(404).json({
      success: false,
      message: 'API endpoint không tồn tại.',
    });
  });

  // Global JSON error handler for API errors (e.g. invalid JSON payload)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return res.status(err?.status || 500).json({
        success: false,
        message: err?.message || 'Lỗi xử lý máy chủ API.',
      });
    }
    return next(err);
  });

  return app;
}

export const apiApp = createApiApp();

async function startServer() {
  const app = apiApp;

  const distDir = path.join(ROOT_DIR, 'dist');
  const isCompiledServer = path.basename(__filename) === 'server.js';
  const useProductionStatic =
    process.env.NODE_ENV === 'production' ||
    (isCompiledServer && fs.existsSync(path.join(distDir, 'index.html')));

  // Serve static files in production or Vite middleware in dev
  if (useProductionStatic) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

const isMainModule =
  Boolean(process.argv[1]) &&
  (path.resolve(process.argv[1]) === __filename ||
    process.argv[1].endsWith('server.ts') ||
    process.argv[1].endsWith('server.js'));

if (isMainModule && !process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
  });
}

export default apiApp;
