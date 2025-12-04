import React, { useState, useMemo } from 'react';
import { User, Assignment, Exam } from '../types.ts';
import { LogoutIcon, BellIcon, ClockIcon, AcademicCapIcon } from './Icons.tsx';

interface HeaderProps {
    user: User;
    onLogout: () => void;
    assignments?: Assignment[];
    exams?: Exam[];
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, assignments = [], exams = [] }) => {
    const [showNotifications, setShowNotifications] = useState(false);

    // Lógica para generar notificaciones inteligentes
    const notifications = useMemo(() => {
        const today = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(today.getDate() + 3);

        const alerts: any[] = [];

        // 1. Asignaciones próximas
        const upcomingAssignments = assignments.filter(a => {
            const dueDate = new Date(a.dueDate);
            return !a.isSubmitted && dueDate >= today && dueDate <= threeDaysFromNow;
        });
        
        upcomingAssignments.forEach(a => {
            alerts.push({
                id: `assign-${a.id}`,
                title: 'Tarea por vencer',
                msg: `"${a.title}" vence el ${new Date(a.dueDate).toLocaleDateString()}`,
                type: 'warning'
            });
        });

        // 2. Exámenes próximos
        const upcomingExams = exams.filter(e => {
            const examDate = new Date(e.date);
            return examDate >= today && examDate <= threeDaysFromNow;
        });

        upcomingExams.forEach(e => {
            alerts.push({
                id: `exam-${e.id}`,
                title: 'Examen cercano',
                msg: `"${e.title}" es el ${new Date(e.date).toLocaleDateString()}`,
                type: 'danger'
            });
        });

        return alerts;
    }, [assignments, exams]);

    return (
        <header className="flex items-center justify-end h-20 px-6 bg-white dark:bg-gray-800 border-b dark:border-gray-700 relative z-20">
            <div className="flex items-center space-x-4">
                
                {/* NOTIFICATIONS BELL */}
                <div className="relative">
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
                    >
                        <BellIcon className="h-6 w-6" />
                        {notifications.length > 0 && (
                            <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                        )}
                    </button>

                    {/* DROPDOWN NOTIFICACIONES */}
                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-fade-in">
                            <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b dark:border-gray-700">
                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Notificaciones</h3>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map(n => (
                                        <div key={n.id} className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <div className="flex items-start">
                                                <div className={`mt-1 p-1 rounded-full ${n.type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                    {n.type === 'danger' ? <AcademicCapIcon className="h-4 w-4"/> : <ClockIcon className="h-4 w-4"/>}
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{n.title}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{n.msg}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-gray-500 text-sm">
                                        No tienes notificaciones nuevas.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="text-right mr-4 hidden md:block">
                    <p className="font-semibold text-gray-800 dark:text-white">{user.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
                <img className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600" src={user.avatarUrl} alt="User Avatar" />
                 <button onClick={onLogout} className="ml-2 p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-white focus:outline-none transition-colors" title="Cerrar Sesión">
                    <LogoutIcon className="h-6 w-6" />
                </button>
            </div>
        </header>
    );
};

export default Header;