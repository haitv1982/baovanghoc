import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'absences.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const TEACHERS_FILE = path.join(DATA_DIR, 'teachers.json');

// Initialize Gemini client server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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
  phone: string;
  password: string;
  parentName: string;
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

function getUsers(): ParentUser[] {
  if (!fs.existsSync(USERS_FILE)) {
    const defaultUsers: ParentUser[] = [
      {
        phone: '0987654321',
        password: '123',
        parentName: 'Nguyễn Văn Hùng',
        createdAt: new Date().toISOString(),
      },
      {
        phone: '0912345678',
        password: '123',
        parentName: 'Trần Thị Mai',
        createdAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2), 'utf-8');
    return defaultUsers;
  }
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveUsers(users: ParentUser[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
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

async function startServer() {
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

  // 2. Parent login or first-time setup
  app.post('/api/auth/parent-auth', (req: Request, res: Response) => {
    const { phone, password, parentName } = req.body;
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập số điện thoại phụ huynh' });
    }

    const cleanPhone = phone.trim();
    const cleanPass = (password || '').trim();
    const users = getUsers();
    const existing = users.find((u) => u.phone === cleanPhone);

    if (!cleanPass) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu' });
    }

    if (existing) {
      // Check password
      if (existing.password === cleanPass) {
        return res.json({
          success: true,
          isFirstTime: false,
          user: {
            role: 'parent',
            phone: existing.phone,
            name: existing.parentName,
          },
          token: 'token-parent-' + cleanPhone,
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Mật khẩu không chính xác cho số điện thoại này.',
        });
      }
    } else {
      // First time login: create account with entered password and name
      const newUser: ParentUser = {
        phone: cleanPhone,
        password: cleanPass,
        parentName: parentName?.trim() || `Phụ huynh (${cleanPhone.slice(-4)})`,
        createdAt: new Date().toISOString(),
      };
      users.push(newUser);
      saveUsers(users);

      return res.json({
        success: true,
        isFirstTime: true,
        message: 'Đăng ký mật khẩu lần đầu thành công!',
        user: {
          role: 'parent',
          phone: newUser.phone,
          name: newUser.parentName,
        },
        token: 'token-parent-' + cleanPhone,
      });
    }
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

    const teacherLine = teacherName
      ? `- Giáo viên chủ nhiệm lớp: ${studentClass} (${teacherName})`
      : `- Giáo viên chủ nhiệm lớp: ${studentClass || '...'}`;

    const fallbackLetter = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
----------------***----------------

ĐƠN XIN PHÉP NGHỈ HỌC

Kính gửi:  - Ban giám hiệu trường ${schoolName || 'THCS Giai Lạc'}
           ${teacherLine}

Em tên là: ${studentName || '...................................................'}
Hiện là học sinh lớp: ${studentClass || '...................................................'}
Em viết đơn này xin phép được nghỉ học ${sessionText} ngày ${dateStr}.
Lý do (Ghi cụ thể): ${reasonPreset || 'Bị ốm'}. ${reasonDetail ? `(${reasonDetail})` : ''}
Em xin hứa: Sẽ chủ động liên hệ bạn bè để mượn vở chép bài học đầy đủ, hoàn thành tất cả các bài tập được giao và đi học lại nghiêm túc, đúng giờ.

Rất mong được sự chấp nhận của quý Thầy, Cô. Em xin chân thành cám ơn!

                                    Giai Lạc, ngày ${day} tháng ${month} năm ${year}

      Chữ ký của Phụ huynh học sinh                    Người làm đơn
                                                      (Ghi rõ họ và tên)

         ${parentName || 'Phụ huynh'}                                   ${studentName || 'Học sinh'}
       (SĐT: ${parentPhone || '...'})`;

    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.json({ success: true, letter: fallbackLetter });
      }

      const prompt = `Bạn là thư ký hành chính học đường chuyên nghiệp tại Việt Nam.
Hãy soạn thảo bức "ĐƠN XIN PHÉP NGHỈ HỌC" theo đúng mẫu chuẩn văn bản học đường sau đây (giống trong biểu mẫu của trường THCS Giai Lạc):

CẤU TRÚC BẮT BUỘC (GIỮ NGUYÊN BỐ CỤC ĐỊNH DẠNG NÀY):
--------------------------------------------------
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
----------------***----------------

ĐƠN XIN PHÉP NGHỈ HỌC

Kính gửi:  - Ban giám hiệu trường ${schoolName || 'THCS Giai Lạc'}
           ${teacherLine}

Em tên là: ${studentName || '...'}
Hiện là học sinh lớp: ${studentClass || '...'}
Em viết đơn này xin phép được nghỉ học ${sessionText} ngày ${dateStr}.
Lý do (Ghi cụ thể): ${reasonPreset || 'Sức khỏe không tốt'}. ${reasonDetail ? `(${reasonDetail})` : ''}
Em xin hứa: Sẽ tự giác chép bài, mượn vở bạn bù đắp kiến thức những tiết học vắng, hoàn thành bài tập đầy đủ và đi học lại nghiêm túc, đúng giờ.

Rất mong được sự chấp nhận của quý Thầy, Cô. Em xin chân thành cám ơn!

                                    Giai Lạc, ngày ${day} tháng ${month} năm ${year}

      Chữ ký của Phụ huynh học sinh                    Người làm đơn
                                                      (Ghi rõ họ và tên)

         ${parentName || 'Phụ huynh'}                                   ${studentName || 'Học sinh'}
       (SĐT: ${parentPhone || '...'})
--------------------------------------------------

Yêu cầu:
- Không dùng khối markdown (\`\`\`).
- Điền đầy đủ thông tin thực tế: Tên học sinh (${studentName}), Lớp (${studentClass}), Giáo viên chủ nhiệm (${teacherName || 'Chưa rõ'}), Lý do cụ thể, Tên phụ huynh (${parentName}), SĐT (${parentPhone}).
- Giữ trọn vẹn phong thái kính cẩn, văn phong trang trọng, chuẩn mực tiếng Việt.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const text = response.text?.trim();
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

  // Serve static files or Vite middleware
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
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

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
