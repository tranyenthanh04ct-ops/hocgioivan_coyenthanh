import React, { useState } from 'react';
import { 
  Feather, 
  Lock, 
  User as UserIcon, 
  Mail, 
  Sparkles, 
  ArrowRight,
  BookOpen,
  GraduationCap,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { TEACHER_DEFAULT_EMAIL, TEACHER_DEFAULT_PASSWORD } from '../../lib/authUtils';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState<'admin' | 'student'>('admin');
  
  // Student inputs
  const [studentLoginId, setStudentLoginId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);

  // Teacher inputs (defaults to 224466)
  const [teacherEmail, setTeacherEmail] = useState(TEACHER_DEFAULT_EMAIL);
  const [teacherPassword, setTeacherPassword] = useState(TEACHER_DEFAULT_PASSWORD);
  const [showTeacherPassword, setShowTeacherPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (activeTab === 'student') {
        if (!studentLoginId.trim() || !studentPassword.trim()) {
          setErrorMessage('Vui lòng nhập đầy đủ tên tài khoản và mật khẩu.');
          setIsLoading(false);
          return;
        }
        const res = await login(studentLoginId.trim(), studentPassword, 'student');
        if (!res.success) {
          setErrorMessage(res.error || 'Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản.');
        }
      } else {
        if (!teacherEmail.trim() || !teacherPassword.trim()) {
          setErrorMessage('Vui lòng nhập mật khẩu quản trị.');
          setIsLoading(false);
          return;
        }
        const res = await login(teacherEmail.trim(), teacherPassword, 'admin');
        if (!res.success) {
          setErrorMessage(res.error || 'Mật khẩu quản trị không chính xác.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Đã có lỗi xảy ra khi đăng nhập.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        setErrorMessage(res.error || 'Đăng nhập Google không thành công.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Đã có lỗi xảy ra.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Blur Circles */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-rose-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 left-1/3 w-96 h-96 bg-pink-100/50 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-18 h-18 rounded-3xl bg-linear-to-br from-rose-400 via-pink-400 to-purple-400 text-white shadow-xl shadow-rose-200/60 mb-4 transform hover:rotate-6 transition-transform">
            <Feather className="w-9 h-9" />
          </div>
          
          <h1 className="font-serif-literary text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Học Giỏi Văn
          </h1>
          <p className="mt-1 text-sm font-semibold tracking-wider text-rose-600 uppercase">
            CÙNG CÔ YẾN THANH
          </p>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 max-w-xs mx-auto leading-relaxed">
            Khơi nguồn cảm hứng văn học • Học tập và rèn luyện kỹ năng mỗi ngày
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#FFFDF9] py-8 px-6 sm:px-10 shadow-xl shadow-rose-950/5 rounded-3xl border border-rose-100">
          {/* Role Switcher Tabs */}
          <div className="flex p-1.5 bg-rose-50/70 rounded-2xl mb-7 border border-rose-100/60">
            <button
              id="tab-login-admin"
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                activeTab === 'admin'
                  ? 'bg-white text-rose-600 shadow-sm shadow-rose-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Cô Yến Thanh</span>
            </button>
            <button
              id="tab-login-student"
              type="button"
              onClick={() => {
                setActiveTab('student');
                setErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                activeTab === 'student'
                  ? 'bg-white text-rose-600 shadow-sm shadow-rose-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Học sinh</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {activeTab === 'admin' ? (
              <>
                <div>
                  <label 
                    htmlFor="teacher-email"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
                  >
                    Tài khoản quản trị của Cô
                  </label>
                  <div className="relative rounded-2xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="teacher-email"
                      type="email"
                      required
                      value={teacherEmail}
                      onChange={(e) => setTeacherEmail(e.target.value)}
                      placeholder="tranyenthanh.04.ct@gmail.com"
                      className="block w-full pl-10 pr-4 py-3 bg-white border border-rose-100 rounded-2xl text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label 
                      htmlFor="teacher-password"
                      className="block text-xs font-bold text-gray-700 uppercase tracking-wider"
                    >
                      Mật khẩu quản trị
                    </label>
                    <span className="text-[11px] text-rose-600 font-medium bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                      Mặc định: 224466
                    </span>
                  </div>
                  <div className="relative rounded-2xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="teacher-password"
                      type={showTeacherPassword ? 'text' : 'password'}
                      required
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      placeholder="Nhập 224466"
                      className="block w-full pl-10 pr-10 py-3 bg-white border border-rose-100 rounded-2xl text-sm text-gray-800 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all font-mono tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTeacherPassword(!showTeacherPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showTeacherPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button for Teacher */}
                <button
                  id="teacher-login-submit"
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold text-white bg-linear-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 shadow-md shadow-rose-200/80 transition-all transform active:scale-98 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Đang đăng nhập...</span>
                    </div>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Vào trang quản trị</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="grow border-t border-rose-100"></div>
                  <span className="shrink mx-3 text-xs text-gray-400 uppercase font-medium tracking-wider">
                    Hoặc
                  </span>
                  <div className="grow border-t border-rose-100"></div>
                </div>

                {/* Direct 1-Click Google Sign In for Teacher */}
                <div>
                  <button
                    id="btn-google-login-teacher"
                    type="button"
                    disabled={isGoogleLoading || isLoading}
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-2xs transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    {isGoogleLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
                        <span>Đang xác thực Google...</span>
                      </div>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                          />
                        </svg>
                        <span>Đăng nhập nhanh qua Google</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label 
                    htmlFor="student-login-id"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
                  >
                    Tên tài khoản / Mã học sinh
                  </label>
                  <div className="relative rounded-2xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      id="student-login-id"
                      type="text"
                      required
                      value={studentLoginId}
                      onChange={(e) => setStudentLoginId(e.target.value)}
                      placeholder="Ví dụ: nam_9a1 hoặc hs01..."
                      className="block w-full pl-10 pr-4 py-3 bg-white border border-rose-100 rounded-2xl text-sm placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    * Tài khoản do cô Yến Thanh cấp cho em trên lớp.
                  </p>
                </div>

                <div>
                  <label 
                    htmlFor="student-password"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
                  >
                    Mật khẩu
                  </label>
                  <div className="relative rounded-2xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="student-password"
                      type={showStudentPassword ? 'text' : 'password'}
                      required
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      placeholder="Nhập mật khẩu của em..."
                      className="block w-full pl-10 pr-10 py-3 bg-white border border-rose-100 rounded-2xl text-sm placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStudentPassword(!showStudentPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showStudentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  id="student-login-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold text-white bg-linear-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 shadow-md shadow-rose-200/80 transition-all transform active:scale-98 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Đang kiểm tra thông tin...</span>
                    </div>
                  ) : (
                    <>
                      <span>Vào góc học tập</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </>
            )}

            {/* Error Display */}
            {errorMessage && (
              <div 
                id="login-error-message"
                className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 leading-snug animate-in fade-in duration-200"
              >
                {errorMessage}
              </div>
            )}
          </form>

          {/* Supportive note */}
          <div className="mt-6 pt-5 border-t border-rose-100 text-center">
            <p className="text-xs text-gray-500 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Chăm chỉ mỗi ngày để cùng đạt điểm 9+ Văn nhé!</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
