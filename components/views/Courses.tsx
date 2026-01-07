
import React, { useState, useEffect } from 'react';
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
        <div className="h-40 bg-gray-100 dark:bg-gray-700 relative">
            {course.imageUrl ? (
                <img src={course.imageUrl} className="w-full h-full object-cover" alt={course.title} />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
                    <BookOpenIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 opacity-30" />
                </div>
            )}
            <div className="absolute bottom-4 left-4">
                 <span className={`px-2 py-1 text-xs font-bold rounded-full shadow-lg ${getStatusClass(course.status)}`}>
                    {course.status}
                </span>
            </div>
        </div>
        <div className="p-6">
            <div className="flex justify-between items-start">
                <div>
                    <div className="uppercase tracking-wide text-[10px] text-blue-500 dark:text-blue-400 font-bold mb-1">{course.id}</div>
                    <h3 className="block text-lg leading-tight font-bold text-black dark:text-white line-clamp-2 h-14">{course.title}</h3>
                </div>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 h-10 overflow-hidden text-ellipsis leading-relaxed">{course.description}</p>
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs text-gray-600 dark:text-gray-300">
                <span>Prof: <strong>{course.professor}</strong></span>
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"><strong>{course.credits}</strong> Creds</span>
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
    targetCourseId?: string | null;
    onClearTarget?: () => void;
}

const Courses: React.FC<CoursesProps> = ({ user, courses, assignments, exams, grades, targetCourseId, onClearTarget }) => {
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

    // Efecto para abrir un curso si venimos redireccionados del Home
    useEffect(() => {
        if (targetCourseId) {
            const course = courses.find(c => c.id === targetCourseId);
            if (course) {
                setSelectedCourse(course);
            }
        }
    }, [targetCourseId, courses]);

    const handleBack = () => {
        setSelectedCourse(null);
        if (onClearTarget) onClearTarget();
    };

    if (selectedCourse) {
        return <CourseDetail 
            course={selectedCourse} 
            user={user} 
            onBack={handleBack} 
            allAssignments={assignments}
            allExams={exams}
            allGrades={grades}
        />;
    }

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <BookOpenIcon className="h-8 w-8 mr-3 text-blue-500"/>
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
