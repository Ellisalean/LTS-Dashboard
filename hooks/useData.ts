
import { useState, useEffect } from 'react';
import { supabase } from '../application/supabase.ts';
import { Course, Assignment, Exam, Grade, Message, CalendarEvent, CourseStatus, User, Payment, Resource } from '../types.ts';

interface FinancialStatus {
    hasDebt: boolean;
    totalDebt: number;
    monthsBehind: number;
}

interface DataState {
    courses: Course[];
    assignments: Assignment[];
    exams: Exam[];
    grades: Grade[];
    resources: Resource[];
    messages: Message[];
    calendarEvents: CalendarEvent[];
    loading: boolean;
    unreadChatCount: number;
    financialStatus: FinancialStatus;
}

export const useRealtimeData = (user: User | null) => {
    const [data, setData] = useState<DataState>({
        courses: [],
        assignments: [],
        exams: [],
        grades: [],
        resources: [],
        messages: [],
        calendarEvents: [],
        loading: true,
        unreadChatCount: 0,
        financialStatus: { hasDebt: false, totalDebt: 0, monthsBehind: 0 }
    });

    useEffect(() => {
        if (!user) return;

        let isMounted = true;

        const fetchData = async () => {
            try {
                const { data: dbUser } = await supabase.from('estudiantes').select('id, matricula').eq('nombre', user.name).single();
                const userId = dbUser?.id;
                if (!userId) return;

                const [inscRes, gradesRes, coursesRes, chatRes, paymentsRes, resourcesRes, messagesRes, assignmentsRes, examsRes] = await Promise.all([
                    supabase.from('inscripciones').select('curso_id').eq('estudiante_id', userId),
                    supabase.from('notas').select('*').eq('estudiante_id', userId),
                    supabase.from('cursos').select('*').order('nombre'),
                    supabase.from('chat_mensajes').select('*', { count: 'exact', head: true }).eq('receiver_id', userId).eq('leido', false),
                    supabase.from('pagos').select('*').eq('student_id', userId),
                    supabase.from('recursos').select('*').order('created_at', { ascending: false }),
                    supabase.from('mensajes').select('*').order('fecha_envio', { ascending: false }),
                    supabase.from('asignaciones').select('*'),
                    supabase.from('examenes').select('*')
                ]);

                const activeCourseIds = new Set((inscRes.data || []).map(i => i.curso_id));
                const dbCourses = coursesRes.data || [];
                const dbGrades = gradesRes.data || [];
                
                const courseMap = dbCourses.reduce((acc: any, c: any) => { acc[c.id] = c.nombre; return acc; }, {});

                const processedResources = (resourcesRes.data || []).map((r: any) => ({
                    id: r.id, courseId: r.course_id, title: r.titulo, url: r.url, type: r.tipo
                }));

                const processedCourses = dbCourses.map((c: any) => {
                    const courseGrades = dbGrades.filter(g => g.curso_id === c.id);
                    const isCompleted = courseGrades.some(g => 
                        (g.titulo_asignacion || '').toLowerCase().includes('final') || 
                        (g.titulo_asignacion || '').toLowerCase().includes('examen final')
                    );

                    return {
                        id: c.id,
                        title: c.nombre,
                        professor: c.profesor,
                        credits: c.creditos,
                        status: isCompleted ? CourseStatus.Completado : (activeCourseIds.has(c.id) ? CourseStatus.EnCurso : CourseStatus.NoIniciado),
                        description: c.descripcion,
                        detailedContent: c.contenido_detallado,
                        imageUrl: c.image_url
                    };
                });

                // --- GENERAR EVENTOS DE CALENDARIO REALES ---
                const today = new Date();
                today.setHours(0,0,0,0);

                const events: CalendarEvent[] = [
                    ...(assignmentsRes.data || [])
                        .filter(a => activeCourseIds.has(a.curso_id) && new Date(a.fecha_entrega) >= today)
                        .map(a => ({
                            id: `asig-${a.id}`,
                            title: `Tarea: ${a.titulo}`,
                            date: a.fecha_entrega,
                            type: 'assignment' as const
                        })),
                    ...(examsRes.data || [])
                        .filter(e => activeCourseIds.has(e.curso_id) && new Date(e.fecha) >= today)
                        .map(e => ({
                            id: `exam-${e.id}`,
                            title: `Examen: ${e.titulo}`,
                            date: e.fecha,
                            type: 'exam' as const
                        }))
                ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5);

                const totalPaid = (paymentsRes.data || []).reduce((acc: number, p: any) => acc + p.amount, 0);
                const debt = Math.max(0, 150 - totalPaid);

                if (isMounted) {
                    setData({
                        courses: processedCourses,
                        assignments: (assignmentsRes.data || []).filter(a => activeCourseIds.has(a.curso_id)).map(a => ({
                            id: a.id, courseId: a.curso_id, course: courseMap[a.curso_id], title: a.titulo, dueDate: a.fecha_entrega, isSubmitted: a.entregado
                        })),
                        exams: (examsRes.data || []).filter(e => activeCourseIds.has(e.curso_id)).map(e => ({
                            id: e.id, courseId: e.curso_id, course: courseMap[e.curso_id], title: e.titulo, date: e.fecha, time: e.hora
                        })),
                        resources: processedResources,
                        grades: dbGrades.map(g => ({
                            id: g.id, courseId: g.curso_id, course: courseMap[g.curso_id], assignmentTitle: g.titulo_asignacion, score: g.puntuacion, maxScore: g.puntuacion_maxima
                        })),
                        messages: (messagesRes.data || []).map(m => ({
                            id: m.id, 
                            from: m.remitente, 
                            subject: m.asunto, 
                            isRead: m.leido, 
                            timestamp: m.fecha_envio,
                            contenido: m.contenido // Aseguramos que el contenido viaje al frontend
                        })),
                        calendarEvents: events,
                        loading: false,
                        unreadChatCount: chatRes.count || 0,
                        financialStatus: { hasDebt: debt > 0, totalDebt: debt, monthsBehind: Math.floor(debt / 25) }
                    });
                }
            } catch (e) {
                console.error(e);
                if (isMounted) setData(prev => ({ ...prev, loading: false }));
            }
        };

        fetchData();
        const sub = supabase.channel('schema-db-changes').on('postgres_changes', { event: '*', schema: 'public' }, fetchData).subscribe();
        return () => { isMounted = false; supabase.removeChannel(sub); };
    }, [user]);

    return data;
};
