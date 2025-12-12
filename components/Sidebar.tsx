

import React from 'react';
import { View } from '../types.ts';
import { SCHOOL_LOGO_URL } from '../constants.ts';
import { HomeIcon, BookOpenIcon, ClipboardListIcon, AcademicCapIcon, ChartBarIcon, UserGroupIcon, CheckIcon, ChatIcon, CurrencyDollarIcon } from './Icons.tsx';

interface SidebarProps {
    activeView: View;
    setActiveView: (view: View) => void;
    userRole?: 'admin' | 'estudiante' | 'profesor';
    unreadChatCount?: number;
    isOpen?: boolean; // New prop for mobile state
    onClose?: () => void; // New prop to close sidebar
}

const navItems = [
    { view: View.Home, icon: HomeIcon, label: 'Inicio' },
    { view: View.Courses, icon: BookOpenIcon, label: 'Cursos' },
    { view: View.Assignments, icon: ClipboardListIcon, label: 'Asignaciones' },
    { view: View.Exams, icon: AcademicCapIcon, label: 'Exámenes' },
    { view: View.Grades, icon: ChartBarIcon, label: 'Notas' },
    { view: View.Attendance, icon: CheckIcon, label: 'Asistencia' },
    { view: View.Financial, icon: CurrencyDollarIcon, label: 'Estado Financiero' }, // NUEVO
    { view: View.Chat, icon: ChatIcon, label: 'Mensajería' },
];

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, userRole, unreadChatCount = 0, isOpen = false, onClose }) => {
    
    // Sidebar content component to reuse or keep clean
    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 shadow-xl">
            <div className="flex items-center justify-center h-20 border-b dark:border-gray-700 py-2 shrink-0">
                <img 
                    src={SCHOOL_LOGO_URL} 
                    alt="LTS Logo" 
                    className="h-12 w-auto object-contain"
                />
                <span className="ml-3 text-xl font-bold text-gray-800 dark:text-white">LTS</span>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <button
                        key={item.view}
                        onClick={() => setActiveView(item.view)}
                        className={`flex items-center w-full px-4 py-3 text-left text-sm font-medium rounded-lg transition-colors duration-200 relative
                            ${activeView === item.view 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="ml-4">{item.label}</span>
                        {item.view === View.Chat && unreadChatCount > 0 && (
                            <span className="absolute right-4 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {unreadChatCount}
                            </span>
                        )}
                    </button>
                ))}

                {/* Botón especial para PROFESORES y ADMINS */}
                {(userRole === 'admin' || userRole === 'profesor') && (
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

    return (
        <>
            {/* Desktop Sidebar (Static) */}
            <div className="hidden md:flex md:w-64 md:flex-col">
                <SidebarContent />
            </div>

            {/* Mobile Sidebar (Off-canvas) */}
            {/* Overlay */}
            <div 
                className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />
            
            {/* Drawer */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 md:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <SidebarContent />
            </div>
        </>
    );
};

export default Sidebar;
