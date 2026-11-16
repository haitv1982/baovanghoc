import React, { useState } from 'react';
import { X, FileText, Image as ImageIcon, Download, Copy, Check, Printer, User } from 'lucide-react';
import { AbsenceRecord } from '../types';
import { FormalLeaveDocument, cleanSchoolDisplay, extractLetterFields } from './FormalLeaveDocument';

interface ProofModalProps {
  record: AbsenceRecord | null;
  onClose: () => void;
  schoolName?: string;
}

export const ProofModal: React.FC<ProofModalProps> = ({ record, onClose, schoolName = 'THCS Giai Lạc' }) => {
  const [activeTab, setActiveTab] = useState<'letter' | 'attachment'>('letter');
  const [copied, setCopied] = useState(false);

  if (!record) return null;

  const hasAttachment = Boolean(record.attachmentData || record.attachmentName);
  const isImageAttachment = record.attachmentType?.startsWith('image/') ||
    record.attachmentName?.match(/\.(jpg|jpeg|png|webp|gif)$/i);

  const schoolDisplay = cleanSchoolDisplay(schoolName);
  const nfcStudent = (record.studentName || '').normalize('NFC');
  const nfcClass = (record.studentClass || '').normalize('NFC');
  const nfcTeacher = (record.teacherName || '').normalize('NFC');
  const nfcParent = (record.parentName || '').normalize('NFC');
  const nfcPhone = (record.parentPhone || '').normalize('NFC');

  const sessionText =
    record.morning && record.afternoon
      ? 'cả ngày (buổi sáng và buổi chiều)'
      : record.morning
      ? 'buổi sáng'
      : record.afternoon
      ? 'buổi chiều'
      : 'trong ngày';

  let day = '...';
  let month = '...';
  let year = '2026';
  if (record.date && record.date.includes('-')) {
    const [y, m, d] = record.date.split('-');
    day = d || '...';
    month = m || '...';
    year = y || '2026';
  }

  const defaultReason = `${(record.reasonPreset || '').normalize('NFC')}${
    record.reasonDetail?.trim() ? ` (${record.reasonDetail.trim().normalize('NFC')})` : ''
  }`;
  const defaultPromise =
    'Sẽ tự giác chép bài, mượn vở bạn bù đắp kiến thức những tiết học vắng, hoàn thành bài tập đầy đủ và đi học lại nghiêm túc, đúng giờ.';
  const { reasonText, promiseText } = extractLetterFields(record.aiLetter, defaultReason, defaultPromise);

  const buildStandardLetterHtml = (forPrint = false) => `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Đơn xin phép nghỉ học - ${nfcStudent}</title>
      <style>
        @page { size: A4 portrait; margin: 2cm 2cm 2cm 2.5cm; }
        body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.55; margin: ${forPrint ? '35px 45px' : '0'}; color: #000000; }
        .header { text-align: center; margin-bottom: 18pt; }
        .national-motto { font-size: 13pt; font-weight: bold; text-transform: uppercase; }
        .independence { font-size: 13pt; font-weight: bold; margin-top: 2pt; }
        .divider { font-size: 11pt; margin-top: 2pt; letter-spacing: 1pt; }
        .title { text-align: center; font-size: 17pt; font-weight: bold; text-transform: uppercase; margin: 18pt 0 14pt 0; }
        .recipient-table { width: 100%; border-collapse: collapse; margin-bottom: 12pt; margin-left: 24pt; }
        .recipient-table td { border: none; padding: 1.5pt 2pt; font-size: 14pt; vertical-align: top; }
        .line-item { margin: 6pt 0; text-align: justify; }
        .date-location { text-align: right; margin-top: 22pt; margin-bottom: 14pt; font-style: italic; padding-right: 12pt; }
        .signatures { width: 100%; border-collapse: collapse; margin-top: 8pt; }
        .signatures td { width: 50%; text-align: center; vertical-align: top; border: none; font-size: 14pt; }
        .sig-title { font-weight: bold; }
        .sig-note { font-style: italic; font-weight: normal; font-size: 12pt; }
        .sig-space { height: 56pt; }
        .sig-name { font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="national-motto">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div class="independence">Độc lập - Tự do - Hạnh phúc</div>
        <div class="divider">----------------***----------------</div>
      </div>

      <div class="title">ĐƠN XIN PHÉP NGHỈ HỌC</div>

      <table class="recipient-table">
        <tr>
          <td style="width: 78pt; font-weight: bold;">Kính gửi:</td>
          <td>- Ban giám hiệu trường ${schoolDisplay}</td>
        </tr>
        <tr>
          <td></td>
          <td>- Giáo viên chủ nhiệm lớp <b>${nfcClass}</b>${nfcTeacher ? ` (${nfcTeacher})` : ''}</td>
        </tr>
      </table>

      <div class="line-item"><b>Em tên là:</b> <b>${nfcStudent}</b></div>
      <div class="line-item"><b>Hiện là học sinh lớp:</b> <b>${nfcClass}</b></div>
      <div class="line-item">Em viết đơn này xin phép được nghỉ học <b>${sessionText}</b> ngày <b>${record.dateDisplay}</b>.</div>
      <div class="line-item"><b>Lý do (Ghi cụ thể):</b> ${reasonText}</div>
      <div class="line-item"><b>Em xin hứa:</b> ${promiseText}</div>
      <div class="line-item" style="margin-top: 10pt;">Rất mong được sự chấp nhận của quý Thầy, Cô. Em xin chân thành cám ơn!</div>

      <div class="date-location">
        Giai Lạc, ngày ${day} tháng ${month} năm ${year}
      </div>

      <table class="signatures">
        <tr>
          <td>
            <div class="sig-title">Chữ ký của Phụ huynh học sinh</div>
            <div class="sig-note">(Ký và ghi rõ họ tên)</div>
          </td>
          <td>
            <div class="sig-title">Người làm đơn</div>
            <div class="sig-note">(Ghi rõ họ và tên)</div>
          </td>
        </tr>
        <tr>
          <td class="sig-space"></td>
          <td class="sig-space"></td>
        </tr>
        <tr>
          <td>
            <div class="sig-name">${nfcParent}</div>
            <div style="font-style: italic; font-size: 12pt;">(SĐT: ${nfcPhone})</div>
          </td>
          <td class="sig-name">${nfcStudent}</td>
        </tr>
      </table>
      ${forPrint ? '<script>window.onload = function() { window.print(); window.close(); }</script>' : ''}
    </body>
    </html>
  `.normalize('NFC');

  const handleCopyLetter = () => {
    const plainText = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n----------------***----------------\n\nĐƠN XIN PHÉP NGHỈ HỌC\n\nKính gửi: - Ban giám hiệu trường ${schoolDisplay}\n          - Giáo viên chủ nhiệm lớp ${nfcClass}${nfcTeacher ? ` (${nfcTeacher})` : ''}\n\nEm tên là: ${nfcStudent}\nHiện là học sinh lớp: ${nfcClass}\nEm viết đơn này xin phép được nghỉ học ${sessionText} ngày ${record.dateDisplay}.\nLý do (Ghi cụ thể): ${reasonText}\nEm xin hứa: ${promiseText}\n\nRất mong được sự chấp nhận của quý Thầy, Cô. Em xin chân thành cám ơn!\n\nGiai Lạc, ngày ${day} tháng ${month} năm ${year}\nPhụ huynh: ${nfcParent} (SĐT: ${nfcPhone}) | Người làm đơn: ${nfcStudent}`.normalize('NFC');
    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadWordDoc = () => {
    const content = buildStandardLetterHtml(false);
    const blob = new Blob(['\ufeff' + content], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Don_xin_nghi_hoc_${nfcStudent.replace(/\s+/g, '_')}_${record.date}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(buildStandardLetterHtml(true));
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-xs">
                Lớp {record.studentClass}
              </span>
              <span className="text-blue-100 text-xs">
                {record.dateDisplay} • {record.morning && record.afternoon ? 'Nghỉ Cả Ngày' : record.morning ? 'Nghỉ Buổi Sáng' : 'Nghỉ Buổi Chiều'}
              </span>
            </div>
            <h3 className="text-xl font-bold mt-1.5 flex items-center gap-2 text-white">
              <User className="w-5 h-5 text-blue-200" />
              {record.studentName}
            </h3>
            <p className="text-xs text-blue-100 mt-1">
              Phụ huynh: <span className="font-medium text-white">{record.parentName}</span> ({record.parentPhone || 'Chưa có SĐT'}) • GVCN: <span className="font-medium text-white">{record.teacherName || 'Chưa cập nhật'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 pt-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('letter')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
                activeTab === 'letter'
                  ? 'border-blue-600 bg-white text-blue-700 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              Đơn xin nghỉ học (Biểu mẫu chuẩn)
            </button>
            <button
              onClick={() => setActiveTab('attachment')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
                activeTab === 'attachment'
                  ? 'border-blue-600 bg-white text-blue-700 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Minh chứng đính kèm {hasAttachment ? ' (1)' : ' (Trống)'}
            </button>
          </div>

          {activeTab === 'letter' && (
            <div className="flex items-center gap-2 pb-2">
              <button
                onClick={handleCopyLetter}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                title="Sao chép nội dung đơn"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Đã sao chép' : 'Sao chép'}
              </button>
              <button
                onClick={handleDownloadWordDoc}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-2xs"
                title="Tải văn bản Word .doc"
              >
                <Download className="w-3.5 h-3.5" />
                Tải file Word (.doc)
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                title="In văn bản"
              >
                <Printer className="w-3.5 h-3.5" />
                In
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto bg-slate-100/70">
          {activeTab === 'letter' ? (
            <FormalLeaveDocument
              schoolName={schoolName}
              studentName={record.studentName}
              studentClass={record.studentClass}
              teacherName={record.teacherName}
              date={record.date}
              dateDisplay={record.dateDisplay}
              morning={record.morning}
              afternoon={record.afternoon}
              reasonPreset={record.reasonPreset}
              reasonDetail={record.reasonDetail}
              parentName={record.parentName}
              parentPhone={record.parentPhone}
              aiLetter={record.aiLetter}
            />
          ) : (
            <div className="space-y-4">
              {hasAttachment ? (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-800">Tên tệp:</span>
                      <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {record.attachmentName || 'Tệp đính kèm'}
                      </span>
                    </div>
                    {record.attachmentData && (
                      <a
                        href={record.attachmentData}
                        download={record.attachmentName || 'minh_chung_nghi_hoc'}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Tải tệp về máy
                      </a>
                    )}
                  </div>

                  {isImageAttachment && record.attachmentData ? (
                    <div className="flex flex-col items-center">
                      <div className="rounded-lg overflow-hidden border border-slate-200 max-h-[400px] w-full flex justify-center bg-slate-900/5 p-2">
                        <img
                          src={record.attachmentData}
                          alt="Minh chứng xin nghỉ"
                          className="max-h-[380px] w-auto object-contain rounded shadow-xs"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Ảnh minh chứng: Toa thuốc / Sổ khám / Đơn viết tay</p>
                    </div>
                  ) : record.attachmentData ? (
                    <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
                      <FileText className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-800">Tệp tài liệu văn bản Word / PDF</p>
                      <p className="text-xs text-slate-500 mt-1">{record.attachmentName}</p>
                      <a
                        href={record.attachmentData}
                        download={record.attachmentName || 'tai_lieu_dinh_kem.docx'}
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition shadow-xs"
                      >
                        <Download className="w-4 h-4" />
                        Bấm vào đây để tải và mở tệp Word
                      </a>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 text-amber-800 rounded-lg text-sm">
                      Phụ huynh đã khai báo tệp minh chứng: <b>{record.attachmentName}</b> (bản cứng lưu tại hồ sơ).
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-xl border border-dashed border-slate-200 text-center">
                  <ImageIcon className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-600">Phụ huynh không đính kèm ảnh hoặc file tài liệu ngoài.</p>
                  <p className="text-xs text-slate-400 mt-1">Đơn xin nghỉ học bằng văn bản đã được tạo đầy đủ ở mục bên cạnh.</p>
                </div>
              )}
            </div>
          )}

          {/* Quick Context Summary */}
          <div className="mt-4 p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex flex-wrap gap-4 text-xs text-slate-700">
            <div>
              <span className="text-slate-500">Giáo viên chủ nhiệm:</span>{' '}
              <span className="font-semibold text-slate-900">{record.teacherName || 'Chưa điền'}</span>
            </div>
            <div>
              <span className="text-slate-500">Lý do báo vắng:</span>{' '}
              <span className="font-semibold text-slate-900">{record.reasonPreset}</span>
            </div>
            {record.reasonDetail && (
              <div className="w-full">
                <span className="text-slate-500">Nội dung chi tiết:</span>{' '}
                <span className="text-slate-800 italic">"{record.reasonDetail}"</span>
              </div>
            )}
            {record.adminNote && (
              <div className="w-full text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200">
                <span className="font-semibold">Phản hồi từ Nhà trường:</span> {record.adminNote}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Mã đơn: <span className="font-mono text-slate-700 font-medium">{record.id}</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-xs"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
