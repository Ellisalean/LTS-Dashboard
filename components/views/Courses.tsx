import React from 'react';
import { Course, CourseStatus } from '../../types.ts';
import { MOCK_COURSES } from '../../constants.ts';
import { BookOpenIcon } from '../Icons.tsx';

const getStatusClass = (status: CourseStatus) => {
    switch (status) {
        case CourseStatus.EnCurso:
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case CourseStatus.Completado:
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        case CourseStatus.NoIniciado:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

const CourseCard: React.FC<{ course: Course }> = ({ course }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">
        <div className="p-6">
            <div className="flex justify-between items-start">
                <div>
                    <div className="uppercase tracking-wide text-sm text-blue-500 dark:text-blue-400 font-semibold">{course.id}</div>
                    <h3 className="block mt-1 text-lg leading-tight font-bold text-black dark:text-white hover:underline">{course.title}</h3>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(course.status)}`}>
                    {course.status}
                </span>
            </div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{course.description}</p>
            <div className="mt-4 flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
                <span>Prof: <strong>{course.professor}</strong></span>
                <span>Créditos: <strong>{course.credits}</strong></span>
            </div>
        </div>
    </div>
);

const Courses: React.FC = () => {
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <BookOpenIcon className="h-8 w-8 mr-3"/>
                Mis Cursos
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCK_COURSES.map(course => (
                    <CourseCard key={course.id} course={course} />
                ))}
            </div>
        </div>
    );
};

export default Courses;