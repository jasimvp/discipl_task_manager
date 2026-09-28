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
import CommandPalette from './components/CommandPalette';

function MainApp() {
  const { user, loading, socket } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Modals
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [chatDirectUserId, setChatDirectUserId] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global Ctrl + K / Cmd + K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-400">Loading Discipl Workspace...</p>
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
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {/* Pending Founder Verification Banner if applicable */}
      {user?.status === 'pending' && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-center text-xs text-amber-900 font-medium flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span>
            <strong>Account Logged In:</strong> Your company membership verification has been sent to the Founder. Once verified, full company channels and deliverables will be unlocked.
          </span>
        </div>
      )}

      {/* Main Content Area - with mobile bottom nav spacing pb-24 md:pb-10 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 md:pb-10">
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

      {/* Command Palette (Ctrl + K Search) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTask={(id) => setSelectedTaskId(id)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onOpenChatWithUser={handleOpenChatWithUser}
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
