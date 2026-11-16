import React, { useState, useEffect, useMemo } from 'react';
import {
  QrCode,
  UserPlus,
  Upload,
  Download,
  Printer,
  Trash2,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Phone,
  GraduationCap,
  X,
  Copy,
  Check,
  FileSpreadsheet,
  ImagePlus,
  Link2,
} from 'lucide-react';
import { ParentAccount } from '../types';
import { apiFetch } from '../utils/api';
import { buildParentQrUrl, decodeQrFromImageFile, generateQrDataUrl } from '../utils/qr';

interface ParentManagementProps {
  schoolName?: string;
}

interface ParsedParentRow {
  orderNumber: number;
  studentName: string;
  studentClass: string;
  phone: string;
  zaloQrCode?: string;
}

function normalizePhoneInput(raw: string): string {
  return (raw || '').replace(/[\s.\-()]/g, '').trim();
}

function parseBatchParentLines(rawText: string): ParsedParentRow[] {
  const lines = rawText.split(/\r?\n/);
  const items: ParsedParentRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();
    // Skip header row
    if (
      (lower.includes('họ tên') || lower.includes('họ và tên') || lower.includes('tên học sinh')) &&
      (lower.includes('lớp') || lower.includes('điện thoại') || lower.includes('sđt'))
    ) {
      continue;
    }

    let parts: string[] = [];
    if (trimmed.includes('\t')) {
      parts = trimmed.split('\t');
    } else if (trimmed.includes('|')) {
      parts = trimmed.split('|');
    } else if (trimmed.includes(';')) {
      parts = trimmed.split(';');
    } else if (trimmed.includes(',')) {
      parts = trimmed.split(',');
    } else {
      continue;
    }

    parts = parts.map((p) => p.trim()).filter((p, idx) => idx < 4 || p.length > 0);

    let orderNumber = items.length + 1;
    let studentName = '';
    let studentClass = '';
    let phone = '';
    let zaloQrCode = '';

    if (parts.length >= 4) {
      // [TT, Họ tên học sinh, Lớp, Số điện thoại, (optional Zalo QR)]
      const maybeOrder = parseInt(parts[0], 10);
      if (!Number.isNaN(maybeOrder) && maybeOrder > 0) {
        orderNumber = maybeOrder;
      }
      studentName = parts[1];
      studentClass = parts[2];
      phone = normalizePhoneInput(parts[3]);
      zaloQrCode = (parts[4] || '').trim();
    } else if (parts.length === 3) {
      // [Họ tên học sinh, Lớp, Số điện thoại]
      studentName = parts[0];
      studentClass = parts[1];
      phone = normalizePhoneInput(parts[2]);
    } else {
      continue;
    }

    if (studentName && phone) {
      items.push({
        orderNumber,
        studentName: studentName.normalize('NFC'),
        studentClass: studentClass.normalize('NFC').toUpperCase(),
        phone,
        ...(zaloQrCode ? { zaloQrCode } : {}),
      });
    }
  }

  return items;
}

async function createBrandedQrCardBlob(
  parent: ParentAccount,
  qrDataUrl: string,
  schoolName: string
): Promise<Blob | null> {
  const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = qrDataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = 520;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // White background card
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header bar
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(0, 0, canvas.width, 108);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(schoolName.toUpperCase(), canvas.width / 2, 42);

  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('THẺ ĐĂNG NHẬP QR PHỤ HUYNH', canvas.width / 2, 78);

  // QR Image centered with quiet zone
  const qrSize = 310;
  const qrX = (canvas.width - qrSize) / 2;
  const qrY = 132;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Student Details
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`Học sinh: ${parent.studentName}`, canvas.width / 2, 492);

  ctx.fillStyle = '#1e40af';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`Lớp: ${parent.studentClass || '---'}  •  SĐT: ${parent.phone}`, canvas.width / 2, 530);

  ctx.fillStyle = '#475569';
  ctx.font = '15px sans-serif';
  ctx.fillText('Quét bằng Zalo trên máy tính hoặc dùng ảnh này để đăng nhập trên điện thoại', canvas.width / 2, 578);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px sans-serif';
  ctx.fillText(`TT #${parent.orderNumber}`, canvas.width / 2, 610);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

export const ParentManagement: React.FC<ParentManagementProps> = ({
  schoolName = 'Trường THCS Giai Lạc',
}) => {
  const [parents, setParents] = useState<ParentAccount[]>([]);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  // Add Single Parent Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [singleStudentName, setSingleStudentName] = useState<string>('');
  const [singleStudentClass, setSingleStudentClass] = useState<string>('');
  const [singlePhone, setSinglePhone] = useState<string>('');

  // Batch Upload / Paste Modal
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchText, setBatchText] = useState<string>('');
  const [batchNotice, setBatchNotice] = useState<string>('');
  const [isSubmittingBatch, setIsSubmittingBatch] = useState<boolean>(false);

  // Preview QR Modal
  const [previewParent, setPreviewParent] = useState<ParentAccount | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Link Zalo Personal QR Modal
  const [zaloModalParent, setZaloModalParent] = useState<ParentAccount | null>(null);
  const [zaloQrInput, setZaloQrInput] = useState<string>('');
  const [isDecodingZaloAdmin, setIsDecodingZaloAdmin] = useState<boolean>(false);

  // Notifications
  const [toastMessage, setToastMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadParents = async () => {
    setIsLoading(true);
    try {
      const { data } = await apiFetch('/api/parents');
      if (data.success && Array.isArray(data.data)) {
        setParents(data.data);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể tải danh sách phụ huynh.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadParents();
  }, []);

  // Generate QR data URLs whenever parents change
  useEffect(() => {
    let cancelled = false;
    const buildAll = async () => {
      const nextMap: Record<string, string> = {};
      await Promise.all(
        parents.map(async (p) => {
          try {
            const payload = buildParentQrUrl(p.qrToken);
            nextMap[p.id] = await generateQrDataUrl(payload, 240);
          } catch {
            // ignore single item error
          }
        })
      );
      if (!cancelled) {
        setQrMap(nextMap);
      }
    };
    if (parents.length > 0) {
      buildAll();
    } else {
      setQrMap({});
    }
    return () => {
      cancelled = true;
    };
  }, [parents]);

  const allClasses = useMemo(() => {
    const s = new Set<string>();
    parents.forEach((p) => {
      if (p.studentClass) s.add(p.studentClass);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [parents]);

  const filteredParents = useMemo(() => {
    return parents.filter((p) => {
      if (selectedClass !== 'all' && p.studentClass.toLowerCase() !== selectedClass.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.studentName.toLowerCase().includes(q);
        const matchClass = p.studentClass.toLowerCase().includes(q);
        const matchPhone = p.phone.includes(q);
        if (!matchName && !matchClass && !matchPhone) return false;
      }
      return true;
    });
  }, [parents, selectedClass, searchQuery]);

  const parsedPreviewCount = useMemo(() => {
    return parseBatchParentLines(batchText).length;
  }, [batchText]);

  const handleAddSingleParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!singleStudentName.trim() || !singleStudentClass.trim() || !singlePhone.trim()) return;

    try {
      const { ok, data } = await apiFetch('/api/parents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: singleStudentName.trim(),
          studentClass: singleStudentClass.trim().toUpperCase(),
          phone: normalizePhoneInput(singlePhone),
        }),
      });
      if (!ok || !data.success) {
        throw new Error(data.message || 'Không thể cấp tài khoản phụ huynh.');
      }
      showToast(data.message || `Đã cấp tài khoản & mã QR cho SĐT ${singlePhone}`);
      setSingleStudentName('');
      setSingleStudentClass('');
      setSinglePhone('');
      setShowAddModal(false);
      loadParents();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi thêm tài khoản phụ huynh.');
    }
  };

  const handleFileUploadBatch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBatchText(reader.result);
        setBatchNotice('');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleProcessBatch = async () => {
    setBatchNotice('');
    if (!batchText.trim()) {
      setBatchNotice('Vui lòng tải tệp CSV/TXT hoặc dán danh sách từ Excel vào ô bên dưới.');
      return;
    }

    const items = parseBatchParentLines(batchText);
    if (items.length === 0) {
      setBatchNotice(
        'Không tìm thấy dòng hợp lệ. Vui lòng nhập đúng 4 cột: TT | Họ tên học sinh | Lớp | Số điện thoại.'
      );
      return;
    }

    setIsSubmittingBatch(true);
    try {
      const { ok, data } = await apiFetch('/api/parents/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!ok || !data.success) {
        throw new Error(data.message || 'Không thể cấp tài khoản hàng loạt.');
      }
      showToast(data.message || `Đã cấp tài khoản & sinh mã QR cho ${data.count} phụ huynh!`);
      setBatchText('');
      setShowBatchModal(false);
      loadParents();
    } catch (err: any) {
      setBatchNotice(err.message || 'Lỗi khi xử lý danh sách phụ huynh.');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  const handleRegenerateQr = async (parent: ParentAccount) => {
    try {
      const { ok, data } = await apiFetch(`/api/parents/${parent.id}/regenerate-qr`, {
        method: 'PATCH',
      });
      if (ok && data.success) {
        showToast(data.message || `Đã tạo mã QR mới cho ${parent.studentName}.`);
        loadParents();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi khi cấp lại mã QR.');
    }
  };

  const handleDeleteParent = async (parent: ParentAccount) => {
    try {
      const { ok, data } = await apiFetch(`/api/parents/${parent.id}`, {
        method: 'DELETE',
      });
      if (ok && data.success) {
        showToast(`Đã xóa tài khoản phụ huynh của em ${parent.studentName} (${parent.phone}).`);
        if (previewParent?.id === parent.id) setPreviewParent(null);
        loadParents();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi khi xóa tài khoản phụ huynh.');
    }
  };

  const handleDownloadQrCard = async (parent: ParentAccount) => {
    try {
      const qrDataUrl = qrMap[parent.id] || (await generateQrDataUrl(buildParentQrUrl(parent.qrToken), 300));
      const blob = await createBrandedQrCardBlob(parent, qrDataUrl, schoolName);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR_${parent.studentClass || 'HS'}_${parent.phone}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Đã tải ảnh thẻ QR của em ${parent.studentName}!`);
    } catch {
      setErrorMessage('Không thể tạo ảnh thẻ QR để tải về.');
    }
  };

  const handleSaveZaloQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zaloModalParent) return;
    try {
      const { ok, data } = await apiFetch(`/api/parents/${zaloModalParent.id}/zalo-qr`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zaloQrCode: zaloQrInput.trim() }),
      });
      if (!ok || !data.success) {
        throw new Error(data.message || 'Không thể lưu mã QR Zalo.');
      }
      showToast(data.message || 'Đã cập nhật mã QR Zalo cá nhân.');
      setZaloModalParent(null);
      setZaloQrInput('');
      loadParents();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi khi gắn mã QR Zalo.');
    }
  };

  const handleDecodeZaloQrForAdmin = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsDecodingZaloAdmin(true);
    try {
      const decoded = await decodeQrFromImageFile(file);
      setZaloQrInput(decoded.trim());
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không đọc được mã QR từ ảnh đã chọn.');
    } finally {
      setIsDecodingZaloAdmin(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['TT', 'Họ tên học sinh', 'Lớp', 'Số điện thoại', 'Link đăng nhập QR'];
    const rows = [headers.join(',')];

    filteredParents.forEach((p, idx) => {
      const link = buildParentQrUrl(p.qrToken);
      const row = [
        idx + 1,
        `"${p.studentName.replace(/"/g, '""')}"`,
        `"${p.studentClass.replace(/"/g, '""')}"`,
        `"${p.phone}"`,
        `"${link}"`,
      ];
      rows.push(row.join(','));
    });

    const csvContent = '\ufeff' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_sach_QR_phu_huynh_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print QR cards via hidden iframe (safe in iframe preview, avoids window.open)
  const handlePrintQrSheet = async () => {
    if (filteredParents.length === 0) return;

    const cardsHtml = (
      await Promise.all(
        filteredParents.map(async (p, idx) => {
          const qrSrc = qrMap[p.id] || (await generateQrDataUrl(buildParentQrUrl(p.qrToken), 200));
          return `
            <div class="card">
              <div class="school">${schoolName.toUpperCase()}</div>
              <div class="title">THẺ ĐĂNG NHẬP QR PHỤ HUYNH</div>
              <img src="${qrSrc}" alt="QR ${p.phone}" />
              <div class="student">${idx + 1}. ${p.studentName}</div>
              <div class="meta">Lớp: <b>${p.studentClass || '---'}</b> • SĐT: <b>${p.phone}</b></div>
              <div class="hint">Quét bằng Zalo trên máy tính hoặc chụp ảnh QR để đăng nhập</div>
            </div>
          `;
        })
      )
    ).join('');

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Phiếu Mã QR Phụ Huynh - ${schoolName}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: 'Times New Roman', serif; margin: 0; color: #0f172a; }
            h2 { text-align: center; font-size: 14pt; margin: 0 0 10px 0; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
            .card {
              border: 1px dashed #64748b;
              border-radius: 8px;
              padding: 10px;
              text-align: center;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .school { font-size: 9pt; font-weight: bold; color: #1d4ed8; }
            .title { font-size: 10pt; font-weight: bold; margin: 2px 0 6px 0; }
            .card img { width: 135px; height: 135px; display: block; margin: 0 auto 6px auto; }
            .student { font-size: 11pt; font-weight: bold; }
            .meta { font-size: 10pt; margin-top: 2px; }
            .hint { font-size: 8.5pt; color: #475569; margin-top: 4px; font-style: italic; }
          </style>
        </head>
        <body>
          <h2>DANH SÁCH THẺ QR ĐĂNG NHẬP PHỤ HUYNH — ${schoolName.toUpperCase()}</h2>
          <div class="grid">${cardsHtml}</div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 350);
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Actions Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Tự động sinh mã QR theo Số điện thoại phụ huynh</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-600" />
              <span>Quản Lý & Cấp Tài Khoản QR Phụ Huynh</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Úp danh sách gồm: <b>TT, Họ tên học sinh, Lớp, Số điện thoại</b>. Phụ huynh quét QR qua Zalo hoặc tải ảnh QR để đăng nhập không cần mật khẩu.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Úp Danh Sách Phụ Huynh</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-500" />
              <span>+ Thêm 1 Phụ Huynh</span>
            </button>

            <button
              type="button"
              onClick={handlePrintQrSheet}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition"
              title="In phiếu mã QR phát cho phụ huynh"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>In Phiếu QR</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs font-bold shadow-2xs transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Stats + Filter strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-4 mt-4 border-t border-slate-100 text-xs items-center">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Tổng tài khoản PH:</span>
            <span className="font-extrabold text-slate-900 ml-1.5 text-sm">{parents.length}</span>
          </div>
          <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-200">
            <span className="text-blue-700 font-medium">Số lớp đã cấp:</span>
            <span className="font-extrabold text-blue-900 ml-1.5 text-sm">{allClasses.length}</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên HS, lớp hoặc SĐT..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="all">Tất cả các lớp ({allClasses.length} lớp)</option>
              {allClasses.map((cls) => (
                <option key={cls} value={cls}>
                  Lớp {cls}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Parents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 text-center w-12">TT</th>
                <th className="py-3 px-4 min-w-[180px]">Họ tên học sinh</th>
                <th className="py-3 px-3 text-center w-24">Lớp</th>
                <th className="py-3 px-3 min-w-[130px]">Số điện thoại</th>
                <th className="py-3 px-3 text-center w-32">QR Hệ Thống</th>
                <th className="py-3 px-3 text-center w-40">QR Zalo Cá Nhân</th>
                <th className="py-3 px-3 text-center w-32">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredParents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    {isLoading
                      ? 'Đang tải danh sách tài khoản phụ huynh...'
                      : 'Chưa có tài khoản phụ huynh phù hợp. Hãy bấm "Úp Danh Sách Phụ Huynh" để cấp mới.'}
                  </td>
                </tr>
              ) : (
                filteredParents.map((p, idx) => {
                  const qrSrc = qrMap[p.id];
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>

                      <td className="py-3 px-4 font-bold text-slate-900">{p.studentName}</td>

                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                          <GraduationCap className="w-3 h-3 text-indigo-600" />
                          {p.studentClass || '---'}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-blue-700">
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {p.phone}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {qrSrc ? (
                          <button
                            type="button"
                            onClick={() => setPreviewParent(p)}
                            className="inline-flex flex-col items-center gap-1 p-1.5 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition group"
                            title="Bấm để phóng to và tải ảnh QR"
                          >
                            <img src={qrSrc} alt={`QR ${p.phone}`} className="w-12 h-12 object-contain" />
                            <span className="text-[10px] font-bold text-blue-600 group-hover:underline">
                              Phóng to
                            </span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Đang tạo...</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {p.zaloQrCode ? (
                          <button
                            type="button"
                            onClick={() => {
                              setZaloModalParent(p);
                              setZaloQrInput(p.zaloQrCode || '');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                            title={p.zaloQrCode}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Đã gắn QR Zalo</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setZaloModalParent(p);
                              setZaloQrInput('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>Gắn QR Zalo</span>
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDownloadQrCard(p)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                            title="Tải ảnh thẻ QR PNG"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRegenerateQr(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                            title="Cấp lại mã QR mới"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteParent(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Xóa tài khoản phụ huynh"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Add Single Parent */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              <span>Cấp Tài Khoản Phụ Huynh & Sinh Mã QR</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Hệ thống tự động sinh mã QR riêng theo số điện thoại phụ huynh.
            </p>

            <form onSubmit={handleAddSingleParent} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Họ tên học sinh <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={singleStudentName}
                  onChange={(e) => setSingleStudentName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Minh Khang"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lớp <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={singleStudentClass}
                  onChange={(e) => setSingleStudentClass(e.target.value)}
                  placeholder="VD: 6A1"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Số điện thoại phụ huynh <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={singlePhone}
                  onChange={(e) => setSinglePhone(e.target.value)}
                  placeholder="VD: 0987654321"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 px-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition"
                >
                  Cấp Tài Khoản & Mã QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Batch Upload / Paste Parents */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <span>Úp Danh Sách Cấp Tài Khoản & QR Phụ Huynh</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Đúng 4 cột: <b>TT | Họ tên học sinh | Lớp | Số điện thoại</b>
                </p>
              </div>

              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold cursor-pointer transition shrink-0">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Chọn tệp CSV / TXT</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUploadBatch}
                  className="hidden"
                />
              </label>
            </div>

            {batchNotice && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{batchNotice}</span>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-semibold">
                Hoặc dán trực tiếp từ Excel (nhận diện được:{' '}
                <b className="text-blue-700">{parsedPreviewCount} học sinh</b>):
              </span>
              <button
                type="button"
                onClick={() => {
                  setBatchText(
                    `TT\tHọ tên học sinh\tLớp\tSố điện thoại\n1\tNguyễn Gia Bảo\t6A1\t0988112201\n2\tLê Minh Anh\t6A2\t0988112202\n3\tPhạm Tuấn Kiệt\t7B1\t0988112203\n4\tHoàng Thảo Vy\t8A3\t0988112204`
                  );
                }}
                className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
              >
                + Dán ví dụ mẫu
              </button>
            </div>

            <textarea
              rows={8}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={`1\tNguyễn Gia Bảo\t6A1\t0988112201\n2\tLê Minh Anh\t6A2\t0988112202`}
              className="w-full mt-1.5 p-3 rounded-xl border border-slate-300 text-xs font-mono leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />

            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-900 mt-3 leading-relaxed">
              💡 <b>Hướng dẫn:</b> Bạn có thể chọn 4 cột trong Excel (<b>TT</b>, <b>Họ tên học sinh</b>, <b>Lớp</b>, <b>Số điện thoại</b>), nhấn Ctrl+C rồi dán vào ô trên hoặc tải file CSV. Sau khi cấp tài khoản, hệ thống tự động tạo mã QR theo từng số điện thoại.
            </div>

            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setShowBatchModal(false);
                  setBatchNotice('');
                }}
                className="flex-1 py-2.5 px-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSubmittingBatch}
                onClick={handleProcessBatch}
                className="flex-1 py-2.5 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition disabled:opacity-50"
              >
                {isSubmittingBatch
                  ? 'Đang sinh mã QR...'
                  : `Cấp Tài Khoản & Sinh Mã QR (${parsedPreviewCount})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Preview Zoom QR */}
      {previewParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center relative">
            <button
              type="button"
              onClick={() => setPreviewParent(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 mb-2">
              <QrCode className="w-3.5 h-3.5" />
              Mã QR Phụ Huynh
            </span>
            <h4 className="text-base font-black text-slate-900">{previewParent.studentName}</h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Lớp <b>{previewParent.studentClass || '---'}</b> • SĐT:{' '}
              <b className="font-mono text-blue-700">{previewParent.phone}</b>
            </p>

            <div className="my-4 p-3 bg-white border-2 border-slate-200 rounded-2xl inline-block shadow-xs">
              {qrMap[previewParent.id] && (
                <img
                  src={qrMap[previewParent.id]}
                  alt={`QR ${previewParent.phone}`}
                  className="w-52 h-52 mx-auto"
                />
              )}
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
              Phụ huynh mở <b>Zalo</b> quét mã này trên máy tính, hoặc lưu/chụp ảnh mã QR này để đăng nhập trên điện thoại.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(buildParentQrUrl(previewParent.qrToken));
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Đã chép link' : 'Chép Link QR'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadQrCard(previewParent)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Ảnh QR</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Link Zalo Personal QR */}
      {zaloModalParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-emerald-600" />
                <span>Gắn Mã QR Zalo Cá Nhân</span>
              </h3>
              <button
                type="button"
                onClick={() => setZaloModalParent(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Học sinh: <b>{zaloModalParent.studentName}</b> ({zaloModalParent.studentClass}) — SĐT:{' '}
              <b className="font-mono text-blue-700">{zaloModalParent.phone}</b>
            </p>

            <form onSubmit={handleSaveZaloQr} className="space-y-4">
              <div>
                <label className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-bold cursor-pointer transition mb-3">
                  <ImagePlus className="w-4 h-4" />
                  <span>
                    {isDecodingZaloAdmin
                      ? 'Đang giải mã ảnh QR Zalo...'
                      : 'Chọn ảnh Mã QR Zalo cá nhân để tự nhận diện'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleDecodeZaloQrForAdmin}
                    className="hidden"
                  />
                </label>

                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nội dung / Link mã QR Zalo cá nhân
                </label>
                <input
                  type="text"
                  value={zaloQrInput}
                  onChange={(e) => setZaloQrInput(e.target.value)}
                  placeholder="VD: https://zalo.me/qr/p/..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  * Dùng khi phụ huynh dùng nút &ldquo;Đăng nhập bằng ảnh QR Zalo&rdquo; trên điện thoại (Zalo cá nhân dạng zalo.me/qr/p/...).
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZaloModalParent(null)}
                  className="flex-1 py-2.5 px-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition"
                >
                  Lưu Mã QR Zalo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
