import React from 'react';
import { Grade } from '../../types.ts';
import { MOCK_GRADES } from '../../constants.ts';
import { ChartBarIcon } from '../Icons.tsx';

const getGradeColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'text-green-500';
    if (percentage >= 80) return 'text-blue-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-red-500';
};

const Grades: React.FC = () => {
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <ChartBarIcon className="h-8 w-8 mr-3"/>
                Mis Notas
            </h1>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Curso
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Asignación / Examen
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Calificación
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Porcentaje
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {MOCK_GRADES.map((grade) => (
                            <tr key={grade.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{grade.course}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{grade.assignmentTitle}</td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${getGradeColor(grade.score, grade.maxScore)}`}>
                                    {grade.score} / {grade.maxScore}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                                    {((grade.score / grade.maxScore) * 100).toFixed(1)}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Grades;