import React, { useState, useCallback } from 'react';
import { User, View } from '../types.ts';
import Sidebar from './Sidebar.tsx';
import Header from './Header.tsx';
import Home from './views/Home.tsx';
import Courses from './views/Courses.tsx';
import Assignments from './views/Assignments.tsx';
import Exams from './views/Exams.tsx';
import Grades from './views/Grades.tsx';

interface DashboardProps {
    user: User;
    onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
    const [activeView, setActiveView] = useState<View>(View.Home);

    const renderView = () => {
        switch (activeView) {
            case View.Home:
                return <Home user={user} />;
            case View.Courses:
                return <Courses />;
            case View.Assignments:
                return <Assignments />;
            case View.Exams:
                return <Exams />;
            case View.Grades:
                return <Grades />;
            default:
                return <Home user={user} />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <Sidebar activeView={activeView} setActiveView={setActiveView} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header user={user} onLogout={onLogout} />
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