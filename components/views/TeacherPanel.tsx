
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

    const [activeTab, setActiveTab] = useState<'students' | 'resources' | 'assignments' | 'exams' | 'attendance' | 'announcements' | 'courses'>('students');
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

    // Detalle de Materia Seleccionada (Para edición de Admin)
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
    
    // Estados Asistencia
    const [attCourse, setAttCourse] = useState('');
    const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
    const [attList, setAttList] = useState<any[]>([]);
    const [attLoading, setAttLoading] = useState(false);
    const [savingAttendanceId, setSavingAttendanceId] = useState<string | null>(null);

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
        if (!newGrade.courseId || !newGrade.score || !selectedStudent) return alert("Completa los datos de la nota (Materia y Puntuación).");
        const { error } = await supabase.from('notas').insert({
            estudiante_id: selectedStudent.id,
            curso_id: newGrade.courseId,
            titulo_asignacion: newGrade.title || "Evaluación Continua",
            puntuacion: parseFloat(newGrade.score),
            puntuacion_maxima: 100
        });
        if (!error) {
            alert("Calificación cargada con éxito.");
            setNewGrade({ courseId: '', title: '', score: '' });
            handleSelectStudent(selectedStudent);
        }
    };

    const handleAddPayment = async () => {
        if (!newPayment.amount || !selectedStudent) return alert("Ingresa el monto del pago.");
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
            alert("Abono registrado correctamente.");
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
        if (!confirm("¿Deseas eliminar este registro definitivamente?")) return;
        await supabase.from(table).delete().eq('id', id);
        fetchInitialData();
    };

    const loadAttendanceList = async () => {
        if (!attCourse) return alert("Selecciona una materia primero.");
        setAttLoading(true);
        setAttList([]);
        try {
            const { data: inscritos } = await supabase.from('inscripciones').select('estudiante_id').eq('curso_id', attCourse);
            const ids = (inscritos || []).map(i => i.estudiante_id);
            if (ids.length === 0) { alert("Sin alumnos inscritos."); setAttLoading(false); return; }

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

    const cycleAttendance = async (studentId: string, currentStatus: string) => {
        if (savingAttendanceId) return;
        let nextStatus = currentStatus === 'ninguno' ? 'presente' : currentStatus === 'presente' ? 'ausente' : 'ninguno';
        
        setSavingAttendanceId(studentId);
        try {
            if (nextStatus === 'ninguno') {
                const { error } = await supabase.from('asistencias')
                    .delete()
                    .eq('estudiante_id', studentId)
                    .eq('curso_id', attCourse)
                    .eq('fecha', attDate);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('asistencias').upsert({ 
                    estudiante_id: studentId, 
                    curso_id: attCourse, 
                    fecha: attDate, 
                    estado: nextStatus 
                }, { onConflict: 'estudiante_id,curso_id,fecha' });
                if (error) throw error;
            }
            
            // Actualizar estado local solo si la DB respondió bien
            setAttList(prev => prev.map(a => a.id === studentId ? { ...a, estado: nextStatus } : a));
        } catch (err) {
            console.error("Error al guardar asistencia:", err);
            alert("No se pudo guardar la asistencia en el servidor. Verifica tu conexión.");
        } finally {
            setSavingAttendanceId(null);
        }
    };

    const handlePostAnnouncement = async () => {
        if (!newItem.title || !newItem.content) return alert("Completa los campos del aviso.");
        setIsSaving(true);
        const { error } = await supabase.from('mensajes').insert({ 
            remitente: user.name, asunto: newItem.title, contenido: newItem.content, 
            leido: false, fecha_envio: new Date().toISOString() 
        });
        if (!error) alert("Anuncio académico publicado.");
        setNewItem({ courseId: '', title: '', date: '', time: '', content: '', type: 'pdf' });
        fetchAnnouncements();
        setIsSaving(false);
    };

    if (loading) return <div className="p-20 text-center animate-pulse text-blue-600 font-black tracking-widest uppercase">Cargando Administración LTS Cloud...</div>;

    return (
        <div className="space-y-6 pb-20 max-w-[1600px] mx-auto px-4 animate-fade-in">
            <h1 className="text-3xl font-black flex items-center text-gray-800 dark:text-white tracking-tighter uppercase">
                <AcademicCapIcon className="h-9 w-9 mr-4 text-blue-600"/>
                Administración General LTS
            </h1>

            {/* TABS NAVEGACIÓN ESTÉTICA */}
            <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700/50 p-1.5 rounded-3xl overflow-x-auto shadow-inner border dark:border-gray-700">
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
                        className={`flex items-center px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all whitespace-nowrap tracking-widest ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-xl' : 'text-gray-500 hover:bg-white/50'}`}
                    >
                        <tab.icon className="w-4 h-4 mr-2"/> {tab.label}
                    </button>
                ))}
            </div>

            {/* --- LISTADO ESTUDIANTES / STAFF --- */}
            {activeTab === 'students' && !selectedStudent && (
                 <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700 animate-fade-in">
                    <div className="p-6 border-b dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
                        <div className="relative w-full max-w-lg group">
                            <input type="text" placeholder="Buscar por nombre de usuario..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-gray-700 shadow-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
                            <SearchIcon className="w-6 h-6 absolute left-4 top-3.5 text-blue-500 group-focus-within:text-blue-600 transition-colors"/>
                        </div>
                        {isAdmin && (
                            <button 
                                onClick={() => setShowNewMemberModal(true)} 
                                className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-green-700 transition-all flex items-center tracking-widest active:scale-95"
                            >
                                <PlusIcon className="w-5 h-5 mr-2"/> Registrar Nuevo Miembro
                            </button>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead><tr className="bg-gray-100 dark:bg-gray-900 text-[10px] uppercase text-gray-400 font-black tracking-widest"><th className="px-8 py-5">Identidad</th><th className="px-8 py-5">Rol Académico</th><th className="px-8 py-5">Estado</th><th className="px-8 py-5 text-right">Ficha</th></tr></thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {students.filter(s => s.nombre.toLowerCase().includes(studentSearchTerm.toLowerCase())).map(s => (
                                    <tr key={s.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-8 py-5 flex items-center font-bold text-sm text-gray-800 dark:text-gray-200">
                                            <img src={s.avatar_url} className="w-12 h-12 rounded-2xl mr-5 shadow-md border-2 border-white group-hover:scale-110 transition-transform object-cover"/>
                                            {s.nombre}
                                        </td>
                                        <td className="px-8 py-5 text-[10px] text-blue-500 font-black uppercase tracking-widest">{s.rol}</td>
                                        <td className="px-8 py-5"><span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase ${s.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.activo ? 'Activo' : 'Inactivo'}</span></td>
                                        <td className="px-8 py-5 text-right"><button onClick={() => handleSelectStudent(s)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 tracking-widest shadow-lg transition-all active:scale-95">Gestionar Ficha</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL NUEVO MIEMBRO */}
            {showNewMemberModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden border dark:border-gray-700">
                        <div className="bg-blue-600 p-8 text-white flex justify-between items-center">
                            <div><h3 className="text-xl font-black uppercase tracking-tighter">Registrar Miembro</h3><p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">LTS Academic Cloud System</p></div>
                            <button onClick={() => setShowNewMemberModal(false)} className="bg-white/20 hover:bg-white/40 p-2 rounded-full transition-colors"><XIcon className="w-6 h-6"/></button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label><input type="text" value={newMember.nombre} onChange={e => setNewMember({...newMember, nombre: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 font-bold border-none outline-none shadow-inner"/></div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Académico</label><input type="email" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 font-bold border-none outline-none shadow-inner"/></div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña de Inicio</label><input type="text" value={newMember.password} onChange={e => setNewMember({...newMember, password: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 font-bold border-none outline-none shadow-inner"/></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rol</label><select value={newMember.rol} onChange={e => setNewMember({...newMember, rol: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 font-black uppercase"><option value="estudiante">Estudiante</option><option value="profesor">Profesor</option><option value="admin">Admin</option></select></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Estado Inicial</label><select value={newMember.activo ? 'true' : 'false'} onChange={e => setNewMember({...newMember, activo: e.target.value === 'true'})} className="w-full p-4 rounded-2xl bg-gray-50 font-black uppercase"><option value="true">Activo</option><option value="false">Inactivo</option></select></div>
                            </div>
                            <button onClick={handleCreateMember} disabled={isSaving} className={`w-full py-5 mt-4 rounded-[2rem] font-black text-[11px] uppercase shadow-xl tracking-widest transition-all ${isSaving ? 'bg-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}>Guardar y Crear Cuenta</button>
                        </div>
                    </div>
                </div>
            )}

            {/* DETALLE ESTUDIANTE / STAFF (LA FICHA) */}
            {activeTab === 'students' && selectedStudent && (
                <div className="animate-fade-in space-y-6">
                    <div className="flex justify-between items-center bg-gray-100 p-3 rounded-3xl border border-gray-200 shadow-sm">
                        <button onClick={() => setSelectedStudent(null)} className="flex items-center text-blue-600 font-black uppercase text-[10px] tracking-widest bg-white px-5 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition-all active:scale-95"><ChevronLeftIcon className="h-5 w-5 mr-1"/> Volver</button>
                        <button onClick={handleDownloadPDF} className="bg-white text-gray-700 border px-6 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center hover:bg-gray-50 transition-all shadow-sm active:scale-95"><DownloadIcon className="w-4 h-4 mr-2 text-blue-600"/> Boletín Notas (PDF)</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
                        {/* 1. Perfil y Pill Switch de Activación */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-xl border-t-8 border-blue-600 text-center flex flex-col min-h-[550px]">
                            <div className="relative inline-block mx-auto mb-4">
                                <img src={editAvatarUrl || selectedStudent.avatar_url} className="w-24 h-24 rounded-[2rem] shadow-xl border-4 border-white object-cover"/>
                            </div>
                            <h4 className="font-black text-gray-800 dark:text-white text-md leading-tight mb-1 uppercase tracking-tighter">{selectedStudent.nombre}</h4>
                            <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-4">{editRol}</p>
                            
                            <div className="space-y-2.5 text-left flex-1">
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Email</label><input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full p-2.5 rounded-xl bg-gray-50 text-xs font-bold shadow-inner border-none outline-none dark:text-gray-800"/></div>
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Clave</label><input type="text" value={editPassword} onChange={e => setEditPassword(e.target.value)} className="w-full p-2.5 rounded-xl bg-gray-50 text-xs font-bold shadow-inner border-none outline-none dark:text-gray-800"/></div>
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">URL de Foto</label><input type="text" value={editAvatarUrl} onChange={e => setEditAvatarUrl(e.target.value)} placeholder="https://..." className="w-full p-2.5 rounded-xl bg-gray-50 text-[10px] font-bold shadow-inner border-none outline-none dark:text-gray-800"/></div>
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Rol</label><select value={editRol} onChange={e => setEditRol(e.target.value)} className="w-full p-2.5 rounded-xl bg-gray-50 text-xs font-black uppercase shadow-inner border-none outline-none dark:text-gray-800"><option value="estudiante">Estudiante</option><option value="profesor">Profesor</option><option value="admin">Administrador</option></select></div>
                                
                                <div className="pt-2 flex flex-col items-center">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Estado del Usuario</label>
                                    <div 
                                        onClick={() => setEditActivo(!editActivo)}
                                        className={`relative w-40 h-9 rounded-full cursor-pointer transition-all duration-300 p-1 flex items-center ${editActivo ? 'bg-green-500 shadow-inner' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center ${editActivo ? 'translate-x-[124px]' : 'translate-x-0'}`}>
                                            {editActivo ? <CheckIcon className="w-3.5 h-3.5 text-green-600"/> : <XIcon className="w-3.5 h-3.5 text-gray-400"/>}
                                        </div>
                                        <span className={`flex-1 text-center text-[9px] font-black uppercase transition-all ${editActivo ? 'text-white pr-8' : 'text-gray-600 pl-8'}`}>
                                            {editActivo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-5 space-y-2">
                                <button onClick={handleSendCreds} className="w-full bg-amber-500 text-white py-2.5 rounded-xl font-black text-[9px] uppercase shadow-lg hover:bg-amber-600 transition-all flex items-center justify-center active:scale-95"><MailIcon className="w-3.5 h-3.5 mr-2"/> Enviar Credenciales</button>
                                <button onClick={handleUpdateProfile} className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-black text-[9px] uppercase shadow-lg hover:bg-blue-700 transition-all active:scale-95">Guardar Cambios</button>
                            </div>
                        </div>

                        {/* 2. Inscripciones / Materias */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-xl border-t-8 border-green-500 flex flex-col min-h-[550px]">
                             <h3 className="text-[9px] font-black uppercase mb-4 flex items-center text-gray-400 tracking-widest"><BookOpenIcon className="w-4 h-4 mr-2"/> Inscripciones</h3>
                             <div className="space-y-1.5 overflow-y-auto max-h-[450px] pr-2">
                                {adminCourses.map(course => {
                                    const isEnrolled = studentInscriptions.includes(course.id);
                                    return (
                                        <div key={course.id} onClick={() => toggleInscription(course.id)} className={`flex justify-between items-center p-3 rounded-xl border-2 transition-all cursor-pointer shadow-sm ${isEnrolled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100 hover:border-blue-100'}`}>
                                            <p className={`text-[10px] font-black truncate ${isEnrolled ? 'text-green-800' : 'text-gray-400'}`}>{course.nombre}</p>
                                            <div className={`p-1.5 rounded-lg transition-all ${isEnrolled ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-300'}`}><CheckIcon className="w-3 h-3"/></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. Carga y Lista de Notas */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-xl border-t-8 border-amber-500 flex flex-col min-h-[550px]">
                             <h3 className="text-[9px] font-black uppercase mb-4 flex items-center text-gray-400 tracking-widest"><ChartBarIcon className="w-4 h-4 mr-2"/> Calificaciones</h3>
                             
                             <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-3xl border mb-4 space-y-2 shadow-inner border-green-50">
                                <select value={newGrade.courseId} onChange={e => setNewGrade({...newGrade, courseId: e.target.value})} className="w-full p-2.5 text-[9px] rounded-lg font-black uppercase bg-white border-none shadow-sm dark:text-gray-800"><option value="">Materia...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                                <input placeholder="Evaluación" value={newGrade.title} onChange={e => setNewGrade({...newGrade, title: e.target.value})} className="w-full p-2.5 text-[10px] font-bold rounded-lg bg-white border-none shadow-sm dark:text-gray-800"/>
                                <div className="flex gap-1.5"><input type="number" placeholder="Nota" value={newGrade.score} onChange={e => setNewGrade({...newGrade, score: e.target.value})} className="flex-1 p-2.5 text-[10px] font-black rounded-lg bg-white border-none shadow-sm dark:text-gray-800"/><button onClick={handleAddGrade} className="bg-green-600 text-white p-2.5 rounded-lg hover:bg-green-700 transition-all shadow-md active:scale-95"><PlusIcon className="w-5 h-5"/></button></div>
                             </div>

                             <div className="space-y-2 overflow-y-auto max-h-[300px] pr-2">
                                {studentGrades.map(g => (
                                    <div key={g.id} className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl flex justify-between items-center group shadow-sm transition-all border border-transparent hover:border-amber-100">
                                        <div className="truncate text-left flex-1"><p className="text-[8px] font-black text-blue-500 uppercase">{(adminCourses.find(c => c.id === g.curso_id)?.nombre || 'G').substring(0,18)}</p><p className="text-[10px] font-bold truncate text-gray-700 dark:text-gray-200">{g.titulo_asignacion}</p></div>
                                        <div className="flex items-center space-x-2"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black shadow-inner">{g.puntuacion}</span><button onClick={() => handleDeleteItem('notas', g.id)} className="text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><TrashIcon className="w-4 h-4"/></button></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 4. Pagos / Historial */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-xl border-t-8 border-indigo-500 flex flex-col min-h-[550px]">
                             <h3 className="text-[9px] font-black uppercase mb-4 flex items-center text-gray-400 tracking-widest"><CurrencyDollarIcon className="w-4 h-4 mr-2"/> Pagos</h3>
                             
                             <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-3xl border mb-4 space-y-2 shadow-inner border-indigo-100">
                                <div className="relative"><CurrencyDollarIcon className="absolute left-3 top-2.5 w-4 h-4 text-indigo-400"/><input type="number" placeholder="Monto" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} className="w-full pl-9 p-2.5 text-[11px] font-black rounded-lg bg-white border-none shadow-sm dark:text-gray-800"/></div>
                                <select value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})} className="w-full p-2.5 text-[9px] rounded-lg font-black bg-white border-none shadow-sm uppercase dark:text-gray-800"><option value="Zelle">Zelle</option><option value="Pago Móvil">Pago Móvil</option><option value="Efectivo">Efectivo</option></select>
                                <button onClick={handleAddPayment} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-black text-[9px] uppercase shadow-lg hover:bg-indigo-700 transition-all active:scale-95">Registrar</button>
                             </div>

                             <div className="space-y-2 overflow-y-auto max-h-[300px] pr-2">
                                {studentPayments.map(p => (
                                    <div key={p.id} className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl flex justify-between items-center group shadow-sm hover:bg-white border border-transparent hover:border-indigo-100">
                                        <div className="truncate text-left"><p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">{p.date}</p><p className="text-[10px] font-bold truncate text-gray-700 dark:text-gray-200">{p.method}</p></div>
                                        <div className="flex items-center space-x-2"><span className="text-green-600 text-[10px] font-black">${p.amount}</span><button onClick={() => handleDeleteItem('pagos', p.id)} className="text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><TrashIcon className="w-4 h-4"/></button></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- GESTIÓN MATERIAS (CON LUPA Y PREVIEW) --- */}
            {activeTab === 'courses' && !selectedCourse && (
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700 animate-fade-in">
                    <div className="p-8 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50">
                        <div className="relative w-full max-w-lg group">
                            <SearchIcon className="w-5 h-5 absolute left-5 top-4.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <input type="text" placeholder="Buscar materia por nombre o código ID..." value={courseSearchTerm} onChange={(e) => setCourseSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-4 rounded-2xl bg-white dark:bg-gray-700 shadow-xl text-sm border-2 border-transparent focus:border-blue-500 outline-none transition-all dark:text-white" />
                        </div>
                    </div>
                    <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase font-black tracking-widest text-gray-400"><th className="px-10 py-6">Materia</th><th className="px-10 py-6">Profesor Titular</th><th className="px-10 py-6 text-right">Edición</th></tr></thead><tbody className="divide-y dark:divide-gray-700">{adminCourses.filter(c => c.nombre.toLowerCase().includes(courseSearchTerm.toLowerCase())).map(c => (<tr key={c.id} className="hover:bg-blue-50/40 group"><td className="px-10 py-6 font-bold text-sm text-gray-800 dark:text-gray-200">{c.nombre} <br/> <span className="text-[9px] text-blue-500 uppercase tracking-widest font-black">CÓDIGO: {c.id}</span></td><td className="px-10 py-6 text-sm text-gray-600 dark:text-gray-400 font-medium">{c.profesor}</td><td className="px-10 py-6 text-right"><button onClick={() => setSelectedCourse(c)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-blue-700 tracking-widest shadow-lg active:scale-95 transition-all">Editar Ficha Académica</button></td></tr>))}</tbody></table></div>
                </div>
            )}

            {/* EDITOR MATERIA (CON MINIATURA DINÁMICA) */}
            {activeTab === 'courses' && selectedCourse && (
                <div className="animate-fade-in space-y-6">
                    <button onClick={() => setSelectedCourse(null)} className="flex items-center text-blue-600 font-black uppercase text-[10px] bg-white px-6 py-3 rounded-2xl shadow-md active:scale-95 transition-all"><ChevronLeftIcon className="w-5 h-5 mr-1"/> Volver al Catálogo</button>
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3.5rem] shadow-2xl border-t-8 border-blue-500">
                        <h2 className="text-2xl font-black uppercase mb-10 border-b pb-4 text-gray-800 dark:text-white">Ficha de Edición: <span className="text-blue-600">{selectedCourse.nombre}</span></h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 text-left">
                            <div className="space-y-6">
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Nombre Oficial</label><input value={selectedCourse.nombre} onChange={e => setSelectedCourse({...selectedCourse, nombre: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 font-bold border-none outline-none shadow-inner dark:text-gray-800"/></div>
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Profesor Responsable</label><input value={selectedCourse.profesor} onChange={e => setSelectedCourse({...selectedCourse, profesor: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 font-bold border-none outline-none shadow-inner dark:text-gray-800"/></div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Imagen de Portada (Enlace Público)</label>
                                    <div className="flex gap-4 items-center">
                                        <input value={selectedCourse.image_url || ''} onChange={e => setSelectedCourse({...selectedCourse, image_url: e.target.value})} placeholder="https://ejemplo.com/imagen.jpg" className="flex-1 p-4 rounded-2xl bg-gray-50 font-medium text-xs border-none outline-none shadow-inner italic dark:text-gray-800"/>
                                        <div className="w-24 h-24 bg-gray-100 rounded-3xl shadow-lg overflow-hidden border-4 border-white flex-shrink-0 flex items-center justify-center">
                                            {selectedCourse.image_url ? <img src={selectedCourse.image_url} className="w-full h-full object-cover" /> : <div className="text-[8px] text-gray-400 font-black p-2 text-center uppercase tracking-tighter">Vista Previa No Disponible</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Descripción General</label><textarea rows={3} value={selectedCourse.descripcion} onChange={e => setSelectedCourse({...selectedCourse, descripcion: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none shadow-inner text-sm font-medium dark:text-gray-800"></textarea></div>
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Contenido Académico Detallado</label><textarea rows={6} value={selectedCourse.contenido_detallado} onChange={e => setSelectedCourse({...selectedCourse, contenido_detallado: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none shadow-inner text-sm font-medium dark:text-gray-800"></textarea></div>
                            </div>
                        </div>
                        <button onClick={handleUpdateCourse} className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black uppercase shadow-2xl hover:bg-blue-700 mt-10 transition-all active:scale-[0.98]">Guardar Ficha Académica</button>
                    </div>
                </div>
            )}

            {/* --- SECCIÓN BIBLIOTECA DIGITAL (COMPLETA) --- */}
            {activeTab === 'resources' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    {/* Publicación de Recursos */}
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-indigo-500 h-fit space-y-8">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-white uppercase text-sm tracking-widest"><PlusIcon className="w-6 h-6 mr-3 text-indigo-600"/> Publicar Material Académico</h3>
                        <div className="space-y-5 text-left">
                            <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-400 ml-2 tracking-widest">Materia Destinataria</label><select value={newItem.courseId} onChange={e => setNewItem({...newItem, courseId: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none shadow-inner text-sm font-black uppercase dark:text-gray-800">{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                            <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-400 ml-2 tracking-widest">Nombre del Documento/Archivo</label><input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="Ej: Material de Apoyo - Unidad 3" className="w-full p-4 rounded-2xl bg-gray-50 font-bold border-none outline-none shadow-inner text-sm dark:text-gray-800"/></div>
                            <div className="grid grid-cols-4 gap-2">
                                {['pdf', 'video', 'audio', 'link'].map(t => (<button key={t} onClick={() => { setNewItem({...newItem, type: t as any}); setSelectedFile(null); }} className={`p-3 rounded-xl border-2 text-[8px] font-black uppercase transition-all ${newItem.type === t ? 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-md' : 'border-gray-100 text-gray-400'}`}>{t}</button>))}
                            </div>
                            {newItem.type === 'link' ? (
                                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-400 ml-2 tracking-widest">Enlace de Referencia (URL)</label><input type="text" value={newItem.content} onChange={e => setNewItem({...newItem, content: e.target.value})} placeholder="https://drive.google.com/..." className="w-full p-4 rounded-2xl bg-indigo-50/30 border-none outline-none shadow-inner italic text-sm dark:text-gray-800"/></div>
                            ) : (
                                <div onClick={() => fileInputRef.current?.click()} className={`w-full p-10 border-2 border-dashed rounded-[3rem] cursor-pointer text-center group transition-all ${selectedFile ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-indigo-500'}`}>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                    <UploadIcon className="w-12 h-12 text-gray-300 group-hover:text-indigo-500 mx-auto mb-4 transition-colors"/>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{selectedFile ? `Seleccionado: ${selectedFile.name}` : 'Haz clic aquí para seleccionar el archivo local'}</p>
                                    {selectedFile && <p className="text-[8px] text-green-500 mt-2 font-bold uppercase tracking-tighter">Archivo Listo para Cargar</p>}
                                </div>
                            )}
                            <button onClick={handlePostResource} disabled={isSaving} className={`w-full py-6 rounded-[2.5rem] font-black bg-indigo-600 text-white uppercase shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center ${isSaving ? 'opacity-50' : ''}`}><CloudIcon className="w-6 h-6 mr-3"/> Publicar en Repositorio Cloud</button>
                        </div>
                    </div>
                    {/* Listado de Recursos de la Biblioteca */}
                    <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl overflow-hidden h-[800px] flex flex-col border dark:border-gray-700">
                        <div className="p-8 bg-gray-100 dark:bg-gray-900 border-b flex justify-between items-center"><h3 className="font-black text-[11px] uppercase text-gray-400 tracking-widest">Acervo Digital de Recursos</h3><span className="bg-indigo-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full shadow-lg">{courseResources.length} RECURSOS TOTALES</span></div>
                        <div className="flex-1 overflow-y-auto divide-y dark:divide-gray-700">
                            {courseResources.length > 0 ? courseResources.map(res => (
                                <div key={res.id} className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all">
                                    <div className="flex items-center truncate text-left">
                                        <div className={`p-4 rounded-2xl mr-5 shadow-sm ${res.type === 'video' ? 'bg-red-50 text-red-500' : res.type === 'pdf' ? 'bg-blue-50 text-blue-500' : res.type === 'audio' ? 'bg-purple-50 text-purple-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                            {res.type === 'video' ? <VideoIcon className="w-6 h-6"/> : res.type === 'pdf' ? <DocumentTextIcon className="w-6 h-6"/> : res.type === 'audio' ? <MusicIcon className="w-6 h-6"/> : <LinkIcon className="w-6 h-6"/>}
                                        </div>
                                        <div className="truncate">
                                            <p className="text-sm font-black text-gray-800 dark:text-white truncate">{res.title}</p>
                                            <p className="text-[9px] text-gray-400 font-black uppercase mt-1 tracking-tighter">{(adminCourses.find(c => c.id === res.courseId)?.nombre || 'LTS Recursos Comunes')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <a href={res.url} target="_blank" className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-indigo-100 hover:text-indigo-600 text-gray-400 transition-all"><DownloadIcon className="w-4 h-4"/></a>
                                        <button onClick={() => handleDeleteItem('recursos', res.id)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-red-100 hover:text-red-500 text-gray-400 transition-all"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            )) : <div className="p-24 text-center opacity-30 flex flex-col items-center justify-center"><LinkIcon className="w-20 h-20 mb-4"/><p className="font-black text-sm uppercase tracking-widest text-center">La biblioteca no contiene archivos aún</p></div>}
                        </div>
                    </div>
                </div>
            )}

            {/* SECCIÓN ASISTENCIA */}
            {activeTab === 'attendance' && (
                <div className="bg-white dark:bg-gray-800 p-10 rounded-[3.5rem] shadow-2xl border-t-8 border-green-500 space-y-10 animate-fade-in">
                    <div className="flex flex-col md:flex-row gap-6 items-end bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[3rem] border dark:border-gray-700 shadow-inner">
                        <div className="flex-1 space-y-2 text-left">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Elegir Materia / Clase</label>
                            <select value={attCourse} onChange={e => setAttCourse(e.target.value)} className="w-full p-4 rounded-2xl border-none text-sm font-black uppercase shadow-lg focus:ring-2 focus:ring-green-500 outline-none dark:text-gray-800">{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                        </div>
                        <div className="w-full md:w-64 space-y-2 text-left">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Fecha del Día de Clase</label>
                            <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} className="w-full p-4 rounded-2xl border-none text-sm font-black shadow-lg outline-none dark:text-gray-800"/>
                        </div>
                        <button onClick={loadAttendanceList} disabled={attLoading} className="bg-green-600 text-white px-12 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-green-700 h-[56px] disabled:opacity-50 transition-all active:scale-95">
                            {attLoading ? 'Cargando Lista...' : 'Listar Grupo para Asistencia'}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {attList.length > 0 ? attList.map(alumno => (
                            <div 
                                key={alumno.id} 
                                onClick={() => cycleAttendance(alumno.id, alumno.estado)} 
                                className={`flex items-center justify-between p-6 rounded-[2.5rem] cursor-pointer transition-all border-2 shadow-sm transform hover:-translate-y-2 relative overflow-hidden ${savingAttendanceId === alumno.id ? 'opacity-50' : ''} ${alumno.estado === 'presente' ? 'bg-green-50 border-green-200' : alumno.estado === 'ausente' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100 dark:bg-gray-700/50'}`}
                            >
                                {savingAttendanceId === alumno.id && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/20">
                                        <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                                <div className="flex items-center text-left">
                                    <img src={alumno.avatar} className="w-14 h-14 rounded-2xl mr-4 border-2 border-white shadow-md object-cover"/>
                                    <div><p className="text-xs font-black text-gray-800 dark:text-white leading-tight">{alumno.nombre}</p><p className={`text-[8px] font-black uppercase mt-1 ${alumno.estado === 'ninguno' ? 'text-gray-400' : 'text-blue-500'}`}>{alumno.estado === 'ninguno' ? 'Por Marcar' : alumno.estado}</p></div>
                                </div>
                                {alumno.estado === 'presente' ? <CheckCircleIcon className="w-8 h-8 text-green-500"/> : alumno.estado === 'ausente' ? <XIcon className="w-8 h-8 text-red-500"/> : <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300"></div>}
                            </div>
                        )) : <div className="col-span-full py-24 text-center opacity-30 text-sm font-black uppercase flex flex-col items-center"><UserGroupIcon className="w-20 h-20 mb-4"/><p className="text-center">Selecciona una cátedra y lista el grupo para iniciar el control de asistencia diario</p></div>}
                    </div>
                </div>
            )}

            {/* SECCIÓN ANUNCIOS */}
            {activeTab === 'announcements' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-indigo-500 h-fit space-y-8">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-white uppercase text-sm tracking-widest"><PlusIcon className="w-6 h-6 mr-3 text-indigo-600"/> Comunicado Académico Oficial</h3>
                        <div className="space-y-4 text-left">
                            <input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="Asunto del Comunicado..." className="w-full p-5 text-sm bg-gray-50 dark:bg-gray-900/50 border-none rounded-[2rem] font-black shadow-inner outline-none dark:text-white"/>
                            <textarea rows={6} value={newItem.content} onChange={e => setNewItem({...newItem, content: e.target.value})} placeholder="Redacta aquí el contenido íntegro del anuncio para la comunidad del seminario..." className="w-full p-6 text-sm bg-gray-50 dark:bg-gray-900/50 border-none rounded-[2rem] font-medium shadow-inner outline-none dark:text-white"></textarea>
                            <button onClick={handlePostAnnouncement} disabled={isSaving} className={`w-full bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black text-[11px] uppercase shadow-2xl hover:bg-indigo-700 flex items-center justify-center transition-all ${isSaving ? 'opacity-50' : 'active:scale-95'}`}><SendIcon className="w-5 h-5 mr-3"/> Publicar en el Tablón General</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl overflow-hidden h-[750px] flex flex-col border dark:border-gray-700">
                        <div className="p-8 bg-gray-100 dark:bg-gray-900 border-b font-black text-[11px] uppercase text-gray-400 tracking-widest">Histórico de Avisos</div>
                        <div className="flex-1 overflow-y-auto divide-y dark:divide-gray-700">
                            {allAnnouncements.length > 0 ? allAnnouncements.map(msg => (
                                <div key={msg.id} className="p-8 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-all flex justify-between items-start group">
                                    <div className="text-left"><p className="text-sm font-black text-gray-800 dark:text-white leading-snug">{msg.asunto}</p><p className="text-[9px] font-black text-indigo-500 uppercase mt-3 flex items-center"><ClockIcon className="w-3.5 h-3.5 mr-2"/> Publicado el: {new Date(msg.fecha_envio).toLocaleString()}</p></div>
                                    <button onClick={() => handleDeleteItem('mensajes', msg.id)} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            )) : <div className="p-24 text-center opacity-30 flex flex-col items-center justify-center"><MailIcon className="w-20 h-20 mb-4"/><p className="font-black text-sm uppercase tracking-widest">No se han registrado anuncios oficiales aún</p></div>}
                        </div>
                    </div>
                </div>
            )}
            
            {/* SECCIÓN TAREAS Y EXAMENES */}
            {(activeTab === 'assignments' || activeTab === 'exams') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-blue-500 h-fit space-y-8">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-white uppercase text-sm tracking-widest"><PlusIcon className="w-6 h-6 mr-3 text-blue-600"/> Programar {activeTab === 'assignments' ? 'Nueva Tarea' : 'Nuevo Examen'}</h3>
                        <div className="space-y-5 text-left">
                            <select value={newItem.courseId} onChange={e => setNewItem({...newItem, courseId: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none outline-none shadow-inner font-black uppercase text-sm dark:text-gray-800">{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                            <input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="Título / Nombre de la actividad..." className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 font-bold border-none outline-none shadow-inner dark:text-gray-800"/>
                            <div className="flex gap-4"><input type="date" value={newItem.date} onChange={e => setNewItem({...newItem, date: e.target.value})} className="flex-1 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 font-bold border-none outline-none shadow-inner dark:text-gray-800"/>{activeTab === 'exams' && <input type="time" value={newItem.time} onChange={e => setNewItem({...newItem, time: e.target.value})} className="w-32 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 font-bold border-none outline-none shadow-inner dark:text-gray-800"/>}</div>
                            <button onClick={activeTab === 'assignments' ? async () => { await supabase.from('asignaciones').insert({ curso_id: newItem.courseId, titulo: newItem.title, fecha_entrega: newItem.date, entregado: false }); fetchAssignments(); alert("Tarea integrada al calendario."); } : async () => { await supabase.from('examenes').insert({ curso_id: newItem.courseId, titulo: newItem.title, fecha: newItem.date, hora: newItem.time }); fetchExams(); alert("Examen integrado al calendario académico."); }} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-[11px] uppercase hover:bg-blue-700 shadow-xl transition-all active:scale-95">Publicar en Agenda Académica</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl overflow-hidden h-[750px] flex flex-col border dark:border-gray-700">
                        <div className="p-8 bg-gray-100 dark:bg-gray-900 border-b font-black text-[11px] uppercase text-gray-400 tracking-widest">Próximas Actividades Programadas</div>
                        <div className="flex-1 overflow-y-auto divide-y dark:divide-gray-700">
                            {(activeTab === 'assignments' ? allAssignments : allExams).map((item: any) => (
                                <div key={item.id} className="p-8 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-all flex justify-between items-center group">
                                    <div className="text-left truncate"><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{(adminCourses.find(c => c.id === item.curso_id)?.nombre || 'LTS Materia')}</p><p className="text-sm font-black text-gray-800 dark:text-white truncate">{item.titulo}</p><p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest flex items-center"><CalendarIcon className="w-3.5 h-3.5 mr-1.5 inline"/> {item.fecha_entrega || item.fecha} {item.hora && ` a las ${item.hora}`}</p></div>
                                    <button onClick={() => handleDeleteItem(activeTab === 'assignments' ? 'asignaciones' : 'examenes', item.id)} className="text-gray-300 hover:text-red-500 p-2 transition-colors opacity-0 group-hover:opacity-100"><TrashIcon className="w-6 h-6"/></button>
                                </div>
                            ))}
                            {(activeTab === 'assignments' ? allAssignments : allExams).length === 0 && (
                                <div className="flex flex-col items-center justify-center py-24 opacity-20"><CalendarIcon className="w-20 h-20 mb-4"/><p className="text-sm font-black uppercase tracking-widest">Sin actividades registradas</p></div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CloudIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
    </svg>
);

export default TeacherPanel;
