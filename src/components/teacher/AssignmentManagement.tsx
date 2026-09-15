import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { 
  FileCheck, 
  Plus, 
  Search, 
  Clock, 
  Users, 
  Calendar, 
  Edit3, 
  Trash2, 
  GraduationCap, 
  CheckCircle2, 
  X, 
  UploadCloud, 
  HelpCircle,
  ListOrdered,
  FileText,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { db, storage } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Assignment, AssignmentType, Question, UserProfile, Submission } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { ConfirmModal } from '../common/ConfirmModal';
import { AssignmentSubmissionsView } from './AssignmentSubmissionsView';

interface AssignmentManagementProps {
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const AssignmentManagement: React.FC<AssignmentManagementProps> = ({ onShowToast }) => {
  const { currentUser } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissionsCountMap, setSubmissionsCountMap] = useState<Record<string, { submitted: number; total: number; graded: number }>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected assignment to view submissions and grade
  const [gradingAssignment, setGradingAssignment] = useState<Assignment | null>(null);

  // Available students in system to select from
  const [availableStudents, setAvailableStudents] = useState<UserProfile[]>([]);

  // Create / Edit modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('mixed');
  const [gradeClass, setGradeClass] = useState('Tất cả');
  const [dueDate, setDueDate] = useState('');
  const [assignedTarget, setAssignedTarget] = useState<'all' | 'custom'>('all');
  const [selectedStudentUids, setSelectedStudentUids] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  // File upload state for assignment attachment
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState('');
  const [existingAttachmentName, setExistingAttachmentName] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);

  const fetchAssignmentsAndData = async () => {
    try {
      setLoading(true);

      // 1. Fetch all assignments
      const q = query(collection(db, 'assignments'));
      const snap = await getDocs(q);
      const list: Assignment[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Assignment);
      });
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setAssignments(list);

      // 2. Fetch all real students
      const studQuery = query(collection(db, 'users'), where('role', '==', 'student'));
      const studSnap = await getDocs(studQuery);
      const studs: UserProfile[] = [];
      studSnap.forEach((d) => studs.push(d.data() as UserProfile));
      setAvailableStudents(studs);

      // 3. Fetch submissions stats
      const subSnap = await getDocs(collection(db, 'submissions'));
      const stats: Record<string, { submitted: number; total: number; graded: number }> = {};
      
      list.forEach((assign) => {
        const totalAssigned = assign.assignedTo === 'all' ? studs.length : assign.assignedTo.length;
        stats[assign.id] = { submitted: 0, total: totalAssigned, graded: 0 };
      });

      subSnap.forEach((docSnap) => {
        const sub = docSnap.data() as Submission;
        if (stats[sub.assignmentId]) {
          if (sub.status === 'submitted' || sub.status === 'graded') {
            stats[sub.assignmentId].submitted += 1;
          }
          if (sub.status === 'graded') {
            stats[sub.assignmentId].graded += 1;
          }
        }
      });

      setSubmissionsCountMap(stats);
    } catch (err: any) {
      console.error('Error fetching assignments:', err);
      onShowToast('error', 'Lỗi khi tải bài tập: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignmentsAndData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setAssignmentType('mixed');
    setGradeClass('Tất cả');
    // Default dueDate: 3 days from now at 23:59
    const defaultD = new Date();
    defaultD.setDate(defaultD.getDate() + 3);
    defaultD.setHours(23, 59, 0, 0);
    setDueDate(defaultD.toISOString().slice(0, 16));
    setAssignedTarget('all');
    setSelectedStudentUids([]);
    setQuestions([]);
    setUploadFile(null);
    setExistingAttachmentUrl('');
    setExistingAttachmentName('');
    setUploadProgress(null);
    setIsFormOpen(false);
  };

  const handleOpenEdit = (a: Assignment) => {
    setEditingId(a.id);
    setTitle(a.title);
    setDescription(a.description || '');
    setAssignmentType(a.type);
    setGradeClass(a.grade || 'Tất cả');
    setDueDate(a.dueDate ? new Date(a.dueDate).toISOString().slice(0, 16) : '');
    setAssignedTarget(a.assignedTo === 'all' ? 'all' : 'custom');
    setSelectedStudentUids(Array.isArray(a.assignedTo) ? a.assignedTo : []);
    setQuestions(a.questions || []);
    setExistingAttachmentUrl(a.attachmentUrl || '');
    setExistingAttachmentName(a.attachmentName || '');
    setUploadFile(null);
    setUploadProgress(null);
    setIsFormOpen(true);
  };

  // Add Question Helpers
  const addMultipleChoiceQuestion = () => {
    const newQ: Question = {
      id: `q_${Date.now()}`,
      type: 'multiple_choice',
      questionText: '',
      options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
      correctOptionIndex: 0,
      explanation: '',
      points: 2,
    };
    setQuestions([...questions, newQ]);
  };

  const addEssayQuestion = () => {
    const newQ: Question = {
      id: `q_${Date.now()}`,
      type: 'essay',
      questionText: '',
      points: 5,
    };
    setQuestions([...questions, newQ]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      onShowToast('error', 'Vui lòng nhập tiêu đề bài tập.');
      return;
    }

    if (!dueDate) {
      onShowToast('error', 'Vui lòng đặt hạn nộp bài tập.');
      return;
    }

    if (assignedTarget === 'custom' && selectedStudentUids.length === 0) {
      onShowToast('error', 'Cô hãy chọn ít nhất 1 học sinh để giao bài nhé.');
      return;
    }

    setIsSubmitting(true);
    try {
      let attachmentUrl = existingAttachmentUrl;
      let attachmentName = existingAttachmentName;

      // Handle Storage upload if file selected
      if (uploadFile) {
        try {
          const timestamp = Date.now();
          const cleanName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storageRef = ref(storage, `assignments/${timestamp}_${cleanName}`);
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
          onShowToast('info', 'Lưu ý: Tải tệp đính kèm gặp trục trặc, vẫn lưu bài tập văn bản.');
        }
      }

      // Calculate total points
      const calculatedPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
      const totalPoints = calculatedPoints > 0 ? calculatedPoints : 10;

      const assignmentId = editingId || `asg_${Date.now()}`;
      const data: Partial<Assignment> = {
        title: title.trim(),
        description: description.trim(),
        type: assignmentType,
        grade: gradeClass,
        dueDate: new Date(dueDate).toISOString(),
        assignedTo: assignedTarget === 'all' ? 'all' : selectedStudentUids,
        attachmentUrl: attachmentUrl || undefined,
        attachmentName: attachmentName || undefined,
        totalPoints,
        questions,
        authorId: currentUser?.uid || 'admin',
        isPublished: true,
      };

      if (!editingId) {
        data.id = assignmentId;
        data.createdAt = new Date().toISOString();
        await setDoc(doc(db, 'assignments', assignmentId), data);
        onShowToast('success', 'Đã giao bài tập mới cho học sinh thành công!');
      } else {
        await updateDoc(doc(db, 'assignments', editingId), data);
        onShowToast('success', 'Đã cập nhật bài tập thành công!');
      }

      resetForm();
      await fetchAssignmentsAndData();
    } catch (err: any) {
      console.error('Save assignment error:', err);
      onShowToast('error', 'Lỗi khi lưu bài tập: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    try {
      await deleteDoc(doc(db, 'assignments', assignmentToDelete.id));
      onShowToast('success', `Đã xóa bài tập "${assignmentToDelete.title}"`);
      setAssignmentToDelete(null);
      await fetchAssignmentsAndData();
    } catch (err: any) {
      onShowToast('error', 'Lỗi khi xóa bài tập: ' + err.message);
    }
  };

  const filteredAssignments = assignments.filter((a) =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.description && a.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // If currently grading an assignment, render grading view
  if (gradingAssignment) {
    return (
      <AssignmentSubmissionsView
        assignment={gradingAssignment}
        onBack={() => {
          setGradingAssignment(null);
          fetchAssignmentsAndData();
        }}
        onShowToast={onShowToast}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 p-5 rounded-3xl border border-rose-100/80 shadow-xs">
        <div>
          <h2 className="font-serif-literary text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-rose-500" />
            <span>Giao bài tập & Chấm điểm ({assignments.length})</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Tạo bài tập tự luận và trắc nghiệm, theo dõi danh sách nộp bài và chấm điểm cho học sinh.
          </p>
        </div>

        <button
          id="btn-create-assignment"
          onClick={() => {
            resetForm();
            setIsFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-linear-to-r from-rose-500 to-pink-500 text-white text-sm font-bold shadow-md shadow-rose-200 hover:from-rose-600 hover:to-pink-600 transition-all transform active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Giao bài tập mới</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          id="assignment-search-input"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm bài tập theo tiêu đề hoặc nội dung yêu cầu..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-rose-100 rounded-2xl text-sm placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-rose-400"
        />
      </div>

      {/* Assignment List */}
      {loading ? (
        <div className="p-12 text-center text-gray-400">
          <div className="w-7 h-7 border-2 border-rose-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Đang tải danh sách bài tập...</p>
        </div>
      ) : assignments.length === 0 ? (
        <EmptyState
          icon="assignment"
          title="Chưa có bài tập"
          description="Hiện tại cô chưa giao bài tập nào. Cô hãy bấm nút 'Giao bài tập mới' để tạo bài rèn luyện kỹ năng viết và đọc hiểu cho học sinh nhé!"
          actionText="Giao bài tập đầu tiên"
          onAction={() => {
            resetForm();
            setIsFormOpen(true);
          }}
        />
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl text-center border border-rose-100 text-gray-500 text-sm">
          Không tìm thấy bài tập nào phù hợp.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredAssignments.map((assign) => {
            const stat = submissionsCountMap[assign.id] || { 
              submitted: 0, 
              total: assign.assignedTo === 'all' ? availableStudents.length : assign.assignedTo.length,
              graded: 0 
            };
            const isOverdue = new Date(assign.dueDate).getTime() < Date.now();

            return (
              <div
                key={assign.id}
                id={`assignment-card-${assign.id}`}
                className="bg-white rounded-3xl border border-rose-100 p-6 shadow-xs hover:shadow-md hover:border-rose-200 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                      {assign.type === 'essay' ? 'Tự luận' : assign.type === 'quiz' ? 'Trắc nghiệm' : 'Kết hợp (TN & TL)'}
                    </span>

                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                      isOverdue ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      {isOverdue ? 'Đã hết hạn' : `Hạn: ${new Date(assign.dueDate).toLocaleDateString('vi-VN')}`}
                    </span>
                  </div>

                  <h3 className="font-serif-literary text-lg font-bold text-gray-900 line-clamp-2 mb-2">
                    {assign.title}
                  </h3>

                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-4">
                    {assign.description || 'Xem chi tiết đề bài và nộp bài đúng hạn.'}
                  </p>

                  {/* Submission Progress Bar */}
                  <div className="p-3 bg-rose-50/40 rounded-2xl border border-rose-100/60 mb-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-gray-600">Tiến độ nộp bài của học sinh:</span>
                      <span className="text-rose-700">
                        {stat.submitted} / {stat.total} đã nộp ({stat.graded} đã chấm)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-rose-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${stat.total > 0 ? (stat.submitted / stat.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-rose-50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      id={`btn-edit-assign-${assign.id}`}
                      onClick={() => handleOpenEdit(assign)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      title="Sửa bài tập"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      id={`btn-delete-assign-${assign.id}`}
                      onClick={() => setAssignmentToDelete(assign)}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Xóa bài tập"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    id={`btn-grade-assign-${assign.id}`}
                    onClick={() => setGradingAssignment(assign)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-linear-to-r from-rose-500 to-pink-500 text-white text-xs font-bold shadow-xs hover:from-rose-600 hover:to-pink-600 transition-all transform active:scale-95"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Xem bài làm & Chấm điểm</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create/Edit Assignment */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#FFFDF9] border border-rose-100 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl my-8 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-rose-100 mb-5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-literary text-lg font-bold text-gray-900">
                    {editingId ? 'Chỉnh sửa bài tập Ngữ văn' : 'Giao bài tập Ngữ văn mới'}
                  </h3>
                  <p className="text-xs text-gray-500">Soạn câu hỏi trắc nghiệm, đề tự luận và chọn học sinh giao bài</p>
                </div>
              </div>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-5 overflow-y-auto pr-2 flex-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Tiêu đề bài tập *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Bài tập rèn luyện: Đọc hiểu và Viết đoạn văn 200 chữ tác phẩm 'Vợ nhặt'..."
                  className="w-full px-4 py-2.5 bg-white border border-rose-100 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Hình thức bài tập
                  </label>
                  <select
                    value={assignmentType}
                    onChange={(e) => setAssignmentType(e.target.value as AssignmentType)}
                    className="w-full px-4 py-2.5 bg-white border border-rose-100 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                  >
                    <option value="mixed">Kết hợp cả Trắc nghiệm & Tự luận</option>
                    <option value="essay">Chuyên Tự luận (Bài văn / Đoạn văn)</option>
                    <option value="quiz">Chuyên Trắc nghiệm kiến thức</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Hạn chót nộp bài *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-rose-100 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Yêu cầu đề bài / Hướng dẫn của cô
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nhập hướng dẫn làm bài, yêu cầu thời gian, lưu ý phương pháp làm bài..."
                  className="w-full p-4 bg-white border border-rose-100 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                />
              </div>

              {/* Student Assignment Target */}
              <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-3">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Chọn học sinh cần giao *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="assignTarget"
                      checked={assignedTarget === 'all'}
                      onChange={() => setAssignedTarget('all')}
                      className="text-rose-600 focus:ring-rose-400"
                    />
                    <span>Giao cho tất cả học sinh ({availableStudents.length} em)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="assignTarget"
                      checked={assignedTarget === 'custom'}
                      onChange={() => setAssignedTarget('custom')}
                      className="text-rose-600 focus:ring-rose-400"
                    />
                    <span>Chọn từng học sinh cụ thể</span>
                  </label>
                </div>

                {assignedTarget === 'custom' && (
                  <div className="mt-3 p-3 bg-white rounded-xl border border-rose-100 max-h-40 overflow-y-auto space-y-1.5">
                    {availableStudents.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Chưa có học sinh nào trong hệ thống.</p>
                    ) : (
                      availableStudents.map((st) => (
                        <label
                          key={st.uid}
                          className="flex items-center gap-2.5 text-xs text-gray-700 hover:bg-rose-50/50 p-1.5 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudentUids.includes(st.uid)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentUids([...selectedStudentUids, st.uid]);
                              } else {
                                setSelectedStudentUids(selectedStudentUids.filter((id) => id !== st.uid));
                              }
                            }}
                            className="text-rose-600 focus:ring-rose-400 rounded-sm"
                          />
                          <span className="font-bold text-gray-900">{st.displayName}</span>
                          <span className="text-gray-400">({st.classGrade})</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Questions Builder */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Danh sách câu hỏi bài tập ({questions.length} câu)
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={addMultipleChoiceQuestion}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm trắc nghiệm</span>
                    </button>
                    <button
                      type="button"
                      onClick={addEssayQuestion}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm câu tự luận</span>
                    </button>
                  </div>
                </div>

                {questions.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-rose-200 rounded-2xl text-xs text-gray-400">
                    Chưa có câu hỏi chi tiết. Cô có thể thêm câu hỏi trắc nghiệm/tự luận ở trên hoặc để học sinh làm bài theo phần mô tả chung.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((q, qIndex) => (
                      <div
                        key={q.id}
                        className="p-4 bg-white rounded-2xl border border-rose-100 space-y-3 relative shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-rose-100 text-rose-700">
                            Câu {qIndex + 1} ({q.type === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'})
                          </span>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-gray-500">Điểm:</span>
                              <input
                                type="number"
                                min="0.5"
                                step="0.5"
                                value={q.points}
                                onChange={(e) => updateQuestion(q.id, { points: Number(e.target.value) })}
                                className="w-14 px-2 py-1 bg-rose-50 border border-rose-200 rounded-lg text-center font-bold text-rose-600 text-xs"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => removeQuestion(q.id)}
                              className="text-gray-400 hover:text-rose-600 p-1"
                              title="Xóa câu hỏi"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            required
                            value={q.questionText}
                            onChange={(e) => updateQuestion(q.id, { questionText: e.target.value })}
                            placeholder="Nhập nội dung câu hỏi..."
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-rose-400"
                          />
                        </div>

                        {/* If Multiple Choice Options */}
                        {q.type === 'multiple_choice' && (
                          <div className="space-y-2 pt-1 pl-2">
                            <p className="text-[11px] font-semibold text-gray-500">
                              Chọn đáp án đúng (tích vào nút tròn):
                            </p>
                            {q.options?.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct_${q.id}`}
                                  checked={q.correctOptionIndex === optIdx}
                                  onChange={() => updateQuestion(q.id, { correctOptionIndex: optIdx })}
                                  className="text-rose-600 focus:ring-rose-400"
                                  title="Chọn làm đáp án đúng"
                                />
                                <span className="font-bold text-xs text-rose-700 w-4">
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const newOpts = [...(q.options || [])];
                                    newOpts[optIdx] = e.target.value;
                                    updateQuestion(q.id, { options: newOpts });
                                  }}
                                  className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                                  placeholder={`Nội dung phương án ${String.fromCharCode(65 + optIdx)}...`}
                                />
                              </div>
                            ))}

                            <div>
                              <input
                                type="text"
                                value={q.explanation || ''}
                                onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                                placeholder="Lời giải thích / Dẫn chứng văn học (hiển thị khi trả bài)..."
                                className="w-full px-3 py-1.5 bg-purple-50/50 border border-purple-100 rounded-lg text-xs text-purple-900"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional Attachment File */}
              <div className="p-4 bg-rose-50/50 rounded-2xl border border-dashed border-rose-200">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <UploadCloud className="w-4 h-4 text-rose-500" />
                  <span>Đính kèm tệp đề bài / tài liệu (PDF, Word, Ảnh)</span>
                </div>

                <input
                  type="file"
                  id="assignment-file-input"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-100 file:text-rose-700 hover:file:bg-rose-200 cursor-pointer"
                />

                {uploadFile && (
                  <p className="mt-2 text-xs text-emerald-700 font-medium">
                    Đã chọn tệp: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}

                {existingAttachmentUrl && !uploadFile && (
                  <p className="mt-2 text-xs text-purple-700 font-medium">
                    Tệp hiện tại: {existingAttachmentName || 'Đã đính kèm'}
                  </p>
                )}

                {uploadProgress !== null && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-linear-to-r from-rose-500 to-pink-500 rounded-xl shadow-md shadow-rose-200 hover:from-rose-600 hover:to-pink-600 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang lưu...' : (editingId ? 'Lưu thay đổi' : 'Giao bài ngay')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(assignmentToDelete)}
        title="Xác nhận xóa bài tập"
        message={`Cô có chắc chắn muốn xóa bài tập "${assignmentToDelete?.title}"? Tất cả bài làm của học sinh cho bài tập này cũng sẽ bị xóa.`}
        confirmText="Xóa bài tập"
        isDangerous={true}
        onConfirm={handleDeleteAssignment}
        onCancel={() => setAssignmentToDelete(null)}
      />
    </div>
  );
};
