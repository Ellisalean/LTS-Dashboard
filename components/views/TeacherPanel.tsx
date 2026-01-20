
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../application/supabase.ts';
import { 
    PencilIcon, UserGroupIcon, PlusIcon, TrashIcon, ClipboardListIcon, 
    AcademicCapIcon, CalendarIcon, CheckIcon, DownloadIcon, MailIcon, 
    BookOpenIcon, SearchIcon, CurrencyDollarIcon, XIcon, 
    ChevronLeftIcon, VideoIcon, MusicIcon, DocumentTextIcon, LinkIcon, 
    ChartBarIcon, ClockIcon, CheckCircleIcon, SendIcon, UploadIcon,
    ExclamationTriangleIcon
} from '../Icons.tsx';
import { SCHOOL_LOGO_URL } from '../../constants.ts';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import { User, Payment, Resource, Assignment, Exam, Grade } from '../../types.ts';

interface StudentData {
    id: string;
    nombre: string;
    email: string;
    avatar_url: string;
    activo: boolean;
    rol: string;
    password?: string;
}

interface CourseAdminData {
    id: string;
    nombre: string;
    profesor: string;
    descripcion: string;
    creditos: number;
    contenido_detallado?: string;
    image_url?: string;
}

const TeacherPanel: React.FC<{ user: User }> = ({ user }) => {
    const isAdmin = user.role === 'admin';
    const isTeacher = user.role === 'profesor';
    
    const [activeTab, setActiveTab] = useState<'students' | 'courses' | 'resources' | 'assignments' | 'exams' | 'attendance' | 'announcements'>('students');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Listados Globales
    const [students, setStudents] = useState<StudentData[]>([]);
    const [adminCourses, setAdminCourses] = useState<CourseAdminData[]>([]);
    const [courseResources, setCourseResources] = useState<Resource[]>([]);
    const [allAnnouncements, setAllAnnouncements] = useState<any[]>([]);
    
    // Buscadores
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [courseSearchTerm, setCourseSearchTerm] = useState('');

    // Detalle Alumno
    const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editAvatarUrl, setEditAvatarUrl] = useState('');
    const [editRol, setEditRol] = useState('');
    const [editActivo, setEditActivo] = useState(true);
    const [studentGrades, setStudentGrades] = useState<any[]>([]);
    const [studentInscriptions, setStudentInscriptions] = useState<string[]>([]);
    const [studentPayments, setStudentPayments] = useState<Payment[]>([]);

    // Detalle Materia
    const [selectedCourse, setSelectedCourse] = useState<CourseAdminData | null>(null);

    // Formularios
    const [newGrade, setNewGrade] = useState({ courseId: '', title: '', score: '' });
    const [newPayment, setNewPayment] = useState({ amount: '', date: new Date().toISOString().split('T')[0], desc: '', method: 'Zelle' });
    const [newItem, setNewItem] = useState({ 
        courseId: '', title: '', date: '', time: '', content: '', type: 'pdf' as 'pdf' | 'video' | 'audio' | 'link'
    });
    
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // --- ESTADOS ASISTENCIA ---
    const [attCourse, setAttCourse] = useState('');
    const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
    const [attList, setAttList] = useState<any[]>([]);
    const [attLoading, setAttLoading] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        await Promise.all([
            fetchStudents(), 
            fetchCourses(), 
            fetchResources(), 
            fetchAnnouncements()
        ]);
        setLoading(false);
    };

    const fetchStudents = async () => {
        const { data } = await supabase.from('estudiantes').select('*').order('nombre');
        if (data) setStudents(data);
    };

    const fetchCourses = async () => {
        const { data } = await supabase.from('cursos').select('*').order('nombre');
        if (data) setAdminCourses(data);
    };

    const fetchResources = async () => {
        const { data } = await supabase.from('recursos').select('*').order('created_at', { ascending: false });
        if (data) setCourseResources(data.map((r: any) => ({
            id: r.id, courseId: r.course_id, title: r.titulo, url: r.url, type: r.tipo
        })));
    };

    const fetchAnnouncements = async () => {
        const { data } = await supabase.from('mensajes').select('*').order('fecha_envio', { ascending: false });
        if (data) setAllAnnouncements(data);
    };

    const handleSelectStudent = async (student: StudentData) => {
        setSelectedStudent(student);
        setEditName(student.nombre);
        setEditEmail(student.email || '');
        setEditPassword(student.password || '');
        setEditAvatarUrl(student.avatar_url || '');
        setEditRol(student.rol);
        setEditActivo(student.activo);
        const [{ data: g }, { data: i }, { data: p }] = await Promise.all([
            supabase.from('notas').select('*').eq('estudiante_id', student.id).order('id', { ascending: false }),
            supabase.from('inscripciones').select('curso_id').eq('estudiante_id', student.id),
            supabase.from('pagos').select('*').eq('student_id', student.id).order('date', { ascending: false })
        ]);
        setStudentGrades(g || []);
        setStudentInscriptions((i || []).map((ins: any) => ins.curso_id));
        setStudentPayments(p || []);
    };

    const handleUpdateCourse = async () => {
        if (!selectedCourse) return;
        setIsSaving(true);
        const { error } = await supabase.from('cursos').update({ 
            nombre: selectedCourse.nombre, profesor: selectedCourse.profesor, 
            creditos: selectedCourse.creditos, descripcion: selectedCourse.descripcion,
            contenido_detallado: selectedCourse.contenido_detallado, image_url: selectedCourse.image_url
        }).eq('id', selectedCourse.id);
        if (!error) { alert("Materia actualizada."); fetchCourses(); setSelectedCourse(null); }
        setIsSaving(false);
    };

    const handleUpdateProfile = async () => {
        if (!selectedStudent) return;
        setIsSaving(true);
        const { error } = await supabase.from('estudiantes').update({ 
            nombre: editName, email: editEmail, password: editPassword, 
            rol: editRol, activo: editActivo, avatar_url: editAvatarUrl
        }).eq('id', selectedStudent.id);
        if (!error) { alert("Perfil actualizado."); fetchStudents(); handleSelectStudent(selectedStudent); }
        setIsSaving(false);
    };

    const handleDownloadPDF = () => {
        if (!selectedStudent) return;
        const doc = new jsPDF();
        doc.addImage(SCHOOL_LOGO_URL, 'PNG', 15, 15, 25, 25);
        doc.setFontSize(20); doc.setTextColor(30, 58, 138); 
        doc.text("Latin Theological Seminary", 45, 25);
        doc.setFontSize(14); doc.text("Boletín Académico Oficial", 45, 33);
        const tableData = studentGrades.map(g => [adminCourses.find(c => g.curso_id === c.id)?.nombre || g.curso_id, g.titulo_asignacion, g.puntuacion.toString()]);
        autoTable(doc, { startY: 75, head: [['Materia', 'Actividad', 'Nota']], body: tableData, theme: 'striped', headStyles: { fillColor: [30, 58, 138] } });
        doc.save(`Boletin_${selectedStudent.nombre}.pdf`);
    };

    // --- LÓGICA ASISTENCIA (SYSTEM BLINDADO) ---
    const handleResetDailyAttendance = async () => {
        if (!attCourse) return alert("Selecciona la materia.");
        if (!confirm(`¿Reiniciar asistencia de hoy para esta materia?`)) return;
        setAttLoading(true);
        try {
            await supabase.from('asistencias').delete().eq('curso_id', attCourse).eq('fecha', attDate);
            alert("Asistencia reiniciada.");
            loadAttendanceList();
        } catch (e) { console.error(e); }
        finally { setAttLoading(false); }
    };

    const loadAttendanceList = async () => {
        if (!attCourse) return alert("Selecciona materia.");
        setAttLoading(true);
        try {
            const { data: inscritos } = await supabase.from('inscripciones').select('estudiante_id').eq('curso_id', attCourse);
            const ids = (inscritos || []).map(i => i.estudiante_id);
            const [{ data: profs }, { data: hist }] = await Promise.all([
                supabase.from('estudiantes').select('id, nombre, avatar_url, activo').in('id', ids),
                supabase.from('asistencias').select('*').eq('curso_id', attCourse).eq('fecha', attDate)
            ]);
            const mapped = (profs || []).filter(p => p.activo !== false).map(p => ({
                id: p.id, nombre: p.nombre, avatar: p.avatar_url,
                estado: hist?.find(h => h.estudiante_id === p.id)?.estado || 'ninguno'
            }));
            setAttList(mapped);
        } catch (e) { console.error(e); }
        finally { setAttLoading(false); }
    };

    const handleSetAttendanceSafe = async (studentId: string, status: 'presente' | 'ausente' | 'ninguno') => {
        if (savingId) return;
        setSavingId(studentId);
        setAttList(prev => prev.map(a => a.id === studentId ? { ...a, estado: status } : a));
        try {
            await supabase.from('asistencias').delete().eq('estudiante_id', studentId).eq('curso_id', attCourse).eq('fecha', attDate);
            if (status !== 'ninguno') {
                await supabase.from('asistencias').insert({ estudiante_id: studentId, curso_id: attCourse, fecha: attDate, estado: status });
            }
        } catch (err) { alert("Error de sincronización."); loadAttendanceList(); }
        finally { setSavingId(null); }
    };

    // --- FIX: Added missing handleDeleteItem function ---
    const handleDeleteItem = async (table: string, id: string) => {
        if (!confirm("¿Está seguro de eliminar este registro?")) return;
        setIsSaving(true);
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (!error) {
            alert("Registro eliminado.");
            if (table === 'recursos') fetchResources();
            if (table === 'estudiantes') fetchStudents();
            if (table === 'cursos') fetchCourses();
            if (table === 'mensajes') fetchAnnouncements();
        } else {
            alert(`Error: ${error.message}`);
        }
        setIsSaving(false);
    };

    if (loading) return <div className="p-20 text-center animate-pulse text-blue-600 font-black uppercase tracking-widest">Cargando Sistema Maestro...</div>;

    return (
        <div className="space-y-6 pb-20 max-w-[1600px] mx-auto px-4 animate-fade-in text-left">
            <h1 className="text-3xl font-black flex items-center text-gray-800 dark:text-white tracking-tighter uppercase">
                <AcademicCapIcon className="h-9 w-9 mr-4 text-blue-600"/>
                Gestión Centralizada LTS
            </h1>

            {/* BARRA DE NAVEGACIÓN ESTILO PREMIUM */}
            <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700/50 p-1.5 rounded-[2rem] overflow-x-auto shadow-inner border dark:border-gray-700">
                {[
                    { id: 'students', label: 'Estudiantes / Staff', icon: UserGroupIcon },
                    { id: 'courses', label: 'Materias', icon: BookOpenIcon },
                    { id: 'resources', label: 'Biblioteca', icon: LinkIcon },
                    { id: 'assignments', label: 'Tareas', icon: ClipboardListIcon },
                    { id: 'exams', label: 'Exámenes', icon: AcademicCapIcon },
                    { id: 'attendance', label: 'Asistencia', icon: CheckIcon },
                    { id: 'announcements', label: 'Anuncios', icon: MailIcon },
                ].map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => { setActiveTab(tab.id as any); setSelectedStudent(null); setSelectedCourse(null); }} 
                        className={`flex items-center px-6 py-3.5 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap tracking-widest ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-xl' : 'text-gray-500 hover:bg-white/50'}`}
                    >
                        <tab.icon className="w-4 h-4 mr-2"/> {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB: MATERIAS (REPLICANDO CAPTURA DE PANTALLA) */}
            {activeTab === 'courses' && !selectedCourse && (
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700 animate-fade-in">
                    <div className="p-8 border-b dark:border-gray-700 bg-gray-50/50">
                        <div className="relative max-w-xl group">
                            <input 
                                type="text" 
                                placeholder="Buscar materia por nombre o código ID..." 
                                value={courseSearchTerm} 
                                onChange={(e) => setCourseSearchTerm(e.target.value)} 
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-gray-700 shadow-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" 
                            />
                            <SearchIcon className="w-6 h-6 absolute left-4 top-4 text-gray-300 group-focus-within:text-blue-500 transition-colors"/>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-900 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                                    <th className="px-10 py-6">MATERIA</th>
                                    <th className="px-10 py-6 text-center">PROFESOR TITULAR</th>
                                    <th className="px-10 py-6 text-right">EDICIÓN</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {adminCourses.filter(c => c.nombre.toLowerCase().includes(courseSearchTerm.toLowerCase()) || c.id.toLowerCase().includes(courseSearchTerm.toLowerCase())).map(c => (
                                    <tr key={c.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-10 py-6">
                                            <p className="font-black text-gray-800 dark:text-white text-sm uppercase leading-tight">{c.nombre}</p>
                                            <p className="text-[10px] font-black text-blue-500 uppercase mt-1">CÓDIGO: {c.id}</p>
                                        </td>
                                        <td className="px-10 py-6 text-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                            {c.profesor}
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <button 
                                                onClick={() => setSelectedCourse(c)}
                                                className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-blue-700 transition-all active:scale-95 tracking-widest"
                                            >
                                                EDITAR FICHA ACADÉMICA
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: ASISTENCIA (SYSTEM BLINDADO CON PILL SWITCH) */}
            {activeTab === 'attendance' && (
                <div className="bg-white dark:bg-gray-800 p-10 rounded-[3.5rem] shadow-2xl border-t-8 border-green-500 space-y-10 animate-fade-in">
                    <div className="flex flex-col md:flex-row gap-6 items-end bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[3rem] border dark:border-gray-700 shadow-inner">
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Materia</label>
                            <select value={attCourse} onChange={e => setAttCourse(e.target.value)} className="w-full p-4 rounded-2xl border-none text-sm font-black uppercase shadow-lg focus:ring-2 focus:ring-green-500 outline-none dark:text-gray-800"><option value="">Selecciona cátedra...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                        </div>
                        <div className="w-full md:w-64 space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Fecha</label>
                            <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} className="w-full p-4 rounded-2xl border-none text-sm font-black shadow-lg outline-none dark:text-gray-800"/>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={loadAttendanceList} disabled={attLoading} className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-green-700 h-[56px] active:scale-95">Listar Grupo</button>
                            {attList.length > 0 && <button onClick={handleResetDailyAttendance} className="bg-red-50 text-red-600 border border-red-100 px-6 py-4 rounded-2xl hover:bg-red-600 hover:text-white transition-all h-[56px] shadow-sm"><TrashIcon className="w-5 h-5"/></button>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {attList.map(alumno => (
                            <div key={alumno.id} className={`flex flex-col p-6 rounded-[2.5rem] bg-gray-50 dark:bg-gray-700/30 border-2 transition-all shadow-sm ${savingId === alumno.id ? 'opacity-50 border-blue-300' : 'border-transparent hover:border-blue-100'}`}>
                                <div className="flex items-center mb-6">
                                    <img src={alumno.avatar} className="w-14 h-14 rounded-2xl mr-4 border-2 border-white shadow-md object-cover"/>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-xs font-black text-gray-800 dark:text-white truncate uppercase tracking-tighter">{alumno.nombre}</p>
                                        <div className="flex items-center mt-1">
                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${alumno.estado === 'presente' ? 'bg-green-100 text-green-700' : alumno.estado === 'ausente' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-500'}`}>{alumno.estado}</span>
                                            {savingId === alumno.id && <div className="ml-2 w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-inner border dark:border-gray-700 gap-1">
                                    <button onClick={() => handleSetAttendanceSafe(alumno.id, 'presente')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${alumno.estado === 'presente' ? 'bg-green-500 text-white shadow-md scale-[1.02]' : 'text-gray-400 hover:bg-gray-50'}`}>Presente</button>
                                    <button onClick={() => handleSetAttendanceSafe(alumno.id, 'ausente')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${alumno.estado === 'ausente' ? 'bg-red-500 text-white shadow-md scale-[1.02]' : 'text-gray-400 hover:bg-gray-50'}`}>Ausente</button>
                                    <button onClick={() => handleSetAttendanceSafe(alumno.id, 'ninguno')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${alumno.estado === 'ninguno' ? 'bg-gray-400 text-white shadow-md' : 'text-gray-300 hover:bg-gray-100'}`}>Limpiar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* EDITOR MATERIA (MODAL INTERNO) */}
            {selectedCourse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border-t-8 border-blue-600 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                            <div>
                                <h3 className="font-black text-xl text-gray-900 dark:text-white uppercase tracking-tighter">Editor Académico</h3>
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{selectedCourse.nombre}</p>
                            </div>
                            <button onClick={() => setSelectedCourse(null)} className="p-2 bg-white rounded-full shadow hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"><XIcon className="w-6 h-6"/></button>
                        </div>
                        <div className="p-8 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre</label><input value={selectedCourse.nombre} onChange={e => setSelectedCourse({...selectedCourse, nombre: e.target.value})} className="w-full p-4 bg-gray-50 rounded-xl font-bold border-none shadow-inner dark:text-gray-800"/></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Titular</label><input value={selectedCourse.profesor} onChange={e => setSelectedCourse({...selectedCourse, profesor: e.target.value})} className="w-full p-4 bg-gray-50 rounded-xl font-bold border-none shadow-inner dark:text-gray-800"/></div>
                            </div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción Breve</label><textarea rows={3} value={selectedCourse.descripcion} onChange={e => setSelectedCourse({...selectedCourse, descripcion: e.target.value})} className="w-full p-4 bg-gray-50 rounded-xl font-medium border-none shadow-inner dark:text-gray-800"></textarea></div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contenido Académico Detallado</label><textarea rows={8} value={selectedCourse.contenido_detallado} onChange={e => setSelectedCourse({...selectedCourse, contenido_detallado: e.target.value})} className="w-full p-4 bg-gray-50 rounded-xl font-medium text-xs border-none shadow-inner dark:text-gray-800"></textarea></div>
                        </div>
                        <div className="p-8 border-t dark:border-gray-700">
                            <button onClick={handleUpdateCourse} disabled={isSaving} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-[11px] uppercase shadow-2xl hover:bg-blue-700 flex items-center justify-center transition-all active:scale-95">
                                {isSaving ? 'Guardando...' : 'Aplicar Cambios Académicos'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: ESTUDIANTES */}
            {activeTab === 'students' && !selectedStudent && (
                 <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700 animate-fade-in">
                    <div className="p-8 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50">
                        <div className="relative w-full max-w-lg group">
                            <input type="text" placeholder="Buscar por nombre..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-gray-700 shadow-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
                            <SearchIcon className="w-6 h-6 absolute left-4 top-4 text-blue-500 group-focus-within:text-blue-600 transition-colors"/>
                        </div>
                        {isAdmin && <button onClick={() => alert("Función Crear Miembro activada")} className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-green-700 tracking-widest active:scale-95 flex items-center"><PlusIcon className="w-5 h-5 mr-2"/> Registrar Nuevo Miembro</button>}
                    </div>
                    <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-gray-100 dark:bg-gray-900 text-[10px] uppercase text-gray-400 font-black tracking-widest"><th className="px-10 py-6">Identidad</th><th className="px-10 py-6">Rol</th><th className="px-10 py-6">Estado</th><th className="px-10 py-6 text-right">Acción</th></tr></thead><tbody className="divide-y dark:divide-gray-700">{students.filter(s => s.nombre.toLowerCase().includes(studentSearchTerm.toLowerCase())).map(s => (<tr key={s.id} className="hover:bg-blue-50/30 transition-colors group"><td className="px-10 py-6 flex items-center font-black text-sm text-gray-800 dark:text-gray-200"><img src={s.avatar_url} className="w-12 h-12 rounded-2xl mr-5 shadow-md border-2 border-white object-cover"/>{s.nombre}</td><td className="px-10 py-6 text-[10px] text-blue-500 font-black uppercase tracking-widest">{s.rol}</td><td className="px-10 py-6"><span className={`inline-flex items-center px-4 py-1 rounded-full text-[9px] font-black uppercase ${s.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.activo ? 'Activo' : 'Inactivo'}</span></td><td className="px-10 py-6 text-right"><button onClick={() => handleSelectStudent(s)} className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 tracking-widest shadow-lg transition-all active:scale-95">Gestionar Ficha</button></td></tr>))}</tbody></table></div>
                </div>
            )}

            {/* TAB: BIBLIOTECA (RECURSOS) */}
            {activeTab === 'resources' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-blue-500 h-fit space-y-8">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-white uppercase text-sm tracking-widest"><PlusIcon className="w-6 h-6 mr-3 text-blue-600"/> Publicar Nuevo Material</h3>
                        <div className="space-y-4">
                            <select value={newItem.courseId} onChange={e => setNewItem({...newItem, courseId: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl font-black text-sm border-none shadow-inner dark:text-gray-800"><option value="">Materia de destino...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                            <input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="Título del Material" className="w-full p-4 bg-gray-50 rounded-2xl font-black text-sm border-none shadow-inner dark:text-gray-800"/>
                            <div className="flex bg-gray-100 p-2 rounded-2xl gap-2">
                                {['pdf', 'video', 'audio', 'link'].map(t => (
                                    <button key={t} onClick={() => setNewItem({...newItem, type: t as any})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${newItem.type === t ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400'}`}>{t}</button>
                                ))}
                            </div>
                            <button className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black text-[11px] uppercase shadow-2xl flex items-center justify-center transition-all active:scale-95"><SendIcon className="w-5 h-5 mr-3"/> Publicar Material</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl overflow-hidden h-[750px] flex flex-col border dark:border-gray-700">
                        <div className="p-8 bg-gray-100 dark:bg-gray-900 border-b font-black text-[11px] uppercase text-gray-400 tracking-widest flex justify-between items-center">Biblioteca Académica <span className="text-blue-500">{courseResources.length} ITEMS</span></div>
                        <div className="flex-1 overflow-y-auto divide-y dark:divide-gray-700">
                            {courseResources.map(res => (
                                <div key={res.id} className="p-6 hover:bg-gray-50 transition-all flex justify-between items-center group">
                                    <div className="flex items-center text-left">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl mr-4">{res.type === 'video' ? <VideoIcon className="w-5 h-5"/> : <DocumentTextIcon className="w-5 h-5"/>}</div>
                                        <div><p className="text-sm font-black text-gray-800 truncate w-64 uppercase">{res.title}</p><p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">{adminCourses.find(c => c.id === res.courseId)?.nombre || res.courseId}</p></div>
                                    </div>
                                    <button onClick={() => handleDeleteItem('recursos', res.id)} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><TrashIcon className="w-5 h-5"/></button>
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
