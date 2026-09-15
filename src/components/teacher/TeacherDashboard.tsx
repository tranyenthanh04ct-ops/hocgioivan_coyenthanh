import React, { useState } from 'react';
import { MaterialManagement } from './MaterialManagement';
import { AssignmentManagement } from './AssignmentManagement';
import { StudentManagement } from './StudentManagement';
import { BookOpen, FileCheck, Users, Sparkles } from 'lucide-react';

interface TeacherDashboardProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentTab,
  onSelectTab,
  onShowToast,
}) => {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-rose-500 via-pink-500 to-purple-500 p-6 sm:p-8 text-white shadow-xl shadow-rose-200/50">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Khu vực Quản trị & Giảng dạy</span>
          </div>
          <h1 className="font-serif-literary text-2xl sm:text-3xl font-bold tracking-tight">
            Chào mừng Cô Yến Thanh!
          </h1>
          <p className="text-xs sm:text-sm text-rose-100 leading-relaxed">
            Nơi cô đăng tải các chuyên đề bài giảng, giao bài tập tự luận - trắc nghiệm, theo dõi việc học và chấm điểm động viên các em học sinh.
          </p>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Tab Switcher for Quick Access */}
      <div className="flex border-b border-rose-100 pb-1 gap-2 overflow-x-auto">
        <button
          id="teacher-tab-materials"
          onClick={() => onSelectTab('materials')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
            currentTab === 'materials'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-200'
              : 'text-gray-600 hover:bg-rose-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Tài liệu học tập</span>
        </button>

        <button
          id="teacher-tab-assignments"
          onClick={() => onSelectTab('assignments')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
            currentTab === 'assignments'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-200'
              : 'text-gray-600 hover:bg-rose-50'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Giao bài & Chấm điểm</span>
        </button>

        <button
          id="teacher-tab-students"
          onClick={() => onSelectTab('students')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
            currentTab === 'students'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-200'
              : 'text-gray-600 hover:bg-rose-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Quản lý học sinh</span>
        </button>
      </div>

      {/* Dynamic Content Views */}
      <div className="transition-opacity duration-200">
        {currentTab === 'materials' && <MaterialManagement onShowToast={onShowToast} />}
        {currentTab === 'assignments' && <AssignmentManagement onShowToast={onShowToast} />}
        {currentTab === 'students' && <StudentManagement onShowToast={onShowToast} />}
      </div>
    </main>
  );
};
