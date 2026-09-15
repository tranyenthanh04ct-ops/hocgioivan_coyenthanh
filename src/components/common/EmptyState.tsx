import React from 'react';
import { BookOpen, FileText, Users, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  id?: string;
  icon?: 'book' | 'assignment' | 'users' | 'sparkle';
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  id = 'empty-state-card',
  icon = 'book',
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div
      id={id}
      className="flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white/70 backdrop-blur-xs border border-rose-100/80 rounded-3xl shadow-xs"
    >
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-400 mb-4 shadow-inner">
        {icon === 'book' && <BookOpen className="w-8 h-8" />}
        {icon === 'assignment' && <FileText className="w-8 h-8" />}
        {icon === 'users' && <Users className="w-8 h-8" />}
        {icon === 'sparkle' && <Sparkles className="w-8 h-8" />}
      </div>
      <h3 className="font-serif-literary text-xl font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm max-w-md leading-relaxed mb-6">{description}</p>
      {actionText && onAction && (
        <button
          id={`${id}-action-btn`}
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-linear-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold shadow-md shadow-rose-200 hover:from-rose-600 hover:to-pink-600 transition-all transform active:scale-95"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
