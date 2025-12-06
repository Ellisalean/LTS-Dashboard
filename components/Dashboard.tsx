
import React, { useState } from 'react';
import { User, View } from '../types.ts';
import Sidebar from './Sidebar.tsx';
import Header from './Header.tsx';
import Home from './views/Home.tsx';
import Courses from './views/Courses.tsx';
import Assignments from './views/Assignments.tsx';
import Exams from './views/Exams.tsx';
import Grades from './views/Grades.tsx';
import TeacherPanel from './views/TeacherPanel.tsx';
import AttendanceView from './views/AttendanceView.tsx';
import ChatView from './views/ChatView.tsx';
import { useRealtimeData } from '../hooks/useData.ts';

interface DashboardProps {
    user: User;
    onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
    const [activeView, setActiveView] = useState<View>(View.Home);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state
    
    // Obtener datos en tiempo real de Supabase
    const { courses, assignments, exams, grades, messages, calendarEvents, loading, unreadChatCount } = useRealtimeData(user);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
                <p className="ml-4 text-gray-600 dark:text-gray-300">Cargando datos del seminario...</p>
            </div>
        );
    }

    const renderView = () => {
        switch (activeView) {
            case View.Home:
                return <Home user={user} events={calendarEvents} messages={messages} />;
            case View.Courses:
                return <Courses user={user} courses={courses} assignments={assignments} exams={exams} grades={grades} />;
            case View.Assignments:
                return <Assignments assignments={assignments} />;
            case View.Exams:
                return <Exams exams={exams} />;
            case View.Grades:
                return <Grades user={user} grades={grades} />;
            case View.Attendance:
                return <AttendanceView user={user} />;
            case View.Chat:
                return <ChatView user={user} />;
            case View.TeacherPanel:
                return <TeacherPanel user={user} />;
            default:
                return <Home user={user} events={calendarEvents} messages={messages} />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <Sidebar 
                activeView={activeView} 
                setActiveView={(view) => {
                    setActiveView(view);
                    setIsSidebarOpen(false); // Close sidebar on selection (mobile)
                }} 
                userRole={user.role} 
                unreadChatCount={unreadChatCount}
                isOpen={isSidebarOpen} // Pass open state
                onClose={() => setIsSidebarOpen(false)} // Pass close handler
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    user={user} 
                    onLogout={onLogout} 
                    assignments={assignments} 
                    exams={exams} 
                    unreadChatCount={unreadChatCount} 
                    onMenuClick={() => setIsSidebarOpen(true)} // Pass open handler
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900">
                    <div className="container mx-auto px-6 py-8">
                        {renderView()}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
