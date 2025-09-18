

export interface User {
  name: string;
  email: string;
  avatarUrl: string;
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
}

export interface Assignment {
  id: string;
  course: string;
  title: string;
  dueDate: string;
  isSubmitted: boolean;
}

export interface Exam {
  id: string;
  course: string;
  title: string;
  date: string;
  time: string;
}

export interface Grade {
  id: string;
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
}

export enum View {
  Home = 'Inicio',
  Courses = 'Cursos',
  Assignments = 'Asignaciones',
  Exams = 'Exámenes',
  Grades = 'Notas',
}