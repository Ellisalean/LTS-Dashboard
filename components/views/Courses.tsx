
import React, { useState, useEffect } from 'react';
import { Course, CourseStatus, User, Assignment, Exam, Grade } from '../../types.ts';
import { BookOpenIcon, SearchIcon } from '../Icons.tsx';
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
    <div onClick={onClick} className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg overflow-hidden transform hover:-translate-y-2 transition-all duration-300 cursor-pointer border-b-8 border-blue-500/20 group">
        <div className="h-40 bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
            {course.imageUrl ? (
                <img src={course.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={course.title} />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-700">
                    <BookOpenIcon className="h-12 w-12 text-white opacity-20" />
                </div>
            )}
            <div className="absolute top-4 right-4">
                 <span className={`px-3 py-1 text-[10px] font-black rounded-full shadow-lg uppercase tracking-widest ${getStatusClass(course.status)}`}>
                    {course.status}
                </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-4 left-4">
                <span className="text-white text-[9px] font-bold uppercase tracking-widest opacity-80">Cód: {course.id}</span>
            </div>
        </div>
        <div className="p-6">
            <h3 className="text-lg leading-tight font-black text-gray-900 dark:text-white line-clamp-2 h-14 group-hover:text-blue-600 transition-colors">{course.title}</h3>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 h-8 overflow-hidden">{course.description || "Sin descripción disponible."}</p>
            <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center text-[10px] text-gray-600 dark:text-gray-400 uppercase font-bold tracking-tighter">
                <span className="truncate w-32 flex items-center"><div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div> {course.professor}</span>
                <span className="bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2 py-1 rounded-lg">{course.credits} Créditos</span>
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
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (targetCourseId) {
            const course = courses.find(c => c.id === targetCourseId);
            if (course) setSelectedCourse(course);
        }
    }, [targetCourseId, courses]);

    const handleBack = () => {
        setSelectedCourse(null);
        if (onClearTarget) onClearTarget();
    };

    const filteredCourses = courses.filter(c => 
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
        <div className="animate-fade-in space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white flex items-center tracking-tighter">
                        <BookOpenIcon className="h-10 w-10 mr-4 text-blue-500"/>
                        Plan de Estudios
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 ml-14 text-sm font-medium">Explora las materias de tu programa académico.</p>
                </div>
                
                <div className="relative w-full md:w-96 group">
                    <SearchIcon className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                        type="text"
                        placeholder="Buscar materia por nombre o código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-gray-800 border-2 border-transparent shadow-xl rounded-2xl text-sm font-medium focus:ring-0 focus:border-blue-500 outline-none transition-all dark:text-white"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredCourses.map(course => (
                    <CourseCard key={course.id} course={course} onClick={() => setSelectedCourse(course)} />
                ))}
                {filteredCourses.length === 0 && (
                    <div className="col-span-full py-24 text-center">
                        <div className="bg-gray-50 dark:bg-gray-800/50 inline-block p-8 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                             <SearchIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                             <p className="text-gray-500 dark:text-gray-400 font-bold">No se encontraron materias que coincidan con tu búsqueda.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Courses;
