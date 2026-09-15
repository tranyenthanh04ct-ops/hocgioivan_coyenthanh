import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  orderBy
} from 'firebase/firestore';
import { 
  UserPlus, 
  Search, 
  GraduationCap, 
  Key, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  Check, 
  X,
  Users,
  Copy
} from 'lucide-react';
import { db, createStudentAuthAccount } from '../../firebase/config';
import { UserProfile, ToastMessage } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { ConfirmModal } from '../common/ConfirmModal';

interface StudentManagementProps {
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({ onShowToast }) => {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  // Modal create
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newClass, setNewClass] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal edit
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editClass, setEditClass] = useState('');

  // Password view/reset
  const [showPasswordUid, setShowPasswordUid] = useState<string | null>(null);
  const [resetModalStudent, setResetModalStudent] = useState<UserProfile | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');

  // Confirm delete
  const [studentToDelete, setStudentToDelete] = useState<UserProfile | null>(null);

  // Fetch real students from Firestore
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const snapshot = await getDocs(q);
      const list: UserProfile[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as UserProfile);
      });
      // Sort in-memory by createdAt or name
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setStudents(list);
    } catch (err: any) {
      console.error('Error loading students:', err);
      onShowToast('error', 'Không thể tải danh sách học sinh: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Filtered students
  const filteredStudents = students.filter((s) => {
    const matchesSearch = 
      s.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.studentCode && s.studentCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'all' || s.classGrade === selectedClass;
    return matchesSearch && matchesClass;
  });

  const availableClasses = Array.from(new Set(students.map((s) => s.classGrade).filter(Boolean))) as string[];

  // Handle Create Student
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newUsername.trim() || !newPassword.trim()) {
      onShowToast('error', 'Vui lòng điền đầy đủ họ tên, tên đăng nhập và mật khẩu.');
      return;
    }

    const cleanUsername = newUsername.trim().toLowerCase().replace(/\s+/g, '');
    const studentEmail = `${cleanUsername}@yenthanh.edu.vn`;

    setIsSubmitting(true);
    try {
      // Check if username already exists
      const isDuplicate = students.some(
        s => s.studentCode?.toLowerCase().trim() === cleanUsername ||
             s.email?.toLowerCase().trim() === studentEmail
      );
      if (isDuplicate) {
        onShowToast('error', 'Tên đăng nhập này đã có học sinh sử dụng. Cô hãy chọn tên khác nhé.');
        setIsSubmitting(false);
        return;
      }

      // 1. Generate or create UID
      const newUid = await createStudentAuthAccount(studentEmail, newPassword.trim());

      // 2. Save document to Firestore
      const newProfile: UserProfile = {
        uid: newUid,
        email: studentEmail,
        displayName: newFullName.trim(),
        role: 'student',
        studentCode: cleanUsername,
        classGrade: newClass.trim() || 'Lớp chưa phân',
        rawPasswordHint: newPassword.trim(),
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', newUid), newProfile);

      onShowToast('success', `Đã tạo thành công tài khoản cho em ${newFullName.trim()}`);
      setIsCreateOpen(false);
      setNewFullName('');
      setNewClass('');
      setNewUsername('');
      setNewPassword('123456');
      await fetchStudents();
    } catch (err: any) {
      console.error('Create student error:', err);
      onShowToast('error', 'Lỗi khi tạo tài khoản: ' + (err.message || 'Thử lại sau.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Student
  const handleSaveEdit = async () => {
    if (!editingStudent) return;
    try {
      await updateDoc(doc(db, 'users', editingStudent.uid), {
        displayName: editFullName.trim(),
        classGrade: editClass.trim(),
      });
      onShowToast('success', 'Đã cập nhật thông tin học sinh.');
      setEditingStudent(null);
      await fetchStudents();
    } catch (err: any) {
      onShowToast('error', 'Lỗi khi sửa thông tin: ' + err.message);
    }
  };

  // Handle Reset Password Hint
  const handleSaveResetPassword = async () => {
    if (!resetModalStudent || !newResetPassword.trim()) return;
    try {
      await updateDoc(doc(db, 'users', resetModalStudent.uid), {
        rawPasswordHint: newResetPassword.trim(),
      });
      onShowToast('success', `Đã lưu mật khẩu mới cho em ${resetModalStudent.displayName}`);
      setResetModalStudent(null);
      setNewResetPassword('');
      await fetchStudents();
    } catch (err: any) {
      onShowToast('error', 'Lỗi khi cập nhật mật khẩu: ' + err.message);
    }
  };

  // Handle Delete Student
  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', studentToDelete.uid));
      onShowToast('success', `Đã xóa học sinh ${studentToDelete.displayName}`);
      setStudentToDelete(null);
      await fetchStudents();
    } catch (err: any) {
      onShowToast('error', 'Lỗi khi xóa học sinh: ' + err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    onShowToast('info', 'Đã sao chép: ' + text);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 p-5 rounded-3xl border border-rose-100/80 shadow-xs">
        <div>
          <h2 className="font-serif-literary text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-500" />
            <span>Danh sách học sinh ({students.length})</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Quản lý tài khoản, phân lớp và hỗ trợ mật khẩu cho học sinh của cô.
          </p>
        </div>

        <button
          id="btn-add-student"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-linear-to-r from-rose-500 to-pink-500 text-white text-sm font-bold shadow-md shadow-rose-200 hover:from-rose-600 hover:to-pink-600 transition-all transform active:scale-95 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Thêm học sinh mới</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="student-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên học sinh, tên đăng nhập hoặc lớp..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-rose-100 rounded-2xl text-sm placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-rose-400"
          />
        </div>

        <div>
          <select
            id="student-class-filter"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-rose-100 rounded-2xl text-sm text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-rose-400"
          >
            <option value="all">Tất cả các lớp</option>
            {availableClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Student List View */}
      {loading ? (
        <div className="p-12 text-center text-gray-400">
          <div className="w-7 h-7 border-2 border-rose-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Đang tải danh sách học sinh...</p>
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          icon="users"
          title="Chưa có học sinh nào"
          description="Lớp học văn của cô hiện chưa có học sinh nào. Cô hãy bấm nút 'Thêm học sinh mới' để cấp tài khoản đăng nhập cho các em nhé!"
          actionText="Thêm học sinh đầu tiên"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl text-center border border-rose-100 text-gray-500 text-sm">
          Không tìm thấy học sinh nào phù hợp với bộ lọc.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-rose-100 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-rose-50/70 border-b border-rose-100 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Học sinh</th>
                  <th className="px-6 py-4">Lớp</th>
                  <th className="px-6 py-4">Tên đăng nhập</th>
                  <th className="px-6 py-4">Mật khẩu cấp</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50">
                {filteredStudents.map((st) => {
                  const isPwVisible = showPasswordUid === st.uid;
                  return (
                    <tr key={st.uid} className="hover:bg-rose-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-sm shrink-0">
                            {st.displayName.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{st.displayName}</p>
                            <p className="text-xs text-gray-400">{st.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100/70 text-rose-700">
                          {st.classGrade || 'Chưa phân lớp'}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-gray-700">
                          <span className="font-semibold text-rose-950">
                            {st.studentCode || st.email.split('@')[0]}
                          </span>
                          <button
                            onClick={() => copyToClipboard(st.studentCode || st.email.split('@')[0])}
                            title="Sao chép tên đăng nhập"
                            className="text-gray-400 hover:text-rose-500 p-0.5"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold bg-gray-100 px-2.5 py-1 rounded-lg text-gray-800">
                            {isPwVisible ? (st.rawPasswordHint || '******') : '••••••'}
                          </span>
                          <button
                            onClick={() => setShowPasswordUid(isPwVisible ? null : st.uid)}
                            className="text-gray-400 hover:text-gray-600"
                            title={isPwVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          >
                            {isPwVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => {
                              setResetModalStudent(st);
                              setNewResetPassword(st.rawPasswordHint || '123456');
                            }}
                            title="Đặt lại mật khẩu"
                            className="text-xs text-rose-500 hover:text-rose-700 font-medium ml-1"
                          >
                            Đổi MK
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingStudent(st);
                              setEditFullName(st.displayName);
                              setEditClass(st.classGrade || '');
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Sửa thông tin"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setStudentToDelete(st)}
                            className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Xóa học sinh"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Student */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FFFDF9] border border-rose-100 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-rose-100 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-literary text-lg font-bold text-gray-900">
                    Thêm học sinh mới
                  </h3>
                  <p className="text-xs text-gray-500">Tạo tài khoản học tập cho em</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Họ và tên học sinh *
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => {
                    setNewFullName(e.target.value);
                    // Suggest username automatically
                    if (!newUsername) {
                      const simple = e.target.value
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, '');
                      setNewUsername(simple);
                    }
                  }}
                  placeholder="Ví dụ: Lê Thảo My"
                  className="w-full px-4 py-2.5 bg-white border border-rose-100 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Lớp học *
                </label>
                <input
                  type="text"
                  required
                  value={newClass}
                  onChange={(e) => setNewClass(e.target.value)}
                  placeholder="Ví dụ: 9A1, 12 Chuyên Văn, Lớp 8..."
                  className="w-full px-4 py-2.5 bg-white border border-rose-100 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Tên đăng nhập cấp cho em *
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="thaomy"
                    className="w-full px-4 py-2.5 bg-white border border-rose-100 rounded-l-2xl text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                  />
                  <span className="px-3 py-2.5 bg-rose-50 border border-l-0 border-rose-100 rounded-r-2xl text-xs text-rose-700 font-mono select-none">
                    @yenthanh.edu.vn
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  * Em chỉ cần nhập tên này khi đăng nhập là được.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Mật khẩu ban đầu *
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="123456"
                  className="w-full px-4 py-2.5 bg-white border border-rose-100 rounded-2xl text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  * Tối thiểu 6 ký tự để bảo mật Firebase Auth.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-linear-to-r from-rose-500 to-pink-500 rounded-xl shadow-md shadow-rose-200 hover:from-rose-600 hover:to-pink-600 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Student */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FFFDF9] border border-rose-100 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-serif-literary text-lg font-bold text-gray-900 mb-4">
              Chỉnh sửa học sinh
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Họ và tên</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-rose-100 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Lớp học</label>
                <input
                  type="text"
                  value={editClass}
                  onChange={(e) => setEditClass(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-rose-100 rounded-xl text-sm"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-5 py-2 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl shadow-sm"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reset Password Hint */}
      {resetModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FFFDF9] border border-rose-100 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-serif-literary text-lg font-bold text-gray-900 mb-2">
              Đặt lại mật khẩu cho {resetModalStudent.displayName}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Cập nhật mật khẩu mới và ghi chú để nhắc nhở em khi cần.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mật khẩu mới</label>
                <input
                  type="text"
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-rose-100 rounded-xl text-sm font-mono"
                  placeholder="Nhập mật khẩu mới..."
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setResetModalStudent(null)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveResetPassword}
                  className="px-5 py-2 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl shadow-sm"
                >
                  Cập nhật mật khẩu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(studentToDelete)}
        title="Xác nhận xóa học sinh"
        message={`Cô có chắc chắn muốn xóa học sinh ${studentToDelete?.displayName}? Dữ liệu bài làm của em cũng sẽ không còn hiển thị.`}
        confirmText="Xóa học sinh"
        isDangerous={true}
        onConfirm={handleDeleteStudent}
        onCancel={() => setStudentToDelete(null)}
      />
    </div>
  );
};
