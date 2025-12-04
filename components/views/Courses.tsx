import React, { useState } from 'react';
import { Course, CourseStatus, User, Assignment, Exam, Grade } from '../../types.ts';
import { BookOpenIcon } from '../Icons.tsx';
import CourseDetail from './CourseDetail.tsx';

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

const CourseCard: React.FC<{ course: Course; onClick: () => void; }> = ({ course, onClick }) => (
    <div onClick={onClick} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 cursor-pointer">
        <div className="p-6">
            <div className="flex justify-between items-start">
                <div>
                    <div className="uppercase tracking-wide text-sm text-blue-500 dark:text-blue-400 font-semibold">{course.id}</div>
                    <h3 className="block mt-1 text-lg leading-tight font-bold text-black dark:text-white">{course.title}</h3>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(course.status)}`}>
                    {course.status}
                </span>
            </div>
            <p className="mt-2 text-gray-500 dark:text-gray-400 h-10 overflow-hidden text-ellipsis">{course.description}</p>
            <div className="mt-4 flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
                <span>Prof: <strong>{course.professor}</strong></span>
                <span>Créditos: <strong>{course.credits}</strong></span>
            </div>
        </div>
    </div>
);

interface CoursesProps {
    user: User;
    courses: Course[];
    assignments: Assignment[];
    exams: Exam[];
    grades: Grade[];
}

const Courses: React.FC<CoursesProps> = ({ user, courses, assignments, exams, grades }) => {
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

    if (selectedCourse) {
        return <CourseDetail 
            course={selectedCourse} 
            user={user} 
            onBack={() => setSelectedCourse(null)} 
            allAssignments={assignments}
            allExams={exams}
            allGrades={grades}
        />;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <BookOpenIcon className="h-8 w-8 mr-3"/>
                Mis Cursos
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => (
                    <CourseCard key={course.id} course={course} onClick={() => setSelectedCourse(course)} />
                ))}
            </div>
        </div>
    );
};

export default Courses;