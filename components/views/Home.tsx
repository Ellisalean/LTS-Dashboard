import React from 'react';
import { User, CalendarEvent, Message } from '../../types.ts';
import { CalendarIcon, MailIcon, ClockIcon } from '../Icons.tsx';

interface HomeProps {
    user: User;
    events: CalendarEvent[];
    messages: Message[];
}

const WelcomeHeader: React.FC<{ user: User }> = ({ user }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex items-center space-x-6">
        <img className="h-24 w-24 rounded-full object-cover ring-4 ring-blue-500" src={user.avatarUrl} alt="User Avatar" />
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">¡Bienvenido, {user.name.split(' ')[0]}!</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Es un gusto tenerte de vuelta. Aquí está tu resumen de hoy.</p>
        </div>
    </div>
);

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
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
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
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
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


const Home: React.FC<HomeProps> = ({ user, events, messages }) => {
    return (
        <div className="space-y-8">
            <WelcomeHeader user={user} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <CalendarWidget events={events} />
                <MessagesWidget messages={messages} />
            </div>
        </div>
    );
};

export default Home;