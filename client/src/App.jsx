import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthView from './components/AuthView';
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import TaskBoardView from './components/TaskBoardView';
import ReassignmentsView from './components/ReassignmentsView';
import MessagesView from './components/MessagesView';
import TeamWorkloadView from './components/TeamWorkloadView';
import AccessRequestsView from './components/AccessRequestsView';
import TaskModal from './components/TaskModal';
import TaskDetailsModal from './components/TaskDetailsModal';

function MainApp() {
  const { user, loading, socket } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Modals
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [chatDirectUserId, setChatDirectUserId] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-400">Loading TaskFlow Workspace...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show authentication login / request access screen
  if (!user) {
    return <AuthView />;
  }

  const handleOpenChatWithUser = (userId) => {
    setChatDirectUserId(userId);
    setActiveTab('messages');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      
      {/* Navigation Header */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigateTab={setActiveTab}
            onOpenCreateTask={() => setIsCreateTaskOpen(true)}
            onSelectTask={(id) => setSelectedTaskId(id)}
          />
        )}

        {activeTab === 'tasks' && (
          <TaskBoardView
            onOpenCreateTask={() => setIsCreateTaskOpen(true)}
            onSelectTask={(id) => setSelectedTaskId(id)}
          />
        )}

        {activeTab === 'reassignments' && (
          <ReassignmentsView
            onSelectTask={(id) => setSelectedTaskId(id)}
          />
        )}

        {activeTab === 'messages' && (
          <MessagesView initialUserId={chatDirectUserId} />
        )}

        {activeTab === 'team' && (
          <TeamWorkloadView
            onOpenCreateTask={() => setIsCreateTaskOpen(true)}
            onOpenChatWithUser={handleOpenChatWithUser}
          />
        )}

        {activeTab === 'access' && user?.role === 'founder' && (
          <AccessRequestsView />
        )}
      </main>

      {/* Create Task Modal */}
      <TaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onTaskCreated={() => {
          // Socket event will also trigger update across all open tabs
        }}
      />

      {/* Task Details & Reassignment Modal */}
      <TaskDetailsModal
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={() => {
          // Socket event triggers update
        }}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
