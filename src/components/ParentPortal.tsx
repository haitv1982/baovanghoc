import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Calendar,
  Sun,
  Moon,
  Clock,
  User,
  GraduationCap,
  Phone,
  FileCheck,
  AlertCircle,
  Eye,
  Trash2,
  Download,
  History,
  PlusCircle,
  Loader2,
  Check,
  UserCheck,
} from 'lucide-react';
import { AbsenceRecord, UserSession } from '../types';

interface ParentPortalProps {
  session: UserSession;
  onAbsenceSubmitted: (record: AbsenceRecord) => void;
  myAbsences: AbsenceRecord[];
  onViewProof: (record: AbsenceRecord) => void;
  schoolName?: string;
}

const PRESET_REASONS = [
  { id: 'sick', label: 'Bị ốm / Sốt cao / Cảm cúm', icon: '🤒', detailHint: 'Cháu bị sốt cao từ đêm qua, người mệt mỏi cần nghỉ ngơi và theo dõi tại nhà.' },
  { id: 'hospital', label: 'Đi khám bệnh / Nhập viện', icon: '🏥', detailHint: 'Gia đình có lịch hẹn đưa cháu đi khám chuyên khoa tại bệnh viện.' },
  { id: 'family_urgent', label: 'Việc gia đình đột xuất', icon: '👨‍👩‍👧', detailHint: 'Gia đình có việc hiếu/việc gấp đột xuất cần cháu có mặt cùng bố mẹ.' },
  { id: 'hometown', label: 'Về quê có việc gia đình', icon: '🏡', detailHint: 'Gia đình có việc về quê, cháu xin phép vắng mặt trong ngày.' },
  { id: 'competition', label: 'Tham gia thi đấu / Hoạt động', icon: '🏆', detailHint: 'Cháu tham gia giải thi đấu thể thao/năng khiếu được phân công.' },
  { id: 'other', label: 'Lý do khác (tự nhập)', icon: '✍️', detailHint: '' },
];

const SUGGESTED_CLASSES = [
  '1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B',
  '6A1', '6A2', '6A3', '7A1', '7A2', '7B1', '8A1', '8A2', '9A1', '9A2',
  '10A1', '10A2', '10D1', '11A1', '11B1', '12A1', '12A2', '12D1',
];

export const ParentPortal: React.FC<ParentPortalProps> = ({
  session,
  onAbsenceSubmitted,
  myAbsences,
  onViewProof,
  schoolName = 'Trường THCS Giai Lạc',
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // Form states
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(todayStr);
  const [morning, setMorning] = useState<boolean>(true);
  const [afternoon, setAfternoon] = useState<boolean>(false);
  const [studentName, setStudentName] = useState<string>('');
  const [studentClass, setStudentClass] = useState<string>('6A1');
  const [teacherName, setTeacherName] = useState<string>('Cô Nguyễn Thị Hoa');
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_REASONS[0].label);
  const [reasonDetail, setReasonDetail] = useState<string>(PRESET_REASONS[0].detailHint);
  const [parentName, setParentName] = useState<string>(session.name || '');
  const [parentPhone, setParentPhone] = useState<string>(session.phone || '');

  // AI Generated letter state
  const [aiLetter, setAiLetter] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [showAiLetterPreview, setShowAiLetterPreview] = useState<boolean>(false);

  // Attachment state
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [attachmentType, setAttachmentType] = useState<string>('');
  const [attachmentData, setAttachmentData] = useState<string>('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Handle Preset change
  const handleSelectPreset = (reason: typeof PRESET_REASONS[0]) => {
    setSelectedPreset(reason.label);
    if (reason.detailHint && !reasonDetail) {
      setReasonDetail(reason.detailHint);
    } else if (reason.id === 'other') {
      setReasonDetail('');
    } else {
      setReasonDetail(reason.detailHint);
    }
  };

  // Quick session buttons
  const setSessionType = (type: 'morning' | 'afternoon' | 'fullday') => {
    if (type === 'morning') {
      setMorning(true);
      setAfternoon(false);
    } else if (type === 'afternoon') {
      setMorning(false);
      setAfternoon(true);
    } else {
      setMorning(true);
      setAfternoon(true);
    }
  };

  // AI Letter Generator function
  const handleGenerateAiLetter = async () => {
    if (!studentName.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên học sinh trước khi tạo đơn bằng AI.');
      return;
    }

    setErrorMessage('');
    setIsGeneratingAi(true);

    try {
      const res = await fetch('/api/ai/generate-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName,
          studentClass,
          teacherName,
          schoolName,
          date,
          morning,
          afternoon,
          reasonPreset: selectedPreset,
          reasonDetail,
          parentName,
          parentPhone,
        }),
      });

      const data = await res.json();
      if (data.success && data.letter) {
        setAiLetter(data.letter);
        setShowAiLetterPreview(true);
      } else {
        throw new Error(data.message || 'Không thể tạo đơn tự động.');
      }
    } catch (err: any) {
      // Fallback local letter formatted strictly like user's photo
      const sessionText = morning && afternoon ? 'cả ngày (buổi sáng và buổi chiều)' : morning ? 'buổi sáng' : 'buổi chiều';
      const parts = date.split('-');
      const d = parts[2] || '...';
      const m = parts[1] || '...';
      const y = parts[0] || '2026';
      const teacherLine = teacherName
        ? `- Giáo viên chủ nhiệm lớp: ${studentClass} (${teacherName})`
        : `- Giáo viên chủ nhiệm lớp: ${studentClass || '...'}`;

      const fallback = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
----------------***----------------

ĐƠN XIN PHÉP NGHỈ HỌC

Kính gửi:  - Ban giám hiệu trường ${schoolName}
           ${teacherLine}

Em tên là: ${studentName}
Hiện là học sinh lớp: ${studentClass}
Em viết đơn này xin phép được nghỉ học ${sessionText} ngày ${parts.reverse().join('/')}.
Lý do (Ghi cụ thể): ${selectedPreset}. ${reasonDetail ? `(${reasonDetail})` : ''}
Em xin hứa: Sẽ tự giác chép bài, mượn vở bạn bù đắp kiến thức những tiết học vắng, hoàn thành bài tập đầy đủ và đi học lại nghiêm túc, đúng giờ.

Rất mong được sự chấp nhận của quý Thầy, Cô. Em xin chân thành cám ơn!

                                    Giai Lạc, ngày ${d} tháng ${m} năm ${y}

      Chữ ký của Phụ huynh học sinh                    Người làm đơn
                                                      (Ghi rõ họ và tên)

         ${parentName || 'Phụ huynh'}                                   ${studentName || 'Học sinh'}
       (SĐT: ${parentPhone || '...'})`;

      setAiLetter(fallback);
      setShowAiLetterPreview(true);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Handle file upload (photo or Word doc)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('Tệp đính kèm tối đa 25MB. Vui lòng chọn tệp nhỏ hơn.');
      return;
    }

    setAttachmentName(file.name);
    setAttachmentType(file.type);

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachmentData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachmentName('');
    setAttachmentType('');
    setAttachmentData('');
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!studentName.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên của học sinh.');
      return;
    }

    if (!studentClass.trim()) {
      setErrorMessage('Vui lòng chọn hoặc nhập lớp của học sinh.');
      return;
    }

    if (!morning && !afternoon) {
      setErrorMessage('Vui lòng chọn buổi nghỉ (Sáng, Chiều hoặc Cả ngày).');
      return;
    }

    setIsSubmitting(true);

    try {
      // Auto-generate letter if not generated yet
      let finalLetter = aiLetter;
      if (!finalLetter) {
        const sessionText = morning && afternoon ? 'cả ngày (buổi sáng và buổi chiều)' : morning ? 'buổi sáng' : 'buổi chiều';
        const parts = date.split('-');
        const d = parts[2] || '...';
        const m = parts[1] || '...';
        const y = parts[0] || '2026';
        const teacherLine = teacherName
          ? `- Giáo viên chủ nhiệm lớp: ${studentClass} (${teacherName})`
          : `- Giáo viên chủ nhiệm lớp: ${studentClass || '...'}`;

        finalLetter = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
----------------***----------------

ĐƠN XIN PHÉP NGHỈ HỌC

Kính gửi:  - Ban giám hiệu trường ${schoolName}
           ${teacherLine}

Em tên là: ${studentName}
Hiện là học sinh lớp: ${studentClass}
Em viết đơn này xin phép được nghỉ học ${sessionText} ngày ${parts.reverse().join('/')}.
Lý do (Ghi cụ thể): ${selectedPreset}. ${reasonDetail ? `(${reasonDetail})` : ''}
Em xin hứa: Sẽ tự giác chép bài, mượn vở bạn bù đắp kiến thức những tiết học vắng, hoàn thành bài tập đầy đủ và đi học lại nghiêm túc, đúng giờ.

Rất mong được sự chấp nhận của quý Thầy, Cô. Em xin chân thành cám ơn!

                                    Giai Lạc, ngày ${d} tháng ${m} năm ${y}

      Chữ ký của Phụ huynh học sinh                    Người làm đơn
                                                      (Ghi rõ họ và tên)

         ${parentName || 'Phụ huynh'}                                   ${studentName || 'Học sinh'}
       (SĐT: ${parentPhone || '...'})`;
      }

      const res = await fetch('/api/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          morning,
          afternoon,
          studentName,
          studentClass,
          teacherName,
          reasonPreset: selectedPreset,
          reasonDetail,
          parentName: parentName || session.name,
          parentPhone: parentPhone || session.phone,
          aiLetter: finalLetter,
          attachmentName,
          attachmentType,
          attachmentData,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể gửi đơn báo vắng.');
      }

      setSubmitSuccess(true);
      onAbsenceSubmitted(data.data);

      // Reset form fields after 2.5 seconds or allow parent to view history
      setTimeout(() => {
        setSubmitSuccess(false);
        setActiveTab('history');
      }, 1800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Đã có lỗi xảy ra khi gửi thông tin lên hệ thống.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      {/* Top Navigation Tabs */}
      <div className="flex bg-slate-200/80 p-1.5 rounded-2xl mb-8 max-w-md mx-auto shadow-inner">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'create'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          Báo Xin Nghỉ Học
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          Lịch Sử Đơn Đã Gửi ({myAbsences.length})
        </button>
      </div>

      {activeTab === 'create' ? (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-blue-100 backdrop-blur-xs mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Tích hợp AI Soạn Thảo Đơn Tự Động
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Đơn Xin Phép Nghỉ Học Cho Học Sinh
            </h2>
            <p className="text-sm text-blue-100 mt-1">
              Phụ huynh điền thông tin bên dưới, hệ thống sẽ tự động tổng hợp gửi ngay cho Ban Giám Hiệu & Giáo viên chủ nhiệm.
            </p>
          </div>

          {/* Form container */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-7">
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {submitSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-3 animate-in fade-in">
                <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-bold">Gửi báo vắng thành công!</p>
                  <p className="text-xs text-emerald-700">Thông tin đã được chuyển tới Ban Giám Hiệu nhà trường ngay tức thì.</p>
                </div>
              </div>
            )}

            {/* 1. Student Info Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Họ và tên học sinh <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn Minh Khang"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-2xs text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Lớp học <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    placeholder="Nhập lớp (VD: 7B3, 6A1, 9A, 10C...)"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-2xs uppercase text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Giáo viên chủ nhiệm lớp <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserCheck className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="VD: Cô Nguyễn Thị Hoa"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-2xs text-sm"
                  />
                </div>
              </div>
            </div>

            {/* 2. Date and Session Selection */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Ngày xin nghỉ học <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDate(todayStr)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                      date === todayStr ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setDate(tomorrow.toISOString().split('T')[0]);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition"
                  >
                    Ngày mai
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                />

                {/* Session select buttons */}
                <div className="sm:col-span-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSessionType('morning')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${
                      morning && !afternoon
                        ? 'bg-amber-500 border-amber-600 text-white shadow-sm'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    Buổi Sáng
                  </button>

                  <button
                    type="button"
                    onClick={() => setSessionType('afternoon')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${
                      !morning && afternoon
                        ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    Buổi Chiều
                  </button>

                  <button
                    type="button"
                    onClick={() => setSessionType('fullday')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${
                      morning && afternoon
                        ? 'bg-blue-700 border-blue-800 text-white shadow-sm'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Cả Ngày
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Reason Selection (Preset 1-touch + custom detail) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Lý do xin phép nghỉ <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-3">
                {PRESET_REASONS.map((reason) => {
                  const isSelected = selectedPreset === reason.label;
                  return (
                    <button
                      key={reason.id}
                      type="button"
                      onClick={() => handleSelectPreset(reason)}
                      className={`text-left p-3 rounded-xl border transition-all text-xs font-medium flex items-center gap-2 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-600/20 font-bold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-base shrink-0">{reason.icon}</span>
                      <span className="line-clamp-2 leading-snug">{reason.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Detail textarea */}
              <div className="relative">
                <textarea
                  rows={2}
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  placeholder="Ghi chi tiết lý do (ví dụ: Cháu bị sốt 38.5 độ từ đêm qua, hoặc lịch khám tại Bệnh viện Nhi Đồng...)"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition shadow-2xs"
                />
              </div>
            </div>

            {/* 4. Parent Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Họ và tên Phụ huynh / Người giám hộ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="VD: Nguyễn Văn Hùng (Bố)"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Số điện thoại phụ huynh <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="VD: 0987654321"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* 5. AI Auto-Generation Box */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-purple-50/50 border border-indigo-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Trợ lý AI Soạn Đơn Xin Nghỉ Học Tự Động
                    </h4>
                    <p className="text-xs text-slate-500">
                      Tự động tạo đơn chuẩn văn bản hành chính Việt Nam có chữ ký & cam kết học tập
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAiLetter}
                  disabled={isGeneratingAi}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
                >
                  {isGeneratingAi ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang soạn đơn chuẩn...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      {aiLetter ? 'Tạo lại đơn bằng AI' : 'Bấm để AI Soạn Đơn Mẫu'}
                    </>
                  )}
                </button>
              </div>

              {/* Letter Preview & Editor (Standard Photo Layout) */}
              {showAiLetterPreview && aiLetter && (
                <div className="mt-4 bg-white p-5 sm:p-7 rounded-2xl border-2 border-indigo-200 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2 mb-4">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5 uppercase tracking-wide">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      Mẫu đơn xin phép nghỉ học chuẩn quy chuẩn hành chính:
                    </span>
                    <span className="text-[11px] text-slate-500 italic">
                      (Định dạng theo biểu mẫu chuẩn trường THCS Giai Lạc)
                    </span>
                  </div>

                  {/* Standard Printed Document Mockup */}
                  <div className="bg-slate-50/80 p-5 sm:p-8 rounded-xl border border-slate-300 font-times text-slate-900 leading-relaxed text-xs sm:text-sm">
                    {/* Quốc hiệu tiêu ngữ */}
                    <div className="text-center mb-5">
                      <div className="font-bold text-xs sm:text-sm uppercase tracking-wider">
                        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                      </div>
                      <div className="font-bold text-xs sm:text-sm">
                        Độc lập - Tự do - Hạnh phúc
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans tracking-widest mt-0.5">
                        ----------------***----------------
                      </div>
                    </div>

                    {/* Title */}
                    <div className="text-center font-bold text-base sm:text-lg uppercase tracking-wide my-4 text-slate-950">
                      ĐƠN XIN PHÉP NGHỈ HỌC
                    </div>

                    {/* Recipient */}
                    <div className="mb-4 pl-2 sm:pl-6 space-y-1">
                      <div className="flex">
                        <span className="font-bold w-20 shrink-0">Kính gửi:</span>
                        <span>- Ban giám hiệu trường {schoolName}</span>
                      </div>
                      <div className="flex">
                        <span className="w-20 shrink-0"></span>
                        <span>
                          - Giáo viên chủ nhiệm lớp: <span className="font-bold">{studentClass}</span>{' '}
                          {teacherName && (
                            <span className="italic font-medium">({teacherName})</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-2.5">
                      <div>
                        <span className="font-bold">Em tên là:</span>{' '}
                        <span className="underline decoration-dotted underline-offset-4 font-semibold text-slate-950">
                          {studentName || '...................................................'}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold">Hiện là học sinh lớp:</span>{' '}
                        <span className="font-semibold">{studentClass || '...................'}</span>
                      </div>
                      <div>
                        <span className="font-bold">Em viết đơn này xin phép được nghỉ học</span>{' '}
                        <span className="font-semibold text-blue-900">
                          {morning && afternoon ? 'cả ngày (buổi sáng và buổi chiều)' : morning ? 'buổi sáng' : 'buổi chiều'}
                        </span>{' '}
                        ngày <span className="font-semibold">{date.split('-').reverse().join('/')}</span>.
                      </div>
                      <div>
                        <span className="font-bold">Lý do (Ghi cụ thể):</span>{' '}
                        <span>{selectedPreset}. {reasonDetail}</span>
                      </div>
                      <div>
                        <span className="font-bold">Em xin hứa:</span>{' '}
                        <span>
                          Sẽ tự giác chép bài, mượn vở bạn bù đắp kiến thức những tiết học vắng, hoàn thành bài tập đầy đủ và đi học lại nghiêm túc, đúng giờ.
                        </span>
                      </div>
                      <div className="pt-1.5">
                        Rất mong được sự chấp nhận của quý Thầy, Cô. Em xin chân thành cám ơn!
                      </div>
                    </div>

                    {/* Date */}
                    <div className="text-right italic mt-6 text-slate-700">
                      Giai Lạc, ngày {date.split('-')[2] || '...'} tháng {date.split('-')[1] || '...'} năm {date.split('-')[0] || '2026'}
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-4 mt-4 text-center">
                      <div>
                        <div className="font-bold">Chữ ký của Phụ huynh học sinh</div>
                        <div className="h-14 flex items-center justify-center text-[10px] text-slate-400 italic">
                          (Đã xác nhận điện tử)
                        </div>
                        <div className="font-bold text-slate-900">{parentName || 'Phụ huynh'}</div>
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">(SĐT: {parentPhone})</div>
                      </div>
                      <div>
                        <div className="font-bold">Người làm đơn</div>
                        <div className="text-[10px] italic text-slate-500 font-sans">(Ghi rõ họ và tên)</div>
                        <div className="h-12 flex items-center justify-center text-[10px] text-slate-400 italic">
                          (Đã ký)
                        </div>
                        <div className="font-bold text-slate-900">{studentName || 'Học sinh'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Edit Area Accordion */}
                  <details className="mt-3 text-xs">
                    <summary className="cursor-pointer text-indigo-700 hover:text-indigo-900 font-semibold p-1 select-none">
                      ✏️ Bấm vào đây nếu muốn chỉnh sửa thêm nội dung đơn dạng thô
                    </summary>
                    <textarea
                      rows={6}
                      value={aiLetter}
                      onChange={(e) => setAiLetter(e.target.value)}
                      className="w-full mt-2 text-xs font-times leading-relaxed text-slate-800 p-3 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </details>
                </div>
              )}
            </div>

            {/* 6. Attachments (Photo or Word doc) */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Kèm minh chứng ảnh hoặc file Word / PDF (Không bắt buộc)
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Bạn có thể chụp ảnh toa thuốc, sổ khám bệnh, giấy hẹn viện, ảnh chụp đơn viết tay hoặc tải file Word giấy xin phép (.doc, .docx).
              </p>

              {attachmentName ? (
                <div className="flex items-center justify-between p-3.5 bg-white border border-blue-200 rounded-xl shadow-xs">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      {attachmentType.startsWith('image/') ? (
                        <ImageIcon className="w-5 h-5" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 truncate">{attachmentName}</p>
                      <p className="text-[11px] text-emerald-600 font-medium">Đã tải lên sẵn sàng gửi</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeAttachment}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Xóa tệp"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-5 bg-white cursor-pointer transition-colors group">
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-600 mb-1.5 transition-colors" />
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                    Bấm vào đây để chọn ảnh chụp toa thuốc hoặc tệp Word (.doc, .docx, .png, .jpg)
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">Dung lượng tối đa 25MB</span>
                  <input
                    type="file"
                    accept="image/*,.doc,.docx,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* 7. Final Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-base shadow-lg shadow-blue-500/25 transition-all transform active:scale-[0.99] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang gửi thông tin lên hệ thống nhà trường...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    GỬI BÁO VẮNG CHO NHÀ TRƯỜNG NGAY
                  </>
                )}
              </button>
              <p className="text-center text-xs text-slate-400 mt-2.5">
                Thông tin sẽ được cập nhật tức thời lên hệ thống để Ban Giám Hiệu và Thầy/Cô tiếp nhận ngay lập tức.
              </p>
            </div>
          </form>
        </div>
      ) : (
        /* History of sent absence requests */
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              Lịch sử đơn báo vắng đã gửi ({myAbsences.length})
            </h3>
            <button
              onClick={() => setActiveTab('create')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
            >
              + Báo vắng mới
            </button>
          </div>

          {myAbsences.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-700">Chưa có đơn báo vắng nào từ số điện thoại này</p>
              <p className="text-xs text-slate-400 mt-1">Khi bạn gửi đơn xin phép nghỉ học cho con, đơn sẽ hiển thị tại đây.</p>
              <button
                onClick={() => setActiveTab('create')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition"
              >
                Gửi đơn đầu tiên ngay
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {myAbsences.map((rec) => {
                const sessionStr = rec.morning && rec.afternoon ? 'Nghỉ Cả Ngày' : rec.morning ? 'Nghỉ Buổi Sáng' : 'Nghỉ Buổi Chiều';
                return (
                  <div
                    key={rec.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-200 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white bg-blue-700 px-2 py-0.5 rounded">
                            Lớp {rec.studentClass}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {rec.dateDisplay} ({sessionStr})
                          </span>
                        </div>
                        <h4 className="text-base font-extrabold text-slate-900 mt-1">
                          {rec.studentName}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        {rec.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <Check className="w-3.5 h-3.5" />
                            Đã Duyệt Nghỉ
                          </span>
                        ) : rec.status === 'noted' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                            Đã Tiếp Nhận
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                            Chờ Nhà Trường Xem
                          </span>
                        )}

                        <button
                          onClick={() => onViewProof(rec)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Xem đơn / Minh chứng
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-600 space-y-1">
                      <p>
                        <span className="font-semibold text-slate-700">Lý do:</span> {rec.reasonPreset} - {rec.reasonDetail}
                      </p>
                      {rec.adminNote && (
                        <p className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-100">
                          <span className="font-bold">Lời nhắn từ Nhà trường:</span> {rec.adminNote}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
