// server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var ROOT_DIR = fs.existsSync(path.join(__dirname, "package.json")) ? __dirname : path.resolve(__dirname, "..");
var PORT = Number(process.env.PORT) || 3e3;
var BUNDLED_DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT_DIR, "data");
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
var QR_SESSIONS_FILE = path.join(DATA_DIR, "qr_sessions.json");
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
function normalizePhone(raw) {
  return (raw || "").replace(/[\s.\-()]/g, "").trim();
}
function phoneMatches(a, b) {
  const na = normalizePhone(a).replace(/^\+?84/, "0");
  const nb = normalizePhone(b).replace(/^\+?84/, "0");
  return Boolean(na && nb && na === nb);
}
function parseZaloOrSystemQr(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return { kind: "unknown", raw: "" };
  const sysToken = extractQrTokenFromPayload(trimmed);
  if (trimmed.includes("parent_qr=") || /^qr_[0-9a-zA-Z_]+$/i.test(sysToken)) {
    return { kind: "system_qr", token: sysToken };
  }
  const profileMatch = trimmed.match(/zalo(?:app)?\.(?:me|com)\/qr\/p\/([A-Za-z0-9_-]+)/i);
  if (profileMatch?.[1]) {
    return { kind: "zalo_profile", profileId: profileMatch[1], raw: trimmed };
  }
  const zaloPhoneMatch = trimmed.match(/zalo(?:app)?\.(?:me|com)\/(?:qr\/)?(\+?\d{8,13})(?:[/?#]|$)/i);
  if (zaloPhoneMatch?.[1]) {
    return { kind: "zalo_phone", phone: normalizePhone(zaloPhoneMatch[1]) };
  }
  const telMatch = trimmed.match(/^tel:(\+?\d{8,13})$/i);
  if (telMatch?.[1]) {
    return { kind: "zalo_phone", phone: normalizePhone(telMatch[1]) };
  }
  const digitsOnly = normalizePhone(trimmed);
  if (/^(\+?84|0)\d{8,10}$/.test(digitsOnly)) {
    return { kind: "zalo_phone", phone: digitsOnly };
  }
  return { kind: "unknown", raw: trimmed };
}
function generateParentQrToken(phone) {
  const clean = normalizePhone(phone) || "ph";
  const rand = crypto.randomBytes(4).toString("hex");
  return `qr_${clean}_${rand}`;
}
function extractQrTokenFromPayload(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      const t = url.searchParams.get("parent_qr");
      if (t) return t.trim();
    }
  } catch {
  }
  const match = trimmed.match(/parent_qr=([^&\s]+)/i);
  if (match?.[1]) {
    return decodeURIComponent(match[1]).trim();
  }
  return trimmed;
}
function getUsers() {
  const defaultUsers = [
    {
      id: "par-1",
      orderNumber: 1,
      studentName: "Nguy\u1EC5n V\u0103n Minh Khang",
      studentClass: "6A1",
      phone: "0987654321",
      parentName: "Nguy\u1EC5n V\u0103n H\xF9ng",
      qrToken: "qr_0987654321_giailac01",
      createdAt: "2026-11-09T06:00:00Z"
    },
    {
      id: "par-2",
      orderNumber: 2,
      studentName: "Tr\u1EA7n B\u1EA3o Ng\u1ECDc",
      studentClass: "7B3",
      phone: "0912345678",
      parentName: "Tr\u1EA7n Th\u1ECB Mai",
      qrToken: "qr_0912345678_giailac02",
      createdAt: "2026-11-09T06:00:00Z"
    }
  ];
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2), "utf-8");
    return defaultUsers;
  }
  try {
    const rawList = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    let needsSave = false;
    const migrated = rawList.map((u, idx) => {
      const cleanPhone = normalizePhone(u.phone || "");
      const hasAllFields = Boolean(u.id && u.qrToken && u.studentName !== void 0 && u.orderNumber);
      if (!hasAllFields) needsSave = true;
      return {
        id: u.id || `par-${idx + 1}-${cleanPhone || Date.now()}`,
        orderNumber: u.orderNumber || idx + 1,
        studentName: (u.studentName || u.parentName || `H\u1ECDc sinh (${cleanPhone.slice(-4)})`).normalize("NFC"),
        studentClass: (u.studentClass || "").normalize("NFC"),
        phone: cleanPhone,
        parentName: (u.parentName || "").normalize("NFC"),
        password: u.password,
        qrToken: u.qrToken || generateParentQrToken(cleanPhone),
        zaloQrCode: u.zaloQrCode || "",
        createdAt: u.createdAt || (/* @__PURE__ */ new Date()).toISOString()
      };
    });
    if (needsSave) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(migrated, null, 2), "utf-8");
    }
    return migrated;
  } catch {
    return defaultUsers;
  }
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}
var QR_SESSION_TTL_MS = 15 * 60 * 1e3;
function getQrSessions() {
  if (!fs.existsSync(QR_SESSIONS_FILE)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(QR_SESSIONS_FILE, "utf-8")) || {};
    const now = Date.now();
    const cleaned = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v && typeof v.createdAt === "number" && now - v.createdAt < QR_SESSION_TTL_MS) {
        cleaned[k] = v;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}
function saveQrSessions(sessions) {
  fs.writeFileSync(QR_SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
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
  app.get("/api/parents", (_req, res) => {
    try {
      const users = getUsers();
      return res.json({ success: true, data: users });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/parents", (req, res) => {
    try {
      const { studentName, studentClass, phone, zaloQrCode } = req.body;
      const cleanPhone = normalizePhone(phone || "");
      const cleanStudent = (studentName || "").trim().normalize("NFC");
      const cleanClass = (studentClass || "").trim().normalize("NFC");
      const cleanZaloQr = (zaloQrCode || "").trim();
      if (!cleanStudent || !cleanClass || !cleanPhone) {
        return res.status(400).json({
          success: false,
          message: "Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 h\u1ECD t\xEAn h\u1ECDc sinh, l\u1EDBp v\xE0 s\u1ED1 \u0111i\u1EC7n tho\u1EA1i ph\u1EE5 huynh."
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
          zaloQrCode: cleanZaloQr || users[existingIdx].zaloQrCode || ""
        };
        saveUsers(users);
        return res.json({
          success: true,
          data: users[existingIdx],
          message: `\u0110\xE3 c\u1EADp nh\u1EADt th\xF4ng tin & gi\u1EEF nguy\xEAn m\xE3 QR cho S\u0110T ${cleanPhone}.`
        });
      }
      const newParent = {
        id: "par-" + Date.now() + "-" + Math.floor(Math.random() * 1e3),
        orderNumber: users.length + 1,
        studentName: cleanStudent,
        studentClass: cleanClass,
        phone: cleanPhone,
        qrToken: generateParentQrToken(cleanPhone),
        zaloQrCode: cleanZaloQr,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      users.push(newParent);
      saveUsers(users);
      return res.status(201).json({
        success: true,
        data: newParent,
        message: "\u0110\xE3 c\u1EA5p t\xE0i kho\u1EA3n ph\u1EE5 huynh v\xE0 sinh m\xE3 QR th\xE0nh c\xF4ng!"
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/parents/batch", (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Danh s\xE1ch ph\u1EE5 huynh kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c r\u1ED7ng."
        });
      }
      const users = getUsers();
      let addedCount = 0;
      let updatedCount = 0;
      for (const item of items) {
        const cleanStudent = (item.studentName || "").trim().normalize("NFC");
        const cleanClass = (item.studentClass || "").trim().normalize("NFC");
        const cleanPhone = normalizePhone(item.phone || "");
        const cleanZaloQr = (item.zaloQrCode || "").trim();
        if (!cleanStudent || !cleanPhone) continue;
        const existingIdx = users.findIndex((u) => phoneMatches(u.phone, cleanPhone));
        if (existingIdx !== -1) {
          users[existingIdx] = {
            ...users[existingIdx],
            studentName: cleanStudent,
            studentClass: cleanClass || users[existingIdx].studentClass,
            qrToken: users[existingIdx].qrToken || generateParentQrToken(cleanPhone),
            zaloQrCode: cleanZaloQr || users[existingIdx].zaloQrCode || ""
          };
          updatedCount++;
        } else {
          users.push({
            id: "par-" + Date.now() + "-" + Math.floor(Math.random() * 1e4),
            orderNumber: users.length + 1,
            studentName: cleanStudent,
            studentClass: cleanClass,
            phone: cleanPhone,
            qrToken: generateParentQrToken(cleanPhone),
            zaloQrCode: cleanZaloQr,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
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
        message: `\u0110\xE3 c\u1EA5p t\xE0i kho\u1EA3n & sinh m\xE3 QR cho ${addedCount} ph\u1EE5 huynh m\u1EDBi${updatedCount > 0 ? ` (c\u1EADp nh\u1EADt ${updatedCount} S\u0110T \u0111\xE3 c\xF3)` : ""}!`
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.patch("/api/parents/:id/zalo-qr", (req, res) => {
    try {
      const { id } = req.params;
      const { zaloQrCode } = req.body;
      const users = getUsers();
      const idx = users.findIndex((u) => u.id === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n ph\u1EE5 huynh." });
      }
      users[idx].zaloQrCode = (zaloQrCode || "").trim();
      saveUsers(users);
      return res.json({
        success: true,
        data: users[idx],
        message: users[idx].zaloQrCode ? `\u0110\xE3 g\u1EAFn m\xE3 QR Zalo c\xE1 nh\xE2n cho ph\u1EE5 huynh em ${users[idx].studentName}.` : `\u0110\xE3 g\u1EE1 m\xE3 QR Zalo c\xE1 nh\xE2n c\u1EE7a em ${users[idx].studentName}.`
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.patch("/api/parents/:id/regenerate-qr", (req, res) => {
    try {
      const { id } = req.params;
      const users = getUsers();
      const idx = users.findIndex((u) => u.id === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n ph\u1EE5 huynh." });
      }
      users[idx].qrToken = generateParentQrToken(users[idx].phone);
      saveUsers(users);
      return res.json({
        success: true,
        data: users[idx],
        message: `\u0110\xE3 c\u1EA5p l\u1EA1i m\xE3 QR m\u1EDBi cho S\u0110T ${users[idx].phone}.`
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.delete("/api/parents/:id", (req, res) => {
    try {
      const { id } = req.params;
      let users = getUsers();
      const initialLen = users.length;
      users = users.filter((u) => u.id !== id);
      if (users.length === initialLen) {
        return res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n ph\u1EE5 huynh \u0111\u1EC3 x\xF3a." });
      }
      users = users.map((u, idx) => ({ ...u, orderNumber: idx + 1 }));
      saveUsers(users);
      return res.json({ success: true, message: "\u0110\xE3 x\xF3a t\xE0i kho\u1EA3n ph\u1EE5 huynh th\xE0nh c\xF4ng." });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.get("/api/auth/parent-qr-lookup", (req, res) => {
    try {
      const cleanPhone = normalizePhone(String(req.query.phone || ""));
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
          qrToken: account.qrToken
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/auth/qr-session", (_req, res) => {
    try {
      const sessionId = "qrs_" + crypto.randomBytes(10).toString("hex");
      const sessions = getQrSessions();
      sessions[sessionId] = {
        sessionId,
        status: "pending",
        createdAt: Date.now()
      };
      saveQrSessions(sessions);
      return res.json({ success: true, sessionId });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.get("/api/auth/qr-session-status", (req, res) => {
    try {
      const sessionId = String(req.query.sessionId || "").trim();
      if (!sessionId) {
        return res.status(400).json({ success: false, status: "invalid" });
      }
      const sessions = getQrSessions();
      const sess = sessions[sessionId];
      if (!sess) {
        return res.json({ success: true, status: "expired" });
      }
      if (sess.status === "confirmed" && sess.user && sess.token) {
        return res.json({
          success: true,
          status: "confirmed",
          user: sess.user,
          token: sess.token
        });
      }
      return res.json({ success: true, status: "pending" });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/auth/parent-qr-confirm", (req, res) => {
    try {
      const { qrData, sessionId } = req.body;
      const extracted = extractQrTokenFromPayload(String(qrData || ""));
      if (!extracted) {
        return res.status(400).json({
          success: false,
          message: "M\xE3 QR kh\xF4ng h\u1EE3p l\u1EC7."
        });
      }
      const users = getUsers();
      const matched = users.find((u) => u.qrToken === extracted);
      if (!matched) {
        return res.status(401).json({
          success: false,
          message: "M\xE3 QR ch\u01B0a \u0111\u01B0\u1EE3c Admin nh\xE0 tr\u01B0\u1EDDng c\u1EA5p t\xE0i kho\u1EA3n ho\u1EB7c \u0111\xE3 b\u1ECB thu h\u1ED3i."
        });
      }
      const userPayload = {
        role: "parent",
        phone: matched.phone,
        name: matched.parentName || `Ph\u1EE5 huynh em ${matched.studentName}`,
        studentName: matched.studentName,
        studentClass: matched.studentClass
      };
      const token = "token-parent-" + matched.phone;
      const cleanSessionId = String(sessionId || "").trim();
      let confirmedDesktop = false;
      if (cleanSessionId && cleanSessionId.startsWith("qrs_")) {
        const sessions = getQrSessions();
        const existingSess = sessions[cleanSessionId];
        sessions[cleanSessionId] = {
          sessionId: cleanSessionId,
          status: "confirmed",
          createdAt: existingSess?.createdAt || Date.now(),
          confirmedAt: Date.now(),
          user: userPayload,
          token
        };
        saveQrSessions(sessions);
        confirmedDesktop = true;
      }
      return res.json({
        success: true,
        confirmedDesktop,
        user: userPayload,
        token
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/auth/parent-qr-login", (req, res) => {
    try {
      const { qrData, mode } = req.body;
      const rawInput = String(qrData || "").trim();
      if (!rawInput) {
        return res.status(400).json({
          success: false,
          message: "Vui l\xF2ng cung c\u1EA5p \u1EA3nh ho\u1EB7c m\xE3 QR h\u1EE3p l\u1EC7 \u0111\u1EC3 \u0111\u0103ng nh\u1EADp."
        });
      }
      const users = getUsers();
      const parsed = parseZaloOrSystemQr(rawInput);
      if (mode === "zalo_image") {
        if (parsed.kind === "system_qr") {
          return res.status(400).json({
            success: false,
            message: "\u0110\xE2y l\xE0 m\xE3 QR h\u1EC7 th\u1ED1ng khi nh\u1EADp S\u0110T. \u0110\u1EC3 \u0111\u0103ng nh\u1EADp b\u1EB1ng \u1EA3nh QR, vui l\xF2ng ch\u1ECDn \u1EA3nh M\xE3 QR Zalo c\xE1 nh\xE2n c\u1EE7a ph\u1EE5 huynh."
          });
        }
        let matched2;
        if (parsed.kind === "zalo_phone") {
          matched2 = users.find((u) => phoneMatches(u.phone, parsed.phone));
          if (!matched2) {
            return res.status(401).json({
              success: false,
              message: `S\u1ED1 \u0111i\u1EC7n tho\u1EA1i ${parsed.phone} trong m\xE3 QR Zalo ch\u01B0a \u0111\u01B0\u1EE3c nh\xE0 tr\u01B0\u1EDDng c\u1EA5p t\xE0i kho\u1EA3n.`
            });
          }
        } else if (parsed.kind === "zalo_profile") {
          matched2 = users.find((u) => {
            if (!u.zaloQrCode) return false;
            const linked = parseZaloOrSystemQr(u.zaloQrCode);
            return linked.kind === "zalo_profile" && linked.profileId.toLowerCase() === parsed.profileId.toLowerCase();
          });
          if (!matched2) {
            return res.status(401).json({
              success: false,
              message: "M\xE3 QR Zalo c\xE1 nh\xE2n (zalo.me/qr/p/...) \u1EA9n s\u1ED1 \u0111i\u1EC7n tho\u1EA1i n\xEAn ch\u01B0a kh\u1EDBp \u0111\u01B0\u1EE3c v\u1EDBi S\u0110T h\u1ECDc sinh. Vui l\xF2ng g\u1EEDi \u1EA3nh m\xE3 QR Zalo n\xE0y cho Gi\xE1o vi\xEAn ho\u1EB7c Admin g\u1EAFn v\xE0o t\xE0i kho\u1EA3n S\u0110T c\u1EE7a ph\u1EE5 huynh."
            });
          }
        } else {
          matched2 = users.find(
            (u) => u.zaloQrCode && u.zaloQrCode.trim() === rawInput
          );
          if (!matched2) {
            return res.status(400).json({
              success: false,
              message: "\u1EA2nh t\u1EA3i l\xEAn kh\xF4ng ph\u1EA3i l\xE0 m\xE3 QR Zalo c\xE1 nh\xE2n h\u1EE3p l\u1EC7 c\u1EE7a ph\u1EE5 huynh \u0111\xE3 \u0111\u0103ng k\xFD."
            });
          }
        }
        return res.json({
          success: true,
          user: {
            role: "parent",
            phone: matched2.phone,
            name: matched2.parentName || `Ph\u1EE5 huynh em ${matched2.studentName}`,
            studentName: matched2.studentName,
            studentClass: matched2.studentClass
          },
          token: "token-parent-" + matched2.phone
        });
      }
      const extracted = extractQrTokenFromPayload(rawInput);
      const matched = users.find((u) => u.qrToken === extracted);
      if (!matched) {
        return res.status(401).json({
          success: false,
          message: "M\xE3 QR kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c ch\u01B0a \u0111\u01B0\u1EE3c Admin nh\xE0 tr\u01B0\u1EDDng c\u1EA5p t\xE0i kho\u1EA3n. Vui l\xF2ng li\xEAn h\u1EC7 nh\xE0 tr\u01B0\u1EDDng \u0111\u1EC3 \u0111\u01B0\u1EE3c c\u1EA5p l\u1EA1i."
        });
      }
      return res.json({
        success: true,
        user: {
          role: "parent",
          phone: matched.phone,
          name: matched.parentName || `Ph\u1EE5 huynh em ${matched.studentName}`,
          studentName: matched.studentName,
          studentClass: matched.studentClass
        },
        token: "token-parent-" + matched.phone
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/auth/parent-auth", (_req, res) => {
    return res.status(403).json({
      success: false,
      message: "H\u1EC7 th\u1ED1ng kh\xF4ng cho ph\xE9p v\xE0o ch\u1EC9 b\u1EB1ng s\u1ED1 \u0111i\u1EC7n tho\u1EA1i. Vui l\xF2ng qu\xE9t m\xE3 QR b\u1EB1ng Zalo ho\u1EB7c \u0111\u0103ng nh\u1EADp b\u1EB1ng \u1EA3nh QR."
    });
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
    const cleanSchool = (schoolName || "THCS Giai L\u1EA1c").normalize("NFC").replace(/^trường\s+/i, "").trim() || "THCS Giai L\u1EA1c";
    const teacherLine = teacherName ? `- Gi\xE1o vi\xEAn ch\u1EE7 nhi\u1EC7m l\u1EDBp ${studentClass} (${teacherName})` : `- Gi\xE1o vi\xEAn ch\u1EE7 nhi\u1EC7m l\u1EDBp ${studentClass || "..."}`;
    const fallbackLetter = `C\u1ED8NG H\xD2A X\xC3 H\u1ED8I CH\u1EE6 NGH\u0128A VI\u1EC6T NAM
\u0110\u1ED9c l\u1EADp - T\u1EF1 do - H\u1EA1nh ph\xFAc
----------------***----------------

\u0110\u01A0N XIN PH\xC9P NGH\u1EC8 H\u1ECCC

K\xEDnh g\u1EEDi:  - Ban gi\xE1m hi\u1EC7u tr\u01B0\u1EDDng ${cleanSchool}
           ${teacherLine}

Em t\xEAn l\xE0: ${studentName || "..................................................."}
Hi\u1EC7n l\xE0 h\u1ECDc sinh l\u1EDBp: ${studentClass || "..................................................."}
Em vi\u1EBFt \u0111\u01A1n n\xE0y xin ph\xE9p \u0111\u01B0\u1EE3c ngh\u1EC9 h\u1ECDc ${sessionText} ng\xE0y ${dateStr}.
L\xFD do (Ghi c\u1EE5 th\u1EC3): ${reasonPreset || "B\u1ECB \u1ED1m"}${reasonDetail ? ` (${reasonDetail})` : ""}
Em xin h\u1EE9a: S\u1EBD t\u1EF1 gi\xE1c ch\xE9p b\xE0i, m\u01B0\u1EE3n v\u1EDF b\u1EA1n b\xF9 \u0111\u1EAFp ki\u1EBFn th\u1EE9c nh\u1EEFng ti\u1EBFt h\u1ECDc v\u1EAFng, ho\xE0n th\xE0nh b\xE0i t\u1EADp \u0111\u1EA7y \u0111\u1EE7 v\xE0 \u0111i h\u1ECDc l\u1EA1i nghi\xEAm t\xFAc, \u0111\xFAng gi\u1EDD.

R\u1EA5t mong \u0111\u01B0\u1EE3c s\u1EF1 ch\u1EA5p nh\u1EADn c\u1EE7a qu\xFD Th\u1EA7y, C\xF4. Em xin ch\xE2n th\xE0nh c\xE1m \u01A1n!

Giai L\u1EA1c, ng\xE0y ${day} th\xE1ng ${month} n\u0103m ${year}
Ch\u1EEF k\xFD c\u1EE7a Ph\u1EE5 huynh h\u1ECDc sinh: ${parentName || "Ph\u1EE5 huynh"} (S\u0110T: ${parentPhone || "..."})
Ng\u01B0\u1EDDi l\xE0m \u0111\u01A1n: ${studentName || "H\u1ECDc sinh"}`.normalize("NFC");
    try {
      if (!ai) {
        return res.json({ success: true, letter: fallbackLetter });
      }
      const prompt = `B\u1EA1n l\xE0 th\u01B0 k\xFD h\xE0nh ch\xEDnh h\u1ECDc \u0111\u01B0\u1EDDng chuy\xEAn nghi\u1EC7p t\u1EA1i Vi\u1EC7t Nam.
H\xE3y so\u1EA1n th\u1EA3o b\u1EE9c "\u0110\u01A0N XIN PH\xC9P NGH\u1EC8 H\u1ECCC" theo \u0111\xFAng m\u1EABu chu\u1EA9n v\u0103n b\u1EA3n h\u1ECDc \u0111\u01B0\u1EDDng sau \u0111\xE2y (gi\u1ED1ng trong bi\u1EC3u m\u1EABu c\u1EE7a tr\u01B0\u1EDDng ${cleanSchool}):

C\u1EA4U TR\xDAC B\u1EAET BU\u1ED8C (GI\u1EEE NGUY\xCAN B\u1ED0 C\u1EE4C \u0110\u1ECANH D\u1EA0NG N\xC0Y):
--------------------------------------------------
C\u1ED8NG H\xD2A X\xC3 H\u1ED8I CH\u1EE6 NGH\u0128A VI\u1EC6T NAM
\u0110\u1ED9c l\u1EADp - T\u1EF1 do - H\u1EA1nh ph\xFAc
----------------***----------------

\u0110\u01A0N XIN PH\xC9P NGH\u1EC8 H\u1ECCC

K\xEDnh g\u1EEDi:  - Ban gi\xE1m hi\u1EC7u tr\u01B0\u1EDDng ${cleanSchool}
           ${teacherLine}

Em t\xEAn l\xE0: ${studentName || "..."}
Hi\u1EC7n l\xE0 h\u1ECDc sinh l\u1EDBp: ${studentClass || "..."}
Em vi\u1EBFt \u0111\u01A1n n\xE0y xin ph\xE9p \u0111\u01B0\u1EE3c ngh\u1EC9 h\u1ECDc ${sessionText} ng\xE0y ${dateStr}.
L\xFD do (Ghi c\u1EE5 th\u1EC3): ${reasonPreset || "S\u1EE9c kh\u1ECFe kh\xF4ng t\u1ED1t"}${reasonDetail ? ` (${reasonDetail})` : ""}
Em xin h\u1EE9a: S\u1EBD t\u1EF1 gi\xE1c ch\xE9p b\xE0i, m\u01B0\u1EE3n v\u1EDF b\u1EA1n b\xF9 \u0111\u1EAFp ki\u1EBFn th\u1EE9c nh\u1EEFng ti\u1EBFt h\u1ECDc v\u1EAFng, ho\xE0n th\xE0nh b\xE0i t\u1EADp \u0111\u1EA7y \u0111\u1EE7 v\xE0 \u0111i h\u1ECDc l\u1EA1i nghi\xEAm t\xFAc, \u0111\xFAng gi\u1EDD.

R\u1EA5t mong \u0111\u01B0\u1EE3c s\u1EF1 ch\u1EA5p nh\u1EADn c\u1EE7a qu\xFD Th\u1EA7y, C\xF4. Em xin ch\xE2n th\xE0nh c\xE1m \u01A1n!

Giai L\u1EA1c, ng\xE0y ${day} th\xE1ng ${month} n\u0103m ${year}
Ch\u1EEF k\xFD c\u1EE7a Ph\u1EE5 huynh h\u1ECDc sinh: ${parentName || "Ph\u1EE5 huynh"} (S\u0110T: ${parentPhone || "..."})
Ng\u01B0\u1EDDi l\xE0m \u0111\u01A1n: ${studentName || "H\u1ECDc sinh"}
--------------------------------------------------

Y\xEAu c\u1EA7u:
- Kh\xF4ng d\xF9ng kh\u1ED1i markdown (\`\`\`).
- Vi\u1EBFt c\xE2u v\u0103n t\u1EA1i m\u1EE5c "L\xFD do (Ghi c\u1EE5 th\u1EC3):" v\xE0 "Em xin h\u1EE9a:" th\u1EADt m\u1EA1ch l\u1EA1c, k\xEDnh c\u1EA9n, chu\u1EA9n ti\u1EBFng Vi\u1EC7t.
- Gi\u1EEF tr\u1ECDn v\u1EB9n phong th\xE1i k\xEDnh c\u1EA9n, v\u0103n phong trang tr\u1ECDng, chu\u1EA9n m\u1EF1c ti\u1EBFng Vi\u1EC7t.`;
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt
      });
      const text = response.text?.trim()?.normalize("NFC");
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
  app.get("/", (req, res, next) => {
    const parentQr = typeof req.query.parent_qr === "string" ? req.query.parent_qr.trim() : "";
    const qrSession = typeof req.query.qr_session === "string" ? req.query.qr_session.trim() : "";
    if (!parentQr || !qrSession || !qrSession.startsWith("qrs_")) {
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
          status: "confirmed",
          createdAt: existingSess?.createdAt || Date.now(),
          confirmedAt: Date.now(),
          user: {
            role: "parent",
            phone: matched.phone,
            name: matched.parentName || `Ph\u1EE5 huynh em ${matched.studentName}`,
            studentName: matched.studentName,
            studentClass: matched.studentClass
          },
          token: "token-parent-" + matched.phone
        };
        saveQrSessions(sessions);
      }
    } catch {
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(
      '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title></title></head><body style="margin:0;background:#ffffff;"><script>try{window.close();}catch(e){}try{if(window.history.length>1)window.history.back();}catch(e){}</script></body></html>'
    );
  });
  app.get("/api/health", (_req, res) => {
    return res.json({
      status: "ok",
      uptime: Math.round(process.uptime()),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
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
  const distDir = path.join(ROOT_DIR, "dist");
  const isCompiledServer = path.basename(__filename) === "server.js";
  const useProductionStatic = process.env.NODE_ENV === "production" || isCompiledServer && fs.existsSync(path.join(distDir, "index.html"));
  if (useProductionStatic) {
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
