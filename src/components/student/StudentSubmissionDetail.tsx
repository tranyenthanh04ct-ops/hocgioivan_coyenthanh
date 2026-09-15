import React from 'react';
import { 
  ArrowLeft, 
  Award, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  ExternalLink, 
  HelpCircle,
  Sparkles,
  Check,
  X
} from 'lucide-react';
import { Assignment, Submission } from '../../types';

interface StudentSubmissionDetailProps {
  assignment: Assignment;
  submission: Submission;
  onBack: () => void;
}

export const StudentSubmissionDetail: React.FC<StudentSubmissionDetailProps> = ({
  assignment,
  submission,
  onBack,
}) => {
  const isGraded = submission.status === 'graded';

  const getScoreBadgeColor = (score?: number) => {
    if (score === undefined) return 'bg-gray-100 text-gray-700';
    if (score >= 8.5) return 'bg-linear-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-200';
    if (score >= 7) return 'bg-linear-to-r from-blue-500 to-indigo-500 text-white shadow-blue-200';
    if (score >= 5) return 'bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-amber-200';
    return 'bg-linear-to-r from-rose-500 to-pink-500 text-white shadow-rose-200';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header with back button */}
      <div className="flex items-center justify-between bg-white/80 p-5 rounded-3xl border border-rose-100 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
            title="Quay lại danh sách bài tập"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold">
                {isGraded ? 'Đã có kết quả' : 'Đã nộp bài'}
              </span>
              <span className="text-xs text-gray-400">
                Nộp lúc: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString('vi-VN') : 'Đúng hạn'}
              </span>
            </div>
            <h2 className="font-serif-literary text-xl font-bold text-gray-900 mt-1">
              {assignment.title}
            </h2>
          </div>
        </div>
      </div>

      {/* Graded Celebratory Card */}
      {isGraded ? (
        <div className="bg-linear-to-br from-rose-50 via-pink-50 to-purple-50 rounded-3xl p-6 sm:p-8 border border-rose-100 shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="space-y-3 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-rose-700 text-xs font-bold shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                <span>Kết quả bài làm từ Cô Yến Thanh</span>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Lời nhận xét & Lời phê của cô:
                </h3>
                <p className="font-serif-literary text-base sm:text-lg text-rose-950 italic leading-relaxed bg-white/80 p-4 rounded-2xl border border-rose-200/60 shadow-2xs">
                  "{submission.teacherFeedback || 'Em làm bài tốt, tiếp tục phát huy tinh thần tự giác học tập nhé!'}"
                </p>
              </div>

              {submission.gradedAt && (
                <p className="text-[11px] text-gray-400">
                  Cô chấm ngày: {new Date(submission.gradedAt).toLocaleString('vi-VN')}
                </p>
              )}
            </div>

            {/* Big Score Box */}
            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-rose-200 shadow-md shrink-0 text-center min-w-[150px]">
              <Award className="w-8 h-8 text-rose-500 mb-1" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Điểm số
              </span>
              <div className="font-serif-literary text-4xl sm:text-5xl font-extrabold text-rose-600 my-1">
                {submission.score}
              </div>
              <span className="text-[11px] font-semibold text-gray-400">
                Thang điểm 10
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif-literary text-lg font-bold text-emerald-900">
              Em đã nộp bài thành công!
            </h3>
            <p className="text-xs text-emerald-700 mt-0.5">
              Cô Yến Thanh đang chấm bài cho em. Khi cô trả bài xong, điểm và lời nhận xét chi tiết sẽ hiện ngay tại đây nhé!
            </p>
          </div>
        </div>
      )}

      {/* Review Submission Content */}
      <div className="bg-white rounded-3xl border border-rose-100 p-6 sm:p-8 shadow-xs space-y-6">
        <h3 className="font-serif-literary text-lg font-bold text-gray-900 border-b border-rose-100 pb-3">
          Chi tiết câu trả lời của em
        </h3>

        {assignment.questions && assignment.questions.length > 0 ? (
          assignment.questions.map((q, idx) => {
            const studentAns = submission.answers?.[q.id];
            const isMultipleChoice = q.type === 'multiple_choice';
            const isCorrect = isMultipleChoice && studentAns?.selectedOptionIndex === q.correctOptionIndex;

            return (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-rose-50/30 border border-rose-100 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-bold text-gray-900">
                    <span className="text-rose-600 mr-1">Câu {idx + 1}:</span>
                    {q.questionText}
                  </h4>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold shrink-0">
                    {q.points} điểm
                  </span>
                </div>

                {/* Multiple choice options review */}
                {isMultipleChoice && q.options && (
                  <div className="space-y-2 pt-1">
                    {q.options.map((opt, optIdx) => {
                      const isOptionSelected = optIdx === studentAns?.selectedOptionIndex;
                      const isOptionCorrect = isGraded && optIdx === q.correctOptionIndex;

                      let style = 'bg-white border-gray-200 text-gray-700';
                      if (isGraded) {
                        if (isOptionCorrect) {
                          style = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold';
                        } else if (isOptionSelected && !isOptionCorrect) {
                          style = 'bg-rose-50 border-rose-300 text-rose-800 line-through';
                        }
                      } else if (isOptionSelected) {
                        style = 'bg-rose-50 border-rose-300 text-rose-800 font-bold';
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${style}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-black/5 flex items-center justify-center font-bold text-[10px]">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{opt}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isOptionSelected && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border font-bold">
                                Câu trả lời của em
                              </span>
                            )}
                            {isGraded && isOptionCorrect && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Đáp án đúng
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {isGraded && q.explanation && (
                      <div className="text-xs text-purple-800 bg-purple-50/70 p-3 rounded-xl border border-purple-100 mt-2">
                        💡 <strong>Lời giải thích của cô:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                )}

                {/* Essay review */}
                {!isMultipleChoice && (
                  <div className="pt-2">
                    <div className="p-4 bg-white rounded-2xl border border-rose-100">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Bài viết của em:
                      </p>
                      {studentAns?.essayText ? (
                        <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed font-sans">
                          {studentAns.essayText}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Chưa nhập nội dung bài viết.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-4 bg-white rounded-2xl border border-rose-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Bài tự luận của em:
            </p>
            <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
              {submission.answers?.['general']?.essayText || 'Chưa có nội dung nộp.'}
            </div>
          </div>
        )}

        {/* Attachment photo if uploaded */}
        {submission.attachmentUrl && (
          <div className="p-4 bg-rose-50/40 rounded-2xl border border-rose-100">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Ảnh chụp bài làm đính kèm:
            </p>
            <a
              href={submission.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-700 mb-3"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Mở xem ảnh toàn màn hình ({submission.attachmentName || 'Tệp đính kèm'})</span>
            </a>
            <div className="rounded-2xl overflow-hidden border border-gray-200 max-w-md">
              <img
                src={submission.attachmentUrl}
                alt="Bài làm của em"
                className="w-full h-auto object-contain max-h-80"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
