
import React, { useState, useEffect } from 'react';
import { supabase } from '../../application/supabase.ts';
import { PencilIcon, UserGroupIcon, PlusIcon, TrashIcon, ClipboardListIcon, AcademicCapIcon, CalendarIcon, CheckIcon, DownloadIcon, MailIcon, BookOpenIcon, HomeIcon, ChatIcon, SearchIcon, CurrencyDollarIcon, CreditCardIcon, XIcon } from '../Icons.tsx';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import { User, Payment } from '../../types.ts';
import { DEGREE_PROGRAM_NAME } from '../../constants.ts';

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
    contenido_detallado?: string;
    creditos: number;
    image_url?: string;
}

const LOGO_URL = "https://cdn.myportfolio.com/d435fa58-d32c-4141-8a15-0f2bfccdea41/1ac05fb8-e508-4c03-b550-d2b907caadbd_rw_600.png?h=7572d326e4292f32557ac73606fd0ece";

const TeacherPanel: React.FC<{ user: User }> = ({ user }) => {
    const isSuperAdmin = user.role === 'admin';
    const isTeacher = user.role === 'profesor';

    const [activeTab, setActiveTab] = useState<'students' | 'assignments' | 'exams' | 'attendance' | 'announcements' | 'courses' | 'finance'>('students');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [students, setStudents] = useState<StudentData[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [adminCourses, setAdminCourses] = useState<CourseAdminData[]>([]);
    const [editingCourse, setEditingCourse] = useState<CourseAdminData | null>(null);

    // Estados para Estudiante Seleccionado
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [studentGrades, setStudentGrades] = useState<GradeData[]>([]);
    const [studentInscriptions, setStudentInscriptions] = useState<string[]>([]);

    // Estados para otras pestañas
    const [assignments, setAssignments] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [financeStudent, setFinanceStudent] = useState('');
    const [studentPayments, setStudentPayments] = useState<any[]>([]);
    
    // Formularios
    const [newGradeCourse, setNewGradeCourse] = useState('');
    const [newGradeTitle, setNewGradeTitle] = useState('Nota Final');
    const [newGradeScore, setNewGradeScore] = useState(0);

    const [newAssignCourse, setNewAssignCourse] = useState('');
    const [newAssignTitle, setNewAssignTitle] = useState('');
    const [newAssignDate, setNewAssignDate] = useState('');

    const [newExamCourse, setNewExamCourse] = useState('');
    const [newExamTitle, setNewExamTitle] = useState('');
    const [newExamDate, setNewExamDate] = useState('');

    const [newAnnounceMsg, setNewAnnounceMsg] = useState('');

    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceCourse, setAttendanceCourse] = useState('');
    const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        await Promise.all([fetchStudents(), fetchCourses()]);
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

    // --- GESTIÓN DE ESTUDIANTE ---
    const handleSelectStudent = async (student: StudentData) => {
        setSelectedStudent(student);
        setEditName(student.nombre);
        setEditEmail(student.email || '');
        setEditPassword(student.password || '');
        
        // Cargar Notas
        const { data: grades } = await supabase.from('notas').select('*').eq('estudiante_id', student.id);
        setStudentGrades(grades || []);

        // Cargar Inscripciones
        const { data: insc } = await supabase.from('inscripciones').select('curso_id').eq('estudiante_id', student.id);
        setStudentInscriptions((insc || []).map(i => i.curso_id));
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

    const handleUpdateStudent = async () => {
        if (!selectedStudent) return;
        setIsSaving(true);
        const { error } = await supabase.from('estudiantes').update({
            nombre: editName, email: editEmail, password: editPassword
        }).eq('id', selectedStudent.id);
        setIsSaving(false);
        if (!error) alert("Alumno actualizado");
    };

    const handleAddGrade = async () => {
        if (!selectedStudent || !newGradeCourse) return;
        const { error } = await supabase.from('notas').insert({
            estudiante_id: selectedStudent.id, curso_id: newGradeCourse, titulo_asignacion: newGradeTitle, puntuacion: newGradeScore, puntuacion_maxima: 100
        });
        if (!error) {
            const { data } = await supabase.from('notas').select('*').eq('estudiante_id', selectedStudent.id);
            setStudentGrades(data || []);
            setNewGradeScore(0);
        }
    };

    // --- GESTIÓN DE CURSOS ---
    const handleUpdateCourse = async () => {
        if (!editingCourse) return;
        setIsSaving(true);
        const { error } = await supabase.from('cursos').update({
            descripcion: editingCourse.descripcion, contenido_detallado: editingCourse.contenido_detallado,
            profesor: editingCourse.profesor, creditos: editingCourse.creditos, image_url: editingCourse.image_url
        }).eq('id', editingCourse.id);
        setIsSaving(false);
        if (!error) { setEditingCourse(null); fetchCourses(); }
    };

    // --- GESTIÓN DE TAREAS Y EXAMENES ---
    useEffect(() => {
        if (activeTab === 'assignments') fetchAssignments();
        if (activeTab === 'exams') fetchExams();
        if (activeTab === 'announcements') fetchAnnouncements();
    }, [activeTab]);

    const fetchAssignments = async () => {
        const { data } = await supabase.from('asignaciones').select('*').order('fecha_entrega', { ascending: false });
        setAssignments(data || []);
    };

    const handleAddAssignment = async () => {
        if (!newAssignCourse || !newAssignTitle) return;
        await supabase.from('asignaciones').insert({ curso_id: newAssignCourse, titulo: newAssignTitle, fecha_entrega: newAssignDate || null });
        fetchAssignments();
        setNewAssignTitle('');
    };

    const fetchExams = async () => {
        const { data } = await supabase.from('examenes').select('*').order('fecha', { ascending: false });
        setExams(data || []);
    };

    const handleAddExam = async () => {
        if (!newExamCourse || !newExamTitle) return;
        await supabase.from('examenes').insert({ curso_id: newExamCourse, titulo: newExamTitle, fecha: newExamDate || null });
        fetchExams();
        setNewExamTitle('');
    };

    const fetchAnnouncements = async () => {
        const { data } = await supabase.from('mensajes').select('*').order('fecha_envio', { ascending: false });
        setAnnouncements(data || []);
    };

    const handleAddAnnounce = async () => {
        if (!newAnnounceMsg) return;
        await supabase.from('mensajes').insert({ remitente: 'Dirección LTS', asunto: newAnnounceMsg, leido: false, fecha_envio: new Date().toISOString() });
        fetchAnnouncements();
        setNewAnnounceMsg('');
    };

    // --- ASISTENCIA ---
    const loadAttendance = async () => {
        if (!attendanceCourse) return;
        const { data } = await supabase.from('asistencias').select('*').eq('curso_id', attendanceCourse).eq('fecha', attendanceDate);
        const map: any = {};
        data?.forEach(r => map[r.estudiante_id] = r.estado);
        setAttendanceMap(map);
    };

    const markAttendance = async (studentId: string, status: string) => {
        setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
        const { data: exist } = await supabase.from('asistencias').select('id').eq('estudiante_id', studentId).eq('curso_id', attendanceCourse).eq('fecha', attendanceDate).single();
        if (exist) await supabase.from('asistencias').update({ estado: status }).eq('id', exist.id);
        else await supabase.from('asistencias').insert({ estudiante_id: studentId, curso_id: attendanceCourse, fecha: attendanceDate, estado: status });
    };

    if (loading) return <div className="p-10 text-center">Cargando Panel...</div>;

    return (
        <div className="space-y-6 pb-20">
            <h1 className="text-3xl font-bold flex items-center"><UserGroupIcon className="h-8 w-8 mr-3 text-amber-500"/>Administración LTS</h1>
            
            {/* TABS PRINCIPALES */}
            <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 p-1 rounded-xl overflow-x-auto">
                {[
                    { id: 'students', label: 'Alumnos', icon: UserGroupIcon },
                    { id: 'courses', label: 'Cursos', icon: BookOpenIcon },
                    { id: 'assignments', label: 'Tareas', icon: ClipboardListIcon },
                    { id: 'exams', label: 'Exámenes', icon: AcademicCapIcon },
                    { id: 'attendance', label: 'Asistencia', icon: CheckIcon },
                    { id: 'announcements', label: 'Anuncios', icon: MailIcon },
                ].map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => { setActiveTab(tab.id as any); setSelectedStudent(null); }}
                        className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow' : 'text-gray-500 hover:bg-white/50'}`}
                    >
                        <tab.icon className="w-4 h-4 mr-2"/> {tab.label}
                    </button>
                ))}
            </div>

            {/* VISTA ALUMNOS */}
            {activeTab === 'students' && !selectedStudent && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700">
                    <div className="p-4 border-b dark:border-gray-700">
                        <div className="relative">
                            <input type="text" placeholder="Buscar alumno..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white" />
                            <SearchIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400"/>
                        </div>
                    </div>
                    <table className="w-full text-left">
                        <thead><tr className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase text-gray-400 font-bold"><th className="px-6 py-3">Nombre</th><th className="px-6 py-3">Rol</th><th className="px-6 py-3 text-right">Acción</th></tr></thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {students.filter(s => s.nombre.toLowerCase().includes(studentSearchTerm.toLowerCase())).map(s => (
                                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                    <td className="px-6 py-4 flex items-center font-bold text-sm"><img src={s.avatar_url} className="w-8 h-8 rounded-full mr-3 shadow-sm"/>{s.nombre}</td>
                                    <td className="px-6 py-4 text-xs capitalize text-gray-500">{s.rol}</td>
                                    <td className="px-6 py-4 text-right"><button onClick={() => handleSelectStudent(s)} className="text-blue-600 font-bold text-xs hover:underline uppercase">Gestionar</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* GESTIÓN DETALLADA DE ALUMNO */}
            {activeTab === 'students' && selectedStudent && (
                <div className="space-y-6 animate-fade-in">
                    <button onClick={() => setSelectedStudent(null)} className="text-blue-600 font-bold flex items-center text-sm">← Volver a lista</button>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Perfil */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-t-4 border-blue-500">
                            <h3 className="font-bold mb-4 uppercase text-xs text-gray-400">Perfil del Alumno</h3>
                            <div className="flex flex-col items-center mb-6"><img src={selectedStudent.avatar_url} className="w-24 h-24 rounded-full border-4 border-blue-50 shadow-lg mb-2"/><p className="font-bold text-lg">{selectedStudent.nombre}</p></div>
                            <div className="space-y-3">
                                <div><label className="text-[10px] font-bold text-gray-400">NOMBRE</label><input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-gray-700"/></div>
                                <div><label className="text-[10px] font-bold text-gray-400">EMAIL</label><input type="text" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-gray-700"/></div>
                                <div><label className="text-[10px] font-bold text-gray-400">CONTRASEÑA</label><input type="text" value={editPassword} onChange={e => setEditPassword(e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-gray-700"/></div>
                                <button onClick={handleUpdateStudent} disabled={isSaving} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-sm shadow-md hover:bg-blue-700">{isSaving ? 'Guardando...' : 'Guardar Perfil'}</button>
                            </div>
                        </div>

                        {/* Inscripciones (Activación de Cursos) */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-t-4 border-green-500">
                            <h3 className="font-bold mb-4 uppercase text-xs text-gray-400">Inscripciones (Activar Cursos)</h3>
                            <p className="text-[10px] text-gray-500 mb-4">Haz clic para activar o desactivar una materia para este alumno.</p>
                            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                                {adminCourses.map(c => (
                                    <div 
                                        key={c.id} 
                                        onClick={() => toggleInscription(c.id)}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${studentInscriptions.includes(c.id) ? 'bg-green-50 border-green-500 dark:bg-green-900/20' : 'bg-gray-50 border-transparent dark:bg-gray-700/50'}`}
                                    >
                                        <div><p className="text-xs font-bold">{c.nombre}</p><p className="text-[10px] text-gray-400">Prof. {c.profesor}</p></div>
                                        {studentInscriptions.includes(c.id) ? <CheckIcon className="w-5 h-5 text-green-600"/> : <PlusIcon className="w-4 h-4 text-gray-300"/>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Notas */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-t-4 border-amber-500">
                            <h3 className="font-bold mb-4 uppercase text-xs text-gray-400">Cargar Calificaciones</h3>
                            <div className="space-y-2 mb-4 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                                <select value={newGradeCourse} onChange={e => setNewGradeCourse(e.target.value)} className="w-full p-2 text-xs border rounded dark:bg-gray-700"><option value="">Seleccionar Curso...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                                <input type="text" value={newGradeTitle} onChange={e => setNewGradeTitle(e.target.value)} placeholder="Título (Ej: Examen 1)" className="w-full p-2 text-xs border rounded dark:bg-gray-700"/>
                                <div className="flex space-x-2"><input type="number" value={newGradeScore} onChange={e => setNewGradeScore(Number(e.target.value))} className="w-20 p-2 text-xs border rounded dark:bg-gray-700"/><button onClick={handleAddGrade} className="flex-1 bg-amber-600 text-white font-bold rounded text-xs">Cargar Nota</button></div>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {studentGrades.map(g => (
                                    <div key={g.id} className="p-2 border-b dark:border-gray-700 flex justify-between items-center"><div className="text-[10px] font-bold">{(adminCourses.find(c => c.id === g.curso_id)?.nombre || g.curso_id).substring(0, 20)}...<br/><span className="text-gray-400 font-normal">{g.titulo_asignacion}</span></div><span className="font-bold text-blue-600">{g.puntuacion} pts</span></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA CURSOS */}
            {activeTab === 'courses' && (
                <div className="space-y-6">
                    {editingCourse ? (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-t-4 border-blue-500 space-y-4">
                            <h3 className="font-bold">Editando Materia: {editingCourse.nombre}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-bold text-blue-600">IMAGEN MINIATURA (URL)</label>
                                    <input type="text" value={editingCourse.image_url || ''} onChange={e => setEditingCourse({...editingCourse, image_url: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 text-sm" placeholder="https://..." />
                                    {editingCourse.image_url && <div className="mt-2 h-20 w-40 overflow-hidden rounded bg-gray-100"><img src={editingCourse.image_url} className="w-full h-full object-cover"/></div>}
                                </div>
                                <div><label className="text-[10px] font-bold text-gray-400">PROFESOR</label><input type="text" value={editingCourse.profesor || ''} onChange={e => setEditingCourse({...editingCourse, profesor: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 text-sm"/></div>
                                <div><label className="text-[10px] font-bold text-gray-400">CRÉDITOS</label><input type="number" value={editingCourse.creditos || 0} onChange={e => setEditingCourse({...editingCourse, creditos: Number(e.target.value)})} className="w-full p-2 border rounded dark:bg-gray-700 text-sm"/></div>
                                <div className="md:col-span-2"><label className="text-[10px] font-bold text-gray-400">DESCRIPCIÓN CORTA</label><input type="text" value={editingCourse.descripcion || ''} onChange={e => setEditingCourse({...editingCourse, descripcion: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 text-sm"/></div>
                                <div className="md:col-span-2"><label className="text-[10px] font-bold text-gray-400">CONTENIDO/SYLLABUS (MÉTODO TEXTO)</label><textarea value={editingCourse.contenido_detallado || ''} onChange={e => setEditingCourse({...editingCourse, contenido_detallado: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 text-sm h-32"/></div>
                            </div>
                            <div className="flex justify-end space-x-2"><button onClick={() => setEditingCourse(null)} className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded">Cancelar</button><button onClick={handleUpdateCourse} className="px-6 py-2 text-sm bg-blue-600 text-white font-bold rounded shadow-lg">Guardar Cambios</button></div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase font-bold text-gray-400"><tr><th className="px-6 py-3">Nombre</th><th className="px-6 py-3">Profesor</th><th className="px-6 py-3 text-right">Acción</th></tr></thead><tbody className="divide-y dark:divide-gray-700">
                            {adminCourses.map(c => (<tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20"><td className="px-6 py-4 font-bold text-sm">{c.nombre}</td><td className="px-6 py-4 text-xs text-gray-500">{c.profesor}</td><td className="px-6 py-4 text-right"><button onClick={() => setEditingCourse(c)} className="text-blue-600 font-bold uppercase text-xs">Editar</button></td></tr>))}
                        </tbody></table></div>
                    )}
                </div>
            )}

            {/* VISTA TAREAS */}
            {activeTab === 'assignments' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md h-fit">
                        <h3 className="font-bold mb-4 flex items-center"><PlusIcon className="w-5 h-5 mr-2 text-blue-500"/>Crear Nueva Tarea</h3>
                        <div className="space-y-3">
                            <select value={newAssignCourse} onChange={e => setNewAssignCourse(e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-gray-700"><option value="">Curso...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                            <input type="text" value={newAssignTitle} onChange={e => setNewAssignTitle(e.target.value)} placeholder="Nombre de la tarea" className="w-full p-2 text-sm border rounded dark:bg-gray-700"/>
                            <input type="date" value={newAssignDate} onChange={e => setNewAssignDate(e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-gray-700"/>
                            <button onClick={handleAddAssignment} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-sm">Publicar Tarea</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase font-bold text-gray-400"><tr><th className="px-4 py-3 text-left">Tarea</th><th className="px-4 py-3">Vence</th><th className="px-4 py-3 text-right"></th></tr></thead><tbody className="divide-y dark:divide-gray-700">
                        {assignments.map(a => (<tr key={a.id} className="text-sm"><td className="px-4 py-3"><p className="font-bold">{a.titulo}</p><p className="text-[10px] text-gray-500">ID: {a.curso_id}</p></td><td className="px-4 py-3 text-xs">{a.fecha_entrega || 'Sin fecha'}</td><td className="px-4 py-3 text-right"><button onClick={async () => { await supabase.from('asignaciones').delete().eq('id', a.id); fetchAssignments(); }} className="text-red-500"><TrashIcon className="w-4 h-4"/></button></td></tr>))}
                    </tbody></table></div>
                </div>
            )}

            {/* VISTA EXAMENES */}
            {activeTab === 'exams' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md h-fit">
                        <h3 className="font-bold mb-4 flex items-center"><AcademicCapIcon className="w-5 h-5 mr-2 text-red-500"/>Programar Examen</h3>
                        <div className="space-y-3">
                            <select value={newExamCourse} onChange={e => setNewExamCourse(e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-gray-700"><option value="">Curso...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                            <input type="text" value={newExamTitle} onChange={e => setNewExamTitle(e.target.value)} placeholder="Título del Examen" className="w-full p-2 text-sm border rounded dark:bg-gray-700"/>
                            <input type="date" value={newExamDate} onChange={e => setNewExamDate(e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-gray-700"/>
                            <button onClick={handleAddExam} className="w-full bg-red-600 text-white font-bold py-2 rounded-lg text-sm">Crear Examen</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase font-bold text-gray-400"><tr><th className="px-4 py-3 text-left">Examen</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3 text-right"></th></tr></thead><tbody className="divide-y dark:divide-gray-700">
                        {exams.map(e => (<tr key={e.id} className="text-sm"><td className="px-4 py-3 font-bold">{e.titulo}</td><td className="px-4 py-3 text-xs">{e.fecha || 'N/A'}</td><td className="px-4 py-3 text-right"><button onClick={async () => { await supabase.from('examenes').delete().eq('id', e.id); fetchExams(); }} className="text-red-500"><TrashIcon className="w-4 h-4"/></button></td></tr>))}
                    </tbody></table></div>
                </div>
            )}

            {/* VISTA ASISTENCIA */}
            {activeTab === 'attendance' && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-t-4 border-blue-500 space-y-4">
                    <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
                        <select value={attendanceCourse} onChange={e => setAttendanceCourse(e.target.value)} className="flex-1 p-2 text-sm border rounded dark:bg-gray-700"><option value="">Seleccionar Curso...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                        <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="p-2 text-sm border rounded dark:bg-gray-700"/>
                        <button onClick={loadAttendance} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm">Cargar Lista</button>
                    </div>
                    {attendanceCourse && (
                        <div className="overflow-hidden rounded-lg border dark:border-gray-700 mt-6"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900 text-[10px] font-bold uppercase text-gray-400"><tr><th className="px-4 py-2">Alumno</th><th className="px-4 py-2 text-center">Estado</th></tr></thead><tbody className="divide-y dark:divide-gray-700">
                            {students.map(s => (
                                <tr key={s.id} className="text-sm"><td className="px-4 py-3 font-bold">{s.nombre}</td><td className="px-4 py-3"><div className="flex justify-center space-x-2">
                                    {['presente', 'ausente', 'tarde'].map(st => (
                                        <button key={st} onClick={() => markAttendance(s.id, st)} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${attendanceMap[s.id] === st ? (st==='presente'?'bg-green-600 text-white':st==='ausente'?'bg-red-600 text-white':'bg-yellow-500 text-white') : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>{st}</button>
                                    ))}
                                </div></td></tr>
                            ))}
                        </tbody></table></div>
                    )}
                </div>
            )}

            {/* VISTA ANUNCIOS */}
            {activeTab === 'announcements' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                        <h3 className="font-bold mb-4">Publicar Anuncio Global</h3>
                        <div className="flex space-x-2"><input type="text" value={newAnnounceMsg} onChange={e => setNewAnnounceMsg(e.target.value)} placeholder="Ej: No habrá clases el próximo lunes por feriado..." className="flex-1 p-2 text-sm border rounded dark:bg-gray-700"/><button onClick={handleAddAnnounce} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center"><MailIcon className="w-4 h-4 mr-2"/>Enviar</button></div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase text-gray-400 font-bold"><tr><th className="px-6 py-3">Fecha</th><th className="px-6 py-3">Mensaje</th><th className="px-6 py-3 text-right"></th></tr></thead><tbody className="divide-y dark:divide-gray-700">
                        {announcements.map(m => (<tr key={m.id} className="text-sm hover:bg-gray-50 dark:hover:bg-gray-700/30"><td className="px-6 py-4 text-gray-400 text-xs">{new Date(m.fecha_envio).toLocaleDateString()}</td><td className="px-6 py-4 font-semibold">{m.asunto}</td><td className="px-6 py-4 text-right"><button onClick={async () => { await supabase.from('mensajes').delete().eq('id', m.id); fetchAnnouncements(); }} className="text-red-400"><TrashIcon className="w-4 h-4"/></button></td></tr>))}
                    </tbody></table></div>
                </div>
            )}
        </div>
    );
};

export default TeacherPanel;
