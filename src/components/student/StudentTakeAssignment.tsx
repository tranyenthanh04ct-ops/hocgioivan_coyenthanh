import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, 
  Send, 
  Save, 
  Clock, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  HelpCircle,
  Sparkles,
  Paperclip
} from 'lucide-react';
import { db, storage } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Assignment, Submission, StudentAnswer } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';

interface StudentTakeAssignmentProps {
  assignment: Assignment;
  onBack: () => void;
  onSubmittedSuccess: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const StudentTakeAssignment: React.FC<StudentTakeAssignmentProps> = ({
  assignment,
  onBack,
  onSubmittedSuccess,
  onShowToast,
}) => {
  const { currentUser, userProfile } = useAuth();

  // Answers keyed by questionId
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  
  // File upload state for handwritten essay photo
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState('');
  const [existingAttachmentName, setExistingAttachmentName] = useState('');

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const submissionId = `${assignment.id}_${currentUser?.uid}`;

  // Load existing draft if any
  useEffect(() => {
    const loadDraft = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        const subSnap = await getDoc(doc(db, 'submissions', submissionId));
        if (subSnap.exists()) {
          const data = subSnap.data() as Submission;
          if (data.answers) {
            setAnswers(data.answers);
          }
          if (data.attachmentUrl) {
            setExistingAttachmentUrl(data.attachmentUrl);
            setExistingAttachmentName(data.attachmentName || '');
          }
        }
      } catch (err) {
        console.error('Error loading draft:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDraft();
  }, [assignment.id, currentUser?.uid]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selectedOptionIndex: optionIndex,
      },
    }));
  };

  const handleEssayChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        essayText: text,
      },
    }));
  };

  // Count words helper
  const countWords = (str?: string) => {
    if (!str || !str.trim()) return 0;
    return str.trim().split(/\s+/).length;
  };

  const saveSubmission = async (status: 'draft' | 'submitted') => {
    if (!currentUser) return;
    try {
      let attachmentUrl = existingAttachmentUrl;
      let attachmentName = existingAttachmentName;

      // Handle upload photo if selected
      if (uploadFile) {
        try {
          const timestamp = Date.now();
          const cleanName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storageRef = ref(storage, `submissions/${timestamp}_${cleanName}`);
          const uploadTask = uploadBytesResumable(storageRef, uploadFile);

          attachmentUrl = await new Promise<string>((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(Math.round(progress));
              },
              (err) => reject(err),
              async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
              }
            );
          });
          attachmentName = uploadFile.name;
        } catch (storageErr) {
          console.warn('Storage upload error:', storageErr);
        }
      }

      const now = new Date().toISOString();
      const submissionData: Partial<Submission> = {
        id: submissionId,
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        studentId: currentUser.uid,
        studentName: userProfile?.displayName || 'Học sinh',
        studentClass: userProfile?.classGrade || '',
        status,
        answers,
        attachmentUrl: attachmentUrl || undefined,
        attachmentName: attachmentName || undefined,
        updatedAt: now,
      };

      if (status === 'submitted') {
        submissionData.submittedAt = now;
      }

      await setDoc(doc(db, 'submissions', submissionId), submissionData, { merge: true });

      if (status === 'submitted') {
        // Trigger celebratory confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f43f5e', '#ec4899', '#a855f7', '#fb7185'],
        });
        onShowToast('success', 'Nộp bài thành công! Cô Yến Thanh đã nhận được bài của em.');
        onSubmittedSuccess();
      } else {
        onShowToast('info', 'Đã lưu bản nháp bài làm của em.');
      }
    } catch (err: any) {
      console.error('Error saving submission:', err);
      onShowToast('error', 'Lỗi khi lưu bài làm: ' + err.message);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    await saveSubmission('draft');
    setIsSaving(false);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    await saveSubmission('submitted');
    setIsSubmitting(false);
  };

  // Calculate question progress
  const answeredCount = assignment.questions?.filter((q) => {
    if (q.type === 'multiple_choice') {
      return answers[q.id]?.selectedOptionIndex !== undefined;
    }
    return Boolean(answers[q.id]?.essayText?.trim());
  }).length || 0;

  const totalQuestions = assignment.questions?.length || 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 p-5 rounded-3xl border border-rose-100 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold">
                Đang làm bài
              </span>
              <span className="text-xs text-gray-500">
                Hạn nộp: {new Date(assignment.dueDate).toLocaleString('vi-VN')}
              </span>
            </div>
            <h2 className="font-serif-literary text-xl font-bold text-gray-900 mt-1">
              {assignment.title}
            </h2>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            id="btn-save-draft"
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving || isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu nháp'}</span>
          </button>

          <button
            id="btn-submit-assignment"
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isSaving || isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-linear-to-r from-rose-500 to-pink-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-200 hover:from-rose-600 hover:to-pink-600 transition-all transform active:scale-95 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Đang nộp...' : 'Nộp bài cho cô'}</span>
          </button>
        </div>
      </div>

      {/* Progress pill if multiple questions */}
      {totalQuestions > 0 && (
        <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-100 flex items-center justify-between text-xs font-semibold">
          <span className="text-gray-700">
            Tiến độ hoàn thành: <span className="text-rose-600 font-bold">{answeredCount}/{totalQuestions} câu</span>
          </span>
          <div className="w-40 bg-white rounded-full h-2 overflow-hidden border border-rose-100">
            <div
              className="bg-rose-500 h-2 rounded-full transition-all"
              style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Description / Instructions */}
      {assignment.description && (
        <div className="p-5 bg-white rounded-3xl border border-rose-100 space-y-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Đề bài & Hướng dẫn của cô:
          </h3>
          <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
            {assignment.description}
          </p>

          {assignment.attachmentUrl && (
            <div className="pt-3 border-t border-rose-50 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-rose-500" />
              <a
                href={assignment.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
              >
                <span>Xem tệp đính kèm của cô ({assignment.attachmentName || 'Tài liệu đề bài'})</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Questions list */}
      <div className="space-y-6">
        {assignment.questions && assignment.questions.length > 0 ? (
          assignment.questions.map((q, idx) => {
            const isMultipleChoice = q.type === 'multiple_choice';
            const studentAns = answers[q.id];

            return (
              <div
                key={q.id}
                className="p-6 bg-white rounded-3xl border border-rose-100 shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-bold text-gray-900 leading-snug">
                    <span className="text-rose-600 mr-1.5 font-serif-literary">Câu {idx + 1}:</span>
                    {q.questionText}
                  </h3>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-100 shrink-0">
                    {q.points} điểm
                  </span>
                </div>

                {/* Multiple choice options */}
                {isMultipleChoice && q.options && (
                  <div className="space-y-2.5 pt-1">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = studentAns?.selectedOptionIndex === optIdx;
                      return (
                        <div
                          key={optIdx}
                          onClick={() => handleSelectOption(q.id, optIdx)}
                          className={`p-3.5 rounded-2xl border text-sm flex items-center gap-3 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-rose-500 text-white border-rose-500 font-semibold shadow-xs shadow-rose-200'
                              : 'bg-rose-50/20 hover:bg-rose-50/60 border-rose-100 text-gray-700'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected ? 'bg-white text-rose-600' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Essay input */}
                {!isMultipleChoice && (
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Nhập bài làm của em:</span>
                      <span className="font-semibold text-rose-600">
                        {countWords(studentAns?.essayText)} từ
                      </span>
                    </div>
                    <textarea
                      rows={7}
                      value={studentAns?.essayText || ''}
                      onChange={(e) => handleEssayChange(q.id, e.target.value)}
                      placeholder="Em hãy trình bày các luận điểm, dẫn chứng và cảm nhận của mình một cách mạch lạc..."
                      className="w-full p-4 bg-white border border-rose-200 rounded-2xl text-sm leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                    />
                  </div>
                )}
              </div>
            );
          })
        ) : (
          // Default general essay box if no structured questions
          <div className="p-6 bg-white rounded-3xl border border-rose-100 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="font-bold text-gray-700 uppercase tracking-wider">
                Bài làm của em:
              </span>
              <span className="font-semibold text-rose-600">
                {countWords(answers['general']?.essayText)} từ
              </span>
            </div>
            <textarea
              rows={10}
              value={answers['general']?.essayText || ''}
              onChange={(e) => handleEssayChange('general', e.target.value)}
              placeholder="Em hãy viết bài làm của mình vào đây..."
              className="w-full p-4 bg-white border border-rose-200 rounded-2xl text-sm leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-rose-400"
            />
          </div>
        )}

        {/* Optional: Upload handwritten paper photo */}
        <div className="p-6 bg-rose-50/40 rounded-3xl border border-dashed border-rose-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
            <UploadCloud className="w-4 h-4 text-rose-500" />
            <span>Đính kèm ảnh chụp bài viết tay (Nếu em viết bài ra giấy)</span>
          </div>

          <input
            type="file"
            id="student-photo-file-input"
            accept="image/*,.pdf"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setUploadFile(e.target.files[0]);
              }
            }}
            className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-100 file:text-rose-700 hover:file:bg-rose-200 cursor-pointer"
          />

          {uploadFile && (
            <p className="text-xs text-emerald-700 font-medium">
              Đã chọn ảnh: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
            </p>
          )}

          {existingAttachmentUrl && !uploadFile && (
            <p className="text-xs text-purple-700 font-medium">
              Ảnh bài làm đã đính kèm: {existingAttachmentName || 'Ảnh bài làm'}
            </p>
          )}

          {uploadProgress !== null && (
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Bar for Mobile & Quick Submit */}
      <div className="flex items-center justify-between p-4 bg-[#FFFDF9]/95 backdrop-blur-md border border-rose-100 rounded-3xl shadow-lg sticky bottom-4 z-30">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isSaving || isSubmitting}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all"
        >
          <Save className="w-4 h-4" />
          <span>Lưu nháp</span>
        </button>

        <button
          id="sticky-btn-submit"
          type="button"
          onClick={() => setShowConfirmModal(true)}
          disabled={isSaving || isSubmitting}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-linear-to-r from-rose-500 to-pink-500 text-white text-sm font-bold shadow-md shadow-rose-200 hover:from-rose-600 hover:to-pink-600 transition-all transform active:scale-95"
        >
          <Send className="w-4 h-4" />
          <span>Nộp bài ngay</span>
        </button>
      </div>

      {/* Confirmation Modal before Submit */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Xác nhận nộp bài cho Cô Yến Thanh"
        message={`Em đã hoàn thành bài làm và sẵn sàng nộp cho cô? Sau khi nộp, cô sẽ nhận được bài và tiến hành chấm điểm cho em.`}
        confirmText="Vâng, nộp bài ngay"
        cancelText="Để em kiểm tra lại"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
};
