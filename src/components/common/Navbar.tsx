import React, { useState } from 'react';
import { 
  BookOpen, 
  FileCheck, 
  Users, 
  LogOut, 
  Sparkles, 
  Menu, 
  X,
  GraduationCap,
  Feather
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const { userProfile, role, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const teacherNavItems = [
    { id: 'materials', label: 'Tài liệu Ngữ văn', icon: BookOpen },
    { id: 'assignments', label: 'Giao bài & Chấm điểm', icon: FileCheck },
    { id: 'students', label: 'Quản lý học sinh', icon: Users },
  ];

  const studentNavItems = [
    { id: 'home', label: 'Trang chủ', icon: Sparkles },
    { id: 'materials', label: 'Tài liệu học tập', icon: BookOpen },
    { id: 'assignments', label: 'Bài tập của em', icon: FileCheck },
  ];

  const navItems = role === 'admin' ? teacherNavItems : studentNavItems;

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFFDF9]/90 backdrop-blur-md border-b border-rose-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Brand Name */}
          <div 
            id="brand-logo"
            onClick={() => onSelectTab(role === 'admin' ? 'materials' : 'home')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-rose-400 via-pink-400 to-purple-400 flex items-center justify-center text-white shadow-md shadow-rose-200 group-hover:scale-105 transition-transform duration-200">
              <Feather className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif-literary font-bold text-lg sm:text-xl text-rose-950 tracking-tight">
                  Học Giỏi Văn
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold tracking-wide">
                  CÔ YẾN THANH
                </span>
              </div>
              <p className="text-[11px] text-gray-500 hidden sm:block">
                Nuôi dưỡng tâm hồn • Chắp cánh ước mơ văn chương
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-rose-50/50 p-1.5 rounded-2xl border border-rose-100/60">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-rose-600 shadow-xs shadow-rose-200/50 scale-102'
                      : 'text-gray-600 hover:text-rose-500 hover:bg-white/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-rose-500' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Profile Info & Logout */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white border border-rose-100 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-xs">
                {role === 'admin' ? (
                  <GraduationCap className="w-4 h-4" />
                ) : (
                  (userProfile?.displayName || 'HS').slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-gray-800 leading-tight">
                  {userProfile?.displayName || (role === 'admin' ? 'Cô Yến Thanh' : 'Học sinh')}
                </p>
                <p className="text-[10px] text-rose-600 font-medium">
                  {role === 'admin' 
                    ? 'Giáo viên • Quản trị' 
                    : (userProfile?.classGrade ? `Lớp ${userProfile.classGrade}` : 'Học sinh')}
                </p>
              </div>
            </div>

            <button
              id="logout-button"
              onClick={logout}
              title="Đăng xuất"
              className="p-2.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"
              aria-label="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile menu toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-gray-600 hover:bg-rose-50 transition-colors"
              aria-label="Mở danh mục"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-rose-100 bg-[#FFFDF9] px-4 pt-3 pb-5 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-rose-50/60 border border-rose-100">
            <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-sm">
              {role === 'admin' ? <GraduationCap className="w-5 h-5" /> : (userProfile?.displayName || 'HS').slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-800">
                {userProfile?.displayName || (role === 'admin' ? 'Cô Yến Thanh' : 'Học sinh')}
              </p>
              <p className="text-xs text-rose-600">
                {role === 'admin' ? 'Giáo viên quản trị' : (userProfile?.classGrade ? `Lớp ${userProfile.classGrade}` : 'Học sinh')}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-rose-500 text-white'
                      : 'text-gray-700 hover:bg-rose-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-rose-100">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất tài khoản</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
