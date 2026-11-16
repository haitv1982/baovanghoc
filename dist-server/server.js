// server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var ROOT_DIR = fs.existsSync(path.join(__dirname, "package.json")) ? __dirname : path.resolve(__dirname, "..");
var PORT = Number(process.env.PORT) || 3e3;
var BUNDLED_DATA_DIR = path.join(ROOT_DIR, "data");
function resolveWritableDataDir() {
  try {
    if (!fs.existsSync(BUNDLED_DATA_DIR)) {
      fs.mkdirSync(BUNDLED_DATA_DIR, { recursive: true });
    }
    const probeFile = path.join(BUNDLED_DATA_DIR, ".write-probe");
    fs.writeFileSync(probeFile, "ok");
    fs.unlinkSync(probeFile);
    return BUNDLED_DATA_DIR;
  } catch {
    const tmpDir = "/tmp/baovanghoc-data";
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
var DATA_DIR = resolveWritableDataDir();
var DATA_FILE = path.join(DATA_DIR, "absences.json");
var USERS_FILE = path.join(DATA_DIR, "users.json");
var ADMIN_FILE = path.join(DATA_DIR, "admin.json");
var TEACHERS_FILE = path.join(DATA_DIR, "teachers.json");
var ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
}) : null;
var initialRecords = [
  {
    id: "abs-1",
    date: "2026-11-09",
    dateDisplay: "09/11/2026",
    morning: true,
    afternoon: false,
    studentName: "Nguy\u1EC5n V\u0103n Minh Khang",
    studentClass: "6A1",
    teacherName: "C\xF4 Nguy\u1EC5n Th\u1ECB Hoa",
    reasonPreset: "B\u1ECB \u1ED1m / S\u1ED1t cao",
    reasonDetail: "Ch\xE1u b\u1ECB s\u1ED1t si\xEAu vi t\u1EEB t\u1ED1i qua, nhi\u1EC7t \u0111\u1ED9 38.5 \u0111\u1ED9 C, gia \u0111\xECnh xin ngh\u1EC9 bu\u1ED5i s\xE1ng \u0111\u1EC3 theo d\xF5i v\xE0 \u0111i kh\xE1m.",
    parentName: "Nguy\u1EC5n V\u0103n H\xF9ng",
    parentPhone: "0987654321",
    aiLetter: `C\u1ED8NG H\xD2A X\xC3 H\u1ED8I CH\u1EE6 NGH\u0128A VI\u1EC6T NAM
\u0110\u1ED9c l\u1EADp - T\u1EF1 do - H\u1EA1nh ph\xFAc
-------------------

\u0110\u01A0N XIN PH\xC9P NGH\u1EC8 H\u1ECCC

K\xEDnh g\u1EEDi:
- Ban Gi\xE1m hi\u1EC7u Tr\u01B0\u1EDDng THCS & THPT Tri Th\u1EE9c
- Gi\xE1o vi\xEAn ch\u1EE7 nhi\u1EC7m L\u1EDBp 6A1

T\xF4i t\xEAn l\xE0: Nguy\u1EC5n V\u0103n H\xF9ng
L\xE0 ph\u1EE5 huynh c\u1EE7a h\u1ECDc sinh: Nguy\u1EC5n V\u0103n Minh Khang
H\u1ECDc sinh l\u1EDBp: 6A1

T\xF4i l\xE0m \u0111\u01A1n n\xE0y xin ph\xE9p cho con \u0111\u01B0\u1EE3c ngh\u1EC9 h\u1ECDc:
- Th\u1EDDi gian: Bu\u1ED5i s\xE1ng ng\xE0y 09/11/2026
- L\xFD do: Ch\xE1u b\u1ECB s\u1ED1t si\xEAu vi t\u1EEB \u0111\xEAm qua, gia \u0111\xECnh \u0111\u01B0a ch\xE1u \u0111i kh\xE1m t\u1EA1i c\u01A1 s\u1EDF y t\u1EBF v\xE0 ngh\u1EC9 ng\u01A1i theo ch\u1EC9 \u0111\u1ECBnh.

Gia \u0111\xECnh xin cam k\u1EBFt nh\u1EAFc nh\u1EDF ch\xE1u t\u1EF1 h\u1ECDc, ch\xE9p b\xE0i v\xE0 ho\xE0n th\xE0nh \u0111\u1EA7y \u0111\u1EE7 b\xE0i t\u1EADp sau khi tr\u1EDF l\u1EA1i l\u1EDBp.

R\u1EA5t mong Ban Gi\xE1m hi\u1EC7u v\xE0 Th\u1EA7y/C\xF4 ch\u1EE7 nhi\u1EC7m xem x\xE9t, ch\u1EA5p thu\u1EADn.

Xin ch\xE2n th\xE0nh c\u1EA3m \u01A1n!

Ng\u01B0\u1EDDi l\xE0m \u0111\u01A1n (K\xFD v\xE0 ghi r\xF5 h\u1ECD t\xEAn)
Nguy\u1EC5n V\u0103n H\xF9ng`,
    attachmentName: "toathuoc_kham_benh.jpg",
    attachmentType: "image/jpeg",
    status: "approved",
    adminNote: "\u0110\xE3 x\xE1c nh\u1EADn v\u1EDBi ph\u1EE5 huynh qua \u0111i\u1EC7n tho\u1EA1i, ch\xFAc em mau kh\u1ECFe.",
    createdAt: "2026-11-09T06:30:00Z"
  },
  {
    id: "abs-2",
    date: "2026-11-09",
    dateDisplay: "09/11/2026",
    morning: true,
    afternoon: true,
    studentName: "Tr\u1EA7n B\u1EA3o Ng\u1ECDc",
    studentClass: "7B3",
    teacherName: "Th\u1EA7y Tr\u1EA7n \u0110\xECnh Tr\u1ECDng",
    reasonPreset: "\u0110i kh\xE1m b\u1EC7nh t\u1EA1i b\u1EC7nh vi\u1EC7n",
    reasonDetail: "Gia \u0111\xECnh c\xF3 l\u1ECBch h\u1EB9n t\xE1i kh\xE1m m\u1EAFt chuy\xEAn khoa t\u1EA1i B\u1EC7nh vi\u1EC7n M\u1EAFt v\xE0o c\u1EA3 ng\xE0y h\xF4m nay.",
    parentName: "Tr\u1EA7n Th\u1ECB Mai",
    parentPhone: "0912345678",
    aiLetter: `C\u1ED8NG H\xD2A X\xC3 H\u1ED8I CH\u1EE6 NGH\u0128A VI\u1EC6T NAM
\u0110\u1ED9c l\u1EADp - T\u1EF1 do - H\u1EA1nh ph\xFAc
----------------***----------------

\u0110\u01A0N XIN PH\xC9P NGH\u1EC8 H\u1ECCC

K\xEDnh g\u1EEDi:  - Ban gi\xE1m hi\u1EC7u tr\u01B0\u1EDDng THCS Giai L\u1EA1c
           - Gi\xE1o vi\xEAn ch\u1EE7 nhi\u1EC7m l\u1EDBp 7B3 (Th\u1EA7y Tr\u1EA7n \u0110\xECnh Tr\u1ECDng)

Em t\xEAn l\xE0: Tr\u1EA7n B\u1EA3o Ng\u1ECDc
Hi\u1EC7n l\xE0 h\u1ECDc sinh l\u1EDBp: 7B3
Em vi\u1EBFt \u0111\u01A1n n\xE0y xin ph\xE9p \u0111\u01B0\u1EE3c ngh\u1EC9 h\u1ECDc c\u1EA3 ng\xE0y (bu\u1ED5i s\xE1ng v\xE0 bu\u1ED5i chi\u1EC1u) ng\xE0y 09/11/2026.
L\xFD do (Ghi c\u1EE5 th\u1EC3): \u0110i kh\xE1m b\u1EC7nh t\u1EA1i b\u1EC7nh vi\u1EC7n. Gia \u0111\xECnh c\xF3 l\u1ECBch h\u1EB9n t\xE1i kh\xE1m m\u1EAFt chuy\xEAn khoa t\u1EA1i B\u1EC7nh vi\u1EC7n M\u1EAFt.
Em xin h\u1EE9a: S\u1EBD t\u1EF1 gi\xE1c ch\xE9p b\xE0i, m\u01B0\u1EE3n v\u1EDF b\u1EA1n b\xF9 \u0111\u1EAFp ki\u1EBFn th\u1EE9c nh\u1EEFng ti\u1EBFt h\u1ECDc v\u1EAFng, ho\xE0n th\xE0nh b\xE0i t\u1EADp \u0111\u1EA7y \u0111\u1EE7 v\xE0 \u0111i h\u1ECDc l\u1EA1i nghi\xEAm t\xFAc, \u0111\xFAng gi\u1EDD.

R\u1EA5t mong \u0111\u01B0\u1EE3c s\u1EF1 ch\u1EA5p nh\u1EADn c\u1EE7a qu\xFD Th\u1EA7y, C\xF4. Em xin ch\xE2n th\xE0nh c\xE1m \u01A1n!

                                    Giai L\u1EA1c, ng\xE0y 09 th\xE1ng 11 n\u0103m 2026

      Ch\u1EEF k\xFD c\u1EE7a Ph\u1EE5 huynh h\u1ECDc sinh                    Ng\u01B0\u1EDDi l\xE0m \u0111\u01A1n
                                                      (Ghi r\xF5 h\u1ECD v\xE0 t\xEAn)

         Tr\u1EA7n Th\u1ECB Mai                                   Tr\u1EA7n B\u1EA3o Ng\u1ECDc
      (S\u0110T: 0912345678)`,
    attachmentName: "giay_hen_kham.docx",
    attachmentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    status: "approved",
    adminNote: "\u0110\xE3 duy\u1EC7t ngh\u1EC9 c\u1EA3 ng\xE0y.",
    createdAt: "2026-11-09T06:45:00Z"
  },
  {
    id: "abs-3",
    date: "2026-11-09",
    dateDisplay: "09/11/2026",
    morning: false,
    afternoon: true,
    studentName: "L\xEA Ho\xE0ng Long",
    studentClass: "9A2",
    teacherName: "C\xF4 L\xEA Ho\xE0ng Mai",
    reasonPreset: "Vi\u1EC7c gia \u0111\xECnh \u0111\u1ED9t xu\u1EA5t",
    reasonDetail: "Gia \u0111\xECnh c\xF3 vi\u1EC7c hi\u1EBFu \u1EDF qu\xEA c\u1EA7n ch\xE1u v\u1EC1 ph\u1EE5 gi\xFAp c\xF9ng cha m\u1EB9 trong bu\u1ED5i chi\u1EC1u.",
    parentName: "L\xEA Thanh B\xECnh",
    parentPhone: "0978112233",
    aiLetter: `C\u1ED8NG H\xD2A X\xC3 H\u1ED8I CH\u1EE6 NGH\u0128A VI\u1EC6T NAM
\u0110\u1ED9c l\u1EADp - T\u1EF1 do - H\u1EA1nh ph\xFAc
----------------***----------------

\u0110\u01A0N XIN PH\xC9P NGH\u1EC8 H\u1ECCC

K\xEDnh g\u1EEDi:  - Ban gi\xE1m hi\u1EC7u tr\u01B0\u1EDDng THCS Giai L\u1EA1c
           - Gi\xE1o vi\xEAn ch\u1EE7 nhi\u1EC7m l\u1EDBp 9A2 (C\xF4 L\xEA Ho\xE0ng Mai)

Em t\xEAn l\xE0: L\xEA Ho\xE0ng Long
Hi\u1EC7n l\xE0 h\u1ECDc sinh l\u1EDBp: 9A2
Em vi\u1EBFt \u0111\u01A1n n\xE0y xin ph\xE9p \u0111\u01B0\u1EE3c ngh\u1EC9 h\u1ECDc bu\u1ED5i chi\u1EC1u ng\xE0y 09/11/2026.
L\xFD do (Ghi c\u1EE5 th\u1EC3): Vi\u1EC7c gia \u0111\xECnh \u0111\u1ED9t xu\u1EA5t. Gia \u0111\xECnh c\xF3 vi\u1EC7c hi\u1EBFu \u1EDF qu\xEA c\u1EA7n v\u1EC1 ph\u1EE5 gi\xFAp trong bu\u1ED5i chi\u1EC1u.
Em xin h\u1EE9a: S\u1EBD ch\u1EE7 \u0111\u1ED9ng li\xEAn h\u1EC7 b\u1EA1n c\xF9ng l\u1EDBp \u0111\u1EC3 m\u01B0\u1EE3n v\u1EDF ch\xE9p b\xE0i \u0111\u1EA7y \u0111\u1EE7 v\xE0 l\xE0m h\u1EBFt b\xE0i t\u1EADp v\u1EC1 nh\xE0.

R\u1EA5t mong \u0111\u01B0\u1EE3c s\u1EF1 ch\u1EA5p nh\u1EADn c\u1EE7a qu\xFD Th\u1EA7y, C\xF4. Em xin ch\xE2n th\xE0nh c\xE1m \u01A1n!

                                    Giai L\u1EA1c, ng\xE0y 09 th\xE1ng 11 n\u0103m 2026

      Ch\u1EEF k\xFD c\u1EE7a Ph\u1EE5 huynh h\u1ECDc sinh                    Ng\u01B0\u1EDDi l\xE0m \u0111\u01A1n
                                                      (Ghi r\xF5 h\u1ECD v\xE0 t\xEAn)

         L\xEA Thanh B\xECnh                                   L\xEA Ho\xE0ng Long
      (S\u0110T: 0978112233)`,
    status: "pending",
    createdAt: "2026-11-09T07:10:00Z"
  },
  {
    id: "abs-4",
    date: "2026-11-09",
    dateDisplay: "09/11/2026",
    morning: true,
    afternoon: false,
    studentName: "Ph\u1EA1m Qu\u1EF3nh Anh",
    studentClass: "10C1",
    teacherName: "Th\u1EA7y Ph\u1EA1m Qu\u1ED1c H\u01B0ng",
    reasonPreset: "B\u1ECB \u1ED1m / C\u1EA3m s\u1ED1t",
    reasonDetail: "Em Qu\u1EF3nh Anh b\u1ECB vi\xEAm h\u1ECDng c\u1EA5p, khan ti\u1EBFng v\xE0 m\u1EC7t m\u1ECFi.",
    parentName: "Ph\u1EA1m Thu H\u01B0\u01A1ng",
    parentPhone: "0903998877",
    aiLetter: `C\u1ED8NG H\xD2A X\xC3 H\u1ED8I CH\u1EE6 NGH\u0128A VI\u1EC6T NAM
\u0110\u1ED9c l\u1EADp - T\u1EF1 do - H\u1EA1nh ph\xFAc
----------------***----------------

\u0110\u01A0N XIN PH\xC9P NGH\u1EC8 H\u1ECCC

K\xEDnh g\u1EEDi:  - Ban gi\xE1m hi\u1EC7u tr\u01B0\u1EDDng THCS Giai L\u1EA1c
           - Gi\xE1o vi\xEAn ch\u1EE7 nhi\u1EC7m l\u1EDBp 10C1 (Th\u1EA7y Ph\u1EA1m Qu\u1ED1c H\u01B0ng)

Em t\xEAn l\xE0: Ph\u1EA1m Qu\u1EF3nh Anh
Hi\u1EC7n l\xE0 h\u1ECDc sinh l\u1EDBp: 10C1
Em vi\u1EBFt \u0111\u01A1n n\xE0y xin ph\xE9p \u0111\u01B0\u1EE3c ngh\u1EC9 h\u1ECDc bu\u1ED5i s\xE1ng ng\xE0y 09/11/2026.
L\xFD do (Ghi c\u1EE5 th\u1EC3): B\u1ECB \u1ED1m / C\u1EA3m s\u1ED1t. Em b\u1ECB vi\xEAm h\u1ECDng c\u1EA5p m\u1EC7t m\u1ECFi, c\u1EA7n ngh\u1EC9 ng\u01A1i v\xE0 u\u1ED1ng thu\u1ED1c theo toa.
Em xin h\u1EE9a: Sau khi kh\u1ECFe l\u1EA1i em s\u1EBD \u0111i h\u1ECDc \u0111\xFAng gi\u1EDD, ch\xE9p b\xE0i v\xE0 ho\xE0n th\xE0nh \u0111\u1EA7y \u0111\u1EE7 b\xE0i t\u1EADp \u0111\u01B0\u1EE3c giao.

R\u1EA5t mong \u0111\u01B0\u1EE3c s\u1EF1 ch\u1EA5p nh\u1EADn c\u1EE7a qu\xFD Th\u1EA7y, C\xF4. Em xin ch\xE2n th\xE0nh c\xE1m \u01A1n!

                                    Giai L\u1EA1c, ng\xE0y 09 th\xE1ng 11 n\u0103m 2026

      Ch\u1EEF k\xFD c\u1EE7a Ph\u1EE5 huynh h\u1ECDc sinh                    Ng\u01B0\u1EDDi l\xE0m \u0111\u01A1n
                                                      (Ghi r\xF5 h\u1ECD v\xE0 t\xEAn)

         Ph\u1EA1m Thu H\u01B0\u01A1ng                                  Ph\u1EA1m Qu\u1EF3nh Anh
      (S\u0110T: 0903998877)`,
    attachmentName: "don_xin_phep_viet_tay.jpg",
    attachmentType: "image/jpeg",
    status: "pending",
    createdAt: "2026-11-09T07:25:00Z"
  },
  {
    id: "abs-5",
    date: "2026-11-08",
    dateDisplay: "08/11/2026",
    morning: true,
    afternoon: true,
    studentName: "V\u0169 \u0110\u1EE9c Anh",
    studentClass: "8A4",
    teacherName: "C\xF4 V\u0169 Minh H\u1EB1ng",
    reasonPreset: "Tham gia thi \u0111\u1EA5u n\u0103ng khi\u1EBFu",
    reasonDetail: "\u0110\u1EA1i di\u1EC7n c\xE2u l\u1EA1c b\u1ED9 thi \u0111\u1EA5u gi\u1EA3i b\u01A1i l\u1ED9i thanh thi\u1EBFu ni\xEAn c\u1EA5p qu\u1EADn.",
    parentName: "V\u0169 M\u1EA1nh C\u01B0\u1EDDng",
    parentPhone: "0934567890",
    aiLetter: `\u0110\u01A0N XIN PH\xC9P NGH\u1EC8 H\u1ECCC
K\xEDnh g\u1EEDi Ban Gi\xE1m hi\u1EC7u nh\xE0 tr\u01B0\u1EDDng v\xE0 GVCN 8A4.
Xin ph\xE9p cho em V\u0169 \u0110\u1EE9c Anh ngh\u1EC9 ng\xE0y 08/11/2026 do tham d\u1EF1 gi\u1EA3i b\u01A1i c\u1EA5p qu\u1EADn theo quy\u1EBFt \u0111\u1ECBnh c\u1EED thi \u0111\u1EA5u.
Ph\u1EE5 huynh: V\u0169 M\u1EA1nh C\u01B0\u1EDDng`,
    status: "noted",
    createdAt: "2026-11-08T06:00:00Z"
  }
];
function getAbsences() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialRecords, null, 2), "utf-8");
    return initialRecords;
  }
  try {
    const content = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    return initialRecords;
  }
}
function saveAbsences(records) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), "utf-8");
}
function getUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    const defaultUsers = [
      {
        phone: "0987654321",
        password: "123",
        parentName: "Nguy\u1EC5n V\u0103n H\xF9ng",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        phone: "0912345678",
        password: "123",
        parentName: "Tr\u1EA7n Th\u1ECB Mai",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2), "utf-8");
    return defaultUsers;
  }
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch {
    return [];
  }
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}
function getAdmin() {
  if (!fs.existsSync(ADMIN_FILE)) {
    const defaultAdmin = {
      username: "admin",
      password: "admin123",
      name: "Ban Gi\xE1m Hi\u1EC7u / Qu\u1EA3n Tr\u1ECB Nh\xE0 Tr\u01B0\u1EDDng",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(defaultAdmin, null, 2), "utf-8");
    return defaultAdmin;
  }
  try {
    return JSON.parse(fs.readFileSync(ADMIN_FILE, "utf-8"));
  } catch {
    return {
      username: "admin",
      password: "admin123",
      name: "Ban Gi\xE1m Hi\u1EC7u / Qu\u1EA3n Tr\u1ECB Nh\xE0 Tr\u01B0\u1EDDng"
    };
  }
}
function saveAdmin(admin) {
  admin.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2), "utf-8");
}
var defaultTeachers = [
  {
    id: "tch-1",
    orderNumber: 1,
    name: "Nguy\u1EC5n Th\u1ECB Hoa",
    assignedClass: "6A1",
    isHomeroom: true,
    username: "gv_hoant",
    password: "123",
    createdAt: "2026-11-09T06:00:00Z"
  },
  {
    id: "tch-2",
    orderNumber: 2,
    name: "Tr\u1EA7n \u0110\xECnh Tr\u1ECDng",
    assignedClass: "7B3",
    isHomeroom: true,
    username: "gv_trongtd",
    password: "123",
    createdAt: "2026-11-09T06:00:00Z"
  },
  {
    id: "tch-3",
    orderNumber: 3,
    name: "L\xEA Ho\xE0ng Mai",
    assignedClass: "9A2",
    isHomeroom: true,
    username: "gv_mailh",
    password: "123",
    createdAt: "2026-11-09T06:00:00Z"
  },
  {
    id: "tch-4",
    orderNumber: 4,
    name: "Ph\u1EA1m Qu\u1ED1c H\u01B0ng",
    assignedClass: "10C1",
    isHomeroom: true,
    username: "gv_hungpq",
    password: "123",
    createdAt: "2026-11-09T06:00:00Z"
  },
  {
    id: "tch-5",
    orderNumber: 5,
    name: "V\u0169 Minh H\u1EB1ng",
    assignedClass: "8A4",
    isHomeroom: true,
    username: "gv_hangvm",
    password: "123",
    createdAt: "2026-11-09T06:00:00Z"
  },
  {
    id: "tch-6",
    orderNumber: 6,
    name: "Nguy\u1EC5n V\u0103n Tu\u1EA5n",
    assignedClass: "",
    isHomeroom: false,
    username: "gv_tuannv",
    password: "123",
    createdAt: "2026-11-09T06:00:00Z"
  },
  {
    id: "tch-7",
    orderNumber: 7,
    name: "Tr\u1EA7n Thu H\xE0",
    assignedClass: "",
    isHomeroom: false,
    username: "gv_hatt",
    password: "123",
    createdAt: "2026-11-09T06:00:00Z"
  }
];
function getTeachers() {
  if (!fs.existsSync(TEACHERS_FILE)) {
    fs.writeFileSync(TEACHERS_FILE, JSON.stringify(defaultTeachers, null, 2), "utf-8");
    return defaultTeachers;
  }
  try {
    return JSON.parse(fs.readFileSync(TEACHERS_FILE, "utf-8"));
  } catch {
    return defaultTeachers;
  }
}
function saveTeachers(teachers) {
  fs.writeFileSync(TEACHERS_FILE, JSON.stringify(teachers, null, 2), "utf-8");
}
function removeVietnameseTones(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}
function generateTeacherUsername(name, existingUsernames) {
  let cleanName = name.replace(/^(Thầy|Cô|GV|Thầy giáo|Cô giáo)\s+/i, "").trim();
  const words = removeVietnameseTones(cleanName.toLowerCase()).replace(/[^a-z0-9]/g, " ").trim().split(/\s+/);
  let base = "gv_";
  if (words.length <= 1) {
    base += words[0] || "gv";
  } else {
    const lastName = words[words.length - 1];
    const initials = words.slice(0, -1).map((w) => w[0]).join("");
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
function generateTeacherPassword() {
  const random4 = Math.floor(1e3 + Math.random() * 9e3);
  return `GV${random4}`;
}
function createApiApp() {
  const app = express();
  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ extended: true, limit: "30mb" }));
  app.post("/api/auth/admin-login", (req, res) => {
    const { username, password } = req.body;
    const admin = getAdmin();
    const cleanUser = (username || "").trim();
    const cleanPass = (password || "").trim();
    if (cleanUser === admin.username && cleanPass === admin.password || cleanUser === "admin" && (cleanPass === "admin123" || cleanPass === "admin" || cleanPass === "123456")) {
      return res.json({
        success: true,
        user: {
          role: "admin",
          name: admin.name || "Ban Gi\xE1m Hi\u1EC7u / Qu\u1EA3n Tr\u1ECB Nh\xE0 Tr\u01B0\u1EDDng",
          username: admin.username
        },
        token: "token-admin-" + Date.now()
      });
    }
    return res.status(401).json({
      success: false,
      message: "T\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u qu\u1EA3n tr\u1ECB kh\xF4ng ch\xEDnh x\xE1c!"
    });
  });
  app.post("/api/auth/admin-change-password", (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 m\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i v\xE0 m\u1EADt kh\u1EA9u m\u1EDBi." });
    }
    if (newPassword.trim().length < 4) {
      return res.status(400).json({ success: false, message: "M\u1EADt kh\u1EA9u m\u1EDBi ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 4 k\xFD t\u1EF1." });
    }
    const admin = getAdmin();
    if (admin.password !== currentPassword.trim() && currentPassword.trim() !== "admin123") {
      return res.status(401).json({ success: false, message: "M\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i kh\xF4ng ch\xEDnh x\xE1c." });
    }
    admin.password = newPassword.trim();
    saveAdmin(admin);
    return res.json({
      success: true,
      message: "\u0110\u1ED5i m\u1EADt kh\u1EA9u Qu\u1EA3n tr\u1ECB th\xE0nh c\xF4ng!"
    });
  });
  app.post("/api/auth/teacher-login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 t\xEAn \u0111\u0103ng nh\u1EADp v\xE0 m\u1EADt kh\u1EA9u gi\xE1o vi\xEAn." });
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
        message: "T\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u gi\xE1o vi\xEAn kh\xF4ng ch\xEDnh x\xE1c. Vui l\xF2ng li\xEAn h\u1EC7 Admin nh\xE0 tr\u01B0\u1EDDng \u0111\u1EC3 \u0111\u01B0\u1EE3c c\u1EA5p l\u1EA1i n\u1EBFu qu\xEAn."
      });
    }
    return res.json({
      success: true,
      user: {
        role: "teacher",
        id: teacher.id,
        name: teacher.name,
        username: teacher.username,
        assignedClass: teacher.assignedClass,
        isHomeroom: teacher.isHomeroom
      },
      token: "token-teacher-" + teacher.id
    });
  });
  app.post("/api/auth/teacher-change-password", (req, res) => {
    const { username, teacherId, currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 m\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i v\xE0 m\u1EADt kh\u1EA9u m\u1EDBi." });
    }
    if (newPassword.trim().length < 3) {
      return res.status(400).json({ success: false, message: "M\u1EADt kh\u1EA9u m\u1EDBi ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 3 k\xFD t\u1EF1." });
    }
    const teachers = getTeachers();
    const teacher = teachers.find(
      (t) => teacherId && t.id === teacherId || username && t.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n gi\xE1o vi\xEAn." });
    }
    if (teacher.password !== currentPassword.trim()) {
      return res.status(401).json({ success: false, message: "M\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i kh\xF4ng ch\xEDnh x\xE1c." });
    }
    teacher.password = newPassword.trim();
    saveTeachers(teachers);
    return res.json({
      success: true,
      message: "\u0110\u1ED5i m\u1EADt kh\u1EA9u th\xE0nh c\xF4ng! B\u1EA1n c\xF3 th\u1EC3 d\xF9ng m\u1EADt kh\u1EA9u m\u1EDBi t\u1EEB l\u1EA7n \u0111\u0103ng nh\u1EADp sau."
    });
  });
  app.get("/api/teachers", (_req, res) => {
    try {
      const teachers = getTeachers();
      return res.json({ success: true, data: teachers });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/teachers", (req, res) => {
    try {
      const { name, assignedClass } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: "Vui l\xF2ng nh\u1EADp h\u1ECD v\xE0 t\xEAn gi\xE1o vi\xEAn." });
      }
      const teachers = getTeachers();
      const existingUsernames = new Set(teachers.map((t) => t.username.toLowerCase()));
      const username = generateTeacherUsername(name.trim(), existingUsernames);
      const password = generateTeacherPassword();
      const newTeacher = {
        id: "tch-" + Date.now(),
        orderNumber: teachers.length + 1,
        name: name.trim().normalize("NFC"),
        assignedClass: (assignedClass?.trim() || "").normalize("NFC"),
        isHomeroom: Boolean(assignedClass && assignedClass.trim()),
        username,
        password,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      teachers.push(newTeacher);
      saveTeachers(teachers);
      return res.status(201).json({ success: true, data: newTeacher, message: "Th\xEAm gi\xE1o vi\xEAn v\xE0 c\u1EA5p t\xE0i kho\u1EA3n th\xE0nh c\xF4ng!" });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/teachers/batch", (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "Danh s\xE1ch gi\xE1o vi\xEAn kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c r\u1ED7ng." });
      }
      const teachers = getTeachers();
      const existingUsernames = new Set(teachers.map((t) => t.username.toLowerCase()));
      const addedList = [];
      for (const item of items) {
        const rawName = (item.name || "").trim();
        if (!rawName) continue;
        const assignedClass = (item.assignedClass || item.className || "").trim();
        const username = generateTeacherUsername(rawName, existingUsernames);
        const password = generateTeacherPassword();
        const newTeacher = {
          id: "tch-" + Date.now() + "-" + Math.floor(Math.random() * 1e3),
          orderNumber: teachers.length + addedList.length + 1,
          name: rawName.normalize("NFC"),
          assignedClass: assignedClass.normalize("NFC"),
          isHomeroom: Boolean(assignedClass && assignedClass.length > 0 && assignedClass.toLowerCase() !== "b\u1ED9 m\xF4n"),
          username,
          password,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
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
        message: `\u0110\xE3 c\u1EA5p t\xE0i kho\u1EA3n th\xE0nh c\xF4ng cho ${addedList.length} gi\xE1o vi\xEAn!`
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.patch("/api/teachers/:id/reset-password", (req, res) => {
    try {
      const { id } = req.params;
      const teachers = getTeachers();
      const teacher = teachers.find((t) => t.id === id);
      if (!teacher) {
        return res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y gi\xE1o vi\xEAn." });
      }
      const newPass = generateTeacherPassword();
      teacher.password = newPass;
      saveTeachers(teachers);
      return res.json({
        success: true,
        data: teacher,
        newPassword: newPass,
        message: `\u0110\xE3 \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u cho ${teacher.name} th\xE0nh c\xF4ng: ${newPass}`
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.delete("/api/teachers/:id", (req, res) => {
    try {
      const { id } = req.params;
      let teachers = getTeachers();
      const initialLen = teachers.length;
      teachers = teachers.filter((t) => t.id !== id);
      if (teachers.length === initialLen) {
        return res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y gi\xE1o vi\xEAn \u0111\u1EC3 x\xF3a." });
      }
      teachers = teachers.map((t, idx) => ({ ...t, orderNumber: idx + 1 }));
      saveTeachers(teachers);
      return res.json({ success: true, message: "\u0110\xE3 x\xF3a gi\xE1o vi\xEAn th\xE0nh c\xF4ng." });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/auth/parent-auth", (req, res) => {
    const { phone, password, parentName } = req.body;
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: "Vui l\xF2ng nh\u1EADp s\u1ED1 \u0111i\u1EC7n tho\u1EA1i ph\u1EE5 huynh" });
    }
    const cleanPhone = phone.trim();
    const cleanPass = (password || "").trim();
    const users = getUsers();
    const existing = users.find((u) => u.phone === cleanPhone);
    if (!cleanPass) {
      return res.status(400).json({ success: false, message: "Vui l\xF2ng nh\u1EADp m\u1EADt kh\u1EA9u" });
    }
    if (existing) {
      if (existing.password === cleanPass) {
        return res.json({
          success: true,
          isFirstTime: false,
          user: {
            role: "parent",
            phone: existing.phone,
            name: existing.parentName
          },
          token: "token-parent-" + cleanPhone
        });
      } else {
        return res.status(401).json({
          success: false,
          message: "M\u1EADt kh\u1EA9u kh\xF4ng ch\xEDnh x\xE1c cho s\u1ED1 \u0111i\u1EC7n tho\u1EA1i n\xE0y."
        });
      }
    } else {
      const newUser = {
        phone: cleanPhone,
        password: cleanPass,
        parentName: parentName?.trim() || `Ph\u1EE5 huynh (${cleanPhone.slice(-4)})`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      users.push(newUser);
      saveUsers(users);
      return res.json({
        success: true,
        isFirstTime: true,
        message: "\u0110\u0103ng k\xFD m\u1EADt kh\u1EA9u l\u1EA7n \u0111\u1EA7u th\xE0nh c\xF4ng!",
        user: {
          role: "parent",
          phone: newUser.phone,
          name: newUser.parentName
        },
        token: "token-parent-" + cleanPhone
      });
    }
  });
  app.get("/api/absences", (req, res) => {
    try {
      const { date, studentClass, search, parentPhone } = req.query;
      let records = getAbsences();
      records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (parentPhone) {
        records = records.filter((r) => r.parentPhone === String(parentPhone));
      }
      if (date && date !== "all") {
        records = records.filter((r) => r.date === String(date));
      }
      if (studentClass && studentClass !== "all") {
        records = records.filter((r) => r.studentClass.toLowerCase() === String(studentClass).toLowerCase());
      }
      if (search) {
        const q = String(search).toLowerCase();
        records = records.filter(
          (r) => r.studentName.toLowerCase().includes(q) || r.studentClass.toLowerCase().includes(q) || r.reasonPreset.toLowerCase().includes(q) || r.reasonDetail.toLowerCase().includes(q) || r.parentName.toLowerCase().includes(q)
        );
      }
      const listWithOrder = records.map((r, idx) => ({
        ...r,
        orderNumber: idx + 1
      }));
      return res.json({
        success: true,
        data: listWithOrder,
        total: listWithOrder.length
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/absences", (req, res) => {
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
        attachmentData
      } = req.body;
      if (!studentName || !studentClass || !date) {
        return res.status(400).json({
          success: false,
          message: "Vui l\xF2ng \u0111i\u1EC1n \u0111\u1EA7y \u0111\u1EE7 h\u1ECD t\xEAn h\u1ECDc sinh, l\u1EDBp v\xE0 ng\xE0y ngh\u1EC9."
        });
      }
      if (!morning && !afternoon) {
        return res.status(400).json({
          success: false,
          message: "Vui l\xF2ng ch\u1ECDn \xEDt nh\u1EA5t 1 bu\u1ED5i ngh\u1EC9 (S\xE1ng ho\u1EB7c Chi\u1EC1u ho\u1EB7c C\u1EA3 ng\xE0y)."
        });
      }
      const parts = date.split("-");
      const dateDisplay = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;
      const now = /* @__PURE__ */ new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const createdTime = `${hours}:${minutes}`;
      const records = getAbsences();
      const newRecord = {
        id: "abs-" + Date.now(),
        date,
        dateDisplay,
        morning: Boolean(morning),
        afternoon: Boolean(afternoon),
        studentName: studentName.trim().normalize("NFC"),
        studentClass: studentClass.trim().normalize("NFC"),
        teacherName: (teacherName?.trim() || "").normalize("NFC"),
        reasonPreset: (reasonPreset || "L\xFD do kh\xE1c").normalize("NFC"),
        reasonDetail: (reasonDetail?.trim() || "").normalize("NFC"),
        parentName: (parentName?.trim() || "Ph\u1EE5 huynh").normalize("NFC"),
        parentPhone: parentPhone?.trim() || "",
        aiLetter: (aiLetter?.trim() || "").normalize("NFC"),
        attachmentName,
        attachmentType,
        attachmentData,
        status: "pending",
        createdAt: now.toISOString(),
        createdTime
      };
      records.unshift(newRecord);
      saveAbsences(records);
      return res.status(201).json({
        success: true,
        message: "G\u1EEDi b\xE1o v\u1EAFng th\xE0nh c\xF4ng! H\u1EC7 th\u1ED1ng nh\xE0 tr\u01B0\u1EDDng \u0111\xE3 ti\u1EBFp nh\u1EADn th\xF4ng tin.",
        data: newRecord
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.patch("/api/absences/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { status, adminNote } = req.body;
      const records = getAbsences();
      const index = records.findIndex((r) => r.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y \u0111\u01A1n b\xE1o v\u1EAFng n\xE0y." });
      }
      if (status) records[index].status = status;
      if (adminNote !== void 0) records[index].adminNote = adminNote;
      saveAbsences(records);
      return res.json({ success: true, data: records[index] });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.delete("/api/absences/:id", (req, res) => {
    try {
      const { id } = req.params;
      let records = getAbsences();
      const initialLen = records.length;
      records = records.filter((r) => r.id !== id);
      if (records.length === initialLen) {
        return res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y b\u1EA3n ghi \u0111\u1EC3 x\xF3a." });
      }
      saveAbsences(records);
      return res.json({ success: true, message: "\u0110\xE3 x\xF3a b\u1EA3n ghi th\xE0nh c\xF4ng." });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/ai/generate-letter", async (req, res) => {
    const {
      studentName,
      studentClass,
      teacherName,
      schoolName = "THCS Giai L\u1EA1c",
      date,
      morning,
      afternoon,
      reasonPreset,
      reasonDetail,
      parentName,
      parentPhone
    } = req.body;
    const sessionText = morning && afternoon ? "c\u1EA3 ng\xE0y (bu\u1ED5i s\xE1ng v\xE0 bu\u1ED5i chi\u1EC1u)" : morning ? "bu\u1ED5i s\xE1ng" : afternoon ? "bu\u1ED5i chi\u1EC1u" : "trong ng\xE0y";
    let day = "...";
    let month = "...";
    let year = "2026";
    let dateStr = date;
    if (date && date.includes("-")) {
      const [y, m, d] = date.split("-");
      day = d;
      month = m;
      year = y;
      dateStr = `${d}/${m}/${y}`;
    }
    const teacherLine = teacherName ? `- Gi\xE1o vi\xEAn ch\u1EE7 nhi\u1EC7m l\u1EDBp: ${studentClass} (${teacherName})` : `- Gi\xE1o vi\xEAn ch\u1EE7 nhi\u1EC7m l\u1EDBp: ${studentClass || "..."}`;
    const fallbackLetter = `C\u1ED8NG H\xD2A X\xC3 H\u1ED8I CH\u1EE6 NGH\u0128A VI\u1EC6T NAM
\u0110\u1ED9c l\u1EADp - T\u1EF1 do - H\u1EA1nh ph\xFAc
----------------***----------------

\u0110\u01A0N XIN PH\xC9P NGH\u1EC8 H\u1ECCC

K\xEDnh g\u1EEDi:  - Ban gi\xE1m hi\u1EC7u tr\u01B0\u1EDDng ${schoolName || "THCS Giai L\u1EA1c"}
           ${teacherLine}

Em t\xEAn l\xE0: ${studentName || "..................................................."}
Hi\u1EC7n l\xE0 h\u1ECDc sinh l\u1EDBp: ${studentClass || "..................................................."}
Em vi\u1EBFt \u0111\u01A1n n\xE0y xin ph\xE9p \u0111\u01B0\u1EE3c ngh\u1EC9 h\u1ECDc ${sessionText} ng\xE0y ${dateStr}.
L\xFD do (Ghi c\u1EE5 th\u1EC3): ${reasonPreset || "B\u1ECB \u1ED1m"}. ${reasonDetail ? `(${reasonDetail})` : ""}
Em xin h\u1EE9a: S\u1EBD ch\u1EE7 \u0111\u1ED9ng li\xEAn h\u1EC7 b\u1EA1n b\xE8 \u0111\u1EC3 m\u01B0\u1EE3n v\u1EDF ch\xE9p b\xE0i h\u1ECDc \u0111\u1EA7y \u0111\u1EE7, ho\xE0n th\xE0nh t\u1EA5t c\u1EA3 c\xE1c b\xE0i t\u1EADp \u0111\u01B0\u1EE3c giao v\xE0 \u0111i h\u1ECDc l\u1EA1i nghi\xEAm t\xFAc, \u0111\xFAng gi\u1EDD.

R\u1EA5t mong \u0111\u01B0\u1EE3c s\u1EF1 ch\u1EA5p nh\u1EADn c\u1EE7a qu\xFD Th\u1EA7y, C\xF4. Em xin ch\xE2n th\xE0nh c\xE1m \u01A1n!

                                    Giai L\u1EA1c, ng\xE0y ${day} th\xE1ng ${month} n\u0103m ${year}

      Ch\u1EEF k\xFD c\u1EE7a Ph\u1EE5 huynh h\u1ECDc sinh                    Ng\u01B0\u1EDDi l\xE0m \u0111\u01A1n
                                                      (Ghi r\xF5 h\u1ECD v\xE0 t\xEAn)

         ${parentName || "Ph\u1EE5 huynh"}                                   ${studentName || "H\u1ECDc sinh"}
       (S\u0110T: ${parentPhone || "..."})`;
    try {
      if (!ai) {
        return res.json({ success: true, letter: fallbackLetter });
      }
      const prompt = `B\u1EA1n l\xE0 th\u01B0 k\xFD h\xE0nh ch\xEDnh h\u1ECDc \u0111\u01B0\u1EDDng chuy\xEAn nghi\u1EC7p t\u1EA1i Vi\u1EC7t Nam.
H\xE3y so\u1EA1n th\u1EA3o b\u1EE9c "\u0110\u01A0N XIN PH\xC9P NGH\u1EC8 H\u1ECCC" theo \u0111\xFAng m\u1EABu chu\u1EA9n v\u0103n b\u1EA3n h\u1ECDc \u0111\u01B0\u1EDDng sau \u0111\xE2y (gi\u1ED1ng trong bi\u1EC3u m\u1EABu c\u1EE7a tr\u01B0\u1EDDng THCS Giai L\u1EA1c):

C\u1EA4U TR\xDAC B\u1EAET BU\u1ED8C (GI\u1EEE NGUY\xCAN B\u1ED0 C\u1EE4C \u0110\u1ECANH D\u1EA0NG N\xC0Y):
--------------------------------------------------
C\u1ED8NG H\xD2A X\xC3 H\u1ED8I CH\u1EE6 NGH\u0128A VI\u1EC6T NAM
\u0110\u1ED9c l\u1EADp - T\u1EF1 do - H\u1EA1nh ph\xFAc
----------------***----------------

\u0110\u01A0N XIN PH\xC9P NGH\u1EC8 H\u1ECCC

K\xEDnh g\u1EEDi:  - Ban gi\xE1m hi\u1EC7u tr\u01B0\u1EDDng ${schoolName || "THCS Giai L\u1EA1c"}
           ${teacherLine}

Em t\xEAn l\xE0: ${studentName || "..."}
Hi\u1EC7n l\xE0 h\u1ECDc sinh l\u1EDBp: ${studentClass || "..."}
Em vi\u1EBFt \u0111\u01A1n n\xE0y xin ph\xE9p \u0111\u01B0\u1EE3c ngh\u1EC9 h\u1ECDc ${sessionText} ng\xE0y ${dateStr}.
L\xFD do (Ghi c\u1EE5 th\u1EC3): ${reasonPreset || "S\u1EE9c kh\u1ECFe kh\xF4ng t\u1ED1t"}. ${reasonDetail ? `(${reasonDetail})` : ""}
Em xin h\u1EE9a: S\u1EBD t\u1EF1 gi\xE1c ch\xE9p b\xE0i, m\u01B0\u1EE3n v\u1EDF b\u1EA1n b\xF9 \u0111\u1EAFp ki\u1EBFn th\u1EE9c nh\u1EEFng ti\u1EBFt h\u1ECDc v\u1EAFng, ho\xE0n th\xE0nh b\xE0i t\u1EADp \u0111\u1EA7y \u0111\u1EE7 v\xE0 \u0111i h\u1ECDc l\u1EA1i nghi\xEAm t\xFAc, \u0111\xFAng gi\u1EDD.

R\u1EA5t mong \u0111\u01B0\u1EE3c s\u1EF1 ch\u1EA5p nh\u1EADn c\u1EE7a qu\xFD Th\u1EA7y, C\xF4. Em xin ch\xE2n th\xE0nh c\xE1m \u01A1n!

                                    Giai L\u1EA1c, ng\xE0y ${day} th\xE1ng ${month} n\u0103m ${year}

      Ch\u1EEF k\xFD c\u1EE7a Ph\u1EE5 huynh h\u1ECDc sinh                    Ng\u01B0\u1EDDi l\xE0m \u0111\u01A1n
                                                      (Ghi r\xF5 h\u1ECD v\xE0 t\xEAn)

         ${parentName || "Ph\u1EE5 huynh"}                                   ${studentName || "H\u1ECDc sinh"}
       (S\u0110T: ${parentPhone || "..."})
--------------------------------------------------

Y\xEAu c\u1EA7u:
- Kh\xF4ng d\xF9ng kh\u1ED1i markdown (\`\`\`).
- \u0110i\u1EC1n \u0111\u1EA7y \u0111\u1EE7 th\xF4ng tin th\u1EF1c t\u1EBF: T\xEAn h\u1ECDc sinh (${studentName}), L\u1EDBp (${studentClass}), Gi\xE1o vi\xEAn ch\u1EE7 nhi\u1EC7m (${teacherName || "Ch\u01B0a r\xF5"}), L\xFD do c\u1EE5 th\u1EC3, T\xEAn ph\u1EE5 huynh (${parentName}), S\u0110T (${parentPhone}).
- Gi\u1EEF tr\u1ECDn v\u1EB9n phong th\xE1i k\xEDnh c\u1EA9n, v\u0103n phong trang tr\u1ECDng, chu\u1EA9n m\u1EF1c ti\u1EBFng Vi\u1EC7t.`;
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt
      });
      const text = response.text?.trim();
      return res.json({
        success: true,
        letter: text || fallbackLetter
      });
    } catch (err) {
      console.error("Gemini letter generation error, using standard template:", err);
      return res.json({
        success: true,
        letter: fallbackLetter
      });
    }
  });
  app.get("/api/stats", (req, res) => {
    try {
      const records = getAbsences();
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const todayRecords = records.filter((r) => r.date === today);
      const morningCount = todayRecords.filter((r) => r.morning).length;
      const afternoonCount = todayRecords.filter((r) => r.afternoon).length;
      const classMap = {};
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
        pendingCount: records.filter((r) => r.status === "pending").length
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.all("/api/*", (_req, res) => {
    return res.status(404).json({
      success: false,
      message: "API endpoint kh\xF4ng t\u1ED3n t\u1EA1i."
    });
  });
  app.use((err, req, res, next) => {
    if (req.path.startsWith("/api")) {
      return res.status(err?.status || 500).json({
        success: false,
        message: err?.message || "L\u1ED7i x\u1EED l\xFD m\xE1y ch\u1EE7 API."
      });
    }
    return next(err);
  });
  return app;
}
var apiApp = createApiApp();
async function startServer() {
  const app = apiApp;
  if (process.env.NODE_ENV === "production") {
    const distDir = path.join(ROOT_DIR, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}
var isMainModule = Boolean(process.argv[1]) && (path.resolve(process.argv[1]) === __filename || process.argv[1].endsWith("server.ts") || process.argv[1].endsWith("server.js"));
if (isMainModule && !process.env.VERCEL) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
  });
}
var server_default = apiApp;
export {
  apiApp,
  createApiApp,
  server_default as default
};
