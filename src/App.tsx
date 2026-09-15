import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { Navbar } from './components/common/Navbar';
import { ToastContainer } from './components/common/Toast';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { StudentDashboard } from './components/student/StudentDashboard';
import { ToastMessage } from './types';
import { Feather, Heart } from 'lucide-react';

const MainApp: React.FC = () => {
  const { currentUser, role, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>(role === 'admin' ? 'materials' : 'home');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync default tab when role changes
  React.useEffect(() => {
    if (role === 'admin') {
      setCurrentTab('materials');
    } else {
      setCurrentTab('home');
    }
  }, [role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-3xl bg-linear-to-br from-rose-400 to-purple-400 flex items-center justify-center text-white shadow-xl shadow-rose-200 animate-pulse mb-4">
          <Feather className="w-8 h-8 animate-bounce" />
        </div>
        <p className="font-serif-literary text-lg font-bold text-gray-800">
          Học Giỏi Văn Cùng Cô Yến Thanh
        </p>
        <p className="text-xs text-rose-600 mt-1">Đang khởi động ứng dụng...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginPage />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2D2A26] flex flex-col">
      {/* Sticky Header */}
      <Navbar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Role-Protected Content */}
      <div className="flex-1">
        {role === 'admin' ? (
          <TeacherDashboard
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            onShowToast={addToast}
          />
        ) : (
          <StudentDashboard
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            onShowToast={addToast}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white/80 border-t border-rose-100 py-6 px-4 mt-12 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-serif-literary font-bold text-rose-950">
              Học Giỏi Văn Cùng Cô Yến Thanh
            </span>
            <span>• Nền tảng học tập Ngữ văn chuyên sâu</span>
          </div>

          <p className="flex items-center justify-center gap-1">
            <span>Dành tặng các em học sinh thân yêu</span>
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
          </p>
        </div>
      </footer>

      {/* Global Toast Messages */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
