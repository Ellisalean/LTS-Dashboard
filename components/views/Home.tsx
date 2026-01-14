
import React, { useState } from 'react';
import { User, CalendarEvent, Message, Course, CourseStatus } from '../../types.ts';
import { CalendarIcon, MailIcon, ClockIcon, BookOpenIcon, ChevronRightIcon, XIcon, UserCircleIcon } from '../Icons.tsx';
import { DEGREE_PROGRAM_NAME } from '../../constants.ts';

interface HomeProps {
    user: User;
    events: CalendarEvent[];
    messages: Message[];
    courses: Course[];
    onCourseClick: (courseId: string) => void;
}

const WelcomeHeader: React.FC<{ user: User }> = ({ user }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6 text-center md:text-left border-b-4 border-blue-600">
        <img className="h-24 w-24 rounded-full object-cover ring-4 ring-blue-500/30 shadow-lg" src={user.avatarUrl} alt="User Avatar" />
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">¡Bienvenido, {user.name.split(' ')[0]}!</h1>
            
            <div className="mt-2 mb-2 inline-block bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="text-blue-700 dark:text-blue-300 font-bold text-xs tracking-wider uppercase">
                    {DEGREE_PROGRAM_NAME}
                </p>
            </div>

            <p className="text-gray-600 dark:text-gray-400">Te acompañamos en tu formación teológica hoy.</p>
        </div>
    </div>
);

const ActiveCoursesWidget: React.FC<{ courses: Course[], onClick: (id: string) => void }> = ({ courses, onClick }) => {
    const activeCourses = courses.filter(c => c.status === CourseStatus.EnCurso);

    if (activeCourses.length === 0) return null;

    return (
        <div className="space-y-4 mb-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                    <BookOpenIcon className="h-6 w-6 mr-3 text-blue-500" />
                    Mis Clases Activas
                </h2>
                <span className="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full uppercase tracking-tighter">
                    {activeCourses.length} En Curso
                </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {activeCourses.map(course => (
                    <div 
                        key={course.id}
                        onClick={() => onClick(course.id)}
                        className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-blue-400"
                    >
                        <div className="h-32 w-full relative overflow-hidden bg-gray-100 dark:bg-gray-900 shrink-0">
                            {course.imageUrl ? (
                                <img src={course.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={course.title} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800">
                                    <BookOpenIcon className="h-12 w-12 text-white/20" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                            <div className="absolute bottom-3 left-3">
                                <span className="text-[10px] font-black text-white bg-blue-600 px-2 py-0.5 rounded uppercase tracking-widest">
                                    Materia
                                </span>
                            </div>
                        </div>

                        <div className="p-4 flex flex-col h-44">
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
                                {course.title}
                            </h3>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 h-8">
                                {course.description || "Curso activo en tu plataforma."}
                            </p>
                            
                            <div className="mt-auto">
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1 uppercase">
                                    <span>Progreso</span>
                                    <span>En curso</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full w-1/3 animate-pulse"></div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mr-2 shrink-0">
                                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                                {course.professor.charAt(0)}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate w-20">
                                            {course.professor.split(' ')[0]}
                                        </span>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <ChevronRightIcon className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const CalendarWidget: React.FC<{ events: CalendarEvent[] }> = ({ events }) => {
    const getMonthAbbreviation = (dateStr: string) => {
        const date = new Date(dateStr);
        if(isNaN(date.getTime())) return 'N/A';
        return date.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' }).toUpperCase().replace('.', '');
    }
    const getDay = (dateStr: string) => {
         const date = new Date(dateStr);
         if(isNaN(date.getTime())) return '-';
         return date.getUTCDate();
    }

    return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md h-full border-t-4 border-blue-500">
        <h2 className="text-xl font-bold flex items-center mb-6 text-gray-800 dark:text-white">
            <CalendarIcon className="h-6 w-6 mr-3 text-blue-500"/>
            Agenda Próxima
        </h2>
        <div className="space-y-4">
            {events.map(event => (
                <div key={event.id} className="flex items-start space-x-4 group p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all border border-transparent hover:border-blue-100">
                    <div className={`w-12 text-center p-2 rounded-xl shadow-sm shrink-0 ${event.type === 'exam' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                        <p className={`font-black text-lg leading-tight ${event.type === 'exam' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>{getDay(event.date)}</p>
                        <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 tracking-widest">{getMonthAbbreviation(event.date)}</p>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate group-hover:text-blue-600 transition-colors">{event.title}</p>
                        <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${event.type === 'exam' ? 'text-red-500' : 'text-blue-500'}`}>
                            {event.type === 'assignment' ? 'Asignación' : 'Examen de Materia'}
                        </p>
                    </div>
                </div>
            ))}
             {events.length === 0 && (
                <div className="text-center py-10 opacity-40">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-2"/>
                    <p className="text-xs font-bold uppercase tracking-widest">Sin actividades próximas</p>
                </div>
             )}
        </div>
    </div>
    )
};

const MessagesWidget: React.FC<{ messages: Message[] }> = ({ messages }) => {
    const [selectedMsg, setSelectedMsg] = useState<any | null>(null);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md h-full border-t-4 border-indigo-500 relative">
            <h2 className="text-xl font-bold flex items-center mb-6 text-gray-800 dark:text-white">
                <MailIcon className="h-6 w-6 mr-3 text-indigo-500"/>
                Anuncios Académicos
            </h2>
            <div className="space-y-4">
                {messages.map(message => (
                    <div 
                        key={message.id} 
                        onClick={() => setSelectedMsg(message)}
                        className={`flex items-start space-x-4 p-4 rounded-xl border cursor-pointer transition-all ${!message.isRead ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/50' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                    >
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${!message.isRead ? 'bg-indigo-600 text-white animate-pulse' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                            <MailIcon className="h-5 w-5"/>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className={`text-sm font-bold truncate ${!message.isRead ? 'text-indigo-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                {message.subject}
                            </p>
                            <div className="flex items-center space-x-3 mt-1.5">
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{message.from}</span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center"><ClockIcon className="h-3 w-3 mr-1"/>{new Date(message.timestamp).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                ))}
                {messages.length === 0 && (
                    <div className="text-center py-10 opacity-40">
                        <MailIcon className="w-12 h-12 mx-auto mb-2"/>
                        <p className="text-xs font-bold uppercase tracking-widest">No hay anuncios nuevos</p>
                    </div>
                )}
            </div>

            {/* MODAL DE LECTURA DE MENSAJE */}
            {selectedMsg && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border-t-8 border-indigo-600">
                        <div className="p-8 border-b dark:border-gray-700 flex justify-between items-start">
                            <div className="flex items-center">
                                <div className="h-14 w-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 mr-4">
                                    <UserCircleIcon className="w-8 h-8"/>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">De: {selectedMsg.from}</p>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">{selectedMsg.subject}</h3>
                                </div>
                            </div>
                            <button onClick={() => setSelectedMsg(null)} className="p-2 bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-full transition-all">
                                <XIcon className="w-6 h-6"/>
                            </button>
                        </div>
                        <div className="p-10">
                            <div className="prose dark:prose-invert max-w-none">
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium whitespace-pre-wrap">
                                    {selectedMsg.contenido || "Este anuncio no tiene un cuerpo de mensaje detallado."}
                                </p>
                            </div>
                            <div className="mt-10 pt-6 border-t dark:border-gray-700 flex justify-between items-center text-gray-400">
                                <span className="text-[10px] font-black uppercase tracking-widest flex items-center">
                                    <ClockIcon className="w-4 h-4 mr-2"/>
                                    Enviado el {new Date(selectedMsg.timestamp).toLocaleString()}
                                </span>
                                <button onClick={() => setSelectedMsg(null)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all">
                                    Entendido
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const Home: React.FC<HomeProps> = ({ user, events, messages, courses, onCourseClick }) => {
    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <WelcomeHeader user={user} />
            
            <ActiveCoursesWidget courses={courses} onClick={onCourseClick} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <CalendarWidget events={events} />
                <MessagesWidget messages={messages} />
            </div>
        </div>
    );
};

export default Home;
