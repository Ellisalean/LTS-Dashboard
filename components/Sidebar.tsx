import React from 'react';
import { View } from '../types.ts';
import { HomeIcon, BookOpenIcon, ClipboardListIcon, AcademicCapIcon, ChartBarIcon, LogoIcon } from './Icons.tsx';

interface SidebarProps {
    activeView: View;
    setActiveView: (view: View) => void;
}

const navItems = [
    { view: View.Home, icon: HomeIcon, label: 'Inicio' },
    { view: View.Courses, icon: BookOpenIcon, label: 'Cursos' },
    { view: View.Assignments, icon: ClipboardListIcon, label: 'Asignaciones' },
    { view: View.Exams, icon: AcademicCapIcon, label: 'Exámenes' },
    { view: View.Grades, icon: ChartBarIcon, label: 'Notas' },
];

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
    return (
        <div className="flex flex-col w-64 bg-white dark:bg-gray-800 shadow-xl">
            <div className="flex items-center justify-center h-20 border-b dark:border-gray-700">
                <LogoIcon className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                <span className="ml-3 text-xl font-bold text-gray-800 dark:text-white">LTS</span>
            </div>
            <nav className="flex-1 px-4 py-4">
                {navItems.map((item) => (
                    <button
                        key={item.view}
                        onClick={() => setActiveView(item.view)}
                        className={`flex items-center w-full px-4 py-3 mt-2 text-left text-sm font-medium rounded-lg transition-colors duration-200 
                            ${activeView === item.view 
                                ? 'bg-blue-600 text-white' 
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="ml-4">{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default Sidebar;