export type UserRole = 'admin' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  studentCode?: string;
  classGrade?: string;
  phone?: string;
  rawPasswordHint?: string;
  createdAt: string;
}

export type MaterialCategory = 
  | 'Nghị luận văn học'
  | 'Nghị luận xã hội'
  | 'Đọc hiểu tác phẩm'
  | 'Thơ & Ca dao'
  | 'Truyện & Kịch'
  | 'Kỹ năng làm văn'
  | 'Đề thi & Hướng dẫn chấm'
  | 'Tài liệu mở rộng';

export interface Material {
  id: string;
  title: string;
  description: string;
  category: MaterialCategory | string;
  grade: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: 'pdf' | 'doc' | 'image' | 'text' | 'other';
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
  viewsCount?: number;
}

export type QuestionType = 'multiple_choice' | 'essay';

export interface Question {
  id: string;
  type: QuestionType;
  questionText: string;
  options?: string[]; // e.g. ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"]
  correctOptionIndex?: number; // 0, 1, 2, 3
  explanation?: string;
  points: number;
}

export type AssignmentType = 'essay' | 'quiz' | 'mixed';

export interface Assignment {
  id: string;
  title: string;
  description: string;
  type: AssignmentType;
  grade?: string;
  dueDate: string; // ISO string
  assignedTo: 'all' | string[]; // 'all' or student UIDs array
  assignedClass?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  totalPoints: number;
  questions: Question[];
  authorId: string;
  createdAt: string;
  isPublished: boolean;
}

export type SubmissionStatus = 'draft' | 'submitted' | 'graded';

export interface StudentAnswer {
  selectedOptionIndex?: number;
  essayText?: string;
}

export interface Submission {
  id: string; // assignmentId_studentId
  assignmentId: string;
  assignmentTitle: string;
  studentId: string;
  studentName: string;
  studentClass?: string;
  status: SubmissionStatus;
  answers: Record<string, StudentAnswer>;
  attachmentUrl?: string;
  attachmentName?: string;
  score?: number; // thang 10
  autoQuizScore?: number;
  teacherFeedback?: string;
  submittedAt?: string;
  gradedAt?: string;
  updatedAt: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
