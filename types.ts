
export interface User {
  name: string;
  email: string;
  avatarUrl: string;
  role?: 'admin' | 'estudiante' | 'profesor';
}

export interface Student {
    name: string;
    email: string;
    password?: string;
    active: boolean;
}

export enum CourseStatus {
  EnCurso = 'En Curso',
  Completado = 'Completado',
  NoIniciado = 'No Iniciado',
}

export interface Course {
  id: string;
  title: string;
  professor: string;
  credits: number;
  status: CourseStatus;
  description: string;
  detailedContent?: string;
  imageUrl?: string;
}

export interface Resource {
    id: string;
    courseId: string;
    title: string;
    url: string;
    type: 'pdf' | 'video' | 'audio' | 'link';
    createdAt?: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  course: string;
  title: string;
  dueDate: string;
  isSubmitted: boolean;
}

export interface Exam {
  id: string;
  courseId: string;
  course: string;
  title: string;
  date: string;
  time: string;
}

export interface Grade {
  id: string;
  courseId: string;
  course: string;
  assignmentTitle: string;
  score: number;
  maxScore: number;
  studentName?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'assignment' | 'exam' | 'event';
}

export interface Message {
  id: string;
  from: string;
  subject: string;
  isRead: boolean;
  timestamp: string;
  type?: 'global' | 'personal';
}

export interface Attendance {
    id: string;
    date: string;
    courseId: string;
    status: 'presente' | 'ausente' | 'justificado';
}

export interface Payment {
    id: string;
    student_id: string;
    amount: number;
    date: string;
    description: string;
    method: string;
    reference?: string;
    type: 'inscription' | 'tuition' | 'other' | 'plan_config';
    verified: boolean;
}

export enum View {
  Home = 'Inicio',
  Courses = 'Cursos',
  Assignments = 'Asignaciones',
  Exams = 'Exámenes',
  Grades = 'Notas',
  Attendance = 'Asistencia',
  Chat = 'Mensajería',
  Financial = 'Estado Financiero',
  TeacherPanel = 'Panel Profesor'
}
