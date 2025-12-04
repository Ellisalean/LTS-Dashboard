import React, { useState, useEffect } from 'react';
import { User, Attendance } from '../../types.ts';
import { supabase } from '../../application/supabase.ts';
import { CheckIcon, XIcon, ClockIcon } from '../Icons.tsx';

interface AttendanceViewProps {
    user: User;
}

const AttendanceView: React.FC<AttendanceViewProps> = ({ user }) => {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ present: 0, absent: 0 });

    useEffect(() => {
        const fetchAttendance = async () => {
            // 1. Obtener ID del usuario actual
            const { data: userData } = await supabase.from('estudiantes').select('id').eq('nombre', user.name).single();
            
            if (userData) {
                // 2. Obtener registros de asistencia
                const { data: attendanceData } = await supabase
                    .from('asistencias')
                    .select('*, cursos(nombre)')
                    .eq('estudiante_id', userData.id)
                    .order('fecha', { ascending: false });

                if (attendanceData) {
                    setRecords(attendanceData);
                    
                    // Calcular estadísticas
                    const present = attendanceData.filter(r => r.estado === 'presente').length;
                    const absent = attendanceData.filter(r => r.estado === 'ausente').length;
                    setStats({ present, absent });
                }
            }
            setLoading(false);
        };

        fetchAttendance();
    }, [user]);

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando historial de asistencia...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <CheckIcon className="h-8 w-8 mr-3 text-green-600"/>
                Control de Asistencia
            </h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-green-500">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Asistencias</h3>
                    <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{stats.present}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-red-500">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Inasistencias</h3>
                    <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{stats.absent}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-blue-500">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Porcentaje</h3>
                    <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
                        {records.length > 0 ? Math.round((stats.present / records.length) * 100) : 0}%
                    </p>
                </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-gray-800 dark:text-white">Historial Detallado</h3>
                </div>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Curso</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {records.length > 0 ? (
                            records.map((record) => (
                                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {new Date(record.fecha).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                        {record.cursos?.nombre || record.curso_id}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                            ${record.estado === 'presente' ? 'bg-green-100 text-green-800' : 
                                              record.estado === 'ausente' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {record.estado === 'presente' && <CheckIcon className="w-3 h-3 mr-1"/>}
                                            {record.estado === 'ausente' && <XIcon className="w-3 h-3 mr-1"/>}
                                            {record.estado}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">No hay registros de asistencia.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AttendanceView;