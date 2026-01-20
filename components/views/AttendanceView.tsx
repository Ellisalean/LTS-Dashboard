
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

    const fetchAttendance = async () => {
        // 1. Obtener ID del usuario actual
        const { data: userData } = await supabase.from('estudiantes').select('id').eq('nombre', user.name).single();
        
        if (userData) {
            // 2. Obtener registros de asistencia con el nombre del curso
            const { data: attendanceData } = await supabase
                .from('asistencias')
                .select('*, cursos(nombre)')
                .eq('estudiante_id', userData.id)
                .order('fecha', { ascending: false });

            if (attendanceData) {
                setRecords(attendanceData);
                
                // Calcular estadísticas
                const present = attendanceData.filter((r: any) => r.estado === 'presente').length;
                const absent = attendanceData.filter((r: any) => r.estado === 'ausente').length;
                setStats({ present, absent });
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAttendance();

        // Suscribirse a cambios en tiempo real para que si el profesor marca, el alumno vea el cambio al instante
        const channel = supabase.channel('realtime-attendance')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'asistencias' }, (payload) => {
                // Solo refrescar si el cambio nos pertenece
                fetchAttendance();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    if (loading) return <div className="p-20 text-center animate-pulse text-blue-600 font-black uppercase tracking-widest">Cargando tu historial de asistencia...</div>;

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-6 flex items-center tracking-tighter uppercase">
                <CheckCircleIcon className="h-10 w-10 mr-3 text-green-600"/>
                Control de Asistencia Académica
            </h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-xl border-t-4 border-green-500 flex flex-col items-center text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Clases Presente</p>
                    <p className="text-4xl font-black text-green-600">{stats.present}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-xl border-t-4 border-red-500 flex flex-col items-center text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Inasistencias</p>
                    <p className="text-4xl font-black text-red-600">{stats.absent}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-xl border-t-4 border-blue-500 flex flex-col items-center text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ratio de Asistencia</p>
                    <p className="text-4xl font-black text-blue-600">
                        {records.length > 0 ? Math.round((stats.present / records.length) * 100) : 0}%
                    </p>
                </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700">
                <div className="px-10 py-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-black text-gray-800 dark:text-white uppercase text-sm tracking-widest">Bitácora Detallada de Asistencia</h3>
                    <span className="bg-blue-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg">{records.length} REGISTROS</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-100 dark:bg-gray-900">
                            <tr>
                                <th className="px-10 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha Lectiva</th>
                                <th className="px-10 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cátedra / Materia</th>
                                <th className="px-10 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado Académico</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {records.length > 0 ? (
                                records.map((record) => (
                                    <tr key={record.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-10 py-5 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                                            {new Date(record.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </td>
                                        <td className="px-10 py-5 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {record.cursos?.nombre || record.curso_id}
                                        </td>
                                        <td className="px-10 py-5 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm
                                                ${record.estado === 'presente' ? 'bg-green-100 text-green-700' : 
                                                  record.estado === 'ausente' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {record.estado === 'presente' && <CheckIcon className="w-3 h-3 mr-2"/>}
                                                {record.estado === 'ausente' && <XIcon className="w-3 h-3 mr-2"/>}
                                                {record.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="px-10 py-20 text-center opacity-30">
                                        <CheckIcon className="w-16 h-16 mx-auto mb-4"/>
                                        <p className="font-black text-sm uppercase tracking-widest">Aún no se han registrado asistencias para ti.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const CheckCircleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export default AttendanceView;
