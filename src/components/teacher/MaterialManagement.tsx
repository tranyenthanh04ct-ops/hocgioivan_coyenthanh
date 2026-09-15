import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { 
  BookOpen, 
  Plus, 
  Search, 
  FileText, 
  UploadCloud, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  Eye, 
  X, 
  File, 
  Image as ImageIcon,
  CheckCircle2,
  Calendar,
  Filter
} from 'lucide-react';
import { db, storage } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Material, MaterialCategory } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { ConfirmModal } from '../common/ConfirmModal';

interface MaterialManagementProps {
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

const CATEGORIES: MaterialCategory[] = [
  'Nghị luận văn học',
  'Nghị luận xã hội',
  'Đọc hiểu tác phẩm',
  'Thơ & Ca dao',
  'Truyện & Kịch',
  'Kỹ năng làm văn',
  'Đề thi & Hướng dẫn chấm',
  'Tài liệu mở rộng',
];

const GRADES = ['Tất cả các khối', 'Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9', 'Lớp 10', 'Lớp 11', 'Lớp 12'];

export const MaterialManagement: React.FC<MaterialManagementProps> = ({ onShowToast }) => {
  const { currentUser, userProfile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');

  // Modal create/edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [grade, setGrade] = useState<string>(GRADES[0]);
  const [contentType, setContentType] = useState<'both' | 'text' | 'file'>('both');
  const [content, setContent] = useState('');
  
  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string>('');
  const [existingFileName, setExistingFileName] = useState<string>('');
  const [existingFileType, setExistingFileType] = useState<'pdf' | 'doc' | 'image' | 'text' | 'other'>('pdf');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View modal
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);

  // Delete modal
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'materials'));
      const snapshot = await getDocs(q);
      const list: Material[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Material);
      });
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setMaterials(list);
    } catch (err: any) {
      console.error('Error fetching materials:', err);
      onShowToast('error', 'Không thể tải danh sách tài liệu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setCategory(CATEGORIES[0]);
    setGrade(GRADES[0]);
    setContent('');
    setUploadFile(null);
    setUploadProgress(null);
    setExistingFileUrl('');
    setExistingFileName('');
    setExistingFileType('pdf');
    setIsFormOpen(false);
  };

  const handleOpenEdit = (m: Material) => {
    setEditingId(m.id);
    setTitle(m.title);
    setDescription(m.description || '');
    setCategory(m.category);
    setGrade(m.grade || GRADES[0]);
    setContent(m.content || '');
    setExistingFileUrl(m.fileUrl || '');
    setExistingFileName(m.fileName || '');
    setExistingFileType(m.fileType || 'pdf');
    setUploadFile(null);
    setUploadProgress(null);
    setIsFormOpen(true);
  };

  const getFileTypeFromFileName = (name: string): 'pdf' | 'doc' | 'image' | 'text' | 'other' => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext || '')) return 'doc';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) return 'image';
    if (['txt', 'md'].includes(ext || '')) return 'text';
    return 'other';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      onShowToast('error', 'Vui lòng nhập tiêu đề tài liệu.');
      return;
    }

    if (!content.trim() && !uploadFile && !existingFileUrl) {
      onShowToast('error', 'Vui lòng nhập nội dung bài đọc hoặc tải lên một tệp tài liệu.');
      return;
    }

    setIsSubmitting(true);
    try {
      let fileUrl = existingFileUrl;
      let fileName = existingFileName;
      let fileType = existingFileType;

      // Handle Firebase Storage file upload
      if (uploadFile) {
        try {
          const timestamp = Date.now();
          const cleanName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storageRef = ref(storage, `materials/${timestamp}_${cleanName}`);
          
          const uploadTask = uploadBytesResumable(storageRef, uploadFile);
          
          fileUrl = await new Promise<string>((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(Math.round(progress));
              },
              (error) => {
                console.error('Storage upload error:', error);
                reject(error);
              },
              async () => {
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadUrl);
              }
            );
          });

          fileName = uploadFile.name;
          fileType = getFileTypeFromFileName(uploadFile.name);
        } catch (storageErr: any) {
          console.warn('Storage upload fallback or failure:', storageErr);
          onShowToast('info', 'Lưu ý: Tải file lên storage gặp trục trặc, vẫn tiếp tục lưu nội dung văn bản.');
        }
      }

      const materialId = editingId || `mat_${Date.now()}`;
      const materialData: Partial<Material> = {
        title: title.trim(),
        description: description.trim(),
        category,
        grade,
        content: content.trim(),
        fileUrl: fileUrl || undefined,
        fileName: fileName || undefined,
        fileType: fileType || undefined,
        authorId: currentUser?.uid || 'admin',
        authorName: userProfile?.displayName || 'Cô Yến Thanh',
        updatedAt: new Date().toISOString(),
      };

      if (!editingId) {
        materialData.id = materialId;
        materialData.createdAt = new Date().toISOString();
        materialData.viewsCount = 0;
        await setDoc(doc(db, 'materials', materialId), materialData);
        onShowToast('success', 'Đã đăng tài liệu Ngữ văn thành công!');
      } else {
        await updateDoc(doc(db, 'materials', editingId), materialData);
        onShowToast('success', 'Đã cập nhật tài liệu thành công!');
      }

      resetForm();
      await fetchMaterials();
    } catch (err: any) {
      console.error('Save material error:', err);
      onShowToast('error', 'Lỗi khi lưu tài liệu: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!materialToDelete) return;
    try {
      await deleteDoc(doc(db, 'materials', materialToDelete.id));
      onShowToast('success', `Đã xóa tài liệu "${materialToDelete.title}"`);
      setMaterialToDelete(null);
      await fetchMaterials();
    } catch (err: any) {
      onShowToast('error', 'Lỗi khi xóa tài liệu: ' + err.message);
    }
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch = 
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.content && m.content.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesGrade = selectedGrade === 'all' || m.grade === selectedGrade;
    return matchesSearch && matchesCat && matchesGrade;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 p-5 rounded-3xl border border-rose-100/80 shadow-xs">
        <div>
          <h2 className="font-serif-literary text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-rose-500" />
            <span>Kho tài liệu Ngữ văn ({materials.length})</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Đăng tài liệu, bài giảng phân tích tác phẩm và chuyên đề ngữ văn cho học sinh.
          </p>
        </div>

        <button
          id="btn-add-material"
          onClick={() => {
            resetForm();
            setIsFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-linear-to-r from-rose-500 to-pink-500 text-white text-sm font-bold shadow-md shadow-rose-200 hover:from-rose-600 hover:to-pink-600 transition-all transform active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Đăng tài liệu mới</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="material-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm tác phẩm, chuyên đề, bài văn mẫu..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-rose-100 rounded-2xl text-sm placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-rose-400"
          />
        </div>

        <div>
          <select
            id="material-category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-rose-100 rounded-2xl text-sm text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-rose-400"
          >
            <option value="all">Tất cả chủ đề</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            id="material-grade-filter"
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-rose-100 rounded-2xl text-sm text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-rose-400"
          >
            <option value="all">Tất cả khối lớp</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials List */}
      {loading ? (
        <div className="p-12 text-center text-gray-400">
          <div className="w-7 h-7 border-2 border-rose-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Đang tải kho tài liệu...</p>
        </div>
      ) : materials.length === 0 ? (
        <EmptyState
          icon="book"
          title="Chưa có tài liệu"
          description="Hiện tại cô chưa đăng tài liệu nào. Cô hãy bấm nút 'Đăng tài liệu mới' để chia sẻ kiến thức bổ ích cho học sinh nhé!"
          actionText="Đăng tài liệu đầu tiên"
          onAction={() => {
            resetForm();
            setIsFormOpen(true);
          }}
        />
      ) : filteredMaterials.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl text-center border border-rose-100 text-gray-500 text-sm">
          Không tìm thấy tài liệu phù hợp với bộ lọc tìm kiếm.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMaterials.map((item) => (
            <div
              key={item.id}
              id={`material-card-${item.id}`}
              className="group bg-white rounded-3xl border border-rose-100 p-5 shadow-xs hover:shadow-md hover:border-rose-200 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                    {item.category}
                  </span>
                  <span className="text-[11px] font-medium text-gray-400">
                    {item.grade || 'Tất cả'}
                  </span>
                </div>

                <h3 
                  onClick={() => setViewingMaterial(item)}
                  className="font-serif-literary text-lg font-bold text-gray-900 group-hover:text-rose-600 cursor-pointer line-clamp-2 mb-2 transition-colors"
                >
                  {item.title}
                </h3>

                <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed mb-4">
                  {item.description || item.content?.slice(0, 120) || 'Bấm để xem chi tiết tài liệu học tập...'}
                </p>
              </div>

              <div className="pt-3 border-t border-rose-50 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'Mới đăng'}
                  </span>
                  {item.fileUrl && (
                    <span className="ml-2 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-semibold">
                      <File className="w-3 h-3" />
                      {item.fileType?.toUpperCase() || 'FILE'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    id={`btn-view-${item.id}`}
                    onClick={() => setViewingMaterial(item)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Mở đọc tài liệu"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    id={`btn-edit-${item.id}`}
                    onClick={() => handleOpenEdit(item)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                    title="Chỉnh sửa"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    id={`btn-delete-${item.id}`}
                    onClick={() => setMaterialToDelete(item)}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Xóa tài liệu"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create/Edit Material */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#FFFDF9] border border-rose-100 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-rose-100 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-literary text-lg font-bold text-gray-900">
                    {editingId ? 'Chỉnh sửa tài liệu Ngữ văn' : 'Đăng tài liệu Ngữ văn mới'}
                  </h3>
                  <p className="text-xs text-gray-500">Chia sẻ bài giảng, dàn ý hoặc tệp văn bản</p>
                </div>
              </div>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Tiêu đề tài liệu *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Phân tích tâm trạng nhân vật Mị trong đêm tình mùa xuân..."
                  className="w-full px-4 py-2.5 bg-white border border-rose-100 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Chủ đề / Phân môn *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-rose-100 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Dành cho khối lớp *
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-rose-100 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Mô tả ngắn gọn
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tóm tắt nội dung chính hoặc lưu ý trọng tâm..."
                  className="w-full px-4 py-2.5 bg-white border border-rose-100 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                />
              </div>

              {/* Directly Write Content */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Nội dung bài viết / Dàn ý chi tiết (HS đọc trực tiếp trên web)
                </label>
                <textarea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Cô có thể nhập trực tiếp dàn bài phân tích, trích đoạn tác phẩm, những luận điểm quan trọng vào đây để học sinh đọc tiện lợi trên điện thoại và máy tính..."
                  className="w-full p-4 bg-white border border-rose-100 rounded-2xl text-sm leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                />
              </div>

              {/* File Attachment */}
              <div className="p-4 bg-rose-50/50 rounded-2xl border border-dashed border-rose-200">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <UploadCloud className="w-4 h-4 text-rose-500" />
                  <span>Đính kèm tệp tài liệu (PDF, Word, Ảnh)</span>
                </div>

                <input
                  type="file"
                  id="material-file-input"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-100 file:text-rose-700 hover:file:bg-rose-200 cursor-pointer"
                />

                {uploadFile && (
                  <p className="mt-2 text-xs text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đã chọn tệp: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}

                {existingFileUrl && !uploadFile && (
                  <p className="mt-2 text-xs text-purple-700 font-medium flex items-center gap-1">
                    <File className="w-3.5 h-3.5" />
                    Tệp hiện tại: {existingFileName || 'Tệp đính kèm'}
                  </p>
                )}

                {uploadProgress !== null && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                      <span>Đang tải tệp lên Firebase Storage...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-rose-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
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
                  {isSubmitting ? 'Đang lưu...' : (editingId ? 'Lưu thay đổi' : 'Đăng tài liệu')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Material Reader */}
      {viewingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#FFFDF9] border border-rose-100 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl my-8 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-4 border-b border-rose-100 mb-4 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                    {viewingMaterial.category}
                  </span>
                  <span className="text-xs text-gray-400">
                    Khối: {viewingMaterial.grade || 'Tất cả'}
                  </span>
                </div>
                <h2 className="font-serif-literary text-2xl font-bold text-gray-900 leading-tight">
                  {viewingMaterial.title}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Đăng bởi {viewingMaterial.authorName || 'Cô Yến Thanh'} • {viewingMaterial.createdAt ? new Date(viewingMaterial.createdAt).toLocaleDateString('vi-VN') : ''}
                </p>
              </div>
              <button
                onClick={() => setViewingMaterial(null)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-2 space-y-6">
              {viewingMaterial.description && (
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 text-sm text-gray-700 italic">
                  {viewingMaterial.description}
                </div>
              )}

              {viewingMaterial.content && (
                <div className="prose prose-rose max-w-none text-gray-800 text-base leading-relaxed whitespace-pre-line font-sans">
                  {viewingMaterial.content}
                </div>
              )}

              {viewingMaterial.fileUrl && (
                <div className="pt-4 border-t border-rose-100">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-rose-100 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0">
                        {viewingMaterial.fileType?.toUpperCase() || 'FILE'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {viewingMaterial.fileName || 'Tệp tài liệu đính kèm'}
                        </p>
                        <p className="text-xs text-gray-400">Bấm để tải về hoặc xem toàn màn hình</p>
                      </div>
                    </div>

                    <a
                      href={viewingMaterial.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở tệp</span>
                    </a>
                  </div>

                  {/* If image preview */}
                  {viewingMaterial.fileType === 'image' && (
                    <div className="mt-4 rounded-2xl overflow-hidden border border-rose-100">
                      <img 
                        src={viewingMaterial.fileUrl} 
                        alt={viewingMaterial.title}
                        className="w-full h-auto max-h-96 object-contain bg-black/5" 
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-rose-100 flex justify-end shrink-0">
              <button
                onClick={() => setViewingMaterial(null)}
                className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(materialToDelete)}
        title="Xác nhận xóa tài liệu"
        message={`Cô có chắc chắn muốn xóa tài liệu "${materialToDelete?.title}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa tài liệu"
        isDangerous={true}
        onConfirm={handleDelete}
        onCancel={() => setMaterialToDelete(null)}
      />
    </div>
  );
};
