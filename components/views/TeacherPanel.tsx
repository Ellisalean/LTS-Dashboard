
import React, { useState, useEffect } from 'react';
import { supabase } from '../../application/supabase.ts';
import { PencilIcon, UserGroupIcon, PlusIcon, TrashIcon, ClipboardListIcon, AcademicCapIcon, CalendarIcon, CheckIcon, DownloadIcon, MailIcon, BookOpenIcon, HomeIcon, ChatIcon, SearchIcon, CurrencyDollarIcon, CreditCardIcon, XIcon, CheckCircleIcon, ChevronLeftIcon, VideoIcon, MusicIcon, DocumentTextIcon, LinkIcon } from '../Icons.tsx';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import { User, Payment, Resource } from '../../types.ts';
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

const getImageData = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) { ctx.drawImage(img, 0, 0); resolve(canvas.toDataURL('image/png')); }
            else reject(new Error('Canvas context error'));
        };
        img.onerror = () => reject(new Error('Image load error'));
    });
};

const TeacherPanel: React.FC<{ user: User }> = ({ user }) => {
    const isSuperAdmin = user.role === 'admin';
    const isTeacher = user.role === 'profesor';

    const [activeTab, setActiveTab] = useState<'students' | 'assignments' | 'exams' | 'attendance' | 'announcements' | 'courses' | 'resources'>('students');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [students, setStudents] = useState<StudentData[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [adminCourses, setAdminCourses] = useState<CourseAdminData[]>([]);
    const [editingCourse, setEditingCourse] = useState<CourseAdminData | null>(null);

    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [studentGrades, setStudentGrades] = useState<GradeData[]>([]);
    const [studentInscriptions, setStudentInscriptions] = useState<string[]>([]);
    const [studentPayments, setStudentPayments] = useState<Payment[]>([]);

    // Recursos
    const [courseResources, setCourseResources] = useState<Resource[]>([]);
    const [newResCourse, setNewResCourse] = useState('');
    const [newResTitle, setNewResTitle] = useState('');
    const [newResUrl, setNewResUrl] = useState('');
    const [newResType, setNewResType] = useState<'pdf' | 'video' | 'audio' | 'link'>('pdf');

    // Notas
    const [newGradeCourse, setNewGradeCourse] = useState('');
    const [newGradeTitle, setNewGradeTitle] = useState('Nota Final');
    const [newGradeScore, setNewGradeScore] = useState(0);

    // Pagos
    const [newPayAmount, setNewPayAmount] = useState(0);
    const [newPayDesc, setNewPayDesc] = useState('');
    const [newPayMethod, setNewPayMethod] = useState('Zelle');

    // Tareas, Exámenes, Anuncios
    const [newAssignCourse, setNewAssignCourse] = useState('');
    const [newAssignTitle, setNewAssignTitle] = useState('');
    const [newAssignDate, setNewAssignDate] = useState('');
    const [newExamCourse, setNewExamCourse] = useState('');
    const [newExamTitle, setNewExamTitle] = useState('');
    const [newExamDate, setNewExamDate] = useState('');
    const [newAnnounceMsg, setNewAnnounceMsg] = useState('');

    const [assignments, setAssignments] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    
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

    const handleSelectStudent = async (student: StudentData) => {
        setSelectedStudent(student);
        setEditName(student.nombre);
        setEditEmail(student.email || '');
        setEditPassword(student.password || '');
        const { data: grades } = await supabase.from('notas').select('*').eq('estudiante_id', student.id);
        setStudentGrades(grades || []);
        const { data: insc } = await supabase.from('inscripciones').select('curso_id').eq('estudiante_id', student.id);
        setStudentInscriptions((insc || []).map(i => i.curso_id));
        fetchStudentPayments(student.id);
    };

    const fetchStudentPayments = async (studentId: string) => {
        const { data } = await supabase.from('pagos').select('*').eq('student_id', studentId).order('date', { ascending: false });
        setStudentPayments(data || []);
    };

    const handleAddPayment = async () => {
        if (!selectedStudent || newPayAmount <= 0) return;
        const { error } = await supabase.from('pagos').insert({
            student_id: selectedStudent.id, amount: newPayAmount, description: newPayDesc || 'Mensualidad', method: newPayMethod, date: new Date().toISOString().split('T')[0], verified: true, type: 'tuition'
        });
        if (!error) { fetchStudentPayments(selectedStudent.id); setNewPayAmount(0); setNewPayDesc(''); }
    };

    const handleDeletePayment = async (id: string) => {
        if (!confirm('¿Eliminar este registro de pago?')) return;
        await supabase.from('pagos').delete().eq('id', id);
        if (selectedStudent) fetchStudentPayments(selectedStudent.id);
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

    const handleDownloadReport = async (onlyAproved: boolean = false) => {
        if (!selectedStudent) return;
        try {
            const JsPDFClass = (jsPDF as any).jsPDF || jsPDF;
            const doc = new JsPDFClass();
            const autoTableFunc = (autoTable as any).default || autoTable;
            let logoBase64 = null;
            try { logoBase64 = await getImageData(LOGO_URL); } catch (e) { console.warn("Logo no cargado en PDF"); }
            if (logoBase64) doc.addImage(logoBase64, 'PNG', 14, 10, 20, 20);
            doc.setFontSize(22); doc.setTextColor(23, 37, 84);
            doc.text("Latin Theological Seminary", logoBase64 ? 40 : 14, 22);
            doc.setFontSize(10); doc.setTextColor(100);
            doc.text(onlyAproved ? "CERTIFICADO ACADÉMICO (MATERIAS APROBADAS)" : "BOLETÍN INFORMATIVO DE NOTAS", logoBase64 ? 40 : 14, 28);
            doc.setFontSize(11); doc.setTextColor(50);
            doc.text(`Estudiante: ${selectedStudent.nombre}`, 14, 45);
            doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 14, 51);
            let filteredGrades = studentGrades;
            if (onlyAproved) filteredGrades = studentGrades.filter(g => (g.titulo_asignacion || '').toLowerCase().includes('final') && g.puntuacion >= 70);
            const tableData = filteredGrades.map(g => [adminCourses.find(c => c.id === g.curso_id)?.nombre || g.curso_id, g.titulo_asignacion, `${g.puntuacion} pts`]);
            autoTableFunc(doc, { startY: 60, head: [['Materia', 'Evaluación', 'Nota']], body: tableData, headStyles: { fillColor: [23, 37, 84] }, alternateRowStyles: { fillColor: [245, 247, 250] } });
            doc.save(`${onlyAproved ? 'Certificado' : 'Boletin'}_${selectedStudent.nombre.replace(/ /g, '_')}.pdf`);
        } catch (e) { alert("Error al generar PDF"); }
    };

    const handleUpdateStudent = async () => {
        if (!selectedStudent) return;
        setIsSaving(true);
        await supabase.from('estudiantes').update({ nombre: editName, email: editEmail, password: editPassword }).eq('id', selectedStudent.id);
        setIsSaving(false); alert("Perfil de alumno actualizado.");
    };

    const handleAddGrade = async () => {
        if (!selectedStudent || !newGradeCourse) return;
        const { error } = await supabase.from('notas').insert({ estudiante_id: selectedStudent.id, curso_id: newGradeCourse, titulo_asignacion: newGradeTitle, puntuacion: newGradeScore, puntuacion_maxima: 100 });
        if (!error) { const { data } = await supabase.from('notas').select('*').eq('estudiante_id', selectedStudent.id); setStudentGrades(data || []); setNewGradeScore(0); }
    };

    const handleDeleteGrade = async (id: string) => {
        if (!confirm('¿Seguro que deseas eliminar esta nota?')) return;
        await supabase.from('notas').delete().eq('id', id);
        if (selectedStudent) { const { data } = await supabase.from('notas').select('*').eq('estudiante_id', selectedStudent.id); setStudentGrades(data || []); }
    };

    const handleUpdateCourse = async () => {
        if (!editingCourse) return;
        setIsSaving(true);
        const { error } = await supabase.from('cursos').update({ descripcion: editingCourse.descripcion, contenido_detallado: editingCourse.contenido_detallado, profesor: editingCourse.profesor, creditos: editingCourse.creditos, image_url: editingCourse.image_url }).eq('id', editingCourse.id);
        setIsSaving(false); if (!error) { setEditingCourse(null); fetchCourses(); alert('Materia actualizada.'); }
    };

    const handleDeleteCourse = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta materia permanentemente?')) return;
        const { error } = await supabase.from('cursos').delete().eq('id', id);
        if (error) alert("No se puede eliminar: existen alumnos o notas asociados a esta materia.");
        else fetchCourses();
    };

    // --- PESTAÑAS SECUNDARIAS ---
    useEffect(() => {
        if (activeTab === 'assignments') fetchAssignments();
        if (activeTab === 'exams') fetchExams();
        if (activeTab === 'announcements') fetchAnnouncements();
        if (activeTab === 'resources') fetchResources();
    }, [activeTab]);

    const fetchResources = async () => {
        const { data } = await supabase.from('recursos').select('*').order('created_at', { ascending: false });
        if (data) setCourseResources(data.map((r: any) => ({
            id: r.id, courseId: r.course_id, title: r.titulo, url: r.url, type: r.tipo, createdAt: r.created_at
        })));
    };

    const handleAddResource = async () => {
        if (!newResCourse || !newResTitle || !newResUrl) return;
        const { error } = await supabase.from('recursos').insert({
            course_id: newResCourse, titulo: newResTitle, url: newResUrl, tipo: newResType
        });
        if (!error) { fetchResources(); setNewResTitle(''); setNewResUrl(''); }
    };

    const handleDeleteResource = async (id: string) => {
        if (!confirm('¿Eliminar este material?')) return;
        await supabase.from('recursos').delete().eq('id', id);
        fetchResources();
    };

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

    const loadAttendance = async () => {
        if (!attendanceCourse) return;
        const { data } = await supabase.from('asistencias').select('*').eq('curso_id', attendanceCourse).eq('fecha', attendanceDate);
        const map: any = {}; data?.forEach(r => map[r.estudiante_id] = r.estado);
        setAttendanceMap(map);
    };
    const markAttendance = async (studentId: string, status: string) => {
        setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
        const { data: exist } = await supabase.from('asistencias').select('id').eq('estudiante_id', studentId).eq('curso_id', attendanceCourse).eq('fecha', attendanceDate).single();
        if (exist) await supabase.from('asistencias').update({ estado: status }).eq('id', exist.id);
        else await supabase.from('asistencias').insert({ estudiante_id: studentId, curso_id: attendanceCourse, fecha: attendanceDate, estado: status });
    };

    if (loading) return <div className="p-10 text-center flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Iniciando Herramientas LTS...</p>
    </div>;

    return (
        <div className="space-y-6 pb-20 max-w-[1600px] mx-auto px-4">
            <h1 className="text-3xl font-black flex items-center text-gray-800 dark:text-white tracking-tighter">
                <UserGroupIcon className="h-9 w-9 mr-4 text-blue-600"/>
                Gestión Administrativa
            </h1>
            
            <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700/50 p-1.5 rounded-3xl overflow-x-auto shadow-inner border border-gray-100 dark:border-gray-700">
                {[
                    { id: 'students', label: 'Alumnos', icon: UserGroupIcon },
                    { id: 'courses', label: 'Materias', icon: BookOpenIcon },
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

            {/* VISTA ALUMNOS (LISTA) */}
            {activeTab === 'students' && !selectedStudent && (
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in">
                    <div className="p-6 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                        <div className="relative w-full max-w-lg">
                            <input 
                                type="text" 
                                placeholder="Buscar alumno por nombre..." 
                                value={studentSearchTerm} 
                                onChange={(e) => setStudentSearchTerm(e.target.value)} 
                                className="w-full pl-12 pr-4 py-4 rounded-2xl border-none bg-white dark:bg-gray-700 shadow-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all" 
                            />
                            <SearchIcon className="w-6 h-6 absolute left-4 top-3.5 text-blue-500"/>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead><tr className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase text-gray-400 font-black tracking-widest"><th className="px-8 py-5">Nombre del Alumno</th><th className="px-8 py-5">Rol</th><th className="px-8 py-5 text-right"></th></tr></thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {students.filter(s => s.nombre.toLowerCase().includes(studentSearchTerm.toLowerCase())).map(s => (
                                    <tr key={s.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-8 py-5 flex items-center font-bold text-sm text-gray-800 dark:text-gray-200">
                                            <img src={s.avatar_url} className="w-12 h-12 rounded-2xl mr-5 shadow-md border-2 border-white"/>
                                            {s.nombre}
                                        </td>
                                        <td className="px-8 py-5 text-xs text-blue-500 font-black uppercase">{s.rol}</td>
                                        <td className="px-8 py-5 text-right">
                                            <button onClick={() => handleSelectStudent(s)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 shadow-xl transition-all tracking-widest">Gestionar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* GESTIÓN RECURSOS (NUEVO) */}
            {activeTab === 'resources' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-indigo-500 h-fit space-y-6">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-gray-200 uppercase text-xs tracking-widest"><PlusIcon className="w-6 h-6 mr-3 text-indigo-600"/>Nuevo Material de Clase</h3>
                        <div className="space-y-4">
                            <select value={newResCourse} onChange={e => setNewResCourse(e.target.value)} className="w-full p-4 text-xs border border-gray-100 dark:border-gray-700 rounded-2xl dark:bg-gray-700 font-black uppercase shadow-sm"><option value="">Seleccionar Materia...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                            <input type="text" value={newResTitle} onChange={e => setNewResTitle(e.target.value)} placeholder="Título del Material (Ej: Clase 1: Historia)" className="w-full p-4 text-xs border border-gray-100 rounded-2xl dark:bg-gray-700 font-bold"/>
                            <input type="text" value={newResUrl} onChange={e => setNewResUrl(e.target.value)} placeholder="Enlace (Link de Drive, YouTube, etc.)" className="w-full p-4 text-xs border border-gray-100 rounded-2xl dark:bg-gray-700 font-bold"/>
                            <div className="grid grid-cols-4 gap-2">
                                {(['pdf', 'video', 'audio', 'link'] as const).map(type => (
                                    <button key={type} onClick={() => setNewResType(type)} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newResType === type ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{type}</button>
                                ))}
                            </div>
                            <button onClick={handleAddResource} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase shadow-2xl hover:bg-indigo-700 tracking-widest transition-all">Subir Material</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700">
                        <div className="p-6 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 font-black text-[10px] uppercase tracking-widest text-gray-400">Materiales Publicados</div>
                        <div className="divide-y dark:divide-gray-700 overflow-y-auto max-h-[600px]">
                            {courseResources.map(res => (
                                <div key={res.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-all">
                                    <div className="flex items-center">
                                        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl mr-4">
                                            {res.type === 'video' ? <VideoIcon className="w-5 h-5 text-red-500" /> : res.type === 'pdf' ? <DocumentTextIcon className="w-5 h-5 text-blue-500" /> : res.type === 'audio' ? <MusicIcon className="w-5 h-5 text-purple-500" /> : <LinkIcon className="w-5 h-5 text-gray-500" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 dark:text-white">{res.title}</p>
                                            <p className="text-[10px] text-indigo-500 font-black uppercase">{(adminCourses.find(c => c.id === res.courseId)?.nombre || res.courseId)}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteResource(res.id)} className="text-gray-300 hover:text-red-500 transition-all p-2"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* GESTIÓN ALUMNO ESPECÍFICO */}
            {activeTab === 'students' && selectedStudent && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <button onClick={() => setSelectedStudent(null)} className="text-blue-600 font-black flex items-center text-xs uppercase tracking-widest hover:underline">
                            <ChevronLeftIcon className="w-6 h-6 mr-1" /> Lista de Alumnos
                        </button>
                        <div className="flex gap-3">
                             <button onClick={() => handleDownloadReport(false)} className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-600 shadow-md hover:bg-gray-50 transition-all">
                                <DownloadIcon className="w-4 h-4 mr-2 text-blue-500"/> Boletín
                             </button>
                             <button onClick={() => handleDownloadReport(true)} className="bg-blue-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all">
                                <CheckCircleIcon className="w-4 h-4 mr-2"/> Certificado
                             </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border-t-8 border-blue-500">
                            <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-6">Información Básica</h3>
                            <div className="flex flex-col items-center mb-8">
                                <img src={selectedStudent.avatar_url} className="w-28 h-28 rounded-3xl border-4 border-white shadow-2xl mb-4 object-cover"/>
                                <p className="font-black text-xl text-gray-800 dark:text-white text-center leading-tight">{selectedStudent.nombre}</p>
                            </div>
                            <div className="space-y-4">
                                <div><label className="text-[10px] font-black text-gray-400 block mb-2 uppercase">Email</label><input type="text" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full p-4 text-xs border border-gray-100 dark:border-gray-700 rounded-2xl dark:bg-gray-700 font-bold"/></div>
                                <div><label className="text-[10px] font-black text-gray-400 block mb-2 uppercase">Contraseña</label><input type="text" value={editPassword} onChange={e => setEditPassword(e.target.value)} className="w-full p-4 text-xs border border-gray-100 dark:border-gray-700 rounded-2xl dark:bg-gray-700 font-bold"/></div>
                                <button onClick={handleUpdateStudent} disabled={isSaving} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black shadow-xl transition-all">Actualizar Perfil</button>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border-t-8 border-green-500 h-[600px] flex flex-col">
                            <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-2">Trimestre Actual</h3>
                            <p className="text-[10px] text-gray-400 italic mb-6">Activa materias para cursado.</p>
                            <div className="space-y-3 overflow-y-auto pr-2 flex-1">
                                {adminCourses.map(c => {
                                    const isInscribed = studentInscriptions.includes(c.id);
                                    return (
                                        <div key={c.id} onClick={() => toggleInscription(c.id)} className={`p-5 rounded-3xl border-2 cursor-pointer transition-all flex items-center justify-between group ${isInscribed ? 'bg-blue-50 border-blue-400 dark:bg-blue-900/30' : 'bg-gray-50 border-transparent dark:bg-gray-700/50 hover:bg-gray-100'}`}>
                                            <div className="flex-1">
                                                <p className="text-xs font-black text-gray-800 dark:text-white truncate max-w-[120px]">{c.nombre}</p>
                                                <p className="text-[10px] text-gray-400 font-bold">Prof: {c.profesor}</p>
                                            </div>
                                            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-all ${isInscribed ? 'bg-blue-500 text-white shadow-lg' : 'bg-gray-200 text-gray-400 group-hover:scale-110'}`}>{isInscribed ? <CheckIcon className="w-6 h-6"/> : <PlusIcon className="w-5 h-5"/>}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border-t-8 border-amber-500 h-[600px] flex flex-col">
                            <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-6">Registro de Notas</h3>
                            <div className="space-y-4 mb-6 bg-amber-50/50 dark:bg-gray-900/30 p-5 rounded-3xl border-2 border-dashed border-amber-200">
                                <select value={newGradeCourse} onChange={e => setNewGradeCourse(e.target.value)} className="w-full p-3.5 text-xs border border-gray-200 dark:border-gray-700 rounded-2xl dark:bg-gray-700 font-black uppercase tracking-tighter shadow-sm"><option value="">Materia...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                                <input type="text" value={newGradeTitle} onChange={e => setNewGradeTitle(e.target.value)} className="w-full p-3.5 text-xs border border-gray-200 dark:border-gray-700 rounded-2xl dark:bg-gray-700 font-bold" placeholder="Título (Ej: Examen Final)"/>
                                <div className="flex gap-2"><input type="number" value={newGradeScore} onChange={e => setNewGradeScore(Number(e.target.value))} className="w-24 p-3.5 text-xs border border-gray-200 rounded-2xl dark:bg-gray-700 font-black text-center" placeholder="Pts"/><button onClick={handleAddGrade} className="flex-1 bg-amber-500 text-white font-black rounded-2xl text-[10px] uppercase shadow-lg hover:bg-amber-600 tracking-widest transition-all">Subir Nota</button></div>
                            </div>
                            <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                                {studentGrades.map(g => (
                                    <div key={g.id} className="p-4 rounded-3xl border border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 shadow-sm group">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] font-black text-blue-500 uppercase truncate">{(adminCourses.find(c => c.id === g.curso_id)?.nombre || g.curso_id)}</p>
                                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{g.titulo_asignacion}</p>
                                        </div>
                                        <div className="flex items-center gap-3 ml-4">
                                            <span className={`text-xs font-black px-3 py-1.5 rounded-xl shadow-sm ${g.puntuacion >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{g.puntuacion}</span>
                                            <button onClick={() => handleDeleteGrade(g.id)} className="text-gray-300 hover:text-red-500 transition-all p-2 group-hover:bg-red-50 rounded-xl"><TrashIcon className="w-5 h-5"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border-t-8 border-indigo-500 h-[600px] flex flex-col">
                            <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest mb-6">Historial Financiero</h3>
                            <div className="space-y-4 mb-6 bg-indigo-50/50 dark:bg-gray-900/30 p-5 rounded-3xl border-2 border-dashed border-indigo-200">
                                <input type="number" value={newPayAmount} onChange={e => setNewPayAmount(Number(e.target.value))} className="w-full p-3.5 text-xs border border-gray-200 dark:border-gray-700 rounded-2xl dark:bg-gray-700 font-black text-center" placeholder="Monto $"/>
                                <input type="text" value={newPayDesc} onChange={e => setNewPayDesc(e.target.value)} className="w-full p-3.5 text-xs border border-gray-200 dark:border-gray-700 rounded-2xl dark:bg-gray-700 font-bold" placeholder="Concepto (Ej: Octubre)"/>
                                <select value={newPayMethod} onChange={e => setNewPayMethod(e.target.value)} className="w-full p-3.5 text-xs border border-gray-200 dark:border-gray-700 rounded-2xl dark:bg-gray-700 font-black uppercase tracking-tighter shadow-sm"><option value="Zelle">Zelle</option><option value="Efectivo">Efectivo</option><option value="Pago Móvil">Pago Móvil</option></select>
                                <button onClick={handleAddPayment} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase shadow-lg hover:bg-indigo-700 tracking-widest transition-all">Registrar Pago</button>
                            </div>
                            <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                                {studentPayments.map(p => (
                                    <div key={p.id} className="p-4 rounded-3xl border border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 shadow-sm group">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-indigo-500 uppercase">{new Date(p.date).toLocaleDateString()}</p>
                                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{p.description}</p>
                                        </div>
                                        <div className="flex items-center gap-3 ml-4"><span className="text-xs font-black px-3 py-1.5 rounded-xl bg-green-100 text-green-700 shadow-sm">${p.amount}</span><button onClick={() => handleDeletePayment(p.id)} className="text-gray-300 hover:text-red-500 transition-all p-2 group-hover:bg-red-50 rounded-xl"><TrashIcon className="w-5 h-5"/></button></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VISTAS DE TAREAS, EXAMENES, ASISTENCIA, ANUNCIOS, CURSOS (MANTENIDO IGUAL) */}
            {activeTab === 'courses' && (
                <div className="space-y-6 animate-fade-in">
                    {editingCourse ? (
                        <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-blue-500 space-y-8 animate-scale-in">
                            <h3 className="font-black text-2xl flex items-center tracking-tighter"><PencilIcon className="w-8 h-8 mr-4 text-blue-600"/>Edición: {editingCourse.nombre}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="md:col-span-2"><label className="text-[10px] font-black text-blue-600 block mb-3 uppercase tracking-widest">Enlace Miniatura (URL de Supabase)</label><input type="text" value={editingCourse.image_url || ''} onChange={e => setEditingCourse({...editingCourse, image_url: e.target.value})} className="w-full p-4 border border-gray-100 rounded-2xl dark:bg-gray-700 shadow-inner font-bold" />{editingCourse.image_url && <div className="mt-6 h-40 w-72 overflow-hidden rounded-3xl shadow-2xl border-4 border-white"><img src={editingCourse.image_url} className="w-full h-full object-cover" alt="Preview"/></div>}</div>
                                <div><label className="text-[10px] font-black text-gray-400 block mb-2 uppercase">Profesor</label><input type="text" value={editingCourse.profesor || ''} onChange={e => setEditingCourse({...editingCourse, profesor: e.target.value})} className="w-full p-4 border border-gray-100 rounded-2xl dark:bg-gray-700 font-bold"/></div>
                                <div><label className="text-[10px] font-black text-gray-400 block mb-2 uppercase">Créditos</label><input type="number" value={editingCourse.creditos || 0} onChange={e => setEditingCourse({...editingCourse, creditos: Number(e.target.value)})} className="w-full p-4 border border-gray-100 rounded-2xl dark:bg-gray-700 font-bold"/></div>
                                <div className="md:col-span-2"><label className="text-[10px] font-black text-gray-400 block mb-2 uppercase">Descripción</label><input type="text" value={editingCourse.descripcion || ''} onChange={e => setEditingCourse({...editingCourse, descripcion: e.target.value})} className="w-full p-4 border border-gray-100 rounded-2xl dark:bg-gray-700 font-bold"/></div>
                            </div>
                            <div className="flex justify-end gap-4 pt-6"><button onClick={() => setEditingCourse(null)} className="px-8 py-4 text-xs font-black uppercase tracking-widest bg-gray-100 dark:bg-gray-700 rounded-2xl hover:bg-gray-200 transition-all">Cancelar</button><button onClick={handleUpdateCourse} className="px-10 py-4 text-xs bg-blue-600 text-white font-black rounded-2xl shadow-2xl hover:bg-blue-700 transition-all uppercase tracking-widest">Guardar Cambios</button></div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700"><table className="w-full text-left"><thead className="bg-gray-50 dark:bg-gray-900 text-[10px] font-black uppercase text-gray-400 tracking-widest"><tr><th className="px-8 py-6">Materia</th><th className="px-8 py-6">Profesor</th><th className="px-8 py-6 text-right"></th></tr></thead><tbody className="divide-y dark:divide-gray-700">{adminCourses.map(c => (<tr key={c.id} className="hover:bg-blue-50/20 dark:hover:bg-gray-700/20 transition-all"><td className="px-8 py-6 font-black text-sm text-gray-800 dark:text-gray-200">{c.nombre}</td><td className="px-8 py-6 text-xs text-gray-400 font-black uppercase tracking-tighter">{c.profesor}</td><td className="px-8 py-6 text-right flex justify-end gap-3"><button onClick={() => setEditingCourse(c)} className="text-blue-600 font-black uppercase text-[10px] hover:bg-blue-50 px-4 py-2 rounded-xl transition-all tracking-widest">Editar</button><button onClick={() => handleDeleteCourse(c.id)} className="text-red-300 hover:text-red-600 p-2 transition-all"><TrashIcon className="w-5 h-5"/></button></td></tr>))}</tbody></table></div>
                    )}
                </div>
            )}

            {activeTab === 'assignments' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-blue-500 h-fit space-y-6">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-gray-200 uppercase text-xs tracking-widest"><PlusIcon className="w-6 h-6 mr-3 text-blue-600"/>Nueva Tarea</h3>
                        <div className="space-y-4">
                            <select value={newAssignCourse} onChange={e => setNewAssignCourse(e.target.value)} className="w-full p-4 text-xs border border-gray-100 dark:border-gray-700 rounded-2xl dark:bg-gray-700 font-black uppercase shadow-sm"><option value="">Seleccionar Materia...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                            <input type="text" value={newAssignTitle} onChange={e => setNewAssignTitle(e.target.value)} placeholder="Nombre de la tarea" className="w-full p-4 text-xs border border-gray-100 rounded-2xl dark:bg-gray-700 font-bold"/><input type="date" value={newAssignDate} onChange={e => setNewAssignDate(e.target.value)} className="w-full p-4 text-xs border border-gray-100 rounded-2xl dark:bg-gray-700 font-bold"/><button onClick={handleAddAssignment} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase shadow-2xl hover:bg-blue-700 tracking-widest transition-all">Publicar Tarea</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900 text-[10px] font-black uppercase text-gray-400 tracking-widest"><tr><th className="px-8 py-5 text-left">Tarea</th><th className="px-8 py-5">Vence</th><th className="px-8 py-5"></th></tr></thead><tbody className="divide-y dark:divide-gray-700">{assignments.map(a => (<tr key={a.id} className="text-xs hover:bg-gray-50 transition-all"><td className="px-8 py-5 font-black text-gray-700 dark:text-gray-200">{a.titulo}</td><td className="px-8 py-5 text-gray-400 font-bold">{a.fecha_entrega || 'N/A'}</td><td className="px-8 py-5 text-right"><button onClick={async () => { if(confirm('¿Eliminar tarea?')) { await supabase.from('asignaciones').delete().eq('id', a.id); fetchAssignments(); } }} className="text-red-300 hover:text-red-600 p-2 transition-all"><TrashIcon className="w-5 h-5"/></button></td></tr>))}</tbody></table></div>
                </div>
            )}

            {activeTab === 'exams' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-red-500 h-fit space-y-6">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-gray-200 uppercase text-xs tracking-widest"><AcademicCapIcon className="w-6 h-6 mr-3 text-red-600"/>Programar Examen</h3>
                        <div className="space-y-4">
                            <select value={newExamCourse} onChange={e => setNewExamCourse(e.target.value)} className="w-full p-4 text-xs border border-gray-100 dark:border-gray-700 rounded-2xl dark:bg-gray-700 font-black uppercase shadow-sm"><option value="">Materia...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                            <input type="text" value={newExamTitle} onChange={e => setNewExamTitle(e.target.value)} placeholder="Ej: Examen Parcial I" className="w-full p-4 text-xs border border-gray-100 rounded-2xl dark:bg-gray-700 font-bold"/><input type="date" value={newExamDate} onChange={e => setNewExamDate(e.target.value)} className="w-full p-4 text-xs border border-gray-100 rounded-2xl dark:bg-gray-700 font-bold"/><button onClick={handleAddExam} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase shadow-2xl hover:bg-red-700 tracking-widest transition-all">Crear Examen</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900 text-[10px] font-black uppercase text-gray-400 tracking-widest"><tr><th className="px-8 py-5 text-left">Examen</th><th className="px-8 py-5">Fecha</th><th className="px-8 py-5"></th></tr></thead><tbody className="divide-y dark:divide-gray-700">{exams.map(e => (<tr key={e.id} className="text-xs hover:bg-gray-50 transition-all"><td className="px-8 py-5 font-black text-gray-700 dark:text-gray-200">{e.titulo}</td><td className="px-8 py-5 text-gray-400 font-bold">{e.fecha || 'Sin fecha'}</td><td className="px-8 py-5 text-right"><button onClick={async () => { if(confirm('¿Eliminar examen?')) { await supabase.from('examenes').delete().eq('id', e.id); fetchExams(); } }} className="text-red-300 hover:text-red-600 p-2 transition-all"><TrashIcon className="w-5 h-5"/></button></td></tr>))}</tbody></table></div>
                </div>
            )}

            {activeTab === 'attendance' && (
                <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-blue-500 space-y-8 animate-fade-in">
                    <h3 className="font-black uppercase text-[10px] text-gray-400 tracking-widest">Control Diario</h3>
                    <div className="flex flex-col md:flex-row gap-6 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-[2.5rem] border-2 border-dashed border-gray-200"><select value={attendanceCourse} onChange={e => setAttendanceCourse(e.target.value)} className="flex-1 p-4 text-xs border-none rounded-2xl bg-white dark:bg-gray-700 font-black uppercase shadow-lg"><option value="">Materia...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select><input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="p-4 text-xs border-none rounded-2xl bg-white dark:bg-gray-700 font-black shadow-lg"/><button onClick={loadAttendance} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-2xl hover:bg-blue-700 tracking-widest transition-all">Cargar Lista</button></div>
                    {attendanceCourse && (
                        <div className="overflow-hidden rounded-[2.5rem] border border-gray-100 dark:border-gray-700"><table className="w-full text-left"><thead className="bg-gray-50 dark:bg-gray-900 text-[10px] font-black uppercase text-gray-400 tracking-widest"><tr><th className="px-8 py-5">Nombre</th><th className="px-8 py-5 text-center">Estado</th></tr></thead><tbody className="divide-y dark:divide-gray-700">{students.map(s => (<tr key={s.id} className="text-sm hover:bg-gray-50/50 transition-all"><td className="px-8 py-5 font-bold text-gray-700 dark:text-gray-200">{s.nombre}</td><td className="px-8 py-5"><div className="flex justify-center gap-3">{['presente', 'ausente', 'tarde'].map(st => (<button key={st} onClick={() => markAttendance(s.id, st)} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase transition-all shadow-md ${attendanceMap[s.id] === st ? (st==='presente'?'bg-green-600 text-white scale-110 shadow-green-200':st==='ausente'?'bg-red-600 text-white scale-110 shadow-red-200':'bg-amber-500 text-white scale-110 shadow-amber-200') : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>{st}</button>))}</div></td></tr>))}</tbody></table></div>
                    )}
                </div>
            )}

            {activeTab === 'announcements' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-indigo-500 space-y-6"><h3 className="font-black text-xs text-gray-400 uppercase tracking-widest">Comunicado LTS</h3><div className="flex flex-col md:flex-row gap-4"><input type="text" value={newAnnounceMsg} onChange={e => setNewAnnounceMsg(e.target.value)} placeholder="Anuncio institucional..." className="flex-1 p-4 text-xs border border-gray-100 rounded-2xl dark:bg-gray-700 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"/><button onClick={handleAddAnnounce} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-2xl hover:bg-indigo-700 tracking-widest transition-all flex items-center justify-center"><MailIcon className="w-5 h-5 mr-3"/>Publicar</button></div></div>
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700"><table className="w-full text-left"><thead className="bg-gray-50 dark:bg-gray-900 text-[10px] font-black uppercase text-gray-400 tracking-widest"><tr><th className="px-8 py-5">Fecha</th><th className="px-8 py-5">Mensaje</th><th className="px-8 py-5"></th></tr></thead><tbody className="divide-y dark:divide-gray-700">{announcements.map(m => (<tr key={m.id} className="text-xs hover:bg-gray-50 transition-all"><td className="px-8 py-5 text-gray-400 font-black uppercase">{new Date(m.fecha_envio).toLocaleDateString()}</td><td className="px-8 py-5 font-bold text-gray-700 dark:text-gray-300">{m.asunto}</td><td className="px-8 py-5 text-right"><button onClick={async () => { if(confirm('¿Eliminar anuncio?')) { await supabase.from('mensajes').delete().eq('id', m.id); fetchAnnouncements(); } }} className="text-red-300 hover:text-red-600 p-2 transition-all"><TrashIcon className="w-5 h-5"/></button></td></tr>))}</tbody></table></div>
                </div>
            )}
        </div>
    );
};

export default TeacherPanel;
