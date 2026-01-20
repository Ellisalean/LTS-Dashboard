
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
    const hasFullAccess = isAdmin || isTeacher;

    const [activeTab, setActiveTab] = useState<'students' | 'courses' | 'resources' | 'attendance' | 'announcements'>('students');
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

    // Detalle del Alumno Seleccionado
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

    // Detalle de Materia Seleccionada
    const [selectedCourse, setSelectedCourse] = useState<CourseAdminData | null>(null);

    // Estado para Nuevo Miembro
    const [showNewMemberModal, setShowNewMemberModal] = useState(false);
    const [newMember, setNewMember] = useState({ nombre: '', email: '', password: '', rol: 'estudiante', activo: true });

    // Estados para Formularios
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
        if (!newItem.courseId || !newItem.title) return alert("Completa los campos.");
        setIsSaving(true);
        let finalUrl = newItem.content;
        
        if (newItem.type !== 'link' && selectedFile) {
            try {
                const filePath = `${newItem.courseId}/${Date.now()}-${selectedFile.name}`;
                const { error: upErr } = await supabase.storage.from('recursos').upload(filePath, selectedFile);
                if (upErr) throw upErr;
                const { data: { publicUrl } } = supabase.storage.from('recursos').getPublicUrl(filePath);
                finalUrl = publicUrl;
            } catch (e) {
                alert("Error al subir archivo.");
                setIsSaving(false);
                return;
            }
        }

        const { error } = await supabase.from('recursos').insert({ 
            course_id: newItem.courseId, 
            titulo: newItem.title, 
            url: finalUrl, 
            tipo: newItem.type 
        });

        if (!error) {
            alert("¡Éxito! El recurso ha sido publicado.");
            setNewItem({ courseId: '', title: '', date: '', time: '', content: '', type: 'pdf' });
            setSelectedFile(null);
            fetchResources();
        }
        setIsSaving(false);
    };

    const handleUpdateCourse = async () => {
        if (!selectedCourse) return;
        setIsSaving(true);
        const { error } = await supabase.from('cursos').update({ 
            nombre: selectedCourse.nombre, 
            profesor: selectedCourse.profesor, 
            creditos: selectedCourse.creditos, 
            descripcion: selectedCourse.descripcion,
            contenido_detallado: selectedCourse.contenido_detallado, 
            image_url: selectedCourse.image_url
        }).eq('id', selectedCourse.id);
        
        if (!error) {
            alert("Información de materia actualizada.");
            fetchCourses();
            setSelectedCourse(null);
        }
        setIsSaving(false);
    };

    const handleUpdateProfile = async () => {
        if (!selectedStudent) return;
        setIsSaving(true);
        const { error } = await supabase.from('estudiantes').update({ 
            nombre: editName, 
            email: editEmail, 
            password: editPassword, 
            rol: editRol,
            activo: editActivo,
            avatar_url: editAvatarUrl
        }).eq('id', selectedStudent.id);
        
        if (!error) {
            alert("Perfil de usuario actualizado correctamente.");
            fetchStudents();
            setSelectedStudent(prev => prev ? { ...prev, nombre: editName, email: editEmail, password: editPassword, rol: editRol, activo: editActivo, avatar_url: editAvatarUrl } : null);
        }
        setIsSaving(false);
    };

    const handleCreateMember = async () => {
        if (!newMember.nombre || !newMember.email || !newMember.password) return alert("Completa los campos obligatorios.");
        setIsSaving(true);
        const { error } = await supabase.from('estudiantes').insert({
            nombre: newMember.nombre, 
            email: newMember.email, 
            password: newMember.password,
            rol: newMember.rol, 
            activo: newMember.activo, 
            avatar_url: `https://i.pravatar.cc/150?u=${newMember.email}`,
            matricula: new Date().toISOString()
        });
        
        if (!error) {
            alert("Nuevo miembro registrado.");
            setShowNewMemberModal(false);
            fetchStudents();
        }
        setIsSaving(false);
    };

    const handleSendCreds = async () => {
        if (!selectedStudent || !hasFullAccess) return;
        setIsSaving(true);
        try {
            const res = await fetch('/.netlify/functions/send-welcome-email', {
                method: 'POST',
                body: JSON.stringify({ 
                    email: editEmail, 
                    name: editName, 
                    password: editPassword || selectedStudent.password, 
                    role: editRol || selectedStudent.rol 
                })
            });
            if (res.ok) alert(`Credenciales enviadas a ${editName}`);
            else alert("No se pudo enviar el correo de bienvenida.");
        } catch (e) { alert("Error de conexión."); }
        finally { setIsSaving(false); }
    };

    const handleDownloadPDF = () => {
        if (!selectedStudent) return;
        const doc = new jsPDF();
        doc.addImage(SCHOOL_LOGO_URL, 'PNG', 15, 15, 25, 25);
        doc.setFontSize(20); doc.setTextColor(30, 58, 138); 
        doc.text("Latin Theological Seminary", 45, 25);
        doc.setFontSize(14); doc.text("Boletín de Calificaciones Académico", 45, 33);
        doc.setFontSize(10); doc.setTextColor(0);
        doc.text(`Estudiante: ${selectedStudent.nombre}`, 15, 55);
        doc.text(`Email: ${selectedStudent.email}`, 15, 60);
        doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 15, 65);
        
        const tableData = studentGrades.map(g => [
            adminCourses.find(c => c.id === g.curso_id)?.nombre || g.curso_id, 
            g.titulo_asignacion, 
            g.puntuacion.toString()
        ]);
        
        autoTable(doc, { 
            startY: 75, head: [['Materia', 'Actividad', 'Nota']], body: tableData,
            theme: 'striped', headStyles: { fillColor: [30, 58, 138] },
            styles: { fontSize: 9 }
        });
        
        doc.save(`Boletin_${selectedStudent.nombre.replace(/\s+/g, '_')}.pdf`);
    };

    const handleAddGrade = async () => {
        if (!newGrade.courseId || !newGrade.score || !selectedStudent) return alert("Completa los datos de la nota.");
        const { error } = await supabase.from('notas').insert({
            estudiante_id: selectedStudent.id,
            curso_id: newGrade.courseId,
            titulo_asignacion: newGrade.title || "Evaluación Continua",
            puntuacion: parseFloat(newGrade.score),
            puntuacion_maxima: 100
        });
        if (!error) {
            alert("Nota cargada.");
            setNewGrade({ courseId: '', title: '', score: '' });
            handleSelectStudent(selectedStudent);
        }
    };

    const handleAddPayment = async () => {
        if (!newPayment.amount || !selectedStudent) return alert("Ingresa el monto.");
        const { error } = await supabase.from('pagos').insert({
            student_id: selectedStudent.id,
            amount: parseFloat(newPayment.amount),
            date: newPayment.date,
            description: newPayment.desc || "Mensualidad Académica",
            method: newPayment.method,
            verified: true,
            type: 'tuition'
        });
        if (!error) {
            alert("Pago registrado.");
            setNewPayment({ amount: '', date: new Date().toISOString().split('T')[0], desc: '', method: 'Zelle' });
            handleSelectStudent(selectedStudent);
        }
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

    const toggleInscription = async (courseId: string) => {
        if (!selectedStudent || isSaving) return;
        setIsSaving(true);
        const isEnrolled = studentInscriptions.includes(courseId);
        try {
            if (isEnrolled) {
                await supabase.from('inscripciones').delete().eq('estudiante_id', selectedStudent.id).eq('curso_id', courseId);
                setStudentInscriptions(prev => prev.filter(id => id !== courseId));
            } else {
                await supabase.from('inscripciones').insert({ estudiante_id: selectedStudent.id, curso_id: courseId });
                setStudentInscriptions(prev => [...prev, courseId]);
            }
        } catch (err) { alert("Error al actualizar inscripción."); }
        finally { setIsSaving(false); }
    };

    const handleDeleteItem = async (table: string, id: string) => {
        if (!confirm("¿Deseas eliminar este registro?")) return;
        await supabase.from(table).delete().eq('id', id);
        fetchInitialData();
    };

    // --- LÓGICA DE ASISTENCIA SEGURA ---
    const handleResetDailyAttendance = async () => {
        if (!attCourse) return alert("Selecciona la materia.");
        if (!confirm(`¿Eliminar TODOS los registros de asistencia de hoy para esta materia?`)) return;
        setAttLoading(true);
        try {
            await supabase.from('asistencias').delete().eq('curso_id', attCourse).eq('fecha', attDate);
            alert("Asistencia diaria reiniciada.");
            loadAttendanceList();
        } catch (e) { console.error(e); }
        finally { setAttLoading(false); }
    };

    const loadAttendanceList = async () => {
        if (!attCourse) return alert("Selecciona una materia.");
        setAttLoading(true);
        try {
            const { data: inscritos } = await supabase.from('inscripciones').select('estudiante_id').eq('curso_id', attCourse);
            const ids = (inscritos || []).map(i => i.estudiante_id);
            if (ids.length === 0) { alert("Sin alumnos inscritos."); setAttList([]); return; }

            const [{ data: profs }, { data: hist }] = await Promise.all([
                supabase.from('estudiantes').select('id, nombre, avatar_url, activo').in('id', ids),
                supabase.from('asistencias').select('*').eq('curso_id', attCourse).eq('fecha', attDate)
            ]);

            const mapped = (profs || [])
                .filter(p => p.activo !== false)
                .map(p => ({
                    id: p.id, 
                    nombre: p.nombre, 
                    avatar: p.avatar_url,
                    estado: hist?.find(h => h.estudiante_id === p.id)?.estado || 'ninguno'
                }));
            setAttList(mapped);
        } catch (e) { console.error(e); }
        finally { setAttLoading(false); }
    };

    const handleSetAttendanceSafe = async (studentId: string, status: 'presente' | 'ausente' | 'ninguno') => {
        if (savingId) return;
        if (!attCourse) return alert("Selecciona materia.");

        setSavingId(studentId);
        setAttList(prev => prev.map(a => a.id === studentId ? { ...a, estado: status } : a));

        try {
            // Borrar e Insertar para asegurar consistencia
            await supabase.from('asistencias').delete().eq('estudiante_id', studentId).eq('curso_id', attCourse).eq('fecha', attDate);
            if (status !== 'ninguno') {
                await supabase.from('asistencias').insert({ estudiante_id: studentId, curso_id: attCourse, fecha: attDate, estado: status });
            }
        } catch (err) { alert("Error de sincronización."); loadAttendanceList(); }
        finally { setSavingId(null); }
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

    if (loading) return <div className="p-20 text-center animate-pulse text-blue-600 font-black tracking-widest uppercase">Cargando Panel Maestro LTS...</div>;

    return (
        <div className="space-y-6 pb-20 max-w-[1600px] mx-auto px-4 animate-fade-in">
            <h1 className="text-3xl font-black flex items-center text-gray-800 dark:text-white tracking-tighter uppercase">
                <AcademicCapIcon className="h-9 w-9 mr-4 text-blue-600"/>
                Gestión Centralizada LTS Cloud
            </h1>

            {/* TABS DE NAVEGACIÓN */}
            <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700/50 p-1.5 rounded-3xl overflow-x-auto shadow-inner border dark:border-gray-700">
                {[
                    { id: 'students', label: 'Estudiantes / Staff', icon: UserGroupIcon },
                    { id: 'courses', label: 'Cátedras', icon: BookOpenIcon },
                    { id: 'resources', label: 'Biblioteca', icon: LinkIcon },
                    { id: 'attendance', label: 'Asistencia', icon: CheckIcon },
                    { id: 'announcements', label: 'Anuncios', icon: MailIcon },
                ].map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => { setActiveTab(tab.id as any); setSelectedStudent(null); setSelectedCourse(null); }} 
                        className={`flex items-center px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all whitespace-nowrap tracking-widest ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-xl' : 'text-gray-500 hover:bg-white/50'}`}
                    >
                        <tab.icon className="w-4 h-4 mr-2"/> {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB: ASISTENCIA */}
            {activeTab === 'attendance' && (
                <div className="bg-white dark:bg-gray-800 p-10 rounded-[3.5rem] shadow-2xl border-t-8 border-green-500 space-y-10 animate-fade-in">
                    <div className="flex flex-col md:flex-row gap-6 items-end bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[3rem] border dark:border-gray-700 shadow-inner">
                        <div className="flex-1 space-y-2 text-left">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Seleccionar Materia</label>
                            <select value={attCourse} onChange={e => setAttCourse(e.target.value)} className="w-full p-4 rounded-2xl border-none text-sm font-black uppercase shadow-lg focus:ring-2 focus:ring-green-500 outline-none dark:text-gray-800"><option value="">Selecciona cátedra...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                        </div>
                        <div className="w-full md:w-64 space-y-2 text-left">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Fecha de Clase</label>
                            <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} className="w-full p-4 rounded-2xl border-none text-sm font-black shadow-lg outline-none dark:text-gray-800"/>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={loadAttendanceList} disabled={attLoading} className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-green-700 h-[56px] active:scale-95">Listar</button>
                            {attList.length > 0 && <button onClick={handleResetDailyAttendance} className="bg-red-50 text-red-600 border border-red-100 px-6 py-4 rounded-2xl hover:bg-red-600 hover:text-white transition-all h-[56px] shadow-sm"><TrashIcon className="w-5 h-5"/></button>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {attList.map(alumno => (
                            <div key={alumno.id} className={`flex flex-col p-6 rounded-[2.5rem] bg-gray-50 dark:bg-gray-700/30 border-2 transition-all shadow-sm ${savingId === alumno.id ? 'opacity-50 border-blue-300' : 'border-transparent hover:border-blue-100'}`}>
                                <div className="flex items-center mb-6">
                                    <img src={alumno.avatar} className="w-14 h-14 rounded-2xl mr-4 border-2 border-white shadow-md object-cover"/>
                                    <div className="flex-1 text-left overflow-hidden">
                                        <p className="text-xs font-black text-gray-800 dark:text-white truncate uppercase tracking-tighter">{alumno.nombre}</p>
                                        <div className="flex items-center mt-1">
                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${alumno.estado === 'presente' ? 'bg-green-100 text-green-700' : alumno.estado === 'ausente' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-500'}`}>{alumno.estado}</span>
                                            {savingId === alumno.id && <div className="ml-2 w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-inner border dark:border-gray-700 gap-1">
                                    <button onClick={() => handleSetAttendanceSafe(alumno.id, 'presente')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${alumno.estado === 'presente' ? 'bg-green-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>Presente</button>
                                    <button onClick={() => handleSetAttendanceSafe(alumno.id, 'ausente')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${alumno.estado === 'ausente' ? 'bg-red-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>Ausente</button>
                                    <button onClick={() => handleSetAttendanceSafe(alumno.id, 'ninguno')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${alumno.estado === 'ninguno' ? 'bg-gray-400 text-white shadow-md' : 'text-gray-300 hover:bg-gray-50'}`}>Limpiar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB: ESTUDIANTES */}
            {activeTab === 'students' && !selectedStudent && (
                 <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700 animate-fade-in">
                    <div className="p-6 border-b dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
                        <div className="relative w-full max-w-lg group">
                            <input type="text" placeholder="Buscar por nombre..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-gray-700 shadow-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
                            <SearchIcon className="w-6 h-6 absolute left-4 top-3.5 text-blue-500 group-focus-within:text-blue-600 transition-colors"/>
                        </div>
                        {isAdmin && <button onClick={() => setShowNewMemberModal(true)} className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-green-700 transition-all flex items-center active:scale-95"><PlusIcon className="w-5 h-5 mr-2"/> Nuevo Miembro</button>}
                    </div>
                    <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-gray-100 dark:bg-gray-900 text-[10px] uppercase text-gray-400 font-black tracking-widest"><th className="px-8 py-5">Identidad</th><th className="px-8 py-5">Rol Académico</th><th className="px-8 py-5">Estado</th><th className="px-8 py-5 text-right">Ficha</th></tr></thead><tbody className="divide-y dark:divide-gray-700">{students.filter(s => s.nombre.toLowerCase().includes(studentSearchTerm.toLowerCase())).map(s => (<tr key={s.id} className="hover:bg-blue-50/30 transition-colors group"><td className="px-8 py-5 flex items-center font-bold text-sm text-gray-800 dark:text-gray-200"><img src={s.avatar_url} className="w-12 h-12 rounded-2xl mr-5 shadow-md border-2 border-white object-cover"/>{s.nombre}</td><td className="px-8 py-5 text-[10px] text-blue-500 font-black uppercase tracking-widest">{s.rol}</td><td className="px-8 py-5"><span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase ${s.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.activo ? 'Activo' : 'Inactivo'}</span></td><td className="px-8 py-5 text-right"><button onClick={() => handleSelectStudent(s)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 tracking-widest shadow-lg transition-all active:scale-95">Gestionar</button></td></tr>))}</tbody></table></div>
                </div>
            )}

            {/* EDITOR ALUMNO (Versión completa) */}
            {activeTab === 'students' && selectedStudent && (
                <div className="animate-fade-in space-y-6">
                    <button onClick={() => setSelectedStudent(null)} className="flex items-center text-blue-600 font-black uppercase text-[10px] tracking-widest bg-white px-5 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition-all active:scale-95"><ChevronLeftIcon className="h-5 w-5 mr-1"/> Volver</button>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
                         {/* Perfil */}
                         <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-xl border-t-8 border-blue-600 text-center flex flex-col min-h-[550px]">
                            <img src={editAvatarUrl || selectedStudent.avatar_url} className="w-24 h-24 rounded-[2rem] shadow-xl border-4 border-white object-cover mx-auto mb-4"/>
                            <h4 className="font-black text-gray-800 dark:text-white text-md uppercase tracking-tighter">{selectedStudent.nombre}</h4>
                            <div className="space-y-2.5 text-left flex-1 mt-4">
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Email</label><input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full p-2.5 rounded-xl bg-gray-50 text-xs font-bold border-none outline-none dark:text-gray-800 shadow-inner"/></div>
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Contraseña</label><input type="text" value={editPassword} onChange={e => setEditPassword(e.target.value)} className="w-full p-2.5 rounded-xl bg-gray-50 text-xs font-bold border-none outline-none dark:text-gray-800 shadow-inner"/></div>
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Rol</label><select value={editRol} onChange={e => setEditRol(e.target.value)} className="w-full p-2.5 rounded-xl bg-gray-50 text-xs font-black uppercase border-none outline-none dark:text-gray-800 shadow-inner"><option value="estudiante">Estudiante</option><option value="profesor">Profesor</option><option value="admin">Administrador</option></select></div>
                            </div>
                            <div className="mt-5 space-y-2">
                                <button onClick={handleUpdateProfile} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[9px] uppercase shadow-lg">Actualizar Perfil</button>
                                <button onClick={handleSendCreds} className="w-full bg-green-50 text-green-700 py-3 rounded-xl font-black text-[9px] uppercase border border-green-200">Enviar Credenciales</button>
                                <button onClick={handleDownloadPDF} className="w-full bg-indigo-50 text-indigo-700 py-3 rounded-xl font-black text-[9px] uppercase border border-indigo-200">Boletín PDF</button>
                            </div>
                         </div>
                         {/* Inscripciones */}
                         <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-xl border-t-8 border-green-500 flex flex-col min-h-[550px]">
                            <h3 className="text-[9px] font-black uppercase mb-4 text-gray-400 tracking-widest flex items-center"><BookOpenIcon className="w-4 h-4 mr-2"/> Cátedras Inscritas</h3>
                            <div className="space-y-1.5 overflow-y-auto max-h-[450px] pr-2">
                                {adminCourses.map(course => {
                                    const isEnrolled = studentInscriptions.includes(course.id);
                                    return (
                                        <div key={course.id} onClick={() => toggleInscription(course.id)} className={`flex justify-between items-center p-3 rounded-xl border-2 transition-all cursor-pointer shadow-sm ${isEnrolled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100 hover:border-blue-100'}`}>
                                            <p className={`text-[10px] font-black truncate ${isEnrolled ? 'text-green-800' : 'text-gray-400'}`}>{course.nombre}</p>
                                            <div className={`p-1.5 rounded-lg ${isEnrolled ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-300'}`}><CheckIcon className="w-3 h-3"/></div>
                                        </div>
                                    );
                                })}
                            </div>
                         </div>
                         {/* Notas */}
                         <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-xl border-t-8 border-amber-500 flex flex-col min-h-[550px]">
                            <h3 className="text-[9px] font-black uppercase mb-4 text-gray-400 tracking-widest flex items-center"><ChartBarIcon className="w-4 h-4 mr-2"/> Calificaciones</h3>
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-3xl border mb-4 space-y-2 shadow-inner border-amber-50">
                                <select value={newGrade.courseId} onChange={e => setNewGrade({...newGrade, courseId: e.target.value})} className="w-full p-2.5 text-[9px] rounded-lg font-black bg-white dark:text-gray-800"><option value="">Materia...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                                <input placeholder="Nota (Ej: 95)" value={newGrade.score} onChange={e => setNewGrade({...newGrade, score: e.target.value})} className="w-full p-2.5 text-[10px] font-black rounded-lg bg-white dark:text-gray-800 shadow-sm border-none"/>
                                <button onClick={handleAddGrade} className="w-full bg-amber-600 text-white p-2.5 rounded-lg font-black text-[9px] uppercase shadow-md">Cargar Nota</button>
                            </div>
                            <div className="space-y-2 overflow-y-auto max-h-[300px] pr-2">
                                {studentGrades.map(g => (
                                    <div key={g.id} className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl flex justify-between items-center group shadow-sm border border-transparent hover:border-amber-100">
                                        <div className="truncate text-left flex-1"><p className="text-[8px] font-black text-blue-500 uppercase">{(adminCourses.find(c => c.id === g.curso_id)?.nombre || '').substring(0,18)}</p><p className="text-[10px] font-bold text-gray-700 truncate">{g.titulo_asignacion}</p></div>
                                        <div className="flex items-center space-x-2"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black shadow-inner">{g.puntuacion}</span><button onClick={() => handleDeleteItem('notas', g.id)} className="text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><TrashIcon className="w-4 h-4"/></button></div>
                                    </div>
                                ))}
                            </div>
                         </div>
                         {/* Pagos */}
                         <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-xl border-t-8 border-indigo-500 flex flex-col min-h-[550px]">
                            <h3 className="text-[9px] font-black uppercase mb-4 text-gray-400 tracking-widest flex items-center"><CurrencyDollarIcon className="h-4 w-4 mr-2"/> Historial Pagos</h3>
                            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-3xl border mb-4 space-y-2 shadow-inner border-indigo-100">
                                <input type="number" placeholder="Monto ($)" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} className="w-full p-2.5 text-[11px] font-black rounded-lg bg-white dark:text-gray-800 border-none"/>
                                <select value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})} className="w-full p-2.5 text-[9px] rounded-lg font-black bg-white dark:text-gray-800 shadow-sm uppercase border-none"><option value="Zelle">Zelle</option><option value="Pago Móvil">Pago Móvil</option><option value="Efectivo">Efectivo</option></select>
                                <button onClick={handleAddPayment} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-black text-[9px] uppercase shadow-lg transition-all active:scale-95">Registrar</button>
                            </div>
                            <div className="space-y-2 overflow-y-auto max-h-[300px] pr-2">
                                {studentPayments.map(p => (
                                    <div key={p.id} className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl flex justify-between items-center group shadow-sm border border-transparent hover:border-indigo-100">
                                        <div className="truncate text-left flex-1"><p className="text-[8px] font-black text-gray-400 uppercase">{p.date}</p><p className="text-[10px] font-bold text-gray-700 truncate">{p.method}</p></div>
                                        <div className="flex items-center space-x-2"><span className="text-green-600 text-[10px] font-black">${p.amount}</span><button onClick={() => handleDeleteItem('pagos', p.id)} className="text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><TrashIcon className="w-4 h-4"/></button></div>
                                    </div>
                                ))}
                            </div>
                         </div>
                    </div>
                </div>
            )}

            {/* TAB: MATERIAS (CÁTEDRAS) */}
            {activeTab === 'courses' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-2xl border-t-8 border-blue-500">
                        <div className="relative mb-6">
                            <input type="text" placeholder="Buscar cátedra para editar..." value={courseSearchTerm} onChange={(e) => setCourseSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-100 dark:bg-gray-900 shadow-inner border-none text-sm font-black uppercase outline-none dark:text-white" />
                            <SearchIcon className="w-6 h-6 absolute left-4 top-3.5 text-blue-500"/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[700px] overflow-y-auto pr-2">
                            {adminCourses.filter(c => c.nombre.toLowerCase().includes(courseSearchTerm.toLowerCase())).map(c => (
                                <div key={c.id} onClick={() => setSelectedCourse(c)} className={`p-4 rounded-[2rem] border-2 cursor-pointer transition-all ${selectedCourse?.id === c.id ? 'bg-blue-600 border-blue-600 text-white shadow-2xl scale-[1.02]' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 hover:border-blue-400 shadow-sm'}`}>
                                    <p className="text-xs font-black uppercase leading-none mb-1">{c.nombre}</p>
                                    {/* Fix: Changed selectedUser to selectedCourse */}
                                    <p className={`text-[9px] font-bold uppercase tracking-widest ${selectedCourse?.id === c.id ? 'text-blue-100' : 'text-gray-400'}`}>Cód: {c.id}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    {selectedCourse ? (
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-2xl border-t-8 border-indigo-500 space-y-6">
                            <h3 className="font-black flex items-center text-gray-800 dark:text-white uppercase text-sm tracking-widest">Editando: {selectedCourse.nombre}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Nombre</label><input value={selectedCourse.nombre} onChange={e => setSelectedCourse({...selectedCourse, nombre: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border-none shadow-inner dark:text-gray-800"/></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Profesor</label><input value={selectedCourse.profesor} onChange={e => setSelectedCourse({...selectedCourse, profesor: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border-none shadow-inner dark:text-gray-800"/></div>
                            </div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Descripción</label><textarea rows={3} value={selectedCourse.descripcion} onChange={e => setSelectedCourse({...selectedCourse, descripcion: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-medium text-sm border-none shadow-inner dark:text-gray-800"></textarea></div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Contenido Detallado</label><textarea rows={6} value={selectedCourse.contenido_detallado} onChange={e => setSelectedCourse({...selectedCourse, contenido_detallado: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-medium text-xs border-none shadow-inner dark:text-gray-800"></textarea></div>
                            <button onClick={handleUpdateCourse} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center"><CheckIcon className="w-5 h-5 mr-3"/> Guardar Cambios en Materia</button>
                        </div>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[3rem] border-2 border-dashed flex flex-col items-center justify-center p-20 opacity-30"><BookOpenIcon className="w-20 h-20 mb-4"/><p className="font-black uppercase text-sm tracking-widest">Selecciona una materia para editar</p></div>
                    )}
                </div>
            )}

            {/* TAB: BIBLIOTECA (RECURSOS) */}
            {activeTab === 'resources' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-blue-500 h-fit space-y-8">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-white uppercase text-sm tracking-widest"><PlusIcon className="w-6 h-6 mr-3 text-blue-600"/> Publicar Nuevo Material</h3>
                        <div className="space-y-4 text-left">
                            <select value={newItem.courseId} onChange={e => setNewItem({...newItem, courseId: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl font-black text-sm border-none shadow-inner dark:text-gray-800"><option value="">Materia de destino...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                            <input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="Título del Material (Ej: Lectura Semana 1)" className="w-full p-4 bg-gray-50 rounded-2xl font-black text-sm border-none shadow-inner dark:text-gray-800"/>
                            <div className="flex bg-gray-100 p-2 rounded-2xl gap-2">
                                {['pdf', 'video', 'audio', 'link'].map(t => (
                                    <button key={t} onClick={() => setNewItem({...newItem, type: t as any})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${newItem.type === t ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>{t}</button>
                                ))}
                            </div>
                            {newItem.type === 'link' ? (
                                <input type="text" value={newItem.content} onChange={e => setNewItem({...newItem, content: e.target.value})} placeholder="Pega el URL aquí..." className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm border-none shadow-inner dark:text-gray-800"/>
                            ) : (
                                <div onClick={() => fileInputRef.current?.click()} className="w-full p-10 border-2 border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 bg-gray-50/50 group transition-all">
                                    <UploadIcon className="w-10 h-10 mb-2 text-gray-300 group-hover:text-blue-500"/>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedFile ? selectedFile.name : 'Click para subir archivo local'}</p>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={newItem.type === 'pdf' ? '.pdf' : newItem.type === 'video' ? 'video/*' : 'audio/*'}/>
                                </div>
                            )}
                            <button onClick={handlePostResource} disabled={isSaving} className={`w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black text-[11px] uppercase shadow-2xl flex items-center justify-center transition-all ${isSaving ? 'opacity-50' : 'active:scale-95'}`}><SendIcon className="w-5 h-5 mr-3"/> {isSaving ? 'Publicando...' : 'Publicar Material Oficial'}</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl overflow-hidden h-[750px] flex flex-col border dark:border-gray-700">
                        <div className="p-8 bg-gray-100 dark:bg-gray-900 border-b font-black text-[11px] uppercase text-gray-400 tracking-widest flex justify-between items-center">Biblioteca Compartida <span className="text-blue-500">{courseResources.length} ITEMS</span></div>
                        <div className="flex-1 overflow-y-auto divide-y dark:divide-gray-700">
                            {courseResources.map(res => (
                                <div key={res.id} className="p-6 hover:bg-gray-50 transition-all flex justify-between items-center group">
                                    <div className="flex items-center text-left">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl mr-4">{res.type === 'video' ? <VideoIcon className="w-5 h-5"/> : res.type === 'pdf' ? <DocumentTextIcon className="w-5 h-5"/> : <LinkIcon className="w-5 h-5"/>}</div>
                                        <div><p className="text-sm font-black text-gray-800 truncate w-64 uppercase leading-none mb-1">{res.title}</p><p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">{adminCourses.find(c => c.id === res.courseId)?.nombre || res.courseId}</p></div>
                                    </div>
                                    <button onClick={() => handleDeleteItem('recursos', res.id)} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: ANUNCIOS */}
            {activeTab === 'announcements' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-indigo-500 h-fit space-y-8">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-white uppercase text-sm tracking-widest"><PlusIcon className="w-6 h-6 mr-3 text-indigo-600"/> Comunicado Académico</h3>
                        <div className="space-y-4 text-left">
                            <input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="Asunto..." className="w-full p-5 text-sm bg-gray-50 border-none rounded-[2rem] font-black shadow-inner outline-none dark:text-gray-800"/>
                            <textarea rows={6} value={newItem.content} onChange={e => setNewItem({...newItem, content: e.target.value})} placeholder="Contenido..." className="w-full p-6 text-sm bg-gray-50 border-none rounded-[2rem] font-medium shadow-inner outline-none dark:text-gray-800"></textarea>
                            <button onClick={handlePostAnnouncement} disabled={isSaving} className={`w-full bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black text-[11px] uppercase shadow-2xl hover:bg-indigo-700 flex items-center justify-center transition-all ${isSaving ? 'opacity-50' : 'active:scale-95'}`}><SendIcon className="w-5 h-5 mr-3"/> Publicar Aviso</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl overflow-hidden h-[750px] flex flex-col border dark:border-gray-700">
                        <div className="p-8 bg-gray-100 dark:bg-gray-900 border-b font-black text-[11px] uppercase text-gray-400 tracking-widest">Historial de Comunicados</div>
                        <div className="flex-1 overflow-y-auto divide-y dark:divide-gray-700">
                            {allAnnouncements.map(msg => (
                                <div key={msg.id} className="p-8 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-all flex justify-between items-start group text-left">
                                    <div><p className="text-sm font-black text-gray-800 dark:text-white leading-snug">{msg.asunto}</p><p className="text-[9px] font-black text-indigo-500 uppercase mt-3 flex items-center"><ClockIcon className="w-3.5 h-3.5 mr-2"/> {new Date(msg.fecha_envio).toLocaleString()}</p></div>
                                    <button onClick={() => handleDeleteItem('mensajes', msg.id)} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"><TrashIcon className="w-5 h-5"/></button>
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
