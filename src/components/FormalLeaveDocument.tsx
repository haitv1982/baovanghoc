import React from 'react';

export interface FormalLeaveDocumentProps {
  schoolName?: string;
  studentName: string;
  studentClass: string;
  teacherName?: string;
  date: string;
  dateDisplay?: string;
  morning: boolean;
  afternoon: boolean;
  reasonPreset: string;
  reasonDetail?: string;
  parentName: string;
  parentPhone?: string;
  aiLetter?: string;
  compact?: boolean;
}

export function cleanSchoolDisplay(schoolName = 'THCS Giai Lạc'): string {
  return schoolName.normalize('NFC').replace(/^trường\s+/i, '').trim() || 'THCS Giai Lạc';
}

export function extractLetterFields(
  aiLetter: string | undefined,
  fallbackReason: string,
  fallbackPromise: string
): { reasonText: string; promiseText: string } {
  if (!aiLetter) {
    return {
      reasonText: fallbackReason.normalize('NFC'),
      promiseText: fallbackPromise.normalize('NFC'),
    };
  }

  const normalized = aiLetter.normalize('NFC');
  const reasonMatch = normalized.match(/Lý do(?:\s*\(Ghi cụ thể\))?\s*:\s*(.+)/i);
  const promiseMatch = normalized.match(/Em xin hứa\s*:\s*(.+)/i);

  return {
    reasonText: (reasonMatch?.[1]?.trim() || fallbackReason).normalize('NFC'),
    promiseText: (promiseMatch?.[1]?.trim() || fallbackPromise).normalize('NFC'),
  };
}

export const FormalLeaveDocument: React.FC<FormalLeaveDocumentProps> = ({
  schoolName = 'THCS Giai Lạc',
  studentName,
  studentClass,
  teacherName,
  date,
  dateDisplay,
  morning,
  afternoon,
  reasonPreset,
  reasonDetail,
  parentName,
  parentPhone,
  aiLetter,
  compact = false,
}) => {
  const schoolDisplay = cleanSchoolDisplay(schoolName);
  const nfcStudent = (studentName || '...................................................').normalize('NFC');
  const nfcClass = (studentClass || '...................').normalize('NFC');
  const nfcTeacher = (teacherName || '').normalize('NFC');
  const nfcParent = (parentName || 'Phụ huynh').normalize('NFC');
  const nfcPhone = (parentPhone || '...').normalize('NFC');

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
  let formattedDate = dateDisplay || date;
  if (date && date.includes('-')) {
    const [y, m, d] = date.split('-');
    day = d || '...';
    month = m || '...';
    year = y || '2026';
    if (!dateDisplay) {
      formattedDate = `${day}/${month}/${year}`;
    }
  }

  const defaultReason = `${(reasonPreset || 'Lý do cá nhân').normalize('NFC')}${
    reasonDetail?.trim() ? ` (${reasonDetail.trim().normalize('NFC')})` : ''
  }`;
  const defaultPromise =
    'Sẽ tự giác chép bài, mượn vở bạn bù đắp kiến thức những tiết học vắng, hoàn thành bài tập đầy đủ và đi học lại nghiêm túc, đúng giờ.';

  const { reasonText, promiseText } = extractLetterFields(aiLetter, defaultReason, defaultPromise);

  return (
    <div
      className={`bg-white font-times text-black border border-slate-300 shadow-md mx-auto ${
        compact
          ? 'p-6 sm:p-9 rounded-xl text-[13.5px] sm:text-[15px] leading-[1.75]'
          : 'p-8 sm:p-12 rounded-xl max-w-2xl text-[14px] sm:text-[16px] leading-[1.8]'
      }`}
    >
      {/* Quốc hiệu - Tiêu ngữ */}
      <div className="text-center mb-5 sm:mb-6">
        <div className="font-bold uppercase tracking-wide text-[14px] sm:text-[16px]">
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        </div>
        <div className="font-bold text-[13.5px] sm:text-[15.5px] mt-0.5">
          Độc lập - Tự do - Hạnh phúc
        </div>
        <div className="text-[12px] sm:text-[13px] tracking-widest mt-0.5">
          ----------------***----------------
        </div>
      </div>

      {/* Tiêu đề đơn */}
      <h2 className="text-center font-bold uppercase tracking-wide text-[18px] sm:text-[21px] my-5 sm:my-6 text-black">
        ĐƠN XIN PHÉP NGHỈ HỌC
      </h2>

      {/* Kính gửi */}
      <div className="mb-5 pl-3 sm:pl-10 space-y-1">
        <div className="flex items-start">
          <span className="font-bold w-20 sm:w-24 shrink-0">Kính gửi:</span>
          <span>- Ban giám hiệu trường {schoolDisplay}</span>
        </div>
        <div className="flex items-start">
          <span className="w-20 sm:w-24 shrink-0" />
          <span>
            - Giáo viên chủ nhiệm lớp <span className="font-bold">{nfcClass}</span>
            {nfcTeacher ? ` (${nfcTeacher})` : ''}
          </span>
        </div>
      </div>

      {/* Nội dung đơn */}
      <div className="space-y-2.5 text-justify">
        <p>
          <span className="font-bold">Em tên là:</span>{' '}
          <span className="font-bold">{nfcStudent}</span>
        </p>

        <p>
          <span className="font-bold">Hiện là học sinh lớp:</span>{' '}
          <span className="font-bold">{nfcClass}</span>
        </p>

        <p>
          Em viết đơn này xin phép được nghỉ học{' '}
          <span className="font-bold">{sessionText}</span> ngày{' '}
          <span className="font-bold">{formattedDate}</span>.
        </p>

        <p>
          <span className="font-bold">Lý do (Ghi cụ thể):</span> {reasonText}
        </p>

        <p>
          <span className="font-bold">Em xin hứa:</span> {promiseText}
        </p>

        <p className="pt-1.5">
          Rất mong được sự chấp nhận của quý Thầy, Cô. Em xin chân thành cám ơn!
        </p>
      </div>

      {/* Địa điểm - Ngày tháng */}
      <div className="text-right italic mt-7 mb-5 pr-2 sm:pr-4">
        Giai Lạc, ngày {day} tháng {month} năm {year}
      </div>

      {/* Chữ ký 2 cột cân đối */}
      <div className="grid grid-cols-2 gap-4 text-center items-start pt-1">
        <div>
          <div className="font-bold">Chữ ký của Phụ huynh học sinh</div>
          <div className="italic text-[12px] sm:text-[13px] mt-0.5">(Ký và ghi rõ họ tên)</div>
          <div className="h-14 sm:h-16 flex items-center justify-center text-[11px] sm:text-[12px] text-slate-500 italic">
            (Đã xác nhận điện tử)
          </div>
          <div className="font-bold text-black">{nfcParent}</div>
          <div className="text-[12px] sm:text-[13px] italic mt-0.5">(SĐT: {nfcPhone})</div>
        </div>

        <div>
          <div className="font-bold">Người làm đơn</div>
          <div className="italic text-[12px] sm:text-[13px] mt-0.5">(Ghi rõ họ và tên)</div>
          <div className="h-14 sm:h-16 flex items-center justify-center text-[11px] sm:text-[12px] text-slate-500 italic">
            (Đã ký)
          </div>
          <div className="font-bold text-black">{nfcStudent}</div>
        </div>
      </div>
    </div>
  );
};
