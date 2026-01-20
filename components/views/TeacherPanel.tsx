
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
    
    const [activeTab, setActiveTab] = useState<'students' | 'courses' | 'resources' | 'assignments' | 'exams' | 'attendance' | 'announcements'>('students');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Listados Globales
    const [students, setStudents] = useState<StudentData[]>([]);
    const [adminCourses, setAdminCourses] = useState<CourseAdminData[]>([]);
    const [courseResources, setCourseResources] = useState<Resource[]>([]);
    const [allAssignments, setAllAssignments] = useState<any[]>([]);
    const [allExams, setAllExams] = useState<any[]>([]);
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
    
    // Asistencia
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
            fetchAssignments(),
            fetchExams(),
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

    const fetchAssignments = async () => {
        const { data } = await supabase.from('asignaciones').select('*').order('fecha_entrega', { ascending: false });
        if (data) setAllAssignments(data);
    };

    const fetchExams = async () => {
        const { data } = await supabase.from('examenes').select('*').order('fecha', { ascending: false });
        if (data) setAllExams(data);
    };

    const fetchAnnouncements = async () => {
        const { data } = await supabase.from('mensajes').select('*').order('fecha_envio', { ascending: false });
        if (data) setAllAnnouncements(data);
    };

    // --- ACCIONES ESTUDIANTE ---
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

    const handleUpdateProfile = async () => {
        if (!selectedStudent) return;
        setIsSaving(true);
        const { error } = await supabase.from('estudiantes').update({ 
            nombre: editName, email: editEmail, password: editPassword, 
            rol: editRol, activo: editActivo, avatar_url: editAvatarUrl
        }).eq('id', selectedStudent.id);
        if (!error) { 
            alert("Perfil de usuario actualizado."); 
            fetchStudents(); 
            handleSelectStudent({ ...selectedStudent, nombre: editName, email: editEmail, password: editPassword, rol: editRol, activo: editActivo, avatar_url: editAvatarUrl }); 
        }
        setIsSaving(false);
    };

    const toggleInscription = async (courseId: string) => {
        if (!selectedStudent || isSaving) return;
        setIsSaving(true);
        const isEnrolled = studentInscriptions.includes(courseId);
        if (isEnrolled) {
            await supabase.from('inscripciones').delete().eq('estudiante_id', selectedStudent.id).eq('curso_id', courseId);
            setStudentInscriptions(prev => prev.filter(id => id !== courseId));
        } else {
            await supabase.from('inscripciones').insert({ estudiante_id: selectedStudent.id, curso_id: courseId });
            setStudentInscriptions(prev => [...prev, courseId]);
        }
        setIsSaving(false);
    };

    const handleAddGrade = async () => {
        if (!newGrade.courseId || !newGrade.score || !selectedStudent) return alert("Completa los datos.");
        const { error } = await supabase.from('notas').insert({
            estudiante_id: selectedStudent.id, curso_id: newGrade.courseId, 
            titulo_asignacion: newGrade.title || "Evaluación Continua", puntuacion: parseFloat(newGrade.score), puntuacion_maxima: 100
        });
        if (!error) { alert("Nota cargada."); setNewGrade({ courseId: '', title: '', score: '' }); handleSelectStudent(selectedStudent); }
    };

    const handleAddPayment = async () => {
        if (!newPayment.amount || !selectedStudent) return alert("Ingresa el monto.");
        const { error } = await supabase.from('pagos').insert({
            student_id: selectedStudent.id, amount: parseFloat(newPayment.amount), date: newPayment.date,
            description: newPayment.desc || "Mensualidad Académica", method: newPayment.method, verified: true, type: 'tuition'
        });
        if (!error) { alert("Pago registrado."); setNewPayment({ amount: '', date: new Date().toISOString().split('T')[0], desc: '', method: 'Zelle' }); handleSelectStudent(selectedStudent); }
    };

    const handleDownloadPDF = () => {
        if (!selectedStudent) return;
        const doc = new jsPDF();
        doc.addImage(SCHOOL_LOGO_URL, 'PNG', 15, 15, 25, 25);
        doc.setFontSize(20); doc.setTextColor(30, 58, 138); doc.text("Latin Theological Seminary", 45, 25);
        doc.setFontSize(14); doc.text("Boletín Académico", 45, 33);
        const tableData = studentGrades.map(g => [adminCourses.find(c => c.id === g.curso_id)?.nombre || g.curso_id, g.titulo_asignacion, g.puntuacion.toString()]);
        autoTable(doc, { startY: 75, head: [['Materia', 'Actividad', 'Nota']], body: tableData, theme: 'striped', headStyles: { fillColor: [30, 58, 138] } });
        doc.save(`Boletin_${selectedStudent.nombre}.pdf`);
    };

    // --- ACCIONES MATERIA ---
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

    // --- ACCIONES BIBLIOTECA ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file); 
        let type: any = 'pdf';
        if (file.type.includes('video')) type = 'video';
        else if (file.type.includes('audio')) type = 'audio';
        setNewItem({ ...newItem, type: type, title: file.name.split('.')[0] });
    };

    const handlePostResource = async () => {
        if (!newItem.courseId || !newItem.title) return alert("Faltan datos.");
        setIsSaving(true);
        let finalUrl = newItem.content;
        
        if (newItem.type !== 'link' && selectedFile) {
            const filePath = `${newItem.courseId}/${Date.now()}-${selectedFile.name}`;
            const { error: upErr } = await supabase.storage.from('recursos').upload(filePath, selectedFile);
            if (!upErr) {
                const { data: { publicUrl } } = supabase.storage.from('recursos').getPublicUrl(filePath);
                finalUrl = publicUrl;
            }
        }

        const { error } = await supabase.from('recursos').insert({ 
            course_id: newItem.courseId, titulo: newItem.title, url: finalUrl, tipo: newItem.type 
        });

        if (!error) { alert("Publicado."); setNewItem({ courseId: '', title: '', date: '', time: '', content: '', type: 'pdf' }); setSelectedFile(null); fetchResources(); }
        setIsSaving(false);
    };

    // --- ACCIONES ASISTENCIA ---
    const handleResetDailyAttendance = async () => {
        if (!attCourse) return alert("Selecciona materia.");
        if (!confirm("¿Reiniciar asistencia de hoy?")) return;
        setAttLoading(true);
        await supabase.from('asistencias').delete().eq('curso_id', attCourse).eq('fecha', attDate);
        alert("Reiniciado.");
        loadAttendanceList();
        setAttLoading(false);
    };

    const loadAttendanceList = async () => {
        if (!attCourse) return alert("Selecciona materia.");
        setAttLoading(true);
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
        setAttLoading(false);
    };

    const handleSetAttendanceSafe = async (studentId: string, status: 'presente' | 'ausente' | 'ninguno') => {
        if (savingId) return;
        setSavingId(studentId);
        setAttList(prev => prev.map(a => a.id === studentId ? { ...a, estado: status } : a));
        await supabase.from('asistencias').delete().eq('estudiante_id', studentId).eq('curso_id', attCourse).eq('fecha', attDate);
        if (status !== 'ninguno') {
            await supabase.from('asistencias').insert({ estudiante_id: studentId, curso_id: attCourse, fecha: attDate, estado: status });
        }
        setSavingId(null);
    };

    const handleDeleteItem = async (table: string, id: string) => {
        if (!confirm("¿Eliminar definitivamente?")) return;
        await supabase.from(table).delete().eq('id', id);
        fetchInitialData();
    };

    const handlePostAnnouncement = async () => {
        if (!newItem.title || !newItem.content) return alert("Completa el anuncio.");
        setIsSaving(true);
        await supabase.from('mensajes').insert({ remitente: user.name, asunto: newItem.title, contenido: newItem.content, leido: false, fecha_envio: new Date().toISOString() });
        alert("Anuncio publicado.");
        setNewItem({ courseId: '', title: '', date: '', time: '', content: '', type: 'pdf' });
        fetchAnnouncements();
        setIsSaving(false);
    };

    if (loading) return <div className="p-20 text-center animate-pulse text-blue-600 font-black uppercase tracking-widest">Cargando Panel Maestro LTS...</div>;

    return (
        <div className="space-y-6 pb-20 max-w-[1600px] mx-auto px-4 animate-fade-in text-left">
            <h1 className="text-3xl font-black flex items-center text-gray-800 dark:text-white tracking-tighter uppercase">
                <AcademicCapIcon className="h-9 w-9 mr-4 text-blue-600"/>
                Administración General LTS Cloud
            </h1>

            {/* BARRA DE NAVEGACIÓN */}
            <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700/50 p-1.5 rounded-[2.5rem] overflow-x-auto shadow-inner border dark:border-gray-700">
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

            {/* TAB: ESTUDIANTES / STAFF */}
            {activeTab === 'students' && !selectedStudent && (
                 <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700 animate-fade-in">
                    <div className="p-8 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50">
                        <div className="relative w-full max-w-lg group">
                            <input type="text" placeholder="Buscar por nombre..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-gray-700 shadow-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
                            <SearchIcon className="w-6 h-6 absolute left-4 top-4 text-gray-300 group-focus-within:text-blue-600 transition-colors"/>
                        </div>
                        {isAdmin && <button className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-green-700 flex items-center active:scale-95"><PlusIcon className="w-5 h-5 mr-2"/> Registrar Miembro</button>}
                    </div>
                    <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-gray-100 dark:bg-gray-900 text-[10px] uppercase text-gray-400 font-black tracking-widest"><th className="px-10 py-6">Identidad</th><th className="px-10 py-6">Rol Académico</th><th className="px-10 py-6">Estado</th><th className="px-10 py-6 text-right">Gestión</th></tr></thead><tbody className="divide-y dark:divide-gray-700">{students.filter(s => s.nombre.toLowerCase().includes(studentSearchTerm.toLowerCase())).map(s => (<tr key={s.id} className="hover:bg-blue-50/30 transition-colors group"><td className="px-10 py-6 flex items-center font-bold text-sm text-gray-800 dark:text-gray-200"><img src={s.avatar_url} className="w-12 h-12 rounded-2xl mr-5 shadow-md border-2 border-white object-cover"/>{s.nombre}</td><td className="px-10 py-6 text-[10px] text-blue-500 font-black uppercase tracking-widest">{s.rol}</td><td className="px-10 py-6"><span className={`inline-flex items-center px-4 py-1 rounded-full text-[9px] font-black uppercase ${s.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.activo ? 'Activo' : 'Inactivo'}</span></td><td className="px-10 py-6 text-right"><button onClick={() => handleSelectStudent(s)} className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 shadow-lg active:scale-95">Ver Ficha</button></td></tr>))}</tbody></table></div>
                </div>
            )}

            {/* EDITOR COMPLETO ALUMNO */}
            {activeTab === 'students' && selectedStudent && (
                <div className="animate-fade-in space-y-6">
                    <button onClick={() => setSelectedStudent(null)} className="flex items-center text-blue-600 font-black uppercase text-[10px] tracking-widest bg-white px-5 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition-all"><ChevronLeftIcon className="h-5 w-5 mr-1"/> Volver</button>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Perfil */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-xl border-t-8 border-blue-600 text-center flex flex-col min-h-[600px]">
                            <img src={editAvatarUrl || selectedStudent.avatar_url} className="w-28 h-28 rounded-[2.5rem] shadow-xl border-4 border-white object-cover mx-auto mb-4"/>
                            <h4 className="font-black text-gray-800 dark:text-white text-md uppercase tracking-tighter">{selectedStudent.nombre}</h4>
                            <div className="space-y-3 text-left flex-1 mt-6">
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Email Académico</label><input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-none shadow-inner text-xs font-bold dark:text-white"/></div>
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Clave de Acceso</label><input type="text" value={editPassword} onChange={e => setEditPassword(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-none shadow-inner text-xs font-bold dark:text-white"/></div>
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Rol del Usuario</label><select value={editRol} onChange={e => setEditRol(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-none shadow-inner text-xs font-black uppercase dark:text-white"><option value="estudiante">Estudiante</option><option value="profesor">Profesor</option><option value="admin">Administrador</option></select></div>
                                <div className="pt-2 flex flex-col items-center">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Estado de Cuenta</label>
                                    <button onClick={() => setEditActivo(!editActivo)} className={`w-full py-3 rounded-xl font-black text-[9px] uppercase transition-all shadow-sm ${editActivo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{editActivo ? 'Cuenta Activa' : 'Cuenta Inactiva'}</button>
                                </div>
                            </div>
                            <button onClick={handleUpdateProfile} className="mt-6 w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[9px] uppercase shadow-lg hover:bg-blue-700">Guardar Cambios</button>
                            <button onClick={handleDownloadPDF} className="mt-2 w-full bg-indigo-50 text-indigo-700 py-4 rounded-2xl font-black text-[9px] uppercase border border-indigo-200">Generar Boleta PDF</button>
                        </div>
                        {/* Inscripciones */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-xl border-t-8 border-green-500 flex flex-col">
                            <h3 className="text-[10px] font-black uppercase mb-6 text-gray-400 flex items-center tracking-widest"><BookOpenIcon className="w-4 h-4 mr-2"/> Cátedras Inscritas</h3>
                            <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                                {adminCourses.map(course => {
                                    const isEnrolled = studentInscriptions.includes(course.id);
                                    return (
                                        <div key={course.id} onClick={() => toggleInscription(course.id)} className={`flex justify-between items-center p-4 rounded-2xl border-2 transition-all cursor-pointer shadow-sm ${isEnrolled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100 hover:border-blue-100'}`}>
                                            <p className={`text-[10px] font-black truncate w-40 ${isEnrolled ? 'text-green-800' : 'text-gray-400'}`}>{course.nombre}</p>
                                            <div className={`p-1.5 rounded-lg ${isEnrolled ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-300'}`}><CheckIcon className="w-3 h-3"/></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Notas */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-xl border-t-8 border-amber-500 flex flex-col">
                            <h3 className="text-[10px] font-black uppercase mb-6 text-gray-400 flex items-center tracking-widest"><ChartBarIcon className="w-4 h-4 mr-2"/> Calificaciones</h3>
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border mb-6 space-y-2">
                                <select value={newGrade.courseId} onChange={e => setNewGrade({...newGrade, courseId: e.target.value})} className="w-full p-2.5 text-[9px] rounded-lg font-black bg-white border-none shadow-sm dark:text-gray-800"><option value="">Materia...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                                <div className="flex gap-1.5"><input placeholder="Nota" type="number" value={newGrade.score} onChange={e => setNewGrade({...newGrade, score: e.target.value})} className="flex-1 p-2.5 text-[10px] font-black rounded-lg bg-white border-none shadow-sm dark:text-gray-800"/><button onClick={handleAddGrade} className="bg-amber-600 text-white p-2.5 rounded-lg shadow-md"><PlusIcon className="w-5 h-5"/></button></div>
                            </div>
                            <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                                {studentGrades.map(g => (
                                    <div key={g.id} className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl flex justify-between items-center group shadow-sm border border-transparent hover:border-amber-100 transition-all">
                                        <div className="text-left"><p className="text-[8px] font-black text-blue-500 uppercase">{(adminCourses.find(c => c.id === g.curso_id)?.nombre || '').substring(0,18)}</p><p className="text-[10px] font-bold text-gray-700 truncate w-32">{g.titulo_asignacion}</p></div>
                                        <div className="flex items-center space-x-2"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black shadow-inner">{g.puntuacion}</span><button onClick={() => handleDeleteItem('notas', g.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><TrashIcon className="w-4 h-4"/></button></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Pagos */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-xl border-t-8 border-indigo-500 flex flex-col">
                            <h3 className="text-[10px] font-black uppercase mb-6 text-gray-400 flex items-center tracking-widest"><CurrencyDollarIcon className="h-4 w-4 mr-2"/> Pagos / Abonos</h3>
                            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-2xl border mb-6 space-y-2">
                                <input placeholder="Monto ($)" type="number" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} className="w-full p-2.5 text-[11px] font-black rounded-lg bg-white border-none shadow-sm dark:text-gray-800"/>
                                <button onClick={handleAddPayment} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-black text-[9px] uppercase shadow-lg">Registrar</button>
                            </div>
                            <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                                {studentPayments.map(p => (
                                    <div key={p.id} className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl flex justify-between items-center group shadow-sm hover:border-indigo-100 transition-all">
                                        <div className="text-left"><p className="text-[8px] font-black text-gray-400 uppercase">{p.date}</p><p className="text-[10px] font-bold text-gray-700">{p.method}</p></div>
                                        <div className="flex items-center space-x-2"><span className="text-green-600 text-[11px] font-black">${p.amount}</span><button onClick={() => handleDeleteItem('pagos', p.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><TrashIcon className="w-4 h-4"/></button></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: MATERIAS (ESTILO CAPTURA) */}
            {activeTab === 'courses' && !selectedCourse && (
                <div className="bg-white dark:bg-gray-800 rounded-[3.5rem] shadow-2xl overflow-hidden border dark:border-gray-700 animate-fade-in">
                    <div className="p-10 border-b dark:border-gray-700 bg-gray-50/50">
                        <div className="relative max-w-xl shadow-xl rounded-[2rem] overflow-hidden group">
                            <input type="text" placeholder="Buscar materia por nombre o código ID..." value={courseSearchTerm} onChange={(e) => setCourseSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-white dark:bg-gray-700 text-sm font-medium focus:ring-4 focus:ring-blue-500/20 outline-none dark:text-white" />
                            <SearchIcon className="w-7 h-7 absolute left-5 top-4.5 text-gray-200 group-focus-within:text-blue-500 transition-colors"/>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-900 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                                    <th className="px-12 py-7">MATERIA</th>
                                    <th className="px-12 py-7 text-center">PROFESOR TITULAR</th>
                                    <th className="px-12 py-7 text-right">EDICIÓN</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {adminCourses.filter(c => c.nombre.toLowerCase().includes(courseSearchTerm.toLowerCase()) || c.id.toLowerCase().includes(courseSearchTerm.toLowerCase())).map(c => (
                                    <tr key={c.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-12 py-8">
                                            <p className="font-black text-gray-800 dark:text-white text-md uppercase leading-tight">{c.nombre}</p>
                                            <p className="text-[10px] font-black text-blue-500 uppercase mt-1 tracking-widest">CÓDIGO: {c.id}</p>
                                        </td>
                                        <td className="px-12 py-8 text-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                            {c.profesor}
                                        </td>
                                        <td className="px-12 py-8 text-right">
                                            <button onClick={() => setSelectedCourse(c)} className="bg-blue-600 text-white px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95 tracking-widest">
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

            {/* TAB: BIBLIOTECA (RECURSOS) */}
            {activeTab === 'resources' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3.5rem] shadow-2xl border-t-8 border-blue-500 h-fit space-y-8">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-white uppercase text-sm tracking-widest"><PlusIcon className="w-6 h-6 mr-3 text-blue-600"/> Publicar Nuevo Material Académico</h3>
                        <div className="space-y-5">
                            <select value={newItem.courseId} onChange={e => setNewItem({...newItem, courseId: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl font-black text-sm border-none shadow-inner dark:text-white"><option value="">Selecciona Cátedra Destino...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                            <input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="Título del Material" className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl font-black text-sm border-none shadow-inner dark:text-white"/>
                            <div className="flex bg-gray-100 dark:bg-gray-900 p-2 rounded-2xl gap-2 shadow-inner">
                                {['pdf', 'video', 'audio', 'link'].map(t => (
                                    <button key={t} onClick={() => setNewItem({...newItem, type: t as any})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${newItem.type === t ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-md scale-[1.02]' : 'text-gray-400'}`}>{t}</button>
                                ))}
                            </div>
                            
                            {/* CAMPO DE ENLACE CONDICIONAL (CORREGIDO) */}
                            {newItem.type === 'link' ? (
                                <div className="space-y-2 animate-fade-in">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">URL del Recurso Externo</label>
                                    <input type="text" value={newItem.content} onChange={e => setNewItem({...newItem, content: e.target.value})} placeholder="Pega aquí el link (Drive, YouTube, etc)..." className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl font-bold text-sm border-none shadow-inner dark:text-white"/>
                                </div>
                            ) : (
                                <div onClick={() => fileInputRef.current?.click()} className="w-full p-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 bg-gray-50/50 dark:bg-gray-900/30 group transition-all">
                                    <UploadIcon className="w-12 h-12 mb-3 text-gray-300 group-hover:text-blue-500 animate-bounce"/>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedFile ? selectedFile.name : 'Click para subir archivo local'}</p>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={newItem.type === 'pdf' ? '.pdf' : newItem.type === 'video' ? 'video/*' : 'audio/*'}/>
                                </div>
                            )}
                            
                            <button onClick={handlePostResource} disabled={isSaving} className={`w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black text-[11px] uppercase shadow-2xl flex items-center justify-center transition-all ${isSaving ? 'opacity-50' : 'hover:bg-blue-700 active:scale-95'}`}><SendIcon className="w-5 h-5 mr-3"/> {isSaving ? 'Subiendo material...' : 'Publicar en la Nube Académica'}</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[3.5rem] shadow-2xl overflow-hidden h-[750px] flex flex-col border dark:border-gray-700">
                        <div className="p-8 bg-gray-100 dark:bg-gray-900 border-b font-black text-[11px] uppercase text-gray-400 tracking-widest flex justify-between items-center">Inventario de Biblioteca <span className="text-blue-500">{courseResources.length} ITEMS ACTIVOS</span></div>
                        <div className="flex-1 overflow-y-auto divide-y dark:divide-gray-700">
                            {courseResources.length > 0 ? courseResources.map(res => (
                                <div key={res.id} className="p-8 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all flex justify-between items-center group">
                                    <div className="flex items-center text-left">
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl mr-5">{res.type === 'video' ? <VideoIcon className="w-6 h-6"/> : res.type === 'pdf' ? <DocumentTextIcon className="w-6 h-6"/> : <LinkIcon className="w-6 h-6"/>}</div>
                                        <div><p className="text-sm font-black text-gray-800 dark:text-white truncate w-64 uppercase leading-none mb-1.5">{res.title}</p><p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{adminCourses.find(c => c.id === res.courseId)?.nombre || res.courseId}</p></div>
                                    </div>
                                    <button onClick={() => handleDeleteItem('recursos', res.id)} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 bg-white dark:bg-gray-800 rounded-full shadow-md"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            )) : <div className="p-20 text-center opacity-20 flex flex-col items-center uppercase font-black"><BookOpenIcon className="w-20 h-20 mb-4"/><p>Biblioteca Vacía</p></div>}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: ASISTENCIA (PILL SWITCH) */}
            {activeTab === 'attendance' && (
                <div className="bg-white dark:bg-gray-800 p-10 rounded-[4rem] shadow-2xl border-t-8 border-green-500 space-y-10 animate-fade-in">
                    <div className="flex flex-col md:flex-row gap-6 items-end bg-gray-50 dark:bg-gray-900/50 p-10 rounded-[3.5rem] border dark:border-gray-700 shadow-inner">
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Cátedra Lectiva</label>
                            <select value={attCourse} onChange={e => setAttCourse(e.target.value)} className="w-full p-5 rounded-[2rem] border-none text-sm font-black uppercase shadow-xl focus:ring-4 focus:ring-green-500/20 outline-none dark:text-gray-800"><option value="">Selecciona cátedra...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                        </div>
                        <div className="w-full md:w-72 space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Fecha del Día</label>
                            <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} className="w-full p-5 rounded-[2rem] border-none text-sm font-black shadow-xl outline-none dark:text-gray-800"/>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={loadAttendanceList} disabled={attLoading} className="bg-green-600 text-white px-10 py-5 rounded-[2rem] font-black text-[10px] uppercase shadow-2xl hover:bg-green-700 h-[64px] active:scale-95 transition-all">Cargar Grupo</button>
                            {attList.length > 0 && <button onClick={handleResetDailyAttendance} className="bg-red-50 text-red-600 border border-red-100 px-6 py-5 rounded-[2rem] hover:bg-red-600 hover:text-white transition-all h-[64px] shadow-sm active:scale-90"><TrashIcon className="w-6 h-6"/></button>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {attList.map(alumno => (
                            <div key={alumno.id} className={`flex flex-col p-8 rounded-[3rem] bg-gray-50 dark:bg-gray-900/30 border-2 transition-all shadow-md ${savingId === alumno.id ? 'opacity-50 border-blue-400' : 'border-transparent hover:border-blue-100'}`}>
                                <div className="flex items-center mb-8">
                                    <img src={alumno.avatar} className="w-16 h-16 rounded-[1.5rem] mr-5 border-4 border-white shadow-xl object-cover"/>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-black text-gray-800 dark:text-white truncate uppercase tracking-tighter">{alumno.nombre}</p>
                                        <div className="flex items-center mt-2">
                                            <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full shadow-inner ${alumno.estado === 'presente' ? 'bg-green-100 text-green-700' : alumno.estado === 'ausente' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-500'}`}>{alumno.estado}</span>
                                            {savingId === alumno.id && <div className="ml-3 w-4 h-4 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded-[1.5rem] shadow-inner border dark:border-gray-700 gap-1.5 overflow-hidden">
                                    <button onClick={() => handleSetAttendanceSafe(alumno.id, 'presente')} className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase transition-all ${alumno.estado === 'presente' ? 'bg-green-500 text-white shadow-lg scale-[1.03]' : 'text-gray-400 hover:bg-gray-50 hover:text-green-600'}`}>Presente</button>
                                    <button onClick={() => handleSetAttendanceSafe(alumno.id, 'ausente')} className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase transition-all ${alumno.estado === 'ausente' ? 'bg-red-500 text-white shadow-lg scale-[1.03]' : 'text-gray-400 hover:bg-gray-50 hover:text-red-600'}`}>Ausente</button>
                                    <button onClick={() => handleSetAttendanceSafe(alumno.id, 'ninguno')} className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase transition-all ${alumno.estado === 'ninguno' ? 'bg-gray-400 text-white' : 'text-gray-300 hover:bg-gray-100'}`}>Limpiar</button>
                                </div>
                            </div>
                        ))}
                        {attList.length === 0 && !attLoading && <div className="col-span-full py-24 text-center opacity-20 font-black uppercase"><CheckIcon className="w-20 h-20 mx-auto mb-4"/><p>Selecciona una materia para pasar lista</p></div>}
                    </div>
                </div>
            )}

            {/* TAB: TAREAS (ASIGNACIONES) */}
            {activeTab === 'assignments' && (
                <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl overflow-hidden border dark:border-gray-700 animate-fade-in">
                    <div className="p-8 bg-gray-100 dark:bg-gray-900 border-b font-black text-[11px] uppercase text-gray-400 tracking-widest flex justify-between items-center">Registro de Actividades / Tareas <span className="text-blue-500">{allAssignments.length} ENTREGAS</span></div>
                    <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase text-gray-400 font-black tracking-widest"><th className="px-10 py-6">ACTIVIDAD</th><th className="px-10 py-6">MATERIA</th><th className="px-10 py-6">VENCIMIENTO</th><th className="px-10 py-6 text-right">ACCIÓN</th></tr></thead><tbody className="divide-y dark:divide-gray-700">{allAssignments.map(a => (<tr key={a.id} className="hover:bg-blue-50/20 group"><td className="px-10 py-6 font-bold text-gray-800 dark:text-white">{a.titulo}</td><td className="px-10 py-6 text-[10px] font-black text-indigo-500 uppercase">{adminCourses.find(c => c.id === a.curso_id)?.nombre || a.curso_id}</td><td className="px-10 py-6 text-xs text-gray-500">{a.fecha_entrega}</td><td className="px-10 py-6 text-right"><button onClick={() => handleDeleteItem('asignaciones', a.id)} className="text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><TrashIcon className="w-5 h-5"/></button></td></tr>))}</tbody></table></div>
                </div>
            )}

            {/* TAB: EXAMENES */}
            {activeTab === 'exams' && (
                <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl overflow-hidden border dark:border-gray-700 animate-fade-in">
                    <div className="p-8 bg-gray-100 dark:bg-gray-900 border-b font-black text-[11px] uppercase text-gray-400 tracking-widest flex justify-between items-center">Calendario de Evaluaciones <span className="text-red-500">{allExams.length} PROGRAMADOS</span></div>
                    <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase text-gray-400 font-black tracking-widest"><th className="px-10 py-6">EXAMEN</th><th className="px-10 py-6">MATERIA</th><th className="px-10 py-6">FECHA Y HORA</th><th className="px-10 py-6 text-right">ACCIÓN</th></tr></thead><tbody className="divide-y dark:divide-gray-700">{allExams.map(e => (<tr key={e.id} className="hover:bg-red-50/20 group"><td className="px-10 py-6 font-bold text-gray-800 dark:text-white uppercase text-xs">{e.titulo}</td><td className="px-10 py-6 text-[10px] font-black text-indigo-500 uppercase">{adminCourses.find(c => c.id === e.curso_id)?.nombre || e.curso_id}</td><td className="px-10 py-6 text-xs text-gray-500">{e.fecha} | {e.hora}</td><td className="px-10 py-6 text-right"><button onClick={() => handleDeleteItem('examenes', e.id)} className="text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><TrashIcon className="w-5 h-5"/></button></td></tr>))}</tbody></table></div>
                </div>
            )}

            {/* TAB: ANUNCIOS */}
            {activeTab === 'announcements' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3.5rem] shadow-2xl border-t-8 border-indigo-600 space-y-8">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-white uppercase text-sm tracking-widest"><PlusIcon className="w-6 h-6 mr-3 text-indigo-600"/> Publicar Comunicado Oficial</h3>
                        <div className="space-y-4">
                            <input value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="Asunto del Comunicado..." className="w-full p-5 bg-gray-50 dark:bg-gray-900 rounded-[2rem] font-black text-sm border-none shadow-inner dark:text-white"/>
                            <textarea rows={6} value={newItem.content} onChange={e => setNewItem({...newItem, content: e.target.value})} placeholder="Redacta el mensaje íntegro aquí..." className="w-full p-6 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] font-medium text-sm border-none shadow-inner dark:text-white"></textarea>
                            <button onClick={handlePostAnnouncement} className="w-full bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black text-[11px] uppercase shadow-2xl flex items-center justify-center hover:bg-indigo-700 transition-all"><SendIcon className="w-5 h-5 mr-3"/> Publicar en el Tablón General</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[3.5rem] shadow-2xl overflow-hidden h-[750px] flex flex-col border dark:border-gray-700">
                        <div className="p-8 bg-gray-100 dark:bg-gray-900 border-b font-black text-[11px] uppercase text-gray-400 tracking-widest">Historial de Comunicados</div>
                        <div className="flex-1 overflow-y-auto divide-y dark:divide-gray-700">
                            {allAnnouncements.map(msg => (
                                <div key={msg.id} className="p-8 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all flex justify-between items-start group">
                                    <div className="text-left flex-1 mr-4"><p className="text-sm font-black text-gray-800 dark:text-white leading-tight uppercase mb-2">{msg.asunto}</p><p className="text-[10px] font-medium text-gray-500 line-clamp-2">{msg.contenido}</p><p className="text-[9px] font-black text-indigo-500 uppercase mt-4 flex items-center"><ClockIcon className="w-3.5 h-3.5 mr-2"/> {new Date(msg.fecha_envio).toLocaleString()}</p></div>
                                    <button onClick={() => handleDeleteItem('mensajes', msg.id)} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 bg-white dark:bg-gray-800 rounded-full shadow-md"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* EDITOR MATERIA (MODAL) */}
            {selectedCourse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden border-t-8 border-blue-600 flex flex-col max-h-[95vh]">
                        <div className="p-10 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                            <div><h3 className="font-black text-xl text-gray-900 dark:text-white uppercase tracking-tighter">Editor Académico</h3><p className="text-[11px] font-black text-blue-500 uppercase tracking-widest">{selectedCourse.nombre}</p></div>
                            <button onClick={() => setSelectedCourse(null)} className="p-3 bg-white dark:bg-gray-700 rounded-full shadow-lg hover:text-red-500 transition-all"><XIcon className="w-7 h-7"/></button>
                        </div>
                        <div className="p-10 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre</label><input value={selectedCourse.nombre} onChange={e => setSelectedCourse({...selectedCourse, nombre: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl font-bold border-none shadow-inner dark:text-white"/></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Titular</label><input value={selectedCourse.profesor} onChange={e => setSelectedCourse({...selectedCourse, profesor: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl font-bold border-none shadow-inner dark:text-white"/></div>
                            </div>
                            
                            {/* CAMPO DE IMAGEN CON MINIATURA (REQUERIDO POR USUARIO) */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">URL Imagen Portada</label>
                                <div className="flex gap-4 items-center">
                                    <div className="h-20 w-32 rounded-2xl bg-gray-100 dark:bg-gray-900 overflow-hidden shadow-inner flex items-center justify-center shrink-0 border dark:border-gray-700">
                                        {selectedCourse.image_url ? <img src={selectedCourse.image_url} className="w-full h-full object-cover"/> : <VideoIcon className="w-8 h-8 opacity-20"/>}
                                    </div>
                                    <input value={selectedCourse.image_url || ''} onChange={e => setSelectedCourse({...selectedCourse, image_url: e.target.value})} placeholder="Pega el URL de la imagen aquí..." className="flex-1 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl font-medium text-xs border-none shadow-inner dark:text-white"/>
                                </div>
                            </div>

                            <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción Breve</label><textarea rows={3} value={selectedCourse.descripcion} onChange={e => setSelectedCourse({...selectedCourse, descripcion: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl font-medium border-none shadow-inner dark:text-white text-sm"></textarea></div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contenido Académico Detallado</label><textarea rows={6} value={selectedCourse.contenido_detallado} onChange={e => setSelectedCourse({...selectedCourse, contenido_detallado: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl font-medium text-xs border-none shadow-inner dark:text-white"></textarea></div>
                        </div>
                        <div className="p-10 border-t dark:border-gray-700">
                            <button onClick={handleUpdateCourse} disabled={isSaving} className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black text-[11px] uppercase shadow-2xl hover:bg-blue-700 flex items-center justify-center transition-all active:scale-95">{isSaving ? 'Guardando...' : 'Aplicar Cambios Académicos'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherPanel;
