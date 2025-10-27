

import React, { useState, useEffect } from 'react';
import Sidebar from '../layout/Sidebar';
import DashboardContent from './DashboardContent';
import TeacherAttendanceReportPage from './TeacherAttendanceReportPage';
import StaffAttendanceReportPage from './StaffAttendanceReportPage'; // Import baru
import CoachAttendanceReportPage from './CoachAttendanceReportPage'; // Import baru
import StudentAbsenceReportPage from './StudentAbsenceReportPage';
import ManageUsers from './ManageUsers';
import ManageLessonSchedule from './ManageLessonSchedule';
import ManageExtracurricularSchedule from './ManageExtracurricularSchedule';
import ManageClasses from './ManageClasses';
import ManageExtracurriculars from './ManageExtracurriculars';
import UploadMasterSchedule from './UploadMasterSchedule';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import StaffQRCodeGenerator from './StaffQRCodeGenerator';
import { Conversation, getAllConversations, sendMessage, deleteMessage, deleteConversation, markMessagesAsRead } from '../../services/dataService';
import { Spinner } from '../ui/Spinner';
import { Modal } from '../ui/Modal';

// Admin Messages Page Component
const AdminMessagesPage: React.FC = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [replyContent, setReplyContent] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isDeleteConvoModalOpen, setIsDeleteConvoModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const messagesEndRef = React.useRef<HTMLUListElement>(null);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = getAllConversations(user.id, (loadedConversations) => {
            setConversations(loadedConversations);
            setIsLoading(false);
            // If a conversation was selected, update its data
            if (selectedConversation) {
                const updatedConvo = loadedConversations.find(c => c.otherUserId === selectedConversation.otherUserId);
                if (updatedConvo) {
                    setSelectedConversation(updatedConvo);
                } else {
                    setSelectedConversation(null); // Convo might have been deleted
                }
            }
        });
        return () => unsubscribe();
    }, [user, selectedConversation]);

     useEffect(() => {
        messagesEndRef.current?.scrollTo({ top: messagesEndRef.current.scrollHeight, behavior: 'smooth' });
    }, [selectedConversation?.messages]);

    // Effect to mark messages as read when a conversation is opened
    useEffect(() => {
        if (selectedConversation && user) {
            const unreadMessageIds = selectedConversation.messages
                .filter(msg => !msg.isRead && msg.recipientId === user.id)
                .map(msg => msg.id);
            
            if (unreadMessageIds.length > 0) {
                markMessagesAsRead(unreadMessageIds);
            }
        }
    }, [selectedConversation, user]);
    
    const handleSelectConversation = (conversation: Conversation) => {
        setSelectedConversation(conversation);
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedConversation || !replyContent.trim()) return;
        setIsSending(true);
        try {
            await sendMessage(user.id, user.name, selectedConversation.otherUserId, replyContent.trim());
            setReplyContent('');
        } catch (error) {
            console.error("Failed to send admin reply:", error);
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus pesan ini? Tindakan ini tidak dapat diurungkan.')) {
            try {
                await deleteMessage(messageId);
                // The real-time listener will automatically update the view.
            } catch (error) {
                console.error("Failed to delete message:", error);
                alert("Gagal menghapus pesan.");
            }
        }
    };

    const handleOpenDeleteConvoModal = () => {
        if (!selectedConversation) return;
        setDeleteError('');
        setIsDeleteConvoModalOpen(true);
    };

    const handleConfirmDeleteConversation = async () => {
        if (!user || !selectedConversation) return;
        setIsDeleting(true);
        setDeleteError('');
        try {
            await deleteConversation(user.id, selectedConversation.otherUserId);
            setIsDeleteConvoModalOpen(false);
            setSelectedConversation(null); // Go back to the conversation list view
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Gagal menghapus percakapan.');
        } finally {
            setIsDeleting(false);
        }
    };


    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <>
            <div className="h-[calc(100vh-10rem)] flex bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                {/* Conversations List */}
                <div className="w-1/3 border-r border-slate-700 overflow-y-auto">
                    <div className="p-4 border-b border-slate-700">
                        <h2 className="text-lg font-bold text-white">Percakapan</h2>
                    </div>
                    <ul className="divide-y divide-slate-700">
                        {conversations.map(convo => (
                            <li key={convo.otherUserId}>
                                <button onClick={() => handleSelectConversation(convo)} className={`w-full text-left p-4 hover:bg-slate-700/50 transition-colors ${selectedConversation?.otherUserId === convo.otherUserId ? 'bg-slate-700' : ''}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-white">{convo.otherUserName}</span>
                                        {convo.unreadCount > 0 && (
                                            <span className="bg-indigo-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                                {convo.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-400 truncate">
                                        {convo.messages[convo.messages.length - 1]?.content || 'Tidak ada pesan.'}
                                    </p>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Message View */}
                <div className="w-2/3 flex flex-col">
                    {selectedConversation ? (
                        <>
                            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white">{selectedConversation.otherUserName}</h2>
                                <Button onClick={handleOpenDeleteConvoModal} variant="danger" className="w-auto px-3 py-1 text-xs">
                                    Hapus Percakapan
                                </Button>
                            </div>
                            <ul ref={messagesEndRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                            {selectedConversation.messages.map(msg => (
                                <li key={msg.id} className={`flex flex-col ${msg.senderId === user?.id ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-3 rounded-lg max-w-xs md:max-w-md ${msg.senderId === user?.id ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                                        <p className="text-sm text-white">{msg.content}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-slate-500">{new Date(msg.timestamp).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                        <button onClick={() => handleDeleteMessage(msg.id)} className="text-xs text-red-500 hover:underline">Hapus</button>
                                    </div>
                                </li>
                            ))}
                            </ul>
                            <form onSubmit={handleSendReply} className="p-4 border-t border-slate-700 bg-slate-800/50 flex items-center gap-2">
                                <input
                                    type="text"
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder="Ketik balasan..."
                                    className="flex-1 w-full px-4 py-2 bg-slate-900 text-white border-2 border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                                />
                                <Button type="submit" className="flex-shrink-0" isLoading={isSending}>Kirim</Button>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-center">
                            <p className="text-slate-400">Pilih percakapan untuk ditampilkan.</p>
                        </div>
                    )}
                </div>
            </div>
            
            {selectedConversation && (
                <Modal isOpen={isDeleteConvoModalOpen} onClose={() => setIsDeleteConvoModalOpen(false)} title="Hapus Seluruh Percakapan">
                    <div className="space-y-4">
                        <p className="text-slate-300">
                            Apakah Anda yakin ingin menghapus seluruh riwayat percakapan dengan <strong>{selectedConversation.otherUserName}</strong>? Tindakan ini tidak dapat diurungkan.
                        </p>
                        {deleteError && <p className="text-sm text-red-400 mt-2">{deleteError}</p>}
                        <div className="flex justify-end space-x-3 pt-4">
                            <Button type="button" onClick={() => setIsDeleteConvoModalOpen(false)} variant="secondary" disabled={isDeleting}>
                                Batal
                            </Button>
                            <Button onClick={handleConfirmDeleteConversation} isLoading={isDeleting} variant="danger">
                                Hapus
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};


const AdminDashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = getAllConversations(user.id, (conversations) => {
        const totalUnread = conversations.reduce((sum, convo) => sum + convo.unreadCount, 0);
        setUnreadMessageCount(totalUnread);
    });
    return () => unsubscribe();
  }, [user]);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardContent />;
      case 'messages':
        return <AdminMessagesPage />;
      case 'teacher-attendance-report':
        return <TeacherAttendanceReportPage />;
      case 'staff-attendance-report': // Case baru
        return <StaffAttendanceReportPage />;
      case 'coach-attendance-report':
        return <CoachAttendanceReportPage />;
      case 'student-absence-report':
        return <StudentAbsenceReportPage />;
      case 'manage-teachers':
        return <ManageUsers mode="teachers" />;
      case 'manage-admins':
        return <ManageUsers mode="admins" />;
      case 'manage-lesson-schedule':
        return <ManageLessonSchedule />;
      case 'upload-master-schedule':
        return <UploadMasterSchedule />;
      case 'manage-eskul-schedule':
        return <ManageExtracurricularSchedule />;
      case 'manage-classes':
        return <ManageClasses />;
      case 'manage-eskuls':
        return <ManageExtracurriculars />;
      case 'staff-qr-code':
        return <StaffQRCodeGenerator />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-300">
      {/* Sidebar for larger screens */}
      <div className="hidden md:block">
          <Sidebar currentView={currentView} onNavigate={setCurrentView} unreadMessageCount={unreadMessageCount} />
      </div>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-70 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)}>
              <div className="w-64 h-full" onClick={(e) => e.stopPropagation()}>
                 <Sidebar currentView={currentView} onNavigate={(view) => { setCurrentView(view); setIsSidebarOpen(false); }} unreadMessageCount={unreadMessageCount}/>
              </div>
          </div>
      )}
      
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 md:hidden p-4 flex justify-between items-center sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(true)} className="text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                </button>
                 <div className="text-left">
                    <p className="text-xs text-slate-400 whitespace-nowrap">Selamat datang,</p>
                    <p className="font-semibold text-white -mt-1 whitespace-nowrap">{user?.name}</p>
                </div>
            </div>
            <button onClick={logout} aria-label="Logout" className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                </svg>
            </button>
        </header>

        {/* Desktop Header */}
         <header className="hidden md:flex bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 p-4 justify-between items-center sticky top-0 z-20">
            <div className="text-left">
                <p className="text-xs text-slate-400 whitespace-nowrap">Selamat datang,</p>
                <p className="font-semibold text-white -mt-1 whitespace-nowrap">{user?.name}</p>
            </div>
            <button onClick={logout} aria-label="Logout" className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                </svg>
            </button>
        </header>


        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;