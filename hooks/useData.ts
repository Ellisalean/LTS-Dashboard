
import { useState, useEffect } from 'react';
import { supabase } from '../application/supabase.ts';
import { Course, Assignment, Exam, Grade, Message, CalendarEvent, CourseStatus, User, Payment } from '../types.ts';

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
                // 1. Obtener ID del usuario
                const { data: dbUser } = await supabase.from('estudiantes').select('id, matricula').eq('nombre', user.name).single();
                const userId = dbUser?.id;
                if (!userId) return;

                // 2. Obtener Inscripciones y Notas simultáneamente
                const [inscRes, gradesRes, coursesRes, chatRes, paymentsRes] = await Promise.all([
                    supabase.from('inscripciones').select('curso_id').eq('estudiante_id', userId),
                    supabase.from('notas').select('*').eq('estudiante_id', userId),
                    supabase.from('cursos').select('*').order('nombre'),
                    supabase.from('chat_mensajes').select('*', { count: 'exact', head: true }).eq('receiver_id', userId).eq('leido', false),
                    supabase.from('pagos').select('*').eq('student_id', userId)
                ]);

                const activeCourseIds = new Set((inscRes.data || []).map(i => i.curso_id));
                const dbGrades = gradesRes.data || [];
                const dbCourses = coursesRes.data || [];
                
                const courseMap = dbCourses.reduce((acc: any, c: any) => {
                    acc[c.id] = c.nombre;
                    return acc;
                }, {});

                const gradesByCourse = dbGrades.reduce((acc: any, g: any) => {
                    if (!acc[g.curso_id]) acc[g.curso_id] = [];
                    acc[g.curso_id].push(g);
                    return acc;
                }, {});

                // 3. Lógica mejorada de estados
                const courses: Course[] = dbCourses.map((c: any) => {
                    let computedStatus = CourseStatus.NoIniciado;
                    
                    // Prioridad 1: ¿Tiene nota final? -> Completado
                    const hasFinal = (gradesByCourse[c.id] || []).some((g: any) => 
                        (g.titulo_asignacion || '').toLowerCase().includes('final')
                    );
                    
                    if (hasFinal) {
                        computedStatus = CourseStatus.Completado;
                    } else if (activeCourseIds.has(c.id)) {
                        // Prioridad 2: ¿Está inscrito actualmente? -> En Curso
                        computedStatus = CourseStatus.EnCurso;
                    }

                    return {
                        id: c.id,
                        title: c.nombre,
                        professor: c.profesor,
                        credits: c.creditos,
                        status: computedStatus,
                        description: c.descripcion,
                        detailedContent: c.contenido_detallado,
                        imageUrl: c.image_url
                    };
                });

                // Ordenar cursos: Activos primero, luego completados, luego el resto
                courses.sort((a, b) => {
                    const order = { [CourseStatus.EnCurso]: 1, [CourseStatus.Completado]: 2, [CourseStatus.NoIniciado]: 3 };
                    return order[a.status] - order[b.status];
                });

                // 4. Asignaciones y Exámenes (Solo de materias EN CURSO)
                const activeIdsArray = Array.from(activeCourseIds);
                let assignments: Assignment[] = [];
                let exams: Exam[] = [];

                if (activeIdsArray.length > 0) {
                    const [assignRes, examsRes] = await Promise.all([
                        supabase.from('asignaciones').select('*').in('curso_id', activeIdsArray),
                        supabase.from('examenes').select('*').in('curso_id', activeIdsArray)
                    ]);
                    
                    assignments = (assignRes.data || []).map((a: any) => ({
                        id: a.id, courseId: a.curso_id, course: courseMap[a.curso_id] || a.curso_id,
                        title: a.titulo, dueDate: a.fecha_entrega || new Date().toISOString(), isSubmitted: a.entregado
                    }));

                    exams = (examsRes.data || []).map((e: any) => ({
                        id: e.id, courseId: e.curso_id, course: courseMap[e.curso_id] || e.curso_id,
                        title: e.titulo, date: e.fecha || new Date().toISOString(), time: e.hora
                    }));
                }

                // 5. Finanzas
                const allPayments = (paymentsRes.data || []) as Payment[];
                const planConfig = allPayments.find(p => p.type === 'other' && p.description === 'Configuración Plan Mensual');
                const monthlyFee = planConfig ? planConfig.amount : 25;
                let startDate = new Date('2024-10-01');
                if(planConfig?.date) startDate = new Date(planConfig.date);
                const totalPaid = allPayments.filter(p => !(p.type === 'other' && p.description === 'Configuración Plan Mensual')).reduce((acc, curr) => acc + curr.amount, 0);
                const now = new Date();
                let monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
                if (monthsDiff < 0) monthsDiff = 0;
                const expected = 10 + (monthlyFee * (monthsDiff + 1));
                const debt = Math.max(0, expected - totalPaid);

                if (isMounted) {
                    setData({
                        courses,
                        assignments,
                        exams,
                        grades: dbGrades.map((g: any) => ({
                            id: g.id, courseId: g.curso_id, course: courseMap[g.curso_id] || g.curso_id,
                            assignmentTitle: g.titulo_asignacion, score: g.puntuacion, maxScore: g.puntuacion_maxima, studentName: user.name
                        })),
                        messages: [], // Fetch messages separately if needed
                        calendarEvents: [],
                        loading: false,
                        unreadChatCount: chatRes.count || 0,
                        financialStatus: { hasDebt: debt > 0, totalDebt: debt, monthsBehind: Math.floor(debt / monthlyFee) }
                    });
                }

            } catch (error) {
                console.error("Error fetching data:", error);
                if (isMounted) setData(prev => ({ ...prev, loading: false }));
            }
        };

        fetchData();
        const channel = supabase.channel('global-updates').on('postgres_changes', { event: '*', schema: 'public' }, () => fetchData()).subscribe();
        return () => { isMounted = false; supabase.removeChannel(channel); };
    }, [user]);

    return data;
};
