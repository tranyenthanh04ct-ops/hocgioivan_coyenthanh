import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { 
  FileCheck, 
  Clock, 
  CheckCircle2, 
  Edit3, 
  Award, 
  AlertCircle, 
  ChevronRight,
  BookOpen,
  Calendar,
  Sparkles
} from 'lucide-react';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Assignment, Submission } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { StudentTakeAssignment } from './StudentTakeAssignment';
import { StudentSubmissionDetail } from './StudentSubmissionDetail';

interface StudentAssignmentsProps {
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const StudentAssignments: React.FC<StudentAssignmentsProps> = ({ onShowToast }) => {
  const { currentUser } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);

  // Active view: list | taking | detail
  const [activeView, setActiveView] = useState<'list' | 'take' | 'detail'>('list');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Sub-tabs: 'todo' | 'draft' | 'completed'
  const [statusTab, setStatusTab] = useState<'todo' | 'draft' | 'completed'>('todo');

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);

      // 1. Fetch all assignments
      const asgSnap = await getDocs(collection(db, 'assignments'));
      const allAsg: Assignment[] = [];
      asgSnap.forEach((d) => {
        const item = { id: d.id, ...d.data() } as Assignment;
        // Check if assigned to 'all' or this student
        if (item.assignedTo === 'all' || (Array.isArray(item.assignedTo) && item.assignedTo.includes(currentUser.uid))) {
          allAsg.push(item);
        }
      });
      allAsg.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setAssignments(allAsg);

      // 2. Fetch submissions of this student
      const subQuery = query(collection(db, 'submissions'), where('studentId', '==', currentUser.uid));
      const subSnap = await getDocs(subQuery);
      const subMap: Record<string, Submission> = {};
      subSnap.forEach((d) => {
        const item = d.data() as Submission;
        subMap[item.assignmentId] = item;
      });
      setSubmissions(subMap);
    } catch (err) {
      console.error('Error fetching student assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser?.uid]);

  // Categorize
  const todoList = assignments.filter((a) => !submissions[a.id]);
  const draftList = assignments.filter((a) => submissions[a.id]?.status === 'draft');
  const completedList = assignments.filter(
    (a) => submissions[a.id]?.status === 'submitted' || submissions[a.id]?.status === 'graded'
  );

  const handleStartAssignment = (a: Assignment) => {
    setSelectedAssignment(a);
    setActiveView('take');
  };

  const handleViewDetail = (a: Assignment) => {
    setSelectedAssignment(a);
    setActiveView('detail');
  };

  // Render Taking View
  if (activeView === 'take' && selectedAssignment) {
    return (
      <StudentTakeAssignment
        assignment={selectedAssignment}
        onBack={() => {
          setActiveView('list');
          fetchData();
        }}
        onSubmittedSuccess={() => {
          setActiveView('list');
          setStatusTab('completed');
          fetchData();
        }}
        onShowToast={onShowToast}
      />
    );
  }

  // Render Detail View
  if (activeView === 'detail' && selectedAssignment) {
    const sub = submissions[selectedAssignment.id];
    if (sub) {
      return (
        <StudentSubmissionDetail
          assignment={selectedAssignment}
          submission={sub}
          onBack={() => {
            setActiveView('list');
            fetchData();
          }}
        />
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white/80 p-5 rounded-3xl border border-rose-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-literary text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-rose-500" />
            <span>Bài tập của em ({assignments.length})</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Xem bài tập được cô Yến Thanh giao, làm bài trực tiếp và xem điểm nhận xét nhé!
          </p>
        </div>

        {/* 3 Status Filter Pills */}
        <div className="flex p-1.5 bg-rose-50/70 rounded-2xl border border-rose-100/60 overflow-x-auto">
          <button
            id="tab-todo-assignments"
            onClick={() => setStatusTab('todo')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusTab === 'todo'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-gray-600 hover:text-rose-500'
            }`}
          >
            <span>Chưa làm</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px]">
              {todoList.length}
            </span>
          </button>

          <button
            id="tab-draft-assignments"
            onClick={() => setStatusTab('draft')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusTab === 'draft'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-gray-600 hover:text-rose-500'
            }`}
          >
            <span>Đang làm (nháp)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-700 text-[10px]">
              {draftList.length}
            </span>
          </button>

          <button
            id="tab-completed-assignments"
            onClick={() => setStatusTab('completed')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusTab === 'completed'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-gray-600 hover:text-rose-500'
            }`}
          >
            <span>Đã nộp & Đã chấm</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 text-[10px]">
              {completedList.length}
            </span>
          </button>
        </div>
      </div>

      {/* Assignment List Content */}
      {loading ? (
        <div className="p-12 text-center text-gray-400">
          <div className="w-7 h-7 border-2 border-rose-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Đang tải danh sách bài tập...</p>
        </div>
      ) : assignments.length === 0 ? (
        <EmptyState
          icon="assignment"
          title="Chưa có bài tập"
          description="Hiện tại em chưa có bài tập nào được giao. Khi cô Yến Thanh giao bài, thông báo và đề bài sẽ xuất hiện ngay tại đây!"
        />
      ) : (
        <div>
          {/* TAB 1: CHƯA LÀM */}
          {statusTab === 'todo' && (
            todoList.length === 0 ? (
              <div className="bg-white p-10 rounded-3xl border border-rose-100 text-center text-gray-500 text-sm">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-gray-800">Tuyệt vời! Em đã hoàn thành hết các bài tập được giao.</p>
                <p className="text-xs text-gray-400 mt-1">Hãy xem lại bài đã nộp hoặc đọc thêm tài liệu của cô nhé.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {todoList.map((item) => {
                  const isOverdue = new Date(item.dueDate).getTime() < Date.now();
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-3xl border border-rose-100 p-6 shadow-xs hover:shadow-md hover:border-rose-200 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                            {item.type === 'essay' ? 'Tự luận' : item.type === 'quiz' ? 'Trắc nghiệm' : 'Kết hợp'}
                          </span>

                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                            isOverdue ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-amber-50 text-amber-700'
                          }`}>
                            <Clock className="w-3.5 h-3.5" />
                            {isOverdue ? 'Đã quá hạn nộp' : `Hạn: ${new Date(item.dueDate).toLocaleDateString('vi-VN')}`}
                          </span>
                        </div>

                        <h3 className="font-serif-literary text-lg font-bold text-gray-900 line-clamp-2 mb-2">
                          {item.title}
                        </h3>

                        <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed mb-4">
                          {item.description || 'Bấm làm bài để xem chi tiết đề bài và nộp bài cho cô...'}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-rose-50 flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {item.questions?.length || 1} câu hỏi
                        </span>

                        <button
                          id={`btn-do-assignment-${item.id}`}
                          onClick={() => handleStartAssignment(item)}
                          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-linear-to-r from-rose-500 to-pink-500 text-white text-xs font-bold shadow-md shadow-rose-200 hover:from-rose-600 hover:to-pink-600 transition-all transform active:scale-95"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Làm bài ngay</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* TAB 2: ĐANG LÀM (NHÁP) */}
          {statusTab === 'draft' && (
            draftList.length === 0 ? (
              <div className="bg-white p-10 rounded-3xl border border-rose-100 text-center text-gray-500 text-sm">
                Em không có bài tập nào đang lưu nháp.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {draftList.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl border border-amber-200/80 p-6 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          Bản nháp đang làm
                        </span>
                        <span className="text-xs text-gray-400">
                          Hạn: {new Date(item.dueDate).toLocaleDateString('vi-VN')}
                        </span>
                      </div>

                      <h3 className="font-serif-literary text-lg font-bold text-gray-900 mb-2">
                        {item.title}
                      </h3>

                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-4">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-amber-100 flex items-center justify-between">
                      <span className="text-xs text-amber-700 font-medium">
                        Đã lưu nháp gần đây
                      </span>

                      <button
                        onClick={() => handleStartAssignment(item)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Tiếp tục làm bài</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* TAB 3: ĐÃ NỘP & ĐÃ CHẤM */}
          {statusTab === 'completed' && (
            completedList.length === 0 ? (
              <div className="bg-white p-10 rounded-3xl border border-rose-100 text-center text-gray-500 text-sm">
                Em chưa nộp bài tập nào. Hãy bắt đầu làm bài tập ở tab "Chưa làm" nhé!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {completedList.map((item) => {
                  const sub = submissions[item.id];
                  const isGraded = sub?.status === 'graded';

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-3xl border border-rose-100 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          {isGraded ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                              <Award className="w-3.5 h-3.5" />
                              Cô đã chấm: {sub.score} điểm
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Đã nộp bài (Chờ cô chấm)
                            </span>
                          )}

                          <span className="text-[11px] text-gray-400">
                            Nộp lúc: {sub?.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('vi-VN') : ''}
                          </span>
                        </div>

                        <h3 className="font-serif-literary text-lg font-bold text-gray-900 mb-2">
                          {item.title}
                        </h3>

                        {isGraded && sub.teacherFeedback && (
                          <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-100 text-xs text-rose-950 italic line-clamp-2 mb-3">
                            "{sub.teacherFeedback}"
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-rose-50 flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {isGraded ? 'Bấm xem lời phê chi tiết' : 'Cô Yến Thanh đang chấm bài'}
                        </span>

                        <button
                          id={`btn-view-result-${item.id}`}
                          onClick={() => handleViewDetail(item)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-colors"
                        >
                          <span>Xem kết quả & Bài làm</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
