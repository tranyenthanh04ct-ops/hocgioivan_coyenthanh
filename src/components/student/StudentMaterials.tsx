import React, { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { 
  BookOpen, 
  Search, 
  Eye, 
  Calendar, 
  ExternalLink, 
  X, 
  File, 
  Type, 
  BookmarkCheck,
  Feather
} from 'lucide-react';
import { db } from '../../firebase/config';
import { Material } from '../../types';
import { EmptyState } from '../common/EmptyState';

export const StudentMaterials: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'materials'));
        const snap = await getDocs(q);
        const list: Material[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Material);
        });
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setMaterials(list);
      } catch (err) {
        console.error('Fetch student materials error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, []);

  const categories = Array.from(new Set(materials.map((m) => m.category).filter(Boolean)));

  const filtered = materials.filter((m) => {
    const matchSearch =
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.content && m.content.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 p-5 rounded-3xl border border-rose-100 shadow-xs">
        <div>
          <h2 className="font-serif-literary text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-rose-500" />
            <span>Tài liệu bài giảng của Cô Yến Thanh ({materials.length})</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Đọc kỹ tài liệu, dàn ý và phân tích tác phẩm để chuẩn bị bài thật tốt nhé các em.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm tác phẩm, thơ ca, dàn ý..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-rose-100 rounded-2xl text-sm placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-rose-400"
          />
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-rose-100 rounded-2xl text-sm text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-rose-400"
          >
            <option value="all">Tất cả chủ đề</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-400">
          <div className="w-7 h-7 border-2 border-rose-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Đang tải tài liệu học tập...</p>
        </div>
      ) : materials.length === 0 ? (
        <EmptyState
          icon="book"
          title="Chưa có tài liệu"
          description="Hiện tại cô Yến Thanh chưa đăng tài liệu nào. Em hãy quay lại sau khi cô tải bài giảng lên nhé!"
        />
      ) : filtered.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl text-center border border-rose-100 text-gray-500 text-sm">
          Không tìm thấy tài liệu phù hợp với từ khóa tìm kiếm.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => setViewingMaterial(item)}
              className="group bg-white rounded-3xl border border-rose-100 p-5 shadow-xs hover:shadow-md hover:border-rose-200 transition-all duration-200 flex flex-col justify-between cursor-pointer"
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

                <h3 className="font-serif-literary text-lg font-bold text-gray-900 group-hover:text-rose-600 line-clamp-2 mb-2 transition-colors">
                  {item.title}
                </h3>

                <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed mb-4">
                  {item.description || item.content?.slice(0, 120) || 'Bấm vào để mở đọc bài giảng...'}
                </p>
              </div>

              <div className="pt-3 border-t border-rose-50 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'Mới đăng'}
                  </span>
                </div>

                <button
                  id={`btn-read-material-${item.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 group-hover:bg-rose-500 group-hover:text-white text-xs font-bold transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Đọc tài liệu</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reader Modal */}
      {viewingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#FFFDF9] border border-rose-100 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl my-8 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-rose-100 mb-4 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                    {viewingMaterial.category}
                  </span>
                  <span className="text-xs text-gray-400">
                    {viewingMaterial.grade || 'Tất cả các khối'}
                  </span>
                </div>
                <h2 className="font-serif-literary text-2xl font-bold text-gray-900 leading-tight">
                  {viewingMaterial.title}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Đăng bởi {viewingMaterial.authorName || 'Cô Yến Thanh'} • {viewingMaterial.createdAt ? new Date(viewingMaterial.createdAt).toLocaleDateString('vi-VN') : ''}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Font size toggler */}
                <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-xl border border-rose-100">
                  <button
                    onClick={() => setFontSize('sm')}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                      fontSize === 'sm' ? 'bg-white text-rose-600 shadow-2xs' : 'text-gray-500'
                    }`}
                    title="Chữ nhỏ"
                  >
                    A-
                  </button>
                  <button
                    onClick={() => setFontSize('base')}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                      fontSize === 'base' ? 'bg-white text-rose-600 shadow-2xs' : 'text-gray-500'
                    }`}
                    title="Chữ vừa"
                  >
                    A
                  </button>
                  <button
                    onClick={() => setFontSize('lg')}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                      fontSize === 'lg' ? 'bg-white text-rose-600 shadow-2xs' : 'text-gray-500'
                    }`}
                    title="Chữ to"
                  >
                    A+
                  </button>
                </div>

                <button
                  onClick={() => setViewingMaterial(null)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content body */}
            <div className="overflow-y-auto flex-1 pr-2 space-y-6">
              {viewingMaterial.description && (
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 text-sm text-gray-700 italic">
                  {viewingMaterial.description}
                </div>
              )}

              {viewingMaterial.content && (
                <div 
                  className={`prose prose-rose max-w-none text-gray-800 leading-relaxed whitespace-pre-line font-sans ${
                    fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg leading-loose' : 'text-base'
                  }`}
                >
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
                          {viewingMaterial.fileName || 'Tệp đính kèm bài giảng'}
                        </p>
                        <p className="text-xs text-gray-400">Tải về hoặc mở xem toàn màn hình</p>
                      </div>
                    </div>

                    <a
                      href={viewingMaterial.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Xem tệp</span>
                    </a>
                  </div>

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
                className="px-6 py-2.5 rounded-2xl bg-linear-to-r from-rose-500 to-pink-500 text-white text-sm font-bold shadow-md shadow-rose-200"
              >
                Đã hiểu bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
