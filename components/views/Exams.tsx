import React from 'react';
import { Exam } from '../../types.ts';
import { AcademicCapIcon, CalendarIcon } from '../Icons.tsx';

const ExamCard: React.FC<{ exam: Exam }> = ({ exam }) => (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm flex items-center space-x-4">
        <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full">
            <AcademicCapIcon className="h-6 w-6 text-red-600 dark:text-red-300"/>
        </div>
        <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{exam.title}</h3>
            <p className="text-gray-600 dark:text-gray-400">{exam.course}</p>
        </div>
        <div className="flex-grow text-right">
             <div className="flex items-center justify-end text-sm text-gray-500 dark:text-gray-300">
                <CalendarIcon className="h-4 w-4 mr-2"/>
                <span>{new Date(exam.date).toLocaleDateString('es-ES', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
             </div>
             <p className="text-md font-bold text-gray-800 dark:text-gray-100">{exam.time}</p>
        </div>
    </div>
);

interface ExamsProps {
    exams: Exam[];
}

const Exams: React.FC<ExamsProps> = ({ exams }) => {
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <AcademicCapIcon className="h-8 w-8 mr-3"/>
                Próximos Exámenes
            </h1>
            <div className="space-y-4">
                {exams.length > 0 ? (
                    exams.map(exam => <ExamCard key={exam.id} exam={exam} />)
                ) : (
                    <p className="text-gray-500 dark:text-gray-400">No hay exámenes programados.</p>
                )}
            </div>
        </div>
    );
};

export default Exams;