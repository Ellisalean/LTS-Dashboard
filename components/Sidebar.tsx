import React from 'react';
import { View } from '../types.ts';
import { HomeIcon, BookOpenIcon, ClipboardListIcon, AcademicCapIcon, ChartBarIcon, LogoIcon, UserGroupIcon, CheckIcon, ChatIcon } from './Icons.tsx';

interface SidebarProps {
    activeView: View;
    setActiveView: (view: View) => void;
    userRole?: 'admin' | 'estudiante';
}

const navItems = [
    { view: View.Home, icon: HomeIcon, label: 'Inicio' },
    { view: View.Courses, icon: BookOpenIcon, label: 'Cursos' },
    { view: View.Assignments, icon: ClipboardListIcon, label: 'Asignaciones' },
    { view: View.Exams, icon: AcademicCapIcon, label: 'Exámenes' },
    { view: View.Grades, icon: ChartBarIcon, label: 'Notas' },
    { view: View.Attendance, icon: CheckIcon, label: 'Asistencia' },
    { view: View.Chat, icon: ChatIcon, label: 'Mensajería' },
];

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, userRole }) => {
    return (
        <div className="flex flex-col w-64 bg-white dark:bg-gray-800 shadow-xl transition-all duration-300">
            <div className="flex items-center justify-center h-20 border-b dark:border-gray-700">
                <LogoIcon className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                <span className="ml-3 text-xl font-bold text-gray-800 dark:text-white">LTS</span>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <button
                        key={item.view}
                        onClick={() => setActiveView(item.view)}
                        className={`flex items-center w-full px-4 py-3 text-left text-sm font-medium rounded-lg transition-colors duration-200 
                            ${activeView === item.view 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="ml-4">{item.label}</span>
                    </button>
                ))}

                {/* Botón especial solo para PROFESORES/ADMINS */}
                {userRole === 'admin' && (
                     <button
                        onClick={() => setActiveView(View.TeacherPanel)}
                        className={`flex items-center w-full px-4 py-3 mt-6 text-left text-sm font-medium rounded-lg transition-colors duration-200 border border-amber-500/30
                            ${activeView === View.TeacherPanel
                                ? 'bg-amber-600 text-white shadow-md' 
                                : 'text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                            }`}
                    >
                        <UserGroupIcon className="h-5 w-5" />
                        <span className="ml-4">Panel Profesor</span>
                    </button>
                )}
            </nav>
        </div>
    );
};

export default Sidebar;