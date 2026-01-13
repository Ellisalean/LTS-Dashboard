
import React, { useState, useEffect } from 'react';
import { supabase } from '../../application/supabase.ts';
import { 
    PencilIcon, UserGroupIcon, PlusIcon, TrashIcon, ClipboardListIcon, 
    AcademicCapIcon, CalendarIcon, CheckIcon, DownloadIcon, MailIcon, 
    BookOpenIcon, SearchIcon, CurrencyDollarIcon, XIcon, 
    ChevronLeftIcon, VideoIcon, MusicIcon, DocumentTextIcon, LinkIcon, 
    ChartBarIcon, ClockIcon
} from '../Icons.tsx';
import { User, Payment, Resource } from '../../types.ts';

interface StudentData {
    id: string;
    nombre: string;
    email: string;
    avatar_url: string;
    activo: boolean;
    rol: string;
    password?: string;
}

interface GradeData {
    id: string;
    curso_id: string;
    titulo_asignacion: string;
    puntuacion: number;
    puntuacion_maxima: number;
}

interface CourseAdminData {
    id: string;
    nombre: string;
    profesor: string;
    descripcion: string;
    creditos: number;
}

const TeacherPanel: React.FC<{ user: User }> = ({ user }) => {
    const isTeacher = user.role === 'profesor';

    const [activeTab, setActiveTab] = useState<'students' | 'resources' | 'assignments' | 'exams' | 'attendance' | 'announcements'>('students');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Listados Globales
    const [students, setStudents] = useState<StudentData[]>([]);
    const [adminCourses, setAdminCourses] = useState<CourseAdminData[]>([]);
    const [courseResources, setCourseResources] = useState<Resource[]>([]);
    const [studentSearchTerm, setStudentSearchTerm] = useState('');

    // Gestión de Alumno Seleccionado (DETALLE)
    const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [studentGrades, setStudentGrades] = useState<GradeData[]>([]);
    const [studentInscriptions, setStudentInscriptions] = useState<string[]>([]);
    const [studentPayments, setStudentPayments] = useState<Payment[]>([]);

    // Estados para Creación de Materiales
    const [newResCourse, setNewResCourse] = useState('');
    const [newResTitle, setNewResTitle] = useState('');
    const [newResUrl, setNewResUrl] = useState('');
    const [newResType, setNewResType] = useState<'pdf' | 'video' | 'audio' | 'link'>('pdf');

    // Estados para Notas
    const [newGradeCourse, setNewGradeCourse] = useState('');
    const [newGradeTitle, setNewGradeTitle] = useState('Nota Final');
    const [newGradeScore, setNewGradeScore] = useState(0);

    // Estados para Finanzas
    const [newPayAmount, setNewPayAmount] = useState(0);
    const [newPayDesc, setNewPayDesc] = useState('');
    const [newPayMethod, setNewPayMethod] = useState('ZELLE');

    // Estados para Tareas/Examenes/Asistencia
    const [newAssignCourse, setNewAssignCourse] = useState('');
    const [newAssignTitle, setNewAssignTitle] = useState('');
    const [newAssignDate, setNewAssignDate] = useState('');
    const [assignments, setAssignments] = useState<any[]>([]);

    const [newExamCourse, setNewExamCourse] = useState('');
    const [newExamTitle, setNewExamTitle] = useState('');
    const [newExamDate, setNewExamDate] = useState('');
    const [exams, setExams] = useState<any[]>([]);

    const [newAnnounceMsg, setNewAnnounceMsg] = useState('');
    const [announcements, setAnnouncements] = useState<any[]>([]);

    const [attendanceCourse, setAttendanceCourse] = useState('');
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});

    // --- CARGA DE DATOS ---
    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        await Promise.all([fetchStudents(), fetchCourses(), fetchResources()]);
        setLoading(false);
    };

    const fetchStudents = async () => {
        const { data } = await supabase.from('estudiantes').select('*').order('nombre');
        if (data) setStudents(data);
    };

    const fetchCourses = async () => {
        let query = supabase.from('cursos').select('*').order('nombre');
        if (isTeacher) query = query.eq('profesor', user.name);
        const { data } = await query;
        if (data) setAdminCourses(data);
    };

    const fetchResources = async () => {
        const { data } = await supabase.from('recursos').select('*').order('created_at', { ascending: false });
        if (data) setCourseResources(data.map((r: any) => ({
            id: r.id, courseId: r.course_id, title: r.titulo, url: r.url, type: r.tipo
        })));
    };

    // --- ACCIONES ALUMNO SELECCIONADO ---
    const handleSelectStudent = async (student: StudentData) => {
        setSelectedStudent(student);
        setEditName(student.nombre);
        setEditEmail(student.email || '');
        setEditPassword(student.password || '');
        
        const [gradesRes, inscRes, paymentsRes] = await Promise.all([
            supabase.from('notas').select('*').eq('estudiante_id', student.id).order('id', { ascending: false }),
            supabase.from('inscripciones').select('curso_id').eq('estudiante_id', student.id),
            supabase.from('pagos').select('*').eq('student_id', student.id).order('date', { ascending: false })
        ]);

        setStudentGrades(gradesRes.data || []);
        setStudentInscriptions((inscRes.data || []).map(i => i.curso_id));
        setStudentPayments(paymentsRes.data || []);
    };

    const handleUpdateStudentProfile = async () => {
        if (!selectedStudent) return;
        setIsSaving(true);
        const { error } = await supabase.from('estudiantes')
            .update({ nombre: editName, email: editEmail, password: editPassword })
            .eq('id', selectedStudent.id);
        setIsSaving(false);
        if (!error) alert("Perfil actualizado correctamente.");
    };

    const toggleInscription = async (courseId: string) => {
        if (!selectedStudent) return;
        const isInscribed = studentInscriptions.includes(courseId);
        if (isInscribed) {
            await supabase.from('inscripciones').delete().eq('estudiante_id', selectedStudent.id).eq('curso_id', courseId);
            setStudentInscriptions(prev => prev.filter(id => id !== courseId));
        } else {
            await supabase.from('inscripciones').insert({ estudiante_id: selectedStudent.id, curso_id: courseId });
            setStudentInscriptions(prev => [...prev, courseId]);
        }
    };

    const handleAddGrade = async () => {
        if (!selectedStudent || !newGradeCourse) return;
        const { error } = await supabase.from('notas').insert({
            estudiante_id: selectedStudent.id, 
            curso_id: newGradeCourse, 
            titulo_asignacion: newGradeTitle, 
            puntuacion: newGradeScore, 
            puntuacion_maxima: 100
        });
        if (!error) {
            const { data } = await supabase.from('notas').select('*').eq('estudiante_id', selectedStudent.id).order('id', { ascending: false });
            setStudentGrades(data || []);
            setNewGradeScore(0);
        }
    };

    const handleDeleteGrade = async (id: string) => {
        await supabase.from('notas').delete().eq('id', id);
        setStudentGrades(prev => prev.filter(g => g.id !== id));
    };

    const handleAddPayment = async () => {
        if (!selectedStudent || newPayAmount <= 0) return;
        const { error } = await supabase.from('pagos').insert({
            student_id: selectedStudent.id,
            amount: newPayAmount,
            description: newPayDesc || 'Mensualidad',
            method: newPayMethod,
            date: new Date().toISOString().split('T')[0],
            verified: true,
            type: 'tuition'
        });
        if (!error) {
            const { data } = await supabase.from('pagos').select('*').eq('student_id', selectedStudent.id).order('date', { ascending: false });
            setStudentPayments(data || []);
            setNewPayAmount(0);
            setNewPayDesc('');
        }
    };

    const handleDeletePayment = async (id: string) => {
        await supabase.from('pagos').delete().eq('id', id);
        setStudentPayments(prev => prev.filter(p => p.id !== id));
    };

    // --- ACCIONES MATERIALES ---
    const handleAddResource = async () => {
        if (!newResCourse || !newResTitle || !newResUrl) { alert("Completa todos los campos"); return; }
        setIsSaving(true);
        const { error } = await supabase.from('recursos').insert({
            course_id: newResCourse, titulo: newResTitle, url: newResUrl, tipo: newResType
        });
        setIsSaving(false);
        if (!error) {
            alert("Material publicado.");
            setNewResTitle(''); setNewResUrl('');
            fetchResources();
        }
    };

    const handleDeleteResource = async (id: string) => {
        if (!confirm("¿Eliminar este material?")) return;
        await supabase.from('recursos').delete().eq('id', id);
        fetchResources();
    };

    // --- ACCIONES ASISTENCIA ---
    const markAttendance = async (studentId: string, status: string) => {
        if (!attendanceCourse) return;
        setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
        const { data: exist } = await supabase.from('asistencias').select('id').eq('estudiante_id', studentId).eq('curso_id', attendanceCourse).eq('fecha', attendanceDate).single();
        if (exist) await supabase.from('asistencias').update({ estado: status }).eq('id', exist.id);
        else await supabase.from('asistencias').insert({ estudiante_id: studentId, curso_id: attendanceCourse, fecha: attendanceDate, estado: status });
    };

    // --- ACCIONES TAREAS/EXAMENES/ANUNCIOS ---
    const fetchAssignments = async () => {
        const { data } = await supabase.from('asignaciones').select('*').order('fecha_entrega', { ascending: false });
        setAssignments(data || []);
    };
    const handleAddAssignment = async () => {
        if (!newAssignCourse || !newAssignTitle) return;
        await supabase.from('asignaciones').insert({ curso_id: newAssignCourse, titulo: newAssignTitle, fecha_entrega: newAssignDate || null });
        fetchAssignments(); setNewAssignTitle('');
    };

    const fetchExams = async () => {
        const { data } = await supabase.from('examenes').select('*').order('fecha', { ascending: false });
        setExams(data || []);
    };
    const handleAddExam = async () => {
        if (!newExamCourse || !newExamTitle) return;
        await supabase.from('examenes').insert({ curso_id: newExamCourse, titulo: newExamTitle, fecha: newExamDate || null });
        fetchExams(); setNewExamTitle('');
    };

    const fetchAnnouncements = async () => {
        const { data } = await supabase.from('mensajes').select('*').order('fecha_envio', { ascending: false });
        setAnnouncements(data || []);
    };
    const handleAddAnnounce = async () => {
        if (!newAnnounceMsg) return;
        await supabase.from('mensajes').insert({ remitente: 'Dirección LTS', asunto: newAnnounceMsg, leido: false, fecha_envio: new Date().toISOString() });
        fetchAnnouncements(); setNewAnnounceMsg('');
    };

    useEffect(() => {
        if (activeTab === 'assignments') fetchAssignments();
        if (activeTab === 'exams') fetchExams();
        if (activeTab === 'announcements') fetchAnnouncements();
    }, [activeTab]);

    if (loading) return (
        <div className="p-10 text-center flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-blue-600 font-black uppercase text-xs tracking-widest">Sincronizando Sistema...</p>
        </div>
    );

    return (
        <div className="space-y-6 pb-20 max-w-[1600px] mx-auto px-4 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black flex items-center text-gray-800 dark:text-white tracking-tighter">
                    <UserGroupIcon className="h-9 w-9 mr-4 text-blue-600"/>
                    Panel Administrativo
                </h1>
            </div>
            
            {/* NAVEGACIÓN PRINCIPAL */}
            <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700/50 p-1.5 rounded-3xl overflow-x-auto shadow-inner border dark:border-gray-700">
                {[
                    { id: 'students', label: 'Alumnos', icon: UserGroupIcon },
                    { id: 'resources', label: 'Materiales', icon: LinkIcon },
                    { id: 'assignments', label: 'Tareas', icon: ClipboardListIcon },
                    { id: 'exams', label: 'Exámenes', icon: AcademicCapIcon },
                    { id: 'attendance', label: 'Asistencia', icon: CheckIcon },
                    { id: 'announcements', label: 'Anuncios', icon: MailIcon },
                ].map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => { setActiveTab(tab.id as any); setSelectedStudent(null); }} 
                        className={`flex items-center px-6 py-3 rounded-2xl text-xs font-black uppercase transition-all whitespace-nowrap tracking-widest ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-xl' : 'text-gray-500 hover:bg-white/50'}`}
                    >
                        <tab.icon className="w-4 h-4 mr-2"/> {tab.label}
                    </button>
                ))}
            </div>

            {/* VISTA ALUMNOS: LISTADO */}
            {activeTab === 'students' && !selectedStudent && (
                 <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700 animate-fade-in">
                    <div className="p-6 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 flex items-center justify-between">
                        <div className="relative w-full max-w-lg">
                            <input 
                                type="text" 
                                placeholder="Buscar alumno por nombre..." 
                                value={studentSearchTerm} 
                                onChange={(e) => setStudentSearchTerm(e.target.value)} 
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-gray-700 shadow-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                            />
                            <SearchIcon className="w-6 h-6 absolute left-4 top-3.5 text-blue-500"/>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead><tr className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase text-gray-400 font-black tracking-widest"><th className="px-8 py-5">Estudiante</th><th className="px-8 py-5">Rol</th><th className="px-8 py-5 text-right">Acciones</th></tr></thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {students.filter(s => s.nombre.toLowerCase().includes(studentSearchTerm.toLowerCase())).map(s => (
                                    <tr key={s.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-8 py-5 flex items-center font-bold text-sm text-gray-800 dark:text-gray-200">
                                            <img src={s.avatar_url} className="w-12 h-12 rounded-2xl mr-5 shadow-md border-2 border-white"/>
                                            {s.nombre}
                                        </td>
                                        <td className="px-8 py-5 text-xs text-blue-500 font-black uppercase">{s.rol}</td>
                                        <td className="px-8 py-5 text-right">
                                            <button onClick={() => handleSelectStudent(s)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 shadow-xl tracking-widest transition-all">Gestionar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* VISTA ALUMNOS: DETALLE (4 COLUMNAS SEGÚN CAPTURA) */}
            {activeTab === 'students' && selectedStudent && (
                <div className="animate-fade-in space-y-6">
                    <button onClick={() => setSelectedStudent(null)} className="flex items-center text-blue-600 font-black uppercase text-[10px] tracking-widest mb-2"><ChevronLeftIcon className="w-5 h-5 mr-1"/> Volver al Listado</button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        
                        {/* COLUMNA 1: INFORMACIÓN BÁSICA */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border dark:border-gray-700 space-y-6">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Información Básica</h3>
                            <div className="flex flex-col items-center">
                                <img src={selectedStudent.avatar_url} className="w-28 h-28 rounded-3xl shadow-2xl border-4 border-white dark:border-gray-700 mb-4"/>
                                <h4 className="text-center font-black text-xl text-gray-800 dark:text-white leading-tight">{selectedStudent.nombre}</h4>
                            </div>
                            <div className="space-y-4">
                                <div><label className="text-[9px] font-black text-gray-400 uppercase ml-1">Email</label><input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none text-sm font-bold"/></div>
                                <div><label className="text-[9px] font-black text-gray-400 uppercase ml-1">Contraseña</label><input value={editPassword} onChange={e => setEditPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none text-sm font-bold"/></div>
                                <button onClick={handleUpdateStudentProfile} disabled={isSaving} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-[11px] uppercase shadow-lg hover:bg-black transition-all">Actualizar Perfil</button>
                            </div>
                        </div>

                        {/* COLUMNA 2: TRIMESTRE ACTUAL (INSCRIPCIONES) */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border dark:border-gray-700 border-t-8 border-green-500">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Trimestre Actual</h3>
                            <p className="text-[10px] text-gray-400 italic mb-6">Activa materias para cursado.</p>
                            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2">
                                {adminCourses.map(course => (
                                    <div key={course.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl group transition-all">
                                        <div className="flex-1 overflow-hidden mr-4">
                                            <p className="text-xs font-black text-gray-800 dark:text-gray-200 truncate">{course.nombre}</p>
                                            <p className="text-[9px] font-bold text-gray-400 truncate uppercase">Prof: {course.profesor}</p>
                                        </div>
                                        <button 
                                            onClick={() => toggleInscription(course.id)} 
                                            className={`p-2 rounded-xl transition-all shadow-md ${studentInscriptions.includes(course.id) ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-300 hover:text-blue-500'}`}
                                        >
                                            {studentInscriptions.includes(course.id) ? <CheckIcon className="w-4 h-4"/> : <PlusIcon className="w-4 h-4"/>}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* COLUMNA 3: REGISTRO DE NOTAS */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border dark:border-gray-700 border-t-8 border-amber-500">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Registro de Notas</h3>
                            <div className="space-y-4 mb-6 p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-3xl border border-dashed border-amber-200">
                                <select value={newGradeCourse} onChange={e => setNewGradeCourse(e.target.value)} className="w-full p-4 text-[10px] font-black rounded-2xl border dark:bg-gray-700 uppercase">
                                    <option value="">Materia...</option>
                                    {adminCourses.filter(c => studentInscriptions.includes(c.id)).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                                <input placeholder="Ej: Nota Final" value={newGradeTitle} onChange={e => setNewGradeTitle(e.target.value)} className="w-full p-4 rounded-2xl bg-white dark:bg-gray-900 border-none text-xs font-bold shadow-sm"/>
                                <div className="flex gap-2">
                                    <input type="number" value={newGradeScore} onChange={e => setNewGradeScore(Number(e.target.value))} className="w-20 p-4 rounded-2xl bg-white dark:bg-gray-900 border-none text-sm font-black text-center shadow-sm"/>
                                    <button onClick={handleAddGrade} className="flex-1 bg-amber-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-amber-600">Subir Nota</button>
                                </div>
                            </div>
                            <div className="space-y-3 overflow-y-auto max-h-[250px] pr-2">
                                {studentGrades.map(g => (
                                    <div key={g.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex justify-between items-center">
                                        <div>
                                            <p className="text-[9px] font-black text-blue-500 uppercase">{adminCourses.find(c => c.id === g.curso_id)?.nombre.substring(0,10) || 'MAT'}</p>
                                            <p className="text-xs font-bold text-gray-800 dark:text-white">{g.titulo_asignacion}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black">{g.puntuacion}</span>
                                            <button onClick={() => handleDeleteGrade(g.id)} className="text-gray-300 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* COLUMNA 4: HISTORIAL FINANCIERO */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border dark:border-gray-700 border-t-8 border-indigo-500">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Historial Financiero</h3>
                            <div className="space-y-4 mb-6 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-3xl border border-dashed border-indigo-200">
                                <input type="number" value={newPayAmount} onChange={e => setNewPayAmount(Number(e.target.value))} className="w-full p-4 rounded-2xl bg-white dark:bg-gray-900 border-none text-center text-sm font-black shadow-sm"/>
                                <input placeholder="Concepto (Ej: Octubre)" value={newPayDesc} onChange={e => setNewPayDesc(e.target.value)} className="w-full p-4 rounded-2xl bg-white dark:bg-gray-900 border-none text-xs font-bold shadow-sm"/>
                                <select value={newPayMethod} onChange={e => setNewPayMethod(e.target.value)} className="w-full p-4 text-[10px] font-black rounded-2xl border dark:bg-gray-700 uppercase">
                                    <option value="ZELLE">ZELLE</option>
                                    <option value="EFECTIVO">EFECTIVO</option>
                                    <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                                </select>
                                <button onClick={handleAddPayment} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-blue-700">Registrar Pago</button>
                            </div>
                            <div className="space-y-3 overflow-y-auto max-h-[250px] pr-2">
                                {studentPayments.map(p => (
                                    <div key={p.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex justify-between items-center border border-transparent hover:border-indigo-100 transition-all">
                                        <div>
                                            <p className="text-[9px] font-black text-indigo-500 uppercase">{p.date}</p>
                                            <p className="text-xs font-bold text-gray-800 dark:text-white">{p.description}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black">${p.amount}</span>
                                            <button onClick={() => handleDeletePayment(p.id)} className="text-gray-300 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* VISTA MATERIALES (COMPLETA) */}
            {activeTab === 'resources' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-indigo-500 h-fit space-y-6">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-gray-200 uppercase text-xs tracking-widest"><PlusIcon className="w-6 h-6 mr-3 text-indigo-600"/> Nuevo Material</h3>
                        <div className="space-y-4">
                            <select value={newResCourse} onChange={e => setNewResCourse(e.target.value)} className="w-full p-4 text-xs border rounded-2xl dark:bg-gray-700 font-black uppercase"><option value="">Seleccionar Materia...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                            <input type="text" value={newResTitle} onChange={e => setNewResTitle(e.target.value)} placeholder="Título del material" className="w-full p-4 text-xs border rounded-2xl dark:bg-gray-700 font-bold"/>
                            <select value={newResType} onChange={e => setNewResType(e.target.value as any)} className="w-full p-4 text-xs border rounded-2xl dark:bg-gray-700 font-black uppercase"><option value="pdf">PDF / Documento</option><option value="video">Video / YouTube</option><option value="audio">Audio / Podcast</option><option value="link">Enlace Externo</option></select>
                            <input type="text" value={newResUrl} onChange={e => setNewResUrl(e.target.value)} placeholder="Pegar URL del archivo o enlace" className="w-full p-4 text-xs border rounded-2xl dark:bg-gray-700 font-medium italic"/>
                            <button onClick={handleAddResource} disabled={isSaving} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase shadow-2xl hover:bg-indigo-700 transition-all">Publicar Material</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700">
                        <div className="p-6 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 font-black text-[10px] uppercase tracking-widest text-gray-400 flex justify-between items-center"><span>Materiales Publicados</span><span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full">{courseResources.length}</span></div>
                        <div className="divide-y dark:divide-gray-700 overflow-y-auto max-h-[600px]">
                            {courseResources.map(res => (
                                <div key={res.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-all group">
                                    <div className="flex items-center">
                                        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                                            {res.type === 'video' ? <VideoIcon className="w-5 h-5 text-red-500" /> : res.type === 'pdf' ? <DocumentTextIcon className="w-5 h-5 text-blue-500" /> : res.type === 'audio' ? <MusicIcon className="w-5 h-5 text-purple-500" /> : <LinkIcon className="w-5 h-5 text-gray-500" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 dark:text-white">{res.title}</p>
                                            <p className="text-[9px] text-indigo-500 font-black uppercase">{(adminCourses.find(c => c.id === res.courseId)?.nombre || res.courseId)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a href={res.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-indigo-500 p-2"><LinkIcon className="w-5 h-5"/></a>
                                        <button onClick={() => handleDeleteResource(res.id)} className="text-gray-300 hover:text-red-500 transition-all p-2"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA ASISTENCIA (COHERENTE CON EL RESTO) */}
            {activeTab === 'attendance' && (
                <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl p-10 space-y-8 animate-fade-in border-t-8 border-blue-500">
                    <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-gray-50 dark:bg-gray-900 p-6 rounded-3xl">
                        <div className="flex-1 w-full">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Seleccionar Materia</label>
                            <select value={attendanceCourse} onChange={e => setAttendanceCourse(e.target.value)} className="w-full p-4 text-xs rounded-2xl border dark:bg-gray-700 font-black uppercase shadow-sm">
                                <option value="">--- Escoger Materia ---</option>
                                {adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>
                        <div className="w-full md:w-auto">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Fecha de Clase</label>
                            <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="w-full p-4 text-xs rounded-2xl border dark:bg-gray-700 font-black uppercase shadow-sm"/>
                        </div>
                    </div>
                    {attendanceCourse ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {students.map(student => (
                                <div key={student.id} className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-700 group hover:shadow-xl transition-all">
                                    <div className="flex items-center">
                                        <img src={student.avatar_url} className="w-10 h-10 rounded-xl mr-4 shadow-sm"/>
                                        <span className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase truncate max-w-[120px]">{student.nombre}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => markAttendance(student.id, 'presente')} className={`p-3 rounded-xl transition-all shadow-md ${attendanceMap[student.id] === 'presente' ? 'bg-green-600 text-white scale-110' : 'bg-white dark:bg-gray-800 text-gray-300 hover:text-green-500'}`}><CheckIcon className="w-5 h-5"/></button>
                                        <button onClick={() => markAttendance(student.id, 'ausente')} className={`p-3 rounded-xl transition-all shadow-md ${attendanceMap[student.id] === 'ausente' ? 'bg-red-600 text-white scale-110' : 'bg-white dark:bg-gray-800 text-gray-300 hover:text-red-500'}`}><XIcon className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-gray-50 dark:bg-gray-900 rounded-[3rem] border-2 border-dashed border-gray-200">
                            <BookOpenIcon className="w-16 h-16 text-gray-300 mx-auto mb-4"/>
                            <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Escoge una materia para pasar asistencia</p>
                        </div>
                    )}
                </div>
            )}

            {/* VISTA TAREAS Y EXAMENES (SIMPLIFICADA PERO COMPLETA) */}
            {(activeTab === 'assignments' || activeTab === 'exams') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-indigo-500 h-fit space-y-6">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-gray-200 uppercase text-xs tracking-widest"><PlusIcon className="w-6 h-6 mr-3 text-indigo-600"/> Nuevo {activeTab === 'assignments' ? 'Tarea' : 'Examen'}</h3>
                        <div className="space-y-4">
                            <select value={activeTab === 'assignments' ? newAssignCourse : newExamCourse} onChange={e => activeTab === 'assignments' ? setNewAssignCourse(e.target.value) : setNewExamCourse(e.target.value)} className="w-full p-4 rounded-2xl border dark:bg-gray-700 font-bold text-xs uppercase shadow-sm"><option value="">Seleccionar Materia...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                            <input type="text" value={activeTab === 'assignments' ? newAssignTitle : newExamTitle} onChange={e => activeTab === 'assignments' ? setNewAssignTitle(e.target.value) : setNewExamTitle(e.target.value)} placeholder="Título de la evaluación" className="w-full p-4 rounded-2xl border dark:bg-gray-700 font-bold text-xs shadow-sm"/>
                            <input type="date" value={activeTab === 'assignments' ? newAssignDate : newExamDate} onChange={e => activeTab === 'assignments' ? setNewAssignDate(e.target.value) : setNewExamDate(e.target.value)} className="w-full p-4 rounded-2xl border dark:bg-gray-700 font-bold text-xs shadow-sm"/>
                            <button onClick={activeTab === 'assignments' ? handleAddAssignment : handleAddExam} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-indigo-700">Guardar Programación</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl border dark:border-gray-700 overflow-hidden">
                        <div className="p-6 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 font-black text-[10px] uppercase tracking-widest text-gray-400">Próximos Registros</div>
                        <div className="divide-y dark:divide-gray-700 max-h-[500px] overflow-y-auto">
                            {(activeTab === 'assignments' ? assignments : exams).map(item => (
                                <div key={item.id} className="p-5 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <div><p className="font-bold text-sm text-gray-800 dark:text-white">{item.titulo}</p><p className="text-[9px] font-black text-indigo-500 uppercase">{adminCourses.find(c => c.id === item.curso_id)?.nombre || item.curso_id}</p></div>
                                    <div className="text-right font-black text-[10px] text-gray-400 uppercase">{item.fecha_entrega || item.fecha || 'N/A'}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA ANUNCIOS (COMPLETA) */}
            {activeTab === 'announcements' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-amber-500 space-y-6 h-fit">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-gray-200 uppercase text-xs tracking-widest"><MailIcon className="w-6 h-6 mr-3 text-amber-500"/> Nuevo Anuncio Global</h3>
                        <textarea value={newAnnounceMsg} onChange={e => setNewAnnounceMsg(e.target.value)} placeholder="Escribe aquí el mensaje masivo para todos los estudiantes..." className="w-full p-6 rounded-[2rem] border dark:bg-gray-700 font-medium text-sm h-40 resize-none shadow-sm"/>
                        <button onClick={handleAddAnnounce} className="w-full bg-amber-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-amber-700">Publicar para todos</button>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl border dark:border-gray-700 overflow-hidden">
                        <div className="p-6 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 font-black text-[10px] uppercase tracking-widest text-gray-400">Historial de Anuncios</div>
                        <div className="divide-y dark:divide-gray-700 max-h-[500px] overflow-y-auto">
                            {announcements.map(ann => (
                                <div key={ann.id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2"><span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">DIRECCIÓN LTS</span><span className="text-[9px] text-gray-400 font-bold">{new Date(ann.fecha_envio).toLocaleDateString()}</span></div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{ann.asunto}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherPanel;
