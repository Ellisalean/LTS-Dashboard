
import { useState, useEffect } from 'react';
import { supabase } from '../application/supabase.ts';
import { Course, Assignment, Exam, Grade, Message, CalendarEvent, CourseStatus, User } from '../types.ts';

interface DataState {
    courses: Course[];
    assignments: Assignment[];
    exams: Exam[];
    grades: Grade[];
    messages: Message[];
    calendarEvents: CalendarEvent[];
    loading: boolean;
}

export const useRealtimeData = (user: User | null) => {
    const [data, setData] = useState<DataState>({
        courses: [],
        assignments: [],
        exams: [],
        grades: [],
        messages: [],
        calendarEvents: [],
        loading: true
    });

    useEffect(() => {
        if (!user) return;

        let isMounted = true;

        const fetchData = async () => {
            try {
                // 1. Obtener ID del usuario primero (CRUCIAL para personalizar datos)
                const { data: dbUser } = await supabase.from('estudiantes').select('id').eq('nombre', user.name).single();
                const userId = dbUser?.id;

                // 2. Obtener TODAS las notas del usuario (Necesarias para calcular el estado de los cursos)
                let dbGrades: any[] = [];
                if (userId) {
                    const { data } = await supabase.from('notas').select('*').eq('estudiante_id', userId);
                    dbGrades = data || [];
                }

                // 3. Obtener Cursos y MAPEAR estado dinámicamente
                const { data: dbCourses } = await supabase.from('cursos').select('*');
                const courseMap = (dbCourses || []).reduce((acc: any, c: any) => {
                    acc[c.id] = c.nombre;
                    return acc;
                }, {});

                const courses: Course[] = (dbCourses || []).map((c: any) => {
                    // LÓGICA INTELIGENTE DE ESTADO
                    const myGradesInThisCourse = dbGrades.filter((g: any) => g.curso_id === c.id);
                    
                    let computedStatus = CourseStatus.NoIniciado;

                    if (myGradesInThisCourse.length > 0) {
                        // Si tiene notas, al menos está en curso
                        computedStatus = CourseStatus.EnCurso;

                        // Verificar si ya terminó (Si tiene una nota con título "Final", "Definitiva", etc.)
                        const hasFinalGrade = myGradesInThisCourse.some((g: any) => {
                            const title = (g.titulo_asignacion || '').toLowerCase();
                            return title.includes('final') || title.includes('definitiva') || title.includes('cierre') || title.includes('completado');
                        });

                        if (hasFinalGrade) {
                            computedStatus = CourseStatus.Completado;
                        }
                    }

                    return {
                        id: c.id,
                        title: c.nombre,
                        professor: c.profesor,
                        credits: c.creditos,
                        status: computedStatus, // Usamos el estado calculado, ignoramos el de la DB global
                        description: c.descripcion,
                    };
                });

                // 4. Asignaciones
                const { data: dbAssign } = await supabase.from('asignaciones').select('*');
                const assignments: Assignment[] = (dbAssign || []).map((a: any) => ({
                    id: a.id,
                    courseId: a.curso_id,
                    course: courseMap[a.curso_id] || a.curso_id,
                    title: a.titulo,
                    dueDate: a.fecha_entrega || new Date().toISOString(),
                    isSubmitted: a.entregado
                }));

                // 5. Exámenes
                const { data: dbExams } = await supabase.from('examenes').select('*');
                const exams: Exam[] = (dbExams || []).map((e: any) => ({
                    id: e.id,
                    courseId: e.curso_id,
                    course: courseMap[e.curso_id] || e.curso_id,
                    title: e.titulo,
                    date: e.fecha || new Date().toISOString(),
                    time: e.hora
                }));

                // 6. Formatear Notas para la vista
                const grades: Grade[] = dbGrades.map((g: any) => ({
                    id: g.id,
                    courseId: g.curso_id,
                    course: courseMap[g.curso_id] || g.curso_id,
                    assignmentTitle: g.titulo_asignacion,
                    score: g.puntuacion,
                    maxScore: g.puntuacion_maxima,
                    studentName: user.name
                }));

                // 7. Mensajes
                const { data: dbMsgs } = await supabase.from('mensajes').select('*').order('fecha_envio', { ascending: false });
                const messages: Message[] = (dbMsgs || []).map((m: any) => ({
                    id: m.id,
                    from: m.remitente,
                    subject: m.asunto,
                    isRead: m.leido,
                    timestamp: new Date(m.fecha_envio).toLocaleDateString()
                }));

                // 8. Calendario
                const assignmentEvents: CalendarEvent[] = assignments.map(a => ({
                    id: `assign-${a.id}`,
                    title: `Entrega: ${a.title}`,
                    date: a.dueDate,
                    type: 'assignment'
                }));
                const examEvents: CalendarEvent[] = exams.map(e => ({
                    id: `exam-${e.id}`,
                    title: `Exámen: ${e.title}`,
                    date: e.date,
                    type: 'exam'
                }));
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const calendarEvents = [...assignmentEvents, ...examEvents]
                    .filter(event => new Date(event.date) >= today)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .slice(0, 5);

                if (isMounted) {
                    setData({
                        courses,
                        assignments,
                        exams,
                        grades,
                        messages,
                        calendarEvents,
                        loading: false
                    });
                }

            } catch (error) {
                console.error("Error fetching data:", error);
                if (isMounted) setData(prev => ({ ...prev, loading: false }));
            }
        };

        fetchData();

        // Suscripción a cambios en tiempo real
        const channels = supabase.channel('custom-all-channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public' },
                (payload) => {
                    console.log('Change received!', payload);
                    fetchData(); 
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channels);
        };

    }, [user]);

    return data;
};
