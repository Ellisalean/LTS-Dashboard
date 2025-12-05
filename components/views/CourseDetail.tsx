
import React from 'react';
import { Course, User, Assignment, Exam, Grade } from '../../types.ts';
import { ChevronLeftIcon, ClipboardListIcon, AcademicCapIcon, ChartBarIcon, CheckCircleIcon, ClockIcon, BookOpenIcon } from '../Icons.tsx';

interface CourseDetailProps {
    course: Course;
    user: User;
    onBack: () => void;
    allAssignments: Assignment[];
    allExams: Exam[];
    allGrades: Grade[];
}

const getGradeColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'text-green-500';
    if (percentage >= 80) return 'text-blue-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-red-500';
};

const AssignmentsSection: React.FC<{ assignments: Assignment[] }> = ({ assignments }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-bold flex items-center mb-4"><ClipboardListIcon className="h-6 w-6 mr-3 text-blue-500" />Asignaciones</h3>
        {assignments.length > 0 ? (
            <ul className="space-y-3">
                {assignments.map(assignment => (
                    <li key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center">
                            {assignment.isSubmitted 
                                ? <CheckCircleIcon className="h-5 w-5 mr-3 text-green-500"/> 
                                : <ClockIcon className="h-5 w-5 mr-3 text-yellow-500"/>
                            }
                            <div>
                               <p className="font-semibold text-gray-800 dark:text-gray-200">{assignment.title}</p>
                               <p className="text-sm text-gray-500 dark:text-gray-400">
                                Vence: {new Date(assignment.dueDate).toLocaleDateString('es-ES', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}
                               </p>
                            </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                            assignment.isSubmitted 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                            {assignment.isSubmitted ? 'Entregado' : 'Pendiente'}
                        </span>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-gray-500 dark:text-gray-400">No hay asignaciones para este curso.</p>
        )}
    </div>
);

const ExamsSection: React.FC<{ exams: Exam[] }> = ({ exams }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-bold flex items-center mb-4"><AcademicCapIcon className="h-6 w-6 mr-3 text-red-500" />Exámenes</h3>
        {exams.length > 0 ? (
            <ul className="space-y-3">
                {exams.map(exam => (
                    <li key={exam.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{exam.title}</p>
                        <div className="text-right">
                           <p className="text-sm text-gray-500 dark:text-gray-400">
                                {new Date(exam.date).toLocaleDateString('es-ES', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                           <p className="font-bold text-gray-700 dark:text-gray-300">{exam.time}</p>
                        </div>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-gray-500 dark:text-gray-400">No hay exámenes programados para este curso.</p>
        )}
    </div>
);

const GradesSection: React.FC<{ grades: Grade[] }> = ({ grades }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-bold flex items-center mb-4"><ChartBarIcon className="h-6 w-6 mr-3 text-green-500" />Mis Notas del Curso</h3>
        {grades.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Asignación</th>
                            <th className="py-2 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nota</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {grades.map(grade => (
                            <tr key={grade.id}>
                                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{grade.assignmentTitle}</td>
                                <td className={`py-3 px-4 text-sm font-bold text-right ${getGradeColor(grade.score, grade.maxScore)}`}>
                                    {grade.score} / {grade.maxScore} ({((grade.score / grade.maxScore) * 100).toFixed(1)}%)
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : (
            <p className="text-gray-500 dark:text-gray-400">No tienes notas para este curso todavía.</p>
        )}
    </div>
);


const CourseDetail: React.FC<CourseDetailProps> = ({ course, user, onBack, allAssignments, allExams, allGrades }) => {
    const courseAssignments = allAssignments.filter(a => a.courseId === course.id);
    const courseExams = allExams.filter(e => e.courseId === course.id);
    // Filter grades strictly by course ID (Student name filtering happens in the Hook now)
    const courseGrades = allGrades.filter(g => g.courseId === course.id);

    return (
        <div>
            <button
                onClick={onBack}
                className="flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-6 font-semibold"
                aria-label="Volver a la lista de cursos"
            >
                <ChevronLeftIcon className="h-5 w-5 mr-2" />
                Volver a Cursos
            </button>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{course.title}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{course.id}</p>
                <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">Profesor: <span className="font-semibold">{course.professor}</span></p>
                <p className="mt-4 text-gray-600 dark:text-gray-400 border-l-4 border-blue-500 pl-4 italic">{course.description}</p>
            </div>

            {/* SECCIÓN NUEVA: CONTENIDO DETALLADO */}
            {course.detailedContent && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-8">
                    <h3 className="text-xl font-bold flex items-center mb-4 text-gray-900 dark:text-white">
                        <BookOpenIcon className="h-6 w-6 mr-3 text-purple-500" />
                        Sobre este Curso
                    </h3>
                    <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {course.detailedContent}
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                    <AssignmentsSection assignments={courseAssignments} />
                    <ExamsSection exams={courseExams} />
                </div>
                <div>
                    <GradesSection grades={courseGrades} />
                </div>
            </div>
        </div>
    );
};

export default CourseDetail;
