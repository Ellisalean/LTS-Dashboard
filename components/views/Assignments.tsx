import React from 'react';
import { Assignment } from '../../types.ts';
import { MOCK_ASSIGNMENTS } from '../../constants.ts';
import { ClipboardListIcon, CheckCircleIcon, ClockIcon } from '../Icons.tsx';

const AssignmentItem: React.FC<{ assignment: Assignment }> = ({ assignment }) => (
    <li className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-center justify-between">
        <div className="flex items-center">
             {assignment.isSubmitted 
                ? <CheckCircleIcon className="h-6 w-6 mr-4 text-green-500"/> 
                : <ClockIcon className="h-6 w-6 mr-4 text-yellow-500"/>
            }
            <div>
                <p className="font-semibold text-gray-900 dark:text-white">{assignment.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{assignment.course}</p>
            </div>
        </div>
        <div className="text-right">
             <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Vence: {new Date(assignment.dueDate).toLocaleDateString('es-ES', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
             <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                assignment.isSubmitted 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
             }`}>
                {assignment.isSubmitted ? 'Entregado' : 'Pendiente'}
             </span>
        </div>
    </li>
);


const Assignments: React.FC = () => {
    const pendingAssignments = MOCK_ASSIGNMENTS.filter(a => !a.isSubmitted);
    const submittedAssignments = MOCK_ASSIGNMENTS.filter(a => a.isSubmitted);

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <ClipboardListIcon className="h-8 w-8 mr-3"/>
                Asignaciones
            </h1>
            
            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Pendientes</h2>
                    {pendingAssignments.length > 0 ? (
                        <ul className="space-y-4">
                            {pendingAssignments.map(assignment => <AssignmentItem key={assignment.id} assignment={assignment} />)}
                        </ul>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400">No tienes asignaciones pendientes.</p>
                    )}
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Entregadas</h2>
                    {submittedAssignments.length > 0 ? (
                        <ul className="space-y-4">
                            {submittedAssignments.map(assignment => <AssignmentItem key={assignment.id} assignment={assignment} />)}
                        </ul>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400">Aún no has entregado ninguna asignación.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Assignments;