
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../application/supabase.ts';
import { 
    PencilIcon, UserGroupIcon, PlusIcon, TrashIcon, ClipboardListIcon, 
    AcademicCapIcon, CalendarIcon, CheckIcon, DownloadIcon, MailIcon, 
    BookOpenIcon, SearchIcon, CurrencyDollarIcon, XIcon, 
    ChevronLeftIcon, VideoIcon, MusicIcon, DocumentTextIcon, LinkIcon, 
    ChartBarIcon, ClockIcon, CheckCircleIcon, SendIcon, UploadIcon
} from '../Icons.tsx';
import { SCHOOL_LOGO_URL } from '../../constants.ts';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import { User, Payment, Resource, Assignment, Exam } from '../../types.ts';

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
    const [allAssignments, setAllAssignments] = useState<any[]>([]);
    const [allExams, setAllExams] = useState<any[]>([]);
    const [allAnnouncements, setAllAnnouncements] = useState<any[]>([]);
    const [studentSearchTerm, setStudentSearchTerm] = useState('');

    // Detalle del Alumno Seleccionado
    const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [studentGrades, setStudentGrades] = useState<GradeData[]>([]);
    const [studentInscriptions, setStudentInscriptions] = useState<string[]>([]);
    const [studentPayments, setStudentPayments] = useState<Payment[]>([]);

    // Estados para Nuevos Registros
    const [newItem, setNewItem] = useState({ 
        courseId: '', 
        title: '', 
        date: '', 
        time: '', 
        content: '', 
        type: 'link' as 'pdf' | 'video' | 'audio' | 'link'
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Estados Asistencia
    const [attCourse, setAttCourse] = useState('');
    const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
    const [attList, setAttList] = useState<any[]>([]);

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

    // --- MANEJO DE ARCHIVOS ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Auto-detectar tipo basado en extensión si es posible
        let type: 'pdf' | 'video' | 'audio' | 'link' = 'pdf';
        if (file.type.includes('video')) type = 'video';
        else if (file.type.includes('audio')) type = 'audio';
        else if (file.type.includes('pdf')) type = 'pdf';

        const reader = new FileReader();
        reader.onload = (event) => {
            setNewItem({
                ...newItem,
                content: event.target?.result as string,
                type: type,
                title: newItem.title || file.name.split('.')[0]
            });
        };
        reader.readAsDataURL(file);
    };

    const handlePostResource = async () => {
        if (!newItem.courseId || !newItem.title || !newItem.content) {
            alert("Por favor completa todos los campos y selecciona un archivo o enlace.");
            return;
        }
        setIsSaving(true);
        try {
            const { error } = await supabase.from('recursos').insert({
                course_id: newItem.courseId,
                titulo: newItem.title,
                url: newItem.content,
                tipo: newItem.type
            });
            if (error) throw error;
            
            setNewItem({ courseId: '', title: '', date: '', time: '', content: '', type: 'link' });
            if (fileInputRef.current) fileInputRef.current.value = '';
            await fetchResources();
            alert("Recurso publicado con éxito.");
        } catch (e) {
            alert("Error al publicar: " + (e as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    // --- ACCIONES TAREAS Y EXAMENES ---
    const handleAddAssignment = async () => {
        if (!newItem.courseId || !newItem.title || !newItem.date) return;
        setIsSaving(true);
        await supabase.from('asignaciones').insert({
            curso_id: newItem.courseId,
            titulo: newItem.title,
            fecha_entrega: newItem.date,
            entregado: false
        });
        setNewItem({ courseId: '', title: '', date: '', time: '', content: '', type: 'link' });
        await fetchAssignments();
        setIsSaving(false);
    };

    const handleAddExam = async () => {
        if (!newItem.courseId || !newItem.title || !newItem.date) return;
        setIsSaving(true);
        await supabase.from('examenes').insert({
            curso_id: newItem.courseId,
            titulo: newItem.title,
            fecha: newItem.date,
            hora: newItem.time || '00:00'
        });
        setNewItem({ courseId: '', title: '', date: '', time: '', content: '', type: 'link' });
        await fetchExams();
        setIsSaving(false);
    };

    const handleDeleteItem = async (table: string, id: string) => {
        if (!confirm("¿Eliminar este registro definitivamente?")) return;
        await supabase.from(table).delete().eq('id', id);
        if (table === 'asignaciones') fetchAssignments();
        if (table === 'examenes') fetchExams();
        if (table === 'mensajes') fetchAnnouncements();
        if (table === 'recursos') fetchResources();
    };

    // --- ASISTENCIA ---
    const loadAttendanceList = async () => {
        if (!attCourse) return;
        const { data: inscritos } = await supabase.from('inscripciones')
            .select('estudiante_id, estudiantes(nombre, avatar_url)')
            .eq('curso_id', attCourse);
        
        const { data: existentes } = await supabase.from('asistencias')
            .select('*')
            .eq('curso_id', attCourse)
            .eq('fecha', attDate);

        const list = (inscritos || []).map((i: any) => {
            const registro = existentes?.find(e => e.estudiante_id === i.estudiante_id);
            return {
                id: i.estudiante_id,
                nombre: i.estudiantes.nombre,
                avatar: i.estudiantes.avatar_url,
                estado: registro ? registro.estado : 'presente'
            };
        });
        setAttList(list);
    };

    const toggleAttendance = async (studentId: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'presente' ? 'ausente' : 'presente';
        const { error } = await supabase.from('asistencias').upsert({
            estudiante_id: studentId,
            curso_id: attCourse,
            fecha: attDate,
            estado: nextStatus
        }, { onConflict: 'estudiante_id,curso_id,fecha' });
        
        if (!error) setAttList(prev => prev.map(a => a.id === studentId ? { ...a, estado: nextStatus } : a));
    };

    // --- ANUNCIOS ---
    const handlePostAnnouncement = async () => {
        if (!newItem.title) return;
        setIsSaving(true);
        await supabase.from('mensajes').insert({
            remitente: user.name,
            asunto: newItem.title,
            leido: false,
            fecha_envio: new Date().toISOString()
        });
        setNewItem({ courseId: '', title: '', date: '', time: '', content: '', type: 'link' });
        await fetchAnnouncements();
        setIsSaving(false);
    };

    // --- ALUMNOS Y OTROS ---
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

    const handleUpdateProfile = async () => {
        if (!selectedStudent) return;
        setIsSaving(true);
        await supabase.from('estudiantes')
            .update({ nombre: editName, email: editEmail, password: editPassword })
            .eq('id', selectedStudent.id);
        setIsSaving(false);
        alert("Perfil actualizado correctamente.");
    };

    const handleSendCreds = async () => {
        if (!selectedStudent) return;
        setIsSaving(true);
        try {
            const res = await fetch('/.netlify/functions/send-welcome-email', {
                method: 'POST',
                body: JSON.stringify({ email: editEmail, name: editName, password: editPassword, role: selectedStudent.rol })
            });
            if (res.ok) alert("Correo enviado exitosamente con Brevo.");
            else alert("Error al enviar correo. Revisa logs de Netlify.");
        } catch (e) { alert("Error de conexión con el servidor."); }
        finally { setIsSaving(false); }
    };

    const handleDownloadPDF = () => {
        if (!selectedStudent) return;
        const doc = new jsPDF();
        doc.addImage(SCHOOL_LOGO_URL, 'PNG', 15, 15, 30, 30);
        doc.setFontSize(22); doc.setTextColor(30, 58, 138); 
        doc.text("Latin Theological Seminary", 50, 25);
        doc.setFontSize(10); doc.setTextColor(100);
        doc.text("Educación Teológica de Excelencia", 50, 32);
        doc.text("Boletín Oficial de Calificaciones", 50, 38);
        doc.setDrawColor(200); doc.line(15, 50, 195, 50);
        doc.setFontSize(12); doc.setTextColor(0);
        doc.text(`Estudiante: ${selectedStudent.nombre}`, 15, 65);
        doc.text(`Email: ${selectedStudent.email}`, 15, 72);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 150, 65);

        const tableData = studentGrades.map(g => [
            adminCourses.find(c => c.id === g.curso_id)?.nombre || g.curso_id, 
            g.titulo_asignacion, 
            g.puntuacion
        ]);

        autoTable(doc, { 
            startY: 85, 
            head: [['Materia', 'Asignación / Evaluación', 'Nota']], 
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [30, 58, 138], textColor: 255 },
            styles: { fontSize: 10, cellPadding: 5 }
        });

        doc.save(`Notas_${selectedStudent.nombre}.pdf`);
    };

    if (loading) return <div className="p-20 text-center animate-pulse text-blue-600 font-black tracking-widest uppercase">Cargando Administración LTS...</div>;

    return (
        <div className="space-y-6 pb-20 max-w-[1600px] mx-auto px-4 animate-fade-in">
            <h1 className="text-3xl font-black flex items-center text-gray-800 dark:text-white tracking-tighter">
                <AcademicCapIcon className="h-9 w-9 mr-4 text-blue-600"/>
                Administración General
            </h1>

            {/* TABS NAVEGACIÓN */}
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
                        className={`flex items-center px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all whitespace-nowrap tracking-widest ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-xl' : 'text-gray-500 hover:bg-white/50'}`}
                    >
                        <tab.icon className="w-4 h-4 mr-2"/> {tab.label}
                    </button>
                ))}
            </div>

            {/* --- CONTENIDO MATERIALES (REDISEÑADO PARA CARGA) --- */}
            {activeTab === 'resources' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-indigo-500 h-fit space-y-6">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-gray-200 uppercase text-xs tracking-widest">
                            <UploadIcon className="w-6 h-6 mr-3 text-indigo-600"/> Nuevo Recurso Educativo
                        </h3>
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Materia Destino</label>
                                <select value={newItem.courseId} onChange={e => setNewItem({...newItem, courseId: e.target.value})} className="w-full p-4 text-xs border-2 border-gray-100 rounded-2xl font-black uppercase outline-none focus:border-indigo-400">
                                    <option value="">Selecciona la Materia...</option>
                                    {adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Título del Recurso</label>
                                <input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="Ej: Guía de Exégesis Bíblica" className="w-full p-4 text-xs border-2 border-gray-100 rounded-2xl font-bold outline-none focus:border-indigo-400"/>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Contenido</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { id: 'pdf', icon: DocumentTextIcon, label: 'PDF' },
                                        { id: 'video', icon: VideoIcon, label: 'Video' },
                                        { id: 'audio', icon: MusicIcon, label: 'Audio' },
                                        { id: 'link', icon: LinkIcon, label: 'Link' }
                                    ].map(t => (
                                        <button 
                                            key={t.id} 
                                            onClick={() => setNewItem({...newItem, type: t.id as any, content: ''})}
                                            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center space-y-1 ${newItem.type === t.id ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                                        >
                                            <t.icon className="w-5 h-5"/>
                                            <span className="text-[8px] font-black uppercase">{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {newItem.type === 'link' ? (
                                <div className="space-y-2 animate-fade-in">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Enlace Externo (URL)</label>
                                    <input type="text" value={newItem.content} onChange={e => setNewItem({...newItem, content: e.target.value})} placeholder="https://youtube.com/..." className="w-full p-4 text-xs border-2 border-gray-100 rounded-2xl italic outline-none focus:border-indigo-400"/>
                                </div>
                            ) : (
                                <div className="space-y-2 animate-fade-in">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Subir Archivo {newItem.type.toUpperCase()}</label>
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`w-full p-8 border-2 border-dashed rounded-3xl cursor-pointer transition-all text-center flex flex-col items-center justify-center space-y-2 ${newItem.content ? 'border-green-400 bg-green-50' : 'border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50'}`}
                                    >
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={newItem.type === 'pdf' ? '.pdf' : newItem.type === 'audio' ? 'audio/*' : 'video/*'} />
                                        {newItem.content ? (
                                            <>
                                                <CheckCircleIcon className="w-10 h-10 text-green-500"/>
                                                <p className="text-[10px] font-black text-green-700 uppercase">Archivo Cargado Correctamente</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="p-3 bg-white rounded-2xl shadow-sm"><UploadIcon className="w-6 h-6 text-indigo-500"/></div>
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Click para seleccionar archivo</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={handlePostResource} 
                                disabled={isSaving}
                                className={`w-full py-5 rounded-[2rem] font-black text-[11px] uppercase shadow-xl transition-all tracking-widest flex items-center justify-center ${isSaving ? 'bg-gray-300' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1'}`}
                            >
                                {isSaving ? 'Procesando...' : <><SendIcon className="w-4 h-4 mr-2"/> Publicar Recurso</>}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl overflow-hidden border dark:border-gray-700 h-[700px] flex flex-col">
                        <div className="p-8 bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-black text-[11px] uppercase tracking-widest text-gray-400">Biblioteca de Nube</h3>
                            <span className="bg-indigo-100 text-indigo-600 text-[9px] font-black px-3 py-1 rounded-full uppercase">{courseResources.length} Archivos</span>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y dark:divide-gray-700">
                            {courseResources.map(res => (
                                <div key={res.id} className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all">
                                    <div className="flex items-center truncate">
                                        <div className={`p-3 rounded-2xl mr-4 ${
                                            res.type === 'pdf' ? 'bg-blue-50 text-blue-500' : 
                                            res.type === 'video' ? 'bg-red-50 text-red-500' : 
                                            res.type === 'audio' ? 'bg-purple-50 text-purple-500' : 'bg-indigo-50 text-indigo-500'
                                        }`}>
                                            {res.type === 'pdf' ? <DocumentTextIcon className="w-6 h-6"/> : 
                                             res.type === 'video' ? <VideoIcon className="w-6 h-6"/> : 
                                             res.type === 'audio' ? <MusicIcon className="w-6 h-6"/> : <LinkIcon className="w-6 h-6"/>}
                                        </div>
                                        <div className="truncate">
                                            <p className="text-sm font-black text-gray-800 dark:text-gray-200 truncate">{res.title}</p>
                                            <p className="text-[9px] text-indigo-500 font-black uppercase tracking-widest mt-0.5">
                                                {(adminCourses.find(c => c.id === res.courseId)?.nombre || res.courseId)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <a href={res.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"><DownloadIcon className="w-5 h-5"/></a>
                                        <button onClick={() => handleDeleteItem('recursos', res.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            ))}
                            {courseResources.length === 0 && <div className="p-20 text-center text-gray-400 italic font-medium">No hay materiales publicados.</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* OTROS TABS (MANTENIDOS IGUALES) */}
            {activeTab === 'students' && !selectedStudent && (
                 <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700 animate-fade-in">
                    <div className="p-6 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                        <div className="relative w-full max-w-lg">
                            <input type="text" placeholder="Buscar alumno..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-gray-700 shadow-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            <SearchIcon className="w-6 h-6 absolute left-4 top-3.5 text-blue-500"/>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead><tr className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase text-gray-400 font-black tracking-widest"><th className="px-8 py-5">Estudiante</th><th className="px-8 py-5">Rol</th><th className="px-8 py-5 text-right"></th></tr></thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {students.filter(s => s.nombre.toLowerCase().includes(studentSearchTerm.toLowerCase())).map(s => (
                                    <tr key={s.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-8 py-5 flex items-center font-bold text-sm text-gray-800 dark:text-gray-200">
                                            <img src={s.avatar_url} className="w-12 h-12 rounded-2xl mr-5 shadow-md border-2 border-white"/>
                                            {s.nombre}
                                        </td>
                                        <td className="px-8 py-5 text-xs text-blue-500 font-black uppercase">{s.rol}</td>
                                        <td className="px-8 py-5 text-right"><button onClick={() => handleSelectStudent(s)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 tracking-widest transition-all shadow-lg">Gestionar</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'students' && selectedStudent && (
                <div className="animate-fade-in space-y-6">
                    <div className="flex justify-between items-center">
                        <button onClick={() => setSelectedStudent(null)} className="flex items-center text-blue-600 font-black uppercase text-[10px] tracking-widest"><ChevronLeftIcon className="w-5 h-5 mr-1"/> Volver</button>
                        <div className="flex space-x-2">
                            <button onClick={handleDownloadPDF} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center hover:bg-gray-200"><DownloadIcon className="w-4 h-4 mr-2"/> Descargar Notas</button>
                            <button onClick={handleSendCreds} className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center hover:bg-amber-200"><MailIcon className="w-4 h-4 mr-2"/> Enviar Credenciales</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border-t-8 border-blue-600 space-y-6">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Perfil</h3>
                            <div className="flex flex-col items-center">
                                <img src={selectedStudent.avatar_url} className="w-24 h-24 rounded-3xl shadow-xl border-4 border-white mb-4"/>
                                <h4 className="text-center font-black text-gray-800 leading-tight">{selectedStudent.nombre}</h4>
                            </div>
                            <div className="space-y-4">
                                <input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email" className="w-full p-4 rounded-2xl bg-gray-50 text-sm font-bold shadow-inner"/>
                                <input value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Clave" className="w-full p-4 rounded-2xl bg-gray-50 text-sm font-bold shadow-inner"/>
                                <button onClick={handleUpdateProfile} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-[11px] uppercase shadow-lg">Actualizar</button>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border-t-8 border-green-500">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Inscripciones</h3>
                            <div className="space-y-3 overflow-y-auto max-h-[450px]">
                                {adminCourses.map(course => (
                                    <div key={course.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                                        <div className="flex-1 overflow-hidden mr-4"><p className="text-[11px] font-black text-gray-800 truncate">{course.nombre}</p></div>
                                        <button onClick={() => {}} className={`p-2 rounded-xl ${studentInscriptions.includes(course.id) ? 'bg-blue-600 text-white' : 'text-gray-300'}`}><CheckIcon className="w-4 h-4"/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border-t-8 border-amber-500">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Calificaciones</h3>
                            <div className="space-y-3 overflow-y-auto max-h-[450px]">
                                {studentGrades.map(g => (
                                    <div key={g.id} className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center">
                                        <div className="truncate mr-2"><p className="text-[10px] font-black text-blue-500 uppercase">{(adminCourses.find(c => c.id === g.curso_id)?.nombre || 'MAT').substring(0,10)}</p><p className="text-xs font-bold text-gray-800 truncate">{g.titulo_asignacion}</p></div>
                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black">{g.puntuacion}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border-t-8 border-indigo-500">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Pagos</h3>
                            <div className="space-y-3 overflow-y-auto max-h-[450px]">
                                {studentPayments.map(p => (
                                    <div key={p.id} className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center">
                                        <div className="truncate"><p className="text-[9px] font-black text-gray-400 uppercase">{p.date}</p><p className="text-xs font-bold text-gray-800 truncate">{p.description}</p></div>
                                        <span className="text-green-600 text-xs font-black ml-2">${p.amount}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {(activeTab === 'assignments' || activeTab === 'exams') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-blue-500 h-fit space-y-6">
                        <h3 className="font-black flex items-center text-gray-700 uppercase text-xs tracking-widest"><PlusIcon className="w-6 h-6 mr-3 text-blue-600"/> Nuevo {activeTab === 'assignments' ? 'Tarea' : 'Examen'}</h3>
                        <div className="space-y-4">
                            <select value={newItem.courseId} onChange={e => setNewItem({...newItem, courseId: e.target.value})} className="w-full p-4 text-xs border rounded-2xl font-black uppercase"><option value="">Materia...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                            <input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="Título / Tema" className="w-full p-4 text-xs border rounded-2xl font-bold"/>
                            <div className="flex gap-4">
                                <input type="date" value={newItem.date} onChange={e => setNewItem({...newItem, date: e.target.value})} className="flex-1 p-4 text-xs border rounded-2xl font-bold"/>
                                {activeTab === 'exams' && <input type="time" value={newItem.time} onChange={e => setNewItem({...newItem, time: e.target.value})} className="w-32 p-4 text-xs border rounded-2xl font-bold"/>}
                            </div>
                            <button onClick={activeTab === 'assignments' ? handleAddAssignment : handleAddExam} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-blue-700">Publicar</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700 h-[600px] flex flex-col">
                        <div className="p-6 bg-gray-50 border-b font-black text-[10px] uppercase tracking-widest text-gray-400">Listado Actual</div>
                        <div className="flex-1 overflow-y-auto divide-y">
                            {(activeTab === 'assignments' ? allAssignments : allExams).map((item: any) => (
                                <div key={item.id} className="p-5 flex items-center justify-between hover:bg-gray-50">
                                    <div className="truncate mr-4">
                                        <p className="text-[10px] font-black text-blue-500 uppercase">{(adminCourses.find(c => c.id === item.curso_id)?.nombre || item.curso_id)}</p>
                                        <p className="text-sm font-bold text-gray-800 truncate">{item.titulo}</p>
                                        <p className="text-[9px] text-gray-400 flex items-center mt-1"><CalendarIcon className="w-3 h-3 mr-1"/> {item.fecha_entrega || item.fecha} {item.hora && ` - ${item.hora}`}</p>
                                    </div>
                                    <button onClick={() => handleDeleteItem(activeTab === 'assignments' ? 'asignaciones' : 'examenes', item.id)} className="text-gray-300 hover:text-red-500 transition-colors"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'attendance' && (
                <div className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-2xl animate-fade-in border-t-8 border-green-500 space-y-8">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Materia</label>
                            <select value={attCourse} onChange={e => setAttCourse(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none text-sm font-black uppercase"><option value="">Seleccionar Materia...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                        </div>
                        <div className="w-full md:w-64 space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha</label>
                            <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none text-sm font-black"/>
                        </div>
                        <button onClick={loadAttendanceList} className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-green-700 h-[56px] tracking-widest">Cargar Alumnos</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {attList.map(alumno => (
                            <div key={alumno.id} onClick={() => toggleAttendance(alumno.id, alumno.estado)} className={`flex items-center justify-between p-5 rounded-3xl cursor-pointer transition-all border-2 ${alumno.estado === 'presente' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex items-center">
                                    <img src={alumno.avatar} className="w-10 h-10 rounded-xl mr-4 shadow-sm"/>
                                    <p className="text-xs font-black text-gray-800">{alumno.nombre}</p>
                                </div>
                                {alumno.estado === 'presente' ? <CheckCircleIcon className="w-6 h-6 text-green-500"/> : <XIcon className="w-6 h-6 text-red-500"/>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'announcements' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-indigo-500 h-fit space-y-6">
                        <h3 className="font-black flex items-center text-gray-700 uppercase text-xs tracking-widest"><PlusIcon className="w-6 h-6 mr-3 text-indigo-600"/> Nuevo Aviso Académico</h3>
                        <div className="space-y-4">
                            <input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="Asunto del anuncio" className="w-full p-4 text-xs border rounded-2xl font-bold"/>
                            <textarea rows={5} value={newItem.content} onChange={e => setNewItem({...newItem, content: e.target.value})} placeholder="Mensaje para los estudiantes..." className="w-full p-4 text-xs border rounded-2xl font-medium"></textarea>
                            <button onClick={handlePostAnnouncement} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-indigo-700 flex items-center justify-center tracking-widest"><SendIcon className="w-4 h-4 mr-2"/> Publicar Anuncio</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border h-[600px] flex flex-col">
                        <div className="p-6 bg-gray-50 border-b font-black text-[10px] uppercase tracking-widest text-gray-400">Anuncios Enviados</div>
                        <div className="flex-1 overflow-y-auto divide-y">
                            {allAnnouncements.map(msg => (
                                <div key={msg.id} className="p-6 hover:bg-gray-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-sm font-black text-gray-800">{msg.asunto}</p>
                                        <button onClick={() => handleDeleteItem('mensajes', msg.id)} className="text-gray-300 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                    <div className="flex items-center text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                                        <ClockIcon className="w-3 h-3 mr-1"/> {new Date(msg.fecha_envio).toLocaleDateString()}
                                    </div>
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
