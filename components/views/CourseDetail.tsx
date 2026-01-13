
import React from 'react';
import { Course, User, Assignment, Exam, Grade, Resource } from '../../types.ts';
import { ChevronLeftIcon, ClipboardListIcon, AcademicCapIcon, ChartBarIcon, CheckCircleIcon, ClockIcon, BookOpenIcon, VideoIcon, MusicIcon, DocumentTextIcon, LinkIcon } from '../Icons.tsx';

interface CourseDetailProps {
    course: Course;
    user: User;
    onBack: () => void;
    allAssignments: Assignment[];
    allExams: Exam[];
    allGrades: Grade[];
    allResources: Resource[];
}

const getGradeColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'text-green-500';
    if (percentage >= 80) return 'text-blue-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-red-500';
};

const ResourceIcon: React.FC<{ type: Resource['type'] }> = ({ type }) => {
    switch (type) {
        case 'video': return <VideoIcon className="h-6 w-6 text-red-500" />;
        case 'pdf': return <DocumentTextIcon className="h-6 w-6 text-blue-500" />;
        case 'audio': return <MusicIcon className="h-6 w-6 text-purple-500" />;
        default: return <LinkIcon className="h-6 w-6 text-gray-500" />;
    }
};

const ResourcesSection: React.FC<{ resources: Resource[] }> = ({ resources }) => {
    if (resources.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md animate-fade-in border-l-4 border-indigo-500">
            <h3 className="text-xl font-bold flex items-center mb-6 text-gray-900 dark:text-white">
                <LinkIcon className="h-6 w-6 mr-3 text-indigo-500" />
                Materiales y Recursos de Clase
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resources.map((resource) => (
                    <a 
                        key={resource.id} 
                        href={resource.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-transparent hover:border-indigo-400 hover:bg-white dark:hover:bg-gray-700 transition-all group shadow-sm"
                    >
                        <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-inner group-hover:scale-110 transition-transform">
                            <ResourceIcon type={resource.type} />
                        </div>
                        <div className="ml-4 overflow-hidden">
                            <p className="font-bold text-gray-800 dark:text-white truncate text-sm">{resource.title}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{resource.type}</p>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};

const AssignmentsSection: React.FC<{ assignments: Assignment[] }> = ({ assignments }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-blue-500">
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
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-red-500">
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
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-green-500">
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

const CourseDetail: React.FC<CourseDetailProps> = ({ course, user, onBack, allAssignments, allExams, allGrades, allResources }) => {
    const courseAssignments = allAssignments.filter(a => a.courseId === course.id);
    const courseExams = allExams.filter(e => e.courseId === course.id);
    const courseGrades = allGrades.filter(g => g.courseId === course.id);
    const courseResources = allResources.filter(r => r.courseId === course.id);

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <button
                onClick={onBack}
                className="flex items-center text-blue-600 dark:text-blue-400 hover:underline font-black uppercase text-[10px] tracking-widest"
                aria-label="Volver a la lista de cursos"
            >
                <ChevronLeftIcon className="h-5 w-5 mr-2" />
                Volver a Cursos
            </button>

            <div className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-xl border-t-8 border-blue-500">
                <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{course.title}</h1>
                <p className="text-gray-400 font-bold mt-1 text-sm tracking-widest uppercase">{course.id}</p>
                <div className="mt-8 flex items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-3xl w-fit border border-blue-100 dark:border-blue-800">
                    <div className="h-10 w-10 rounded-2xl bg-blue-500 flex items-center justify-center text-white font-black text-xl mr-4 shadow-lg">
                        {course.professor.charAt(0)}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Profesor Titular</p>
                        <p className="text-lg font-bold text-gray-800 dark:text-gray-200 leading-none">{course.professor}</p>
                    </div>
                </div>
                <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800 italic text-gray-600 dark:text-gray-400">
                    "{course.description}"
                </div>
            </div>

            {/* SECCIÓN RECURSOS (VISIBILIDAD INTELIGENTE) */}
            <ResourcesSection resources={courseResources} />

            {/* CONTENIDO DETALLADO */}
            {course.detailedContent && (
                <div className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-xl">
                    <h3 className="text-xl font-black flex items-center mb-6 text-gray-900 dark:text-white uppercase text-xs tracking-widest">
                        <BookOpenIcon className="h-6 w-6 mr-3 text-purple-500" />
                        Guía de la Materia
                    </h3>
                    <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-medium">
                        {course.detailedContent}
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                    <AssignmentsSection assignments={courseAssignments} />
                    <ExamsSection exams={courseExams} />
                </div>
                <div className="h-full">
                    <GradesSection grades={courseGrades} />
                </div>
            </div>
        </div>
    );
};

export default CourseDetail;
