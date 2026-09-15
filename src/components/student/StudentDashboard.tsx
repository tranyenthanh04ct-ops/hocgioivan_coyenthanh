import React from 'react';
import { StudentHome } from './StudentHome';
import { StudentMaterials } from './StudentMaterials';
import { StudentAssignments } from './StudentAssignments';

interface StudentDashboardProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentTab,
  onSelectTab,
  onShowToast,
}) => {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {currentTab === 'home' && (
        <StudentHome
          onNavigateTab={(tab) => onSelectTab(tab)}
          onShowToast={onShowToast}
        />
      )}

      {currentTab === 'materials' && <StudentMaterials />}

      {currentTab === 'assignments' && <StudentAssignments onShowToast={onShowToast} />}
    </main>
  );
};
