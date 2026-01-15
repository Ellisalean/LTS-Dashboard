
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

    // --- ACCIONES ---
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
        if (!newItem.courseId || !newItem.title) return alert("Por favor completa los campos del recurso.");
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

    // Fix: Added handleUpdateProfile function to fix the missing name error
    const handleUpdateProfile = async () => {
        if (!selectedStudent) return;
        setIsSaving(true);
        const { error } = await supabase.from('estudiantes').update({ 
            nombre: editName, 
            email: editEmail, 
            password: editPassword, 
            activo: editActivo 
        }).eq('id', selectedStudent.id);
        
        if (!error) {
            alert("Perfil del estudiante actualizado.");
            fetchStudents();
            setSelectedStudent(prev => prev ? { ...prev, nombre: editName, email: editEmail, password: editPassword, activo: editActivo } : null);
        } else {
            alert("Error al actualizar el perfil: " + (error as any).message);
        }
        setIsSaving(false);
    };

    const handleCreateMember = async () => {
        if (!newMember.nombre || !newMember.email || !newMember.password) return alert("Debes completar los campos obligatorios.");
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
            alert("Nuevo miembro registrado correctamente.");
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
                    role: selectedStudent.rol 
                })
            });
            if (res.ok) alert(`Credenciales enviadas con éxito a ${editName}`);
            else alert("No se pudo enviar el correo de bienvenida.");
        } catch (e) { alert("Error de conexión con el servicio de correo."); }
        finally { setIsSaving(false); }
    };

    const handleSelectStudent = async (student: StudentData) => {
        setSelectedStudent(student);
        setEditName(student.nombre);
        setEditEmail(student.email || '');
        setEditPassword(student.password || '');
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
                const { error } = await supabase
                    .from('inscripciones')
                    .delete()
                    .eq('estudiante_id', selectedStudent.id)
                    .eq('curso_id', courseId);
                
                if (error) throw error;
                setStudentInscriptions(prev => prev.filter(id => id !== courseId));
            } else {
                const { error } = await supabase
                    .from('inscripciones')
                    .insert({ estudiante_id: selectedStudent.id, curso_id: courseId });
                
                if (error) throw error;
                setStudentInscriptions(prev => [...prev, courseId]);
            }
        } catch (err) {
            console.error("Error toggling inscription:", err);
            alert("No se pudo actualizar la inscripción.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!selectedStudent) return;
        const doc = new jsPDF();
        doc.addImage(SCHOOL_LOGO_URL, 'PNG', 15, 15, 25, 25);
        doc.setFontSize(20); doc.setTextColor(30, 58, 138); 
        doc.text("Latin Theological Seminary", 45, 25);
        doc.setFontSize(14); doc.text("Boletín de Calificaciones Oficial", 45, 33);
        doc.setFontSize(10); doc.setTextColor(0);
        doc.text(`Estudiante: ${selectedStudent.nombre}`, 15, 55);
        doc.text(`Email: ${selectedStudent.email}`, 15, 60);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 15, 65);
        
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
        
        doc.save(`Notas_${selectedStudent.nombre.replace(/\s+/g, '_')}.pdf`);
    };

    const handleDeleteItem = async (table: string, id: string) => {
        if (!confirm("¿Deseas eliminar este registro definitivamente?")) return;
        await supabase.from(table).delete().eq('id', id);
        fetchInitialData();
    };

    // --- ASISTENCIA ---
    const loadAttendanceList = async () => {
        if (!attCourse) return alert("Selecciona una materia primero.");
        setAttLoading(true);
        setAttList([]);
        try {
            const { data: inscritos, error: e1 } = await supabase.from('inscripciones').select('estudiante_id').eq('curso_id', attCourse);
            if (e1) throw e1;
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
                    estado: hist?.find(h => h.student_id === p.id || h.estudiante_id === p.id)?.estado || 'ninguno'
                }));
            setAttList(mapped);
        } catch (e) { console.error(e); }
        finally { setAttLoading(false); }
    };

    const cycleAttendance = async (studentId: string, currentStatus: string) => {
        let nextStatus = currentStatus === 'ninguno' ? 'presente' : currentStatus === 'presente' ? 'ausente' : 'ninguno';
        if (nextStatus === 'ninguno') {
            await supabase.from('asistencias').delete().eq('estudiante_id', studentId).eq('curso_id', attCourse).eq('fecha', attDate);
        } else {
            await supabase.from('asistencias').upsert({ 
                estudiante_id: studentId, curso_id: attCourse, fecha: attDate, estado: nextStatus 
            }, { onConflict: 'estudiante_id,curso_id,fecha' });
        }
        setAttList(prev => prev.map(a => a.id === studentId ? { ...a, estado: nextStatus } : a));
    };

    const handlePostAnnouncement = async () => {
        if (!newItem.title || !newItem.content) return alert("Asunto y contenido son necesarios.");
        setIsSaving(true);
        const { error } = await supabase.from('mensajes').insert({ 
            remitente: user.name, asunto: newItem.title, contenido: newItem.content, 
            leido: false, fecha_envio: new Date().toISOString() 
        });
        if (error) {
             await supabase.from('mensajes').insert({ remitente: user.name, asunto: newItem.title, leido: false, fecha_envio: new Date().toISOString() });
             alert("Anuncio publicado (Contenido simplificado).");
        } else alert("Anuncio enviado exitosamente.");
        setNewItem({ courseId: '', title: '', date: '', time: '', content: '', type: 'pdf' });
        fetchAnnouncements();
        setIsSaving(false);
    };

    if (loading) return <div className="p-20 text-center animate-pulse text-blue-600 font-black uppercase tracking-widest">Iniciando Administración LTS...</div>;

    return (
        <div className="space-y-6 pb-20 max-w-[1600px] mx-auto px-4 animate-fade-in">
            <h1 className="text-3xl font-black flex items-center text-gray-800 dark:text-white tracking-tighter uppercase">
                <AcademicCapIcon className="h-9 w-9 mr-4 text-blue-600"/>
                Administración General LTS
            </h1>

            {/* TABS NAVEGACIÓN */}
            <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700/50 p-1.5 rounded-3xl overflow-x-auto shadow-inner border dark:border-gray-700">
                {[
                    { id: 'students', label: 'Estudiantes', icon: UserGroupIcon },
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

            {/* --- CONTENIDO ESTUDIANTES --- */}
            {activeTab === 'students' && !selectedStudent && (
                 <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700 animate-fade-in">
                    <div className="p-6 border-b dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
                        <div className="relative w-full max-w-lg group">
                            <input type="text" placeholder="Buscar alumno por nombre..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-gray-700 shadow-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            <SearchIcon className="w-6 h-6 absolute left-4 top-3.5 text-blue-500 group-focus-within:text-blue-600 transition-colors"/>
                        </div>
                        {isAdmin && (
                            <button onClick={() => setShowNewMemberModal(true)} className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-green-700 transition-all flex items-center tracking-widest active:scale-95"><PlusIcon className="w-5 h-5 mr-2"/> Registrar Nuevo Miembro</button>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead><tr className="bg-gray-100 dark:bg-gray-900 text-[10px] uppercase text-gray-400 font-black tracking-widest"><th className="px-8 py-5">Estudiante</th><th className="px-8 py-5">Rol</th><th className="px-8 py-5">Estado</th><th className="px-8 py-5 text-right">Gestión</th></tr></thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {students.filter(s => s.nombre.toLowerCase().includes(studentSearchTerm.toLowerCase())).map(s => (
                                    <tr key={s.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-8 py-5 flex items-center font-bold text-sm text-gray-800 dark:text-gray-200"><img src={s.avatar_url} className="w-12 h-12 rounded-2xl mr-5 shadow-md border-2 border-white group-hover:scale-110 transition-transform"/>{s.nombre}</td>
                                        <td className="px-8 py-5 text-xs text-blue-500 font-black uppercase">{s.rol}</td>
                                        <td className="px-8 py-5"><div className="flex items-center"><span className={`h-2 w-2 rounded-full mr-2 ${s.activo ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span><span className={`text-[10px] font-black uppercase ${s.activo ? 'text-green-600' : 'text-red-600'}`}>{s.activo ? 'Activo' : 'Inactivo'}</span></div></td>
                                        <td className="px-8 py-5 text-right"><button onClick={() => handleSelectStudent(s)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 tracking-widest shadow-lg transition-all">Gestionar Ficha</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL REGISTRO MIEMBRO */}
            {showNewMemberModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden border dark:border-gray-700">
                        <div className="bg-blue-600 p-8 text-white flex justify-between items-center">
                            <div><h3 className="text-xl font-black uppercase tracking-tighter">Registrar Miembro</h3><p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1">LTS Academic Cloud</p></div>
                            <button onClick={() => setShowNewMemberModal(false)} className="bg-white/20 hover:bg-white/40 p-2 rounded-full transition-colors"><XIcon className="w-6 h-6"/></button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label><input type="text" value={newMember.nombre} onChange={e => setNewMember({...newMember, nombre: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none border-none shadow-inner"/></div>
                            <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Correo Institucional</label><input type="email" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none border-none shadow-inner"/></div>
                            <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña de Acceso</label><input type="text" value={newMember.password} onChange={e => setNewMember({...newMember, password: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none border-none shadow-inner"/></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rol</label><select value={newMember.rol} onChange={e => setNewMember({...newMember, rol: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 text-sm font-black uppercase"><option value="estudiante">Estudiante</option><option value="profesor">Profesor</option><option value="admin">Admin</option></select></div>
                                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Estado</label><select value={newMember.activo ? 'true' : 'false'} onChange={e => setNewMember({...newMember, activo: e.target.value === 'true'})} className="w-full p-4 rounded-2xl bg-gray-50 text-sm font-black uppercase"><option value="true">Activo</option><option value="false">Inactivo</option></select></div>
                            </div>
                            <button onClick={handleCreateMember} disabled={isSaving} className={`w-full py-5 mt-4 rounded-[2rem] font-black text-[11px] uppercase shadow-xl tracking-widest transition-all ${isSaving ? 'bg-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}>Guardar y Crear Cuenta</button>
                        </div>
                    </div>
                </div>
            )}

            {/* DETALLE ESTUDIANTE (RESTAURADO CON BOTONES Y PDF) */}
            {activeTab === 'students' && selectedStudent && (
                <div className="animate-fade-in space-y-6">
                    <div className="flex justify-between items-center bg-gray-100 p-4 rounded-3xl border border-gray-200">
                        <button onClick={() => setSelectedStudent(null)} className="flex items-center text-blue-600 font-black uppercase text-[10px] tracking-widest bg-white px-5 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition-all"><ChevronLeftIcon className="h-5 w-5 mr-1"/> Volver al Listado</button>
                        <button onClick={handleDownloadPDF} className="bg-white text-gray-700 border px-6 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center hover:bg-gray-50 transition-all shadow-sm active:scale-95"><DownloadIcon className="w-4 h-4 mr-2 text-blue-600"/> Descargar Boletín PDF</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {/* Ficha Personal con Botón de Credenciales */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border-t-8 border-blue-600 text-center flex flex-col h-full">
                            <div className="relative inline-block mb-4 mx-auto">
                                <img src={selectedStudent.avatar_url} className="w-28 h-28 rounded-[2rem] shadow-xl border-4 border-white"/>
                                {/* Fix: Added toggle for active status */}
                                <div className={`absolute -bottom-2 -right-2 p-1.5 rounded-full border-4 border-white shadow-lg cursor-pointer ${editActivo ? 'bg-green-500' : 'bg-red-500'}`} onClick={() => setEditActivo(!editActivo)}>{editActivo ? <CheckIcon className="w-4 h-4 text-white"/> : <XIcon className="w-4 h-4 text-white"/>}</div>
                            </div>
                            <h4 className="font-black text-gray-800 text-lg uppercase tracking-tight leading-none mb-1">{selectedStudent.nombre}</h4>
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">{selectedStudent.rol}</p>
                            
                            <div className="space-y-4 text-left flex-1">
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Email Académico</label><input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 text-xs font-bold shadow-inner border-none outline-none"/></div>
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Clave Acceso</label><input type="text" value={editPassword} onChange={e => setEditPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 text-xs font-bold shadow-inner border-none outline-none"/></div>
                            </div>
                            
                            <div className="mt-6 space-y-3">
                                <button onClick={handleSendCreds} className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-amber-600 transition-all flex items-center justify-center active:scale-95"><MailIcon className="w-4 h-4 mr-2"/> Enviar Credenciales</button>
                                <button onClick={handleUpdateProfile} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-blue-700 transition-all active:scale-95">Guardar Ficha</button>
                            </div>
                        </div>

                        {/* Inscripciones */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border-t-8 border-green-500">
                            <h3 className="text-[10px] font-black uppercase mb-6 flex items-center text-gray-400 tracking-widest"><BookOpenIcon className="w-4 h-4 mr-2"/> Materias del Plan</h3>
                            <div className="space-y-3 overflow-y-auto max-h-[350px] pr-2">
                                {adminCourses.map(course => {
                                    const isEnrolled = studentInscriptions.includes(course.id);
                                    return (
                                        <div key={course.id} onClick={() => toggleInscription(course.id)} className={`flex justify-between items-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${isEnrolled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100 hover:border-blue-200'}`}>
                                            <p className={`text-[11px] font-black truncate ${isEnrolled ? 'text-green-800' : 'text-gray-500'}`}>{course.nombre}</p>
                                            <div className={`p-2 rounded-xl ${isEnrolled ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-300'}`}><CheckIcon className="w-4 h-4"/></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Calificaciones */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border-t-8 border-amber-500">
                             <h3 className="text-[10px] font-black uppercase mb-6 flex items-center text-gray-400 tracking-widest"><ChartBarIcon className="w-4 h-4 mr-2"/> Historial de Notas</h3>
                             <div className="space-y-3 overflow-y-auto max-h-[350px] pr-2">
                                {studentGrades.map(g => (
                                    <div key={g.id} className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center group shadow-sm">
                                        <div className="truncate text-left"><p className="text-[9px] font-black text-blue-500">{(adminCourses.find(c => c.id === g.curso_id)?.nombre || 'LTS').substring(0,15)}</p><p className="text-xs font-bold truncate text-gray-800">{g.titulo_asignacion}</p></div>
                                        <div className="flex items-center space-x-2"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black shadow-inner">{g.puntuacion}</span><button onClick={() => handleDeleteItem('notas', g.id)} className="text-gray-300 hover:text-red-500 transition-all"><TrashIcon className="w-4 h-4"/></button></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Finanzas */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border-t-8 border-indigo-500">
                             <h3 className="text-[10px] font-black uppercase mb-6 flex items-center text-gray-400 tracking-widest"><CurrencyDollarIcon className="w-4 h-4 mr-2"/> Pagos Registrados</h3>
                             <div className="space-y-3 overflow-y-auto max-h-[350px] pr-2">
                                {studentPayments.map(p => (
                                    <div key={p.id} className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center group shadow-sm transition-all hover:bg-white">
                                        <div className="truncate text-left"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{p.date}</p><p className="text-xs font-bold truncate text-gray-800">{p.method}</p></div>
                                        <span className="text-green-600 text-xs font-black ml-2">${p.amount}</span>
                                        <button onClick={() => handleDeleteItem('pagos', p.id)} className="text-gray-300 hover:text-red-500 transition-all"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MATERIAS (CON LUPITA) */}
            {activeTab === 'courses' && !selectedCourse && (
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border animate-fade-in">
                    <div className="p-8 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50">
                        <div className="relative w-full max-w-lg group">
                            <SearchIcon className="w-5 h-5 absolute left-5 top-4.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <input type="text" placeholder="Buscar materia por nombre o código..." value={courseSearchTerm} onChange={(e) => setCourseSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-4 rounded-2xl bg-white dark:bg-gray-700 shadow-xl text-sm border-2 border-transparent focus:border-blue-500 outline-none transition-all" />
                        </div>
                    </div>
                    <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase font-black tracking-widest text-gray-400"><th className="px-10 py-6">Materia</th><th className="px-10 py-6">Profesor</th><th className="px-10 py-6 text-right">Acciones</th></tr></thead><tbody className="divide-y dark:divide-gray-700">{adminCourses.filter(c => c.nombre.toLowerCase().includes(courseSearchTerm.toLowerCase())).map(c => (<tr key={c.id} className="hover:bg-blue-50/40 group"><td className="px-10 py-6 font-bold text-sm text-gray-800 dark:text-gray-200">{c.nombre} <br/> <span className="text-[9px] text-blue-500 uppercase tracking-tighter">Cód: {c.id}</span></td><td className="px-10 py-6 text-sm text-gray-600 font-medium">{c.profesor}</td><td className="px-10 py-6 text-right"><button onClick={() => setSelectedCourse(c)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-blue-700 tracking-widest shadow-lg active:scale-95 transition-all">Editar Ficha</button></td></tr>))}</tbody></table></div>
                </div>
            )}

            {/* EDITOR MATERIA (CON MINIATURA) */}
            {activeTab === 'courses' && selectedCourse && (
                <div className="animate-fade-in space-y-6">
                    <button onClick={() => setSelectedCourse(null)} className="flex items-center text-blue-600 font-black uppercase text-[10px] bg-white px-6 py-3 rounded-2xl shadow-md active:scale-95"><ChevronLeftIcon className="w-5 h-5 mr-1"/> Volver al Catálogo</button>
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3.5rem] shadow-2xl border-t-8 border-blue-500">
                        <h2 className="text-2xl font-black uppercase mb-10 border-b pb-4 text-gray-800 dark:text-white">Editor de Materia: <span className="text-blue-600">{selectedCourse.nombre}</span></h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div className="space-y-6 text-left">
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Nombre de la Cátedra</label><input value={selectedCourse.nombre} onChange={e => setSelectedCourse({...selectedCourse, nombre: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 font-bold border-none outline-none shadow-inner"/></div>
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Profesor Titular</label><input value={selectedCourse.profesor} onChange={e => setSelectedCourse({...selectedCourse, profesor: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 font-bold border-none outline-none shadow-inner"/></div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Portada (Enlace URL)</label>
                                    <div className="flex gap-4 items-center">
                                        <input value={selectedCourse.image_url || ''} onChange={e => setSelectedCourse({...selectedCourse, image_url: e.target.value})} placeholder="URL de la imagen..." className="flex-1 p-4 rounded-2xl bg-gray-50 font-medium text-xs border-none outline-none shadow-inner italic"/>
                                        <div className="w-20 h-20 bg-gray-100 rounded-2xl shadow-lg overflow-hidden border-4 border-white flex-shrink-0 flex items-center justify-center">
                                            {selectedCourse.image_url ? <img src={selectedCourse.image_url} className="w-full h-full object-cover" /> : <div className="text-[8px] text-gray-400 font-black">SIN IMAGEN</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6 text-left">
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Resumen Descriptivo</label><textarea rows={3} value={selectedCourse.descripcion} onChange={e => setSelectedCourse({...selectedCourse, descripcion: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none shadow-inner text-sm font-medium"></textarea></div>
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Guía Académica / Temario</label><textarea rows={6} value={selectedCourse.contenido_detallado} onChange={e => setSelectedCourse({...selectedCourse, contenido_detallado: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none shadow-inner text-sm font-medium"></textarea></div>
                            </div>
                        </div>
                        <button onClick={handleUpdateCourse} className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black uppercase shadow-2xl hover:bg-blue-700 mt-10 transition-all active:scale-[0.98]">Guardar Cambios en Ficha</button>
                    </div>
                </div>
            )}

            {/* BIBLIOTECA DE MATERIALES */}
            {activeTab === 'resources' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-indigo-500 h-fit space-y-8">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-white uppercase text-sm tracking-widest"><PlusIcon className="w-6 h-6 mr-3 text-indigo-600"/> Publicar Nuevo Recurso</h3>
                        <div className="space-y-5 text-left">
                            <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-400 ml-2 tracking-widest">Materia Destino</label><select value={newItem.courseId} onChange={e => setNewItem({...newItem, courseId: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none shadow-inner text-sm font-black uppercase">{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                            <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-400 ml-2 tracking-widest">Título del Archivo</label><input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="Ej: Lectura Obligatoria - Unidad 1" className="w-full p-4 rounded-2xl bg-gray-50 font-bold border-none outline-none shadow-inner text-sm"/></div>
                            <div className="grid grid-cols-4 gap-2">
                                {['pdf', 'video', 'audio', 'link'].map(t => (<button key={t} onClick={() => { setNewItem({...newItem, type: t as any}); setSelectedFile(null); }} className={`p-3 rounded-xl border-2 text-[8px] font-black uppercase transition-all ${newItem.type === t ? 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-md' : 'border-gray-100 text-gray-400'}`}>{t}</button>))}
                            </div>
                            {newItem.type === 'link' ? (
                                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-400 ml-2 tracking-widest">Enlace (URL)</label><input type="text" value={newItem.content} onChange={e => setNewItem({...newItem, content: e.target.value})} placeholder="https://..." className="w-full p-4 rounded-2xl bg-indigo-50/30 border-none outline-none shadow-inner italic text-sm"/></div>
                            ) : (
                                <div onClick={() => fileInputRef.current?.click()} className={`w-full p-8 border-2 border-dashed rounded-[2.5rem] cursor-pointer text-center group transition-all ${selectedFile ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-indigo-500'}`}>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                    <UploadIcon className="w-10 h-10 text-gray-300 group-hover:text-indigo-500 mx-auto mb-3 transition-colors"/>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{selectedFile ? selectedFile.name : 'Subir Archivo'}</p>
                                </div>
                            )}
                            <button onClick={handlePostResource} disabled={isSaving} className={`w-full py-5 rounded-[2.5rem] font-black bg-indigo-600 text-white uppercase shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center ${isSaving ? 'opacity-50' : ''}`}><CloudIcon className="w-5 h-5 mr-3"/> Publicar en Biblioteca</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl overflow-hidden h-[700px] flex flex-col border dark:border-gray-700">
                        <div className="p-8 bg-gray-100 dark:bg-gray-900 border-b flex justify-between items-center"><h3 className="font-black text-[11px] uppercase text-gray-400 tracking-widest">Recursos Disponibles</h3><span className="bg-indigo-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full shadow-lg">{courseResources.length} ITEMS</span></div>
                        <div className="flex-1 overflow-y-auto divide-y dark:divide-gray-700">
                            {courseResources.length > 0 ? courseResources.map(res => (
                                <div key={res.id} className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all">
                                    <div className="flex items-center truncate">
                                        <div className={`p-4 rounded-2xl mr-5 shadow-sm ${res.type === 'video' ? 'bg-red-50 text-red-500' : res.type === 'pdf' ? 'bg-blue-50 text-blue-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                            {res.type === 'video' ? <VideoIcon className="w-6 h-6"/> : res.type === 'pdf' ? <DocumentTextIcon className="w-6 h-6"/> : <LinkIcon className="w-6 h-6"/>}
                                        </div>
                                        <div className="truncate text-left">
                                            <p className="text-sm font-black text-gray-800 dark:text-white truncate">{res.title}</p>
                                            <p className="text-[9px] text-gray-400 font-black uppercase mt-1">{(adminCourses.find(c => c.id === res.courseId)?.nombre || 'General')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <a href={res.url} target="_blank" className="p-2 bg-gray-100 rounded-xl hover:bg-indigo-100 hover:text-indigo-600 text-gray-400 transition-all"><DownloadIcon className="w-4 h-4"/></a>
                                        <button onClick={() => handleDeleteItem('recursos', res.id)} className="p-2 bg-gray-100 rounded-xl hover:bg-red-100 hover:text-red-500 text-gray-400 transition-all"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            )) : <div className="p-24 text-center opacity-30 flex flex-col items-center justify-center"><LinkIcon className="w-20 h-20 mb-4"/><p className="text-sm font-black uppercase tracking-widest">Biblioteca Vacía</p></div>}
                        </div>
                    </div>
                </div>
            )}

            {/* ASISTENCIA */}
            {activeTab === 'attendance' && (
                <div className="bg-white dark:bg-gray-800 p-10 rounded-[3.5rem] shadow-2xl border-t-8 border-green-500 space-y-10 animate-fade-in">
                    <div className="flex flex-col md:flex-row gap-6 items-end bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[3rem] border dark:border-gray-700 shadow-inner">
                        <div className="flex-1 space-y-2 text-left">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Cátedra</label>
                            <select value={attCourse} onChange={e => setAttCourse(e.target.value)} className="w-full p-4 rounded-2xl border-none text-sm font-black uppercase shadow-lg focus:ring-2 focus:ring-green-500 outline-none">{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                        </div>
                        <div className="w-full md:w-64 space-y-2 text-left">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Fecha Lectiva</label>
                            <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} className="w-full p-4 rounded-2xl border-none text-sm font-black shadow-lg outline-none"/>
                        </div>
                        <button onClick={loadAttendanceList} disabled={attLoading} className="bg-green-600 text-white px-12 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-green-700 h-[56px] disabled:opacity-50 transition-all active:scale-95">
                            {attLoading ? 'Cargando...' : 'Listar Grupo'}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {attList.length > 0 ? attList.map(alumno => (
                            <div key={alumno.id} onClick={() => cycleAttendance(alumno.id, alumno.estado)} className={`flex items-center justify-between p-6 rounded-[2.5rem] cursor-pointer transition-all border-2 shadow-sm transform hover:-translate-y-2 ${alumno.estado === 'presente' ? 'bg-green-50 border-green-200' : alumno.estado === 'ausente' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100 dark:bg-gray-700/50'}`}>
                                <div className="flex items-center">
                                    <img src={alumno.avatar} className="w-14 h-14 rounded-2xl mr-4 border-2 border-white shadow-md object-cover"/>
                                    <div className="text-left"><p className="text-xs font-black text-gray-800 dark:text-white leading-tight">{alumno.nombre}</p><p className={`text-[8px] font-black uppercase mt-1 ${alumno.estado === 'ninguno' ? 'text-gray-400' : 'text-blue-500'}`}>{alumno.estado === 'ninguno' ? 'Pendiente' : alumno.estado}</p></div>
                                </div>
                                {alumno.estado === 'presente' ? <CheckCircleIcon className="w-8 h-8 text-green-500"/> : alumno.estado === 'ausente' ? <XIcon className="w-8 h-8 text-red-500"/> : <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300"></div>}
                            </div>
                        )) : <div className="col-span-full py-24 text-center opacity-30 text-sm font-black uppercase flex flex-col items-center"><UserGroupIcon className="w-20 h-20 mb-4"/><p>Selecciona materia y lista el grupo</p></div>}
                    </div>
                </div>
            )}

            {/* ANUNCIOS */}
            {activeTab === 'announcements' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-indigo-500 h-fit space-y-8">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-white uppercase text-sm"><PlusIcon className="w-6 h-6 mr-3 text-indigo-600"/> Redactar Aviso Académico</h3>
                        <div className="space-y-4 text-left">
                            <input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="Asunto..." className="w-full p-5 text-sm bg-gray-50 dark:bg-gray-900/50 border-none rounded-[2rem] font-black shadow-inner outline-none"/>
                            <textarea rows={5} value={newItem.content} onChange={e => setNewItem({...newItem, content: e.target.value})} placeholder="Cuerpo del anuncio..." className="w-full p-6 text-sm bg-gray-50 dark:bg-gray-900/50 border-none rounded-[2rem] font-medium shadow-inner outline-none"></textarea>
                            <button onClick={handlePostAnnouncement} disabled={isSaving} className={`w-full bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black text-[11px] uppercase shadow-2xl hover:bg-indigo-700 flex items-center justify-center transition-all ${isSaving ? 'opacity-50' : 'active:scale-95'}`}><SendIcon className="w-5 h-5 mr-3"/> Publicar Tablón</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl overflow-hidden h-[700px] flex flex-col border dark:border-gray-700">
                        <div className="p-8 bg-gray-100 dark:bg-gray-900 border-b font-black text-[11px] uppercase text-gray-400 tracking-widest">Historial</div>
                        <div className="flex-1 overflow-y-auto divide-y dark:divide-gray-700">
                            {allAnnouncements.length > 0 ? allAnnouncements.map(msg => (
                                <div key={msg.id} className="p-8 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-all flex justify-between items-start group">
                                    <div className="text-left"><p className="text-sm font-black text-gray-800 dark:text-white leading-snug">{msg.asunto}</p><p className="text-[9px] font-black text-indigo-500 uppercase mt-3 flex items-center"><ClockIcon className="w-3.5 h-3.5 mr-2"/> {new Date(msg.fecha_envio).toLocaleString()}</p></div>
                                    <button onClick={() => handleDeleteItem('mensajes', msg.id)} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            )) : <div className="p-24 text-center opacity-30 flex flex-col items-center justify-center"><MailIcon className="w-20 h-20 mb-4"/><p className="font-black text-sm uppercase tracking-widest">Sin Avisos</p></div>}
                        </div>
                    </div>
                </div>
            )}
            
            {/* TAREAS Y EXAMENES */}
            {(activeTab === 'assignments' || activeTab === 'exams') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-blue-500 h-fit space-y-8">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-white uppercase text-sm"><PlusIcon className="w-6 h-6 mr-3 text-blue-600"/> Nuevo {activeTab === 'assignments' ? 'Tarea' : 'Examen'}</h3>
                        <div className="space-y-5 text-left">
                            <select value={newItem.courseId} onChange={e => setNewItem({...newItem, courseId: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none shadow-inner font-black uppercase text-sm">{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                            <input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="Título de la actividad..." className="w-full p-4 rounded-2xl bg-gray-50 font-bold border-none outline-none shadow-inner"/>
                            <div className="flex gap-4"><input type="date" value={newItem.date} onChange={e => setNewItem({...newItem, date: e.target.value})} className="flex-1 p-4 rounded-2xl bg-gray-50 font-bold border-none outline-none shadow-inner"/>{activeTab === 'exams' && <input type="time" value={newItem.time} onChange={e => setNewItem({...newItem, time: e.target.value})} className="w-32 p-4 rounded-2xl bg-gray-50 font-bold border-none outline-none shadow-inner"/>}</div>
                            <button onClick={activeTab === 'assignments' ? async () => { await supabase.from('asignaciones').insert({ curso_id: newItem.courseId, titulo: newItem.title, fecha_entrega: newItem.date, entregado: false }); fetchAssignments(); alert("Tarea publicada."); } : async () => { await supabase.from('examenes').insert({ curso_id: newItem.courseId, titulo: newItem.title, fecha: newItem.date, hora: newItem.time }); fetchExams(); alert("Examen publicado."); }} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-[11px] uppercase hover:bg-blue-700 shadow-xl transition-all active:scale-95">Publicar en Calendario</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl overflow-hidden h-[700px] flex flex-col border">
                        <div className="p-8 bg-gray-100 dark:bg-gray-900 border-b font-black text-[11px] uppercase text-gray-400 tracking-widest">Actividades Registradas</div>
                        <div className="flex-1 overflow-y-auto divide-y">
                            {(activeTab === 'assignments' ? allAssignments : allExams).map((item: any) => (
                                <div key={item.id} className="p-8 hover:bg-gray-50 transition-all flex justify-between items-center">
                                    <div className="text-left truncate"><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{(adminCourses.find(c => c.id === item.curso_id)?.nombre || 'LTS')}</p><p className="text-sm font-black text-gray-800 truncate">{item.titulo}</p><p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest"><CalendarIcon className="w-3.5 h-3.5 mr-1.5 inline"/> {item.fecha_entrega || item.fecha} {item.hora && `- ${item.hora}`}</p></div>
                                    <button onClick={() => handleDeleteItem(activeTab === 'assignments' ? 'asignaciones' : 'examenes', item.id)} className="text-gray-300 hover:text-red-500 p-2 transition-colors"><TrashIcon className="w-6 h-6"/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Icono faltante Cloud
const CloudIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
    </svg>
);

export default TeacherPanel;
