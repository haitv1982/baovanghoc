import React, { useState } from 'react';
import { X, FileText, Image as ImageIcon, Download, Copy, Check, Printer, User, Calendar, Clock, AlertCircle } from 'lucide-react';
import { AbsenceRecord } from '../types';

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

  const sessionText =
    record.morning && record.afternoon
      ? 'cả ngày (buổi sáng và buổi chiều)'
      : record.morning
      ? 'buổi sáng'
      : record.afternoon
      ? 'buổi chiều'
      : 'trong ngày';

  // Parse date
  let day = '...';
  let month = '...';
  let year = '2026';
  if (record.date && record.date.includes('-')) {
    const [y, m, d] = record.date.split('-');
    day = d;
    month = m;
    year = y;
  }

  const handleCopyLetter = () => {
    if (record.aiLetter) {
      navigator.clipboard.writeText(record.aiLetter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadWordDoc = () => {
    // Generate a Word-compatible HTML blob (.doc) formatted exactly like the photo
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Đơn xin phép nghỉ học - ${record.studentName}</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.5; margin: 40px 60px; color: #000; }
          .header { text-align: center; font-weight: bold; margin-bottom: 25px; }
          .header .national-motto { font-size: 13pt; }
          .header .independence { font-size: 13pt; font-weight: bold; }
          .header .divider { font-size: 11pt; margin-top: 2px; }
          .title { text-align: center; font-size: 17pt; font-weight: bold; margin: 25px 0 20px 0; letter-spacing: 0.5px; }
          .recipient { margin-bottom: 15px; }
          .recipient table { width: 100%; border: none; }
          .line-item { margin: 10px 0; text-align: justify; }
          .line-dots { border-bottom: 1px dotted #333; display: inline-block; }
          .date-location { text-align: right; margin-top: 30px; font-style: italic; }
          .signatures { width: 100%; margin-top: 25px; border-collapse: collapse; }
          .signatures td { width: 50%; text-align: center; vertical-align: top; border: none; font-size: 13pt; }
          .sig-title { font-weight: bold; }
          .sig-note { font-style: italic; font-size: 11pt; margin-top: 4px; }
          .sig-space { height: 75px; }
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

        <div class="recipient">
          <table cellpadding="2">
            <tr>
              <td style="width: 100px; font-weight: bold; vertical-align: top;">Kính gửi:</td>
              <td>- Ban giám hiệu trường ${schoolName}</td>
            </tr>
            <tr>
              <td></td>
              <td>- Giáo viên chủ nhiệm lớp ${record.studentClass} ${record.teacherName ? `(Thầy/Cô: ${record.teacherName})` : ''}</td>
            </tr>
          </table>
        </div>

        <div class="line-item"><b>Em tên là:</b> ${record.studentName}</div>
        <div class="line-item"><b>Hiện là học sinh lớp:</b> ${record.studentClass}</div>
        <div class="line-item"><b>Em viết đơn này xin phép được nghỉ học</b> ${sessionText} ngày ${record.dateDisplay}.</div>
        <div class="line-item"><b>Lý do (Ghi cụ thể):</b> ${record.reasonPreset}. ${record.reasonDetail || ''}</div>
        <div class="line-item"><b>Em xin hứa:</b> Sẽ tự giác chép bài, mượn vở bạn bù đắp kiến thức những tiết học vắng, hoàn thành bài tập đầy đủ và đi học lại nghiêm túc, đúng giờ.</div>
        <div class="line-item" style="margin-top: 15px;">Rất mong được sự chấp nhận của quý Thầy, Cô. Em xin chân thành cám ơn!</div>

        <div class="date-location">
          Giai Lạc, ngày ${day} tháng ${month} năm ${year}
        </div>

        <table class="signatures">
          <tr>
            <td class="sig-title">Chữ ký của Phụ huynh học sinh</td>
            <td class="sig-title">Người làm đơn<br/><span class="sig-note">(Ghi rõ họ và tên)</span></td>
          </tr>
          <tr>
            <td class="sig-space"></td>
            <td class="sig-space"></td>
          </tr>
          <tr>
            <td class="sig-name">${record.parentName}<br/><span style="font-weight:normal; font-size:11pt;">(SĐT: ${record.parentPhone})</span></td>
            <td class="sig-name">${record.studentName}</td>
          </tr>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Don_xin_nghi_hoc_${record.studentName.replace(/\s+/g, '_')}_${record.date}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>In Đơn Xin Nghỉ Học - ${record.studentName}</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 45px 55px; line-height: 1.6; font-size: 14pt; }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .title { font-size: 18pt; margin: 25px 0 20px 0; letter-spacing: 0.5px; }
            .sig-table { width: 100%; margin-top: 35px; border-collapse: collapse; }
            .sig-table td { width: 50%; text-align: center; vertical-align: top; }
            .sig-space { height: 75px; }
          </style>
        </head>
        <body>
          <div class="center bold">
            <div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div>Độc lập - Tự do - Hạnh phúc</div>
            <div style="font-weight: normal; margin-top: 2px;">----------------***----------------</div>
          </div>

          <div class="center bold title">ĐƠN XIN PHÉP NGHỈ HỌC</div>

          <div style="margin-left: 20px; margin-bottom: 20px;">
            <div><b>Kính gửi:</b> &nbsp; - Ban giám hiệu trường ${schoolName}</div>
            <div style="margin-left: 65px;">- Giáo viên chủ nhiệm lớp: ${record.studentClass} ${record.teacherName ? `(Thầy/Cô: ${record.teacherName})` : ''}</div>
          </div>

          <div style="margin-bottom: 10px;"><b>Em tên là:</b> ${record.studentName}</div>
          <div style="margin-bottom: 10px;"><b>Hiện là học sinh lớp:</b> ${record.studentClass}</div>
          <div style="margin-bottom: 10px;"><b>Em viết đơn này xin phép được nghỉ học</b> ${sessionText} ngày ${record.dateDisplay}.</div>
          <div style="margin-bottom: 10px;"><b>Lý do (Ghi cụ thể):</b> ${record.reasonPreset}. ${record.reasonDetail || ''}</div>
          <div style="margin-bottom: 10px;"><b>Em xin hứa:</b> Sẽ tự giác chép bài, mượn vở bạn bù đắp kiến thức những tiết học vắng, hoàn thành bài tập đầy đủ và đi học lại nghiêm túc, đúng giờ.</div>
          <div style="margin-top: 15px;">Rất mong được sự chấp nhận của quý Thầy, Cô. Em xin chân thành cám ơn!</div>

          <div class="right" style="margin-top: 30px; font-style: italic;">
            Giai Lạc, ngày ${day} tháng ${month} năm ${year}
          </div>

          <table class="sig-table">
            <tr>
              <td class="bold">Chữ ký của Phụ huynh học sinh</td>
              <td class="bold">Người làm đơn<br/><span style="font-style: italic; font-weight: normal; font-size: 11pt;">(Ghi rõ họ và tên)</span></td>
            </tr>
            <tr>
              <td class="sig-space"></td>
              <td class="sig-space"></td>
            </tr>
            <tr>
              <td class="bold">${record.parentName}<br/><span style="font-weight: normal; font-size: 11pt;">(SĐT: ${record.parentPhone})</span></td>
              <td class="bold">${record.studentName}</td>
            </tr>
          </table>

          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
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
            /* Official Paper Document View (Styled like standard A4 letter) */
            <div className="bg-white p-8 sm:p-12 rounded-xl border border-slate-300 shadow-md font-times text-slate-900 max-w-2xl mx-auto leading-relaxed text-sm sm:text-base">
              {/* Quốc hiệu tiêu ngữ */}
              <div className="text-center mb-6">
                <div className="font-bold text-sm sm:text-base uppercase tracking-wider">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </div>
                <div className="font-bold text-sm sm:text-base">
                  Độc lập - Tự do - Hạnh phúc
                </div>
                <div className="text-xs text-slate-600 font-sans tracking-widest mt-0.5">
                  ----------------***----------------
                </div>
              </div>

              {/* Title */}
              <div className="text-center font-bold text-lg sm:text-xl uppercase tracking-wide my-6 text-slate-900">
                ĐƠN XIN PHÉP NGHỈ HỌC
              </div>

              {/* Recipient */}
              <div className="mb-5 space-y-1 pl-4 sm:pl-8 text-sm sm:text-base">
                <div className="flex">
                  <span className="font-bold w-24 shrink-0">Kính gửi:</span>
                  <span>- Ban giám hiệu trường {schoolName}</span>
                </div>
                <div className="flex">
                  <span className="w-24 shrink-0"></span>
                  <span>
                    - Giáo viên chủ nhiệm lớp: <span className="font-bold">{record.studentClass}</span>{' '}
                    {record.teacherName && (
                      <span className="italic text-slate-700">({record.teacherName})</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Student info & reason */}
              <div className="space-y-3 text-sm sm:text-base">
                <div>
                  <span className="font-bold">Em tên là:</span>{' '}
                  <span className="font-semibold text-slate-950 underline decoration-dotted underline-offset-4">
                    {record.studentName}
                  </span>
                </div>

                <div>
                  <span className="font-bold">Hiện là học sinh lớp:</span>{' '}
                  <span className="font-semibold">{record.studentClass}</span>
                </div>

                <div>
                  <span className="font-bold">Em viết đơn này xin phép được nghỉ học</span>{' '}
                  <span className="font-semibold text-blue-900">{sessionText}</span> ngày{' '}
                  <span className="font-semibold">{record.dateDisplay}</span>.
                </div>

                <div>
                  <span className="font-bold">Lý do (Ghi cụ thể):</span>{' '}
                  <span>
                    {record.reasonPreset}. {record.reasonDetail || ''}
                  </span>
                </div>

                <div>
                  <span className="font-bold">Em xin hứa:</span>{' '}
                  <span>
                    Sẽ tự giác chép bài, mượn vở bạn bù đắp kiến thức những tiết học vắng, hoàn thành bài tập đầy đủ và đi học lại nghiêm túc, đúng giờ.
                  </span>
                </div>

                <div className="pt-2">
                  Rất mong được sự chấp nhận của quý Thầy, Cô. Em xin chân thành cám ơn!
                </div>
              </div>

              {/* Date & Location */}
              <div className="text-right italic mt-8 text-sm sm:text-base text-slate-700">
                Giai Lạc, ngày {day} tháng {month} năm {year}
              </div>

              {/* Two-Column Signatures */}
              <div className="grid grid-cols-2 gap-4 mt-6 text-center text-sm sm:text-base">
                <div>
                  <div className="font-bold">Chữ ký của Phụ huynh học sinh</div>
                  <div className="h-20 flex items-center justify-center text-xs text-slate-400 italic">
                    (Đã xác nhận điện tử)
                  </div>
                  <div className="font-bold text-slate-900">{record.parentName}</div>
                  <div className="text-xs text-slate-500 font-sans mt-0.5">(SĐT: {record.parentPhone})</div>
                </div>

                <div>
                  <div className="font-bold">Người làm đơn</div>
                  <div className="text-xs italic text-slate-500 font-sans">(Ghi rõ họ và tên)</div>
                  <div className="h-16 flex items-center justify-center text-xs text-slate-400 italic">
                    (Đã ký)
                  </div>
                  <div className="font-bold text-slate-900">{record.studentName}</div>
                </div>
              </div>
            </div>
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
