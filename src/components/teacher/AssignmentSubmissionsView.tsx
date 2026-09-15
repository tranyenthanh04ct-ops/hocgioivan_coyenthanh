import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc,
  setDoc
} from 'firebase/firestore';
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  GraduationCap, 
  MessageSquare, 
  Save, 
  Send, 
  User, 
  FileText, 
  Check, 
  X,
  ExternalLink,
  Award
} from 'lucide-react';
import { db } from '../../firebase/config';
import { Assignment, Submission, UserProfile } from '../../types';

interface AssignmentSubmissionsViewProps {
  assignment: Assignment;
  onBack: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const AssignmentSubmissionsView: React.FC<AssignmentSubmissionsViewProps> = ({
  assignment,
  onBack,
  onShowToast,
}) => {
  const [assignedStudents, setAssignedStudents] = useState<UserProfile[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);

  // Selected student to grade
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);

  // Grading form state
  const [gradeScore, setGradeScore] = useState<string>('');
  const [gradeFeedback, setGradeFeedback] = useState<string>('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  // Fetch real students and submissions
  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch assigned students
      const usersQuery = query(collection(db, 'users'), where('role', '==', 'student'));
      const usersSnap = await getDocs(usersQuery);
      let studentList: UserProfile[] = [];
      usersSnap.forEach((d) => {
        studentList.push(d.data() as UserProfile);
      });

      // Filter if assignment is assigned to specific students
      if (assignment.assignedTo !== 'all') {
        studentList = studentList.filter((s) => assignment.assignedTo.includes(s.uid));
      }
      setAssignedStudents(studentList);

      // 2. Fetch existing submissions for this assignment
      const subQuery = query(
        collection(db, 'submissions'),
        where('assignmentId', '==', assignment.id)
      );
      const subSnap = await getDocs(subQuery);
      const subMap: Record<string, Submission> = {};
      subSnap.forEach((d) => {
        const data = d.data() as Submission;
        subMap[data.studentId] = data;
      });
      setSubmissions(subMap);

      // Select first student if available and none selected
      if (studentList.length > 0 && !selectedStudent) {
        selectStudentForGrading(studentList[0], subMap[studentList[0].uid] || null);
      }
    } catch (err: any) {
      console.error('Error fetching submissions:', err);
      onShowToast('error', 'Lỗi tải danh sách nộp bài: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [assignment.id]);

  const selectStudentForGrading = (st: UserProfile, sub: Submission | null) => {
    setSelectedStudent(st);
    setActiveSubmission(sub);
    if (sub) {
      setGradeScore(sub.score !== undefined ? String(sub.score) : '');
      setGradeFeedback(sub.teacherFeedback || '');
    } else {
      setGradeScore('');
      setGradeFeedback('');
    }
  };

  // Calculate auto quiz score if student answered multiple choice
  const calculateAutoQuizScore = (submission: Submission): number => {
    if (!assignment.questions || assignment.questions.length === 0) return 0;
    let earned = 0;
    assignment.questions.forEach((q) => {
      if (q.type === 'multiple_choice') {
        const studentAns = submission.answers?.[q.id]?.selectedOptionIndex;
        if (studentAns !== undefined && studentAns === q.correctOptionIndex) {
          earned += Number(q.points) || 1;
        }
      }
    });
    return earned;
  };

  const handleSaveAndReturn = async () => {
    if (!selectedStudent) return;
    if (gradeScore === '' || isNaN(Number(gradeScore))) {
      onShowToast('error', 'Vui lòng nhập điểm số hợp lệ (thang điểm 10).');
      return;
    }

    const numericScore = Number(gradeScore);
    if (numericScore < 0 || numericScore > 10) {
      onShowToast('error', 'Điểm số phải nằm trong khoảng từ 0 đến 10.');
      return;
    }

    setIsSavingGrade(true);
    try {
      const submissionId = activeSubmission?.id || `${assignment.id}_${selectedStudent.uid}`;
      const now = new Date().toISOString();

      const updatedData: Partial<Submission> = {
        id: submissionId,
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        studentId: selectedStudent.uid,
        studentName: selectedStudent.displayName,
        studentClass: selectedStudent.classGrade || '',
        status: 'graded', // Đã chấm và trả kết quả cho HS
        score: numericScore,
        teacherFeedback: gradeFeedback.trim(),
        gradedAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'submissions', submissionId), updatedData, { merge: true });

      onShowToast('success', `Đã chấm và trả bài cho em ${selectedStudent.displayName} thành công!`);
      
      // Update local state
      const newSub: Submission = {
        ...(activeSubmission || ({} as Submission)),
        ...updatedData,
      } as Submission;

      setSubmissions((prev) => ({
        ...prev,
        [selectedStudent.uid]: newSub,
      }));
      setActiveSubmission(newSub);
    } catch (err: any) {
      console.error('Error saving grade:', err);
      onShowToast('error', 'Lỗi khi lưu điểm: ' + err.message);
    } finally {
      setIsSavingGrade(false);
    }
  };

  const submittedCount = assignedStudents.filter((s) => submissions[s.uid]?.status === 'submitted' || submissions[s.uid]?.status === 'graded').length;
  const gradedCount = assignedStudents.filter((s) => submissions[s.uid]?.status === 'graded').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 p-5 rounded-3xl border border-rose-100 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shrink-0"
            title="Quay lại danh sách bài tập"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                Chấm bài
              </span>
              <span className="text-xs text-gray-500">
                Hạn nộp: {new Date(assignment.dueDate).toLocaleString('vi-VN')}
              </span>
            </div>
            <h2 className="font-serif-literary text-xl font-bold text-gray-900 mt-0.5">
              {assignment.title}
            </h2>
          </div>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-2 bg-rose-50/70 p-2 rounded-2xl border border-rose-100/60 text-xs">
          <div className="px-3 py-1 bg-white rounded-xl font-semibold text-gray-700 shadow-2xs">
            Đã giao: <span className="text-rose-600">{assignedStudents.length}</span> HS
          </div>
          <div className="px-3 py-1 bg-white rounded-xl font-semibold text-gray-700 shadow-2xs">
            Đã nộp: <span className="text-emerald-600">{submittedCount}</span>
          </div>
          <div className="px-3 py-1 bg-white rounded-xl font-semibold text-gray-700 shadow-2xs">
            Đã chấm: <span className="text-purple-600">{gradedCount}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400">
          <div className="w-7 h-7 border-2 border-rose-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Đang tải danh sách bài làm...</p>
        </div>
      ) : assignedStudents.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl border border-rose-100 text-center text-gray-500 text-sm">
          Bài tập này chưa có học sinh nào được giao (hoặc lớp học chưa có học sinh).
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Student Roster List */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-rose-100 p-4 shadow-xs space-y-2 max-h-[75vh] overflow-y-auto">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider px-2 py-1 mb-2">
              Danh sách học sinh ({assignedStudents.length})
            </h3>

            {assignedStudents.map((st) => {
              const sub = submissions[st.uid];
              const isSelected = selectedStudent?.uid === st.uid;
              const hasSubmitted = sub && (sub.status === 'submitted' || sub.status === 'graded');
              const isGraded = sub && sub.status === 'graded';

              return (
                <div
                  key={st.uid}
                  onClick={() => selectStudentForGrading(st, sub || null)}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-200'
                      : 'bg-rose-50/40 hover:bg-rose-50/80 text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-pink-100 text-pink-600'
                    }`}>
                      {st.displayName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-bold truncate leading-snug">{st.displayName}</p>
                      <p className={`text-[11px] truncate ${isSelected ? 'text-rose-100' : 'text-gray-400'}`}>
                        {st.classGrade || 'Chưa phân lớp'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {isGraded ? (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        isSelected ? 'bg-white text-rose-600' : 'bg-purple-100 text-purple-700'
                      }`}>
                        <Award className="w-3 h-3" />
                        {sub.score}đ
                      </span>
                    ) : hasSubmitted ? (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isSelected ? 'bg-white/30 text-white' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        <Check className="w-3 h-3" />
                        Đã nộp
                      </span>
                    ) : (
                      <span className={`text-[11px] font-medium ${isSelected ? 'text-rose-200' : 'text-gray-400'}`}>
                        Chưa nộp
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Grading Panel */}
          <div className="lg:col-span-8 space-y-6">
            {selectedStudent ? (
              <div className="bg-white rounded-3xl border border-rose-100 p-6 sm:p-8 shadow-xs space-y-6">
                {/* Student header status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-rose-100 gap-3">
                  <div>
                    <h3 className="font-serif-literary text-xl font-bold text-gray-900">
                      Bài làm của: {selectedStudent.displayName}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Lớp: {selectedStudent.classGrade} • Tài khoản: {selectedStudent.studentCode || selectedStudent.email}
                    </p>
                  </div>

                  <div>
                    {activeSubmission?.status === 'submitted' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <Clock className="w-3.5 h-3.5" />
                        Đã nộp ({activeSubmission.submittedAt ? new Date(activeSubmission.submittedAt).toLocaleString('vi-VN') : 'Đúng hạn'})
                      </span>
                    )}
                    {activeSubmission?.status === 'graded' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Cô đã trả bài ({activeSubmission.score} điểm)
                      </span>
                    )}
                    {(!activeSubmission || activeSubmission.status === 'draft') && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Học sinh chưa nộp bài
                      </span>
                    )}
                  </div>
                </div>

                {/* Assignment Questions & Student Answers */}
                <div className="space-y-6">
                  {assignment.questions && assignment.questions.length > 0 ? (
                    assignment.questions.map((q, idx) => {
                      const studentAns = activeSubmission?.answers?.[q.id];
                      const isMultipleChoice = q.type === 'multiple_choice';

                      return (
                        <div 
                          key={q.id}
                          className="p-5 rounded-2xl bg-rose-50/30 border border-rose-100/70 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-sm font-bold text-gray-900 leading-snug">
                              <span className="text-rose-600 mr-1">Câu {idx + 1}:</span>
                              {q.questionText}
                            </h4>
                            <span className="px-2.5 py-0.5 bg-rose-100/60 rounded-full text-[11px] font-semibold text-rose-700 shrink-0">
                              {q.points} điểm
                            </span>
                          </div>

                          {/* If Multiple Choice */}
                          {isMultipleChoice && q.options && (
                            <div className="space-y-2 pt-1">
                              {q.options.map((opt, optIdx) => {
                                const isCorrect = optIdx === q.correctOptionIndex;
                                const isSelectedByStudent = optIdx === studentAns?.selectedOptionIndex;

                                let optStyle = 'bg-white border-gray-200 text-gray-700';
                                if (isCorrect && isSelectedByStudent) {
                                  optStyle = 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold';
                                } else if (isCorrect) {
                                  optStyle = 'bg-emerald-50/60 border-emerald-200 text-emerald-800 font-medium';
                                } else if (isSelectedByStudent) {
                                  optStyle = 'bg-rose-50 border-rose-300 text-rose-900 font-semibold';
                                }

                                return (
                                  <div
                                    key={optIdx}
                                    className={`p-3 rounded-xl border text-xs flex items-center justify-between ${optStyle}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] bg-black/5">
                                        {String.fromCharCode(65 + optIdx)}
                                      </span>
                                      <span>{opt}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isSelectedByStudent && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border font-bold text-gray-600">
                                          Em đã chọn
                                        </span>
                                      )}
                                      {isCorrect && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold">
                                          Đáp án đúng
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              {q.explanation && (
                                <div className="text-[11px] text-gray-500 italic pt-1 pl-1">
                                  💡 Hướng dẫn / Căn cứ: {q.explanation}
                                </div>
                              )}
                            </div>
                          )}

                          {/* If Essay */}
                          {!isMultipleChoice && (
                            <div className="pt-2">
                              <div className="p-4 bg-white rounded-2xl border border-rose-100 space-y-2">
                                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                  Bài làm tự luận của học sinh:
                                </p>
                                {studentAns?.essayText ? (
                                  <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed font-sans">
                                    {studentAns.essayText}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 italic">
                                    (Học sinh chưa nhập câu trả lời văn bản cho câu này)
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    // Default general essay assignment if no separated questions
                    <div className="p-5 rounded-2xl bg-rose-50/40 border border-rose-100 space-y-3">
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Đề bài: {assignment.description}
                      </p>
                      <div className="p-4 bg-white rounded-2xl border border-rose-100">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                          Bài làm của học sinh:
                        </p>
                        {activeSubmission?.answers?.['general']?.essayText ? (
                          <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                            {activeSubmission.answers['general'].essayText}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">
                            Chưa có nội dung nộp.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Attachment if student uploaded handwritten photo */}
                  {activeSubmission?.attachmentUrl && (
                    <div className="p-4 rounded-2xl bg-white border border-rose-100">
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                        Tệp đính kèm bài làm của em:
                      </p>
                      <a
                        href={activeSubmission.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Xem ảnh chụp bài làm ({activeSubmission.attachmentName || 'Tệp đính kèm'})</span>
                      </a>
                      <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 max-w-sm">
                        <img 
                          src={activeSubmission.attachmentUrl} 
                          alt="Bài làm" 
                          className="w-full h-auto object-contain max-h-60" 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Grading & Feedback Section */}
                <div className="pt-6 border-t border-rose-100 space-y-4 bg-rose-50/40 p-6 rounded-3xl border">
                  <div className="flex items-center gap-2 text-rose-700 font-serif-literary font-bold text-lg">
                    <GraduationCap className="w-5 h-5" />
                    <span>Chấm điểm & Lời phê của Cô Yến Thanh</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Điểm số (Thang điểm 10) *
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max="10"
                        value={gradeScore}
                        onChange={(e) => setGradeScore(e.target.value)}
                        placeholder="Ví dụ: 8.5"
                        className="w-full px-4 py-2.5 bg-white border border-rose-200 rounded-2xl text-base font-bold text-rose-600 focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Lời nhận xét / Lời phê ân cần của cô
                      </label>
                      <textarea
                        rows={3}
                        value={gradeFeedback}
                        onChange={(e) => setGradeFeedback(e.target.value)}
                        placeholder="Em có dẫn chứng rất phong phú, hành văn truyền cảm. Cần chú ý thêm cấu trúc liên kết đoạn..."
                        className="w-full p-3 bg-white border border-rose-200 rounded-2xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveAndReturn}
                      disabled={isSavingGrade}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-linear-to-r from-rose-500 to-pink-500 text-white text-sm font-bold shadow-md shadow-rose-200 hover:from-rose-600 hover:to-pink-600 transition-all transform active:scale-95 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSavingGrade ? 'Đang lưu...' : 'Chấm điểm & Trả kết quả cho HS'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-3xl border border-rose-100 text-center text-gray-400">
                Hãy chọn một học sinh từ danh sách bên trái để chấm bài.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
