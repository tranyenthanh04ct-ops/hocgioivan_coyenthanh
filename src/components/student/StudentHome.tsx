import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { 
  Sparkles, 
  BookOpen, 
  FileCheck, 
  Clock, 
  Award, 
  ArrowRight, 
  CheckCircle2, 
  Feather,
  Flame,
  Calendar
} from 'lucide-react';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Assignment, Material, Submission } from '../../types';

interface StudentHomeProps {
  onNavigateTab: (tab: 'materials' | 'assignments') => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const StudentHome: React.FC<StudentHomeProps> = ({ onNavigateTab }) => {
  const { userProfile, currentUser } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [recentMaterials, setRecentMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);

        // 1. Fetch assignments
        const asgSnap = await getDocs(collection(db, 'assignments'));
        const myAsg: Assignment[] = [];
        asgSnap.forEach((d) => {
          const item = { id: d.id, ...d.data() } as Assignment;
          if (item.assignedTo === 'all' || (Array.isArray(item.assignedTo) && item.assignedTo.includes(currentUser.uid))) {
            myAsg.push(item);
          }
        });
        setAssignments(myAsg);

        // 2. Fetch submissions
        const subQuery = query(collection(db, 'submissions'), where('studentId', '==', currentUser.uid));
        const subSnap = await getDocs(subQuery);
        const subMap: Record<string, Submission> = {};
        subSnap.forEach((d) => {
          const item = d.data() as Submission;
          subMap[item.assignmentId] = item;
        });
        setSubmissions(subMap);

        // 3. Fetch recent materials
        const matSnap = await getDocs(collection(db, 'materials'));
        const mats: Material[] = [];
        matSnap.forEach((d) => {
          mats.push({ id: d.id, ...d.data() } as Material);
        });
        mats.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setRecentMaterials(mats.slice(0, 3));
      } catch (err) {
        console.error('Student home data error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser?.uid]);

  const todoAssignments = assignments.filter((a) => !submissions[a.id]);
  const gradedAssignments = assignments.filter((a) => submissions[a.id]?.status === 'graded');

  return (
    <div className="space-y-8">
      {/* Warm Literary Greeting Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-rose-500 via-pink-500 to-purple-500 p-6 sm:p-10 text-white shadow-xl shadow-rose-200/50">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Góc học tập Ngữ văn</span>
          </div>

          <h1 className="font-serif-literary text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
            Chào em {userProfile?.displayName || 'Học sinh'}! ✨
          </h1>

          <p className="text-xs sm:text-sm text-rose-100 leading-relaxed font-sans">
            "Văn học là tấm gương phản chiếu tâm hồn." Chúc em một buổi học thật nhiều cảm xúc và chuẩn bị bài thật chu đáo cùng cô Yến Thanh nhé!
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('assignments')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-rose-600 text-xs sm:text-sm font-bold shadow-md hover:bg-rose-50 transition-all transform active:scale-95"
            >
              <FileCheck className="w-4 h-4" />
              <span>Làm bài tập ngay ({todoAssignments.length})</span>
            </button>

            <button
              onClick={() => onNavigateTab('materials')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs sm:text-sm font-bold backdrop-blur-xs transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>Đọc tài liệu mới</span>
            </button>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Task Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          onClick={() => onNavigateTab('assignments')}
          className="bg-white p-5 rounded-3xl border border-rose-100 shadow-xs hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Nhiệm vụ cần làm
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-serif-literary text-3xl font-extrabold text-rose-600">
                {todoAssignments.length}
              </span>
              <span className="text-xs text-gray-400">bài chưa nộp</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('assignments')}
          className="bg-white p-5 rounded-3xl border border-rose-100 shadow-xs hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Bài đã có điểm
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-serif-literary text-3xl font-extrabold text-purple-600">
                {gradedAssignments.length}
              </span>
              <span className="text-xs text-gray-400">cô đã trả bài</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('materials')}
          className="bg-white p-5 rounded-3xl border border-rose-100 shadow-xs hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Kho tài liệu
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-serif-literary text-3xl font-extrabold text-pink-600">
                {recentMaterials.length}
              </span>
              <span className="text-xs text-gray-400">bài giảng hữu ích</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Section: Priority Tasks & Recent Materials */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 cols: Urgent Tasks */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif-literary text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-rose-500" />
              <span>Bài tập cần hoàn thành</span>
            </h2>

            <button
              onClick={() => onNavigateTab('assignments')}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="p-8 bg-white rounded-3xl border border-rose-100 text-center text-gray-400 text-xs">
              Đang kiểm tra nhiệm vụ...
            </div>
          ) : todoAssignments.length === 0 ? (
            <div className="p-8 bg-white rounded-3xl border border-rose-100 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-gray-800">Không có bài tập nào còn hạn cần làm!</p>
              <p className="text-xs text-gray-500">Em đã làm rất tốt. Hãy tranh thủ đọc thêm tài liệu bài giảng nhé.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todoAssignments.slice(0, 3).map((item) => {
                const isOverdue = new Date(item.dueDate).getTime() < Date.now();
                return (
                  <div
                    key={item.id}
                    className="p-5 bg-white rounded-3xl border border-rose-100 hover:border-rose-300 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700">
                          {item.type === 'essay' ? 'Tự luận' : item.type === 'quiz' ? 'Trắc nghiệm' : 'Kết hợp'}
                        </span>
                        <span className={`text-[11px] font-medium ${isOverdue ? 'text-rose-600 font-bold' : 'text-gray-400'}`}>
                          Hạn: {new Date(item.dueDate).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <h3 className="font-serif-literary text-base font-bold text-gray-900 line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {item.description || 'Xem chi tiết đề bài'}
                      </p>
                    </div>

                    <button
                      onClick={() => onNavigateTab('assignments')}
                      className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-linear-to-r from-rose-500 to-pink-500 text-white text-xs font-bold shadow-xs hover:from-rose-600 hover:to-pink-600 transition-all shrink-0"
                    >
                      <span>Làm bài</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 5 cols: Recent Materials & Inspiration */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif-literary text-xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-rose-500" />
              <span>Tài liệu mới từ Cô</span>
            </h2>

            <button
              onClick={() => onNavigateTab('materials')}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <span>Xem kho</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentMaterials.length === 0 ? (
            <div className="p-8 bg-white rounded-3xl border border-rose-100 text-center text-gray-400 text-xs">
              Chưa có tài liệu mới nào.
            </div>
          ) : (
            <div className="space-y-3">
              {recentMaterials.map((mat) => (
                <div
                  key={mat.id}
                  onClick={() => onNavigateTab('materials')}
                  className="p-4 bg-white rounded-3xl border border-rose-100 hover:border-rose-200 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                    <span className="font-semibold text-rose-600">{mat.category}</span>
                    <span>{mat.createdAt ? new Date(mat.createdAt).toLocaleDateString('vi-VN') : ''}</span>
                  </div>
                  <h3 className="font-serif-literary text-sm font-bold text-gray-900 group-hover:text-rose-600 transition-colors line-clamp-1">
                    {mat.title}
                  </h3>
                </div>
              ))}
            </div>
          )}

          {/* Inspirational Literary Quote Card */}
          <div className="p-5 rounded-3xl bg-linear-to-br from-rose-50/80 to-purple-50/80 border border-rose-100 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-700 uppercase tracking-wider">
              <Feather className="w-4 h-4" />
              <span>Gợi ý học tốt môn Văn</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed italic">
              "Hãy đọc kỹ tác phẩm nhiều lần để cảm nhận hơi thở của câu chữ, ghi chú các chi tiết nghệ thuật đắt giá và viết bằng sự rung động chân thành của trái tim mình."
            </p>
            <p className="text-[11px] text-rose-600 font-semibold text-right">
              — Lời dặn của Cô Yến Thanh
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
