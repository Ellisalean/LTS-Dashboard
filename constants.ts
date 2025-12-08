
import { User, Course, Assignment, Exam, Grade, Message, CalendarEvent, CourseStatus } from './types.ts';
import { RAW_DATA } from './application/data.ts';

// Centralized Logo URL
export const SCHOOL_LOGO_URL = "https://cdn.myportfolio.com/d435fa58-d32c-4141-8a15-0f2bfccdea41/1ac05fb8-e508-4c03-b550-d2b907caadbd_rw_600.png?h=7572d326e4292f32557ac73606fd0ece";

// Official Program Name
export const DEGREE_PROGRAM_NAME = "PROGRAMA DE LICENCIATURA: Teología y Ministerio Cristiano";

// Helper to clean keys with spaces and other inconsistencies
const cleanData = (data: any[]) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => {
        const cleanedItem: { [key: string]: any } = {};
        for (const key in item) {
            // A more robust key cleaning that handles various whitespace characters
             const cleanedKey = key.trim();
             cleanedItem[cleanedKey] = item[key];
        }
        return cleanedItem;
    });
};

// We keep the non-sensitive data processing here
const rawCourses = cleanData(RAW_DATA.Cursos);
const rawAssignments = cleanData(RAW_DATA.Asignaciones);
const rawExams = cleanData(RAW_DATA.Examenes);
const rawGrades = cleanData(RAW_DATA.Notas);
const rawMessages = cleanData(RAW_DATA.Mensajes);

// A default user for display if needed, though login will create a specific user.
export const MOCK_USER: User = {
    name: 'Estudiante LTS',
    email: 'estudiante@lts.edu',
    avatarUrl: 'https://i.pravatar.cc/150?u=default'
};

const mapCourseStatus = (status: string): CourseStatus => {
    if (typeof status !== 'string') return CourseStatus.NoIniciado;
    const s = status.trim().toLowerCase();
    if (s === 'en curso') return CourseStatus.EnCurso;
    if (s === 'aprobada') return CourseStatus.Completado;
    if (s === 'por cursar') return CourseStatus.NoIniciado;
    return CourseStatus.NoIniciado;
}

export const MOCK_COURSES: Course[] = rawCourses.map((c: any) => ({
    id: c.id,
    title: c.nombre,
    professor: c.profesor,
    credits: c.créditos,
    status: mapCourseStatus(c.estado),
    description: c.descripcion,
}));

const courseIdToNameMap = MOCK_COURSES.reduce((acc, course) => {
    acc[course.id] = course.title;
    return acc;
}, {} as { [key: string]: string });

const formatDate = (dateStr: string) => {
    if (typeof dateStr !== 'string' || !dateStr.includes('/')) return 'N/A';
    // Assuming MM/DD/YYYY format from data
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        // Ensure month and day are correctly padded if needed.
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    return dateStr; // return original if format is unexpected
}

export const MOCK_ASSIGNMENTS: Assignment[] = rawAssignments.map((a: any, index: number) => ({
    id: `${a.id || 'assign'}-${a.curso_id}-${index}`, // Ensure unique ID
    courseId: a.curso_id,
    course: courseIdToNameMap[a.curso_id] || 'Curso Desconocido',
    title: a.titulo,
    dueDate: formatDate(a.fecha_entrega),
    isSubmitted: a.entregado === 'SI' || a.entregado === true,
}));

export const MOCK_EXAMS: Exam[] = rawExams.map((e: any, index: number) => ({
    id: `${e.id || 'exam'}-${e.curso_id}-${index}`, // Ensure unique ID
    courseId: e.curso_id,
    course: courseIdToNameMap[e.curso_id] || 'Curso Desconocido',
    title: e.titulo,
    date: formatDate(e.fecha),
    time: e.hora,
}));

export const MOCK_GRADES: Grade[] = rawGrades.map((g: any, index: number) => ({
    id: `${g.id || 'grade'}-${g.curso_id}-${g.titulo_asignacion}-${index}`, // Ensure unique ID
    courseId: g.curso_id,
    course: courseIdToNameMap[g.curso_id] || 'Curso Desconocido',
    assignmentTitle: g.titulo_asignacion,
    score: g.puntuacion,
    maxScore: g.puntuacion_maxima,
    studentName: g.nombre_estudiante,
}));

export const MOCK_MESSAGES: Message[] = rawMessages.map((m: any, index: number) => ({
    id: m.id || `msg-${index}`, // Ensure unique ID
    from: m.remitente,
    subject: m.asunto,
    isRead: m.leido === 'SI' || m.leido === true,
    timestamp: m.fecha_envio
}));

const assignmentEvents: CalendarEvent[] = MOCK_ASSIGNMENTS.map(a => ({
    id: `assign-${a.id}`,
    title: `Entrega: ${a.title}`,
    date: a.dueDate,
    type: 'assignment'
}));

const examEvents: CalendarEvent[] = MOCK_EXAMS.map(e => ({
    id: `exam-${e.id}`,
    title: `Exámen: ${e.title}`,
    date: e.date,
    type: 'exam'
}));

const today = new Date();
today.setHours(0, 0, 0, 0);

export const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [...assignmentEvents, ...examEvents]
    .filter(event => event.date !== 'N/A' && new Date(event.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4); // Show the next 4 upcoming events
