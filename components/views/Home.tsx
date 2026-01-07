
import React from 'react';
import { User, CalendarEvent, Message, Course, CourseStatus } from '../../types.ts';
import { CalendarIcon, MailIcon, ClockIcon, BookOpenIcon, ChevronRightIcon } from '../Icons.tsx';
import { DEGREE_PROGRAM_NAME } from '../../constants.ts';

interface HomeProps {
    user: User;
    events: CalendarEvent[];
    messages: Message[];
    courses: Course[];
    onCourseClick: (courseId: string) => void;
}

const WelcomeHeader: React.FC<{ user: User }> = ({ user }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6 text-center md:text-left">
        <img className="h-24 w-24 rounded-full object-cover ring-4 ring-blue-500" src={user.avatarUrl} alt="User Avatar" />
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">¡Bienvenido, {user.name.split(' ')[0]}!</h1>
            
            {/* NOMBRE DEL PROGRAMA ACADÉMICO */}
            <div className="mt-2 mb-2 inline-block bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="text-blue-700 dark:text-blue-300 font-bold text-xs tracking-wider uppercase">
                    {DEGREE_PROGRAM_NAME}
                </p>
            </div>

            <p className="text-gray-600 dark:text-gray-400">Es un gusto tenerte de vuelta. Aquí está tu resumen de hoy.</p>
        </div>
    </div>
);

const ActiveCoursesWidget: React.FC<{ courses: Course[], onClick: (id: string) => void }> = ({ courses, onClick }) => {
    const activeCourses = courses.filter(c => c.status === CourseStatus.EnCurso);

    if (activeCourses.length === 0) return null;

    return (
        <div className="space-y-4 mb-8">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                <BookOpenIcon className="h-6 w-6 mr-3 text-blue-500" />
                Materias en curso
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {activeCourses.map(course => (
                    <div 
                        key={course.id}
                        onClick={() => onClick(course.id)}
                        className="group bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden cursor-pointer transform hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-blue-500/50"
                    >
                        <div className="h-24 bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                            {course.imageUrl ? (
                                <img src={course.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={course.title} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 opacity-80">
                                    <BookOpenIcon className="h-10 w-10 text-white opacity-40" />
                                </div>
                            )}
                            <div className="absolute top-2 right-2">
                                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">ACTIVO</span>
                            </div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-gray-800 dark:text-white text-sm line-clamp-1 group-hover:text-blue-500 transition-colors">{course.title}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 h-8 leading-relaxed">
                                {course.description || "Sin descripción disponible."}
                            </p>
                            <div className="mt-3 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Prof. {course.professor.split(' ')[0]}</span>
                                <ChevronRightIcon className="h-4 w-4 text-blue-500 transform group-hover:translate-x-1 transition-transform" />
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
        // Validar fecha
        if(isNaN(date.getTime())) return 'N/A';
        return date.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' }).toUpperCase().replace('.', '');
    }
    const getDay = (dateStr: string) => {
         const date = new Date(dateStr);
         if(isNaN(date.getTime())) return '-';
         return date.getUTCDate();
    }

    return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md h-full">
        <h2 className="text-xl font-bold flex items-center mb-4"><CalendarIcon className="h-6 w-6 mr-3 text-blue-500"/>Agenda Próxima</h2>
        <div className="space-y-4">
            {events.map(event => (
                <div key={event.id} className="flex items-start space-x-4">
                    <div className={`w-12 text-center p-1 rounded-md ${event.type === 'exam' ? 'bg-red-100 dark:bg-red-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
                        <p className={`font-bold text-sm ${event.type === 'exam' ? 'text-red-600 dark:text-red-200' : 'text-blue-600 dark:text-blue-200'}`}>{getDay(event.date)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{getMonthAbbreviation(event.date)}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{event.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{event.type === 'assignment' ? 'Asignación' : event.type === 'exam' ? 'Examen' : 'Evento'}</p>
                    </div>
                </div>
            ))}
             {events.length === 0 && <p className="text-gray-500 dark:text-gray-400">No hay eventos próximos.</p>}
        </div>
    </div>
    )
};

const MessagesWidget: React.FC<{ messages: Message[] }> = ({ messages }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md h-full">
        <h2 className="text-xl font-bold flex items-center mb-4"><MailIcon className="h-6 w-6 mr-3 text-blue-500"/>Mensajes Recientes</h2>
        <div className="space-y-4">
            {messages.map(message => (
                <div key={message.id} className={`flex items-start space-x-3 p-3 rounded-lg ${!message.isRead ? 'bg-blue-50 dark:bg-gray-700/50' : ''}`}>
                    <div className={`h-2 w-2 rounded-full mt-2 ${!message.isRead ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                    <div>
                        <p className={`font-semibold ${!message.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>{message.subject}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">De: {message.from}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center mt-1"><ClockIcon className="h-3 w-3 mr-1"/>{message.timestamp}</p>
                    </div>
                </div>
            ))}
            {messages.length === 0 && <p className="text-gray-500 dark:text-gray-400">No tienes mensajes nuevos.</p>}
        </div>
    </div>
);


const Home: React.FC<HomeProps> = ({ user, events, messages, courses, onCourseClick }) => {
    return (
        <div className="space-y-8 animate-fade-in">
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
