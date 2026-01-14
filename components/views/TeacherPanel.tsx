
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
    
    // Referencia para el archivo real (File object)
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

    // --- ACCIONES ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setSelectedFile(file); 
        
        let type: 'pdf' | 'video' | 'audio' | 'link' = 'pdf';
        if (file.type.includes('video')) type = 'video';
        else if (file.type.includes('audio')) type = 'audio';
        else if (file.type.includes('pdf')) type = 'pdf';

        setNewItem({ 
            ...newItem, 
            type: type, 
            title: newItem.title || file.name.split('.')[0],
            content: 'FILE_SELECTED' 
        });
    };

    const handlePostResource = async () => {
        if (!newItem.courseId || !newItem.title) return alert("Por favor, completa los campos del recurso.");
        if (newItem.type !== 'link' && !selectedFile) return alert("Por favor, selecciona un archivo.");
        if (newItem.type === 'link' && !newItem.content) return alert("Por favor, ingresa el enlace.");

        setIsSaving(true);
        let finalUrl = newItem.content;

        if (newItem.type !== 'link' && selectedFile) {
            try {
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
                const filePath = `${newItem.courseId}/${fileName}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('recursos')
                    .upload(filePath, selectedFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('recursos')
                    .getPublicUrl(filePath);
                
                finalUrl = publicUrl;
            } catch (err) {
                console.error("Error en Storage:", err);
                alert("No se pudo subir el archivo. Asegúrate de que el bucket 'recursos' esté creado y sea público en Supabase.");
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
            alert("¡Éxito! El recurso se ha guardado correctamente.");
            setNewItem({ courseId: '', title: '', date: '', time: '', content: '', type: 'pdf' });
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            await fetchResources();
        } else {
            alert("Error al registrar el recurso en la base de datos.");
        }
        setIsSaving(false);
    };

    const handleUpdateCourse = async () => {
        if (!selectedCourse || !hasFullAccess) return;
        setIsSaving(true);
        const { error } = await supabase.from('cursos')
            .update({ 
                nombre: selectedCourse.nombre,
                profesor: selectedCourse.profesor,
                creditos: selectedCourse.creditos,
                descripcion: selectedCourse.descripcion,
                contenido_detallado: selectedCourse.contenido_detallado,
                image_url: selectedCourse.image_url
            })
            .eq('id', selectedCourse.id);
        
        if (!error) {
            alert("Información de materia actualizada.");
            await fetchCourses();
            setSelectedCourse(null);
        }
        setIsSaving(false);
    };

    const handleCreateMember = async () => {
        if (!newMember.nombre || !newMember.email || !newMember.password) return alert("Completa todos los campos obligatorios.");
        setIsSaving(true);
        const avatarUrl = `https://i.pravatar.cc/150?u=${encodeURIComponent(newMember.email)}`;
        
        const { error } = await supabase.from('estudiantes').insert({
            nombre: newMember.nombre,
            email: newMember.email,
            password: newMember.password,
            rol: newMember.rol,
            activo: newMember.activo,
            avatar_url: avatarUrl,
            matricula: new Date().toISOString()
        });

        if (!error) {
            alert("Miembro creado exitosamente.");
            setShowNewMemberModal(false);
            setNewMember({ nombre: '', email: '', password: '', rol: 'estudiante', activo: true });
            await fetchStudents();
        } else {
            console.error(error);
            alert("Error al crear el miembro en la base de datos.");
        }
        setIsSaving(false);
    };

    const handleSelectStudent = async (student: StudentData) => {
        setSelectedStudent(student);
        setEditName(student.nombre);
        setEditEmail(student.email || '');
        setEditPassword(student.password || '');
        setEditActivo(student.activo);
        await Promise.all([
            fetchStudentGrades(student.id),
            fetchStudentInscriptions(student.id),
            fetchStudentFinancial(student.id)
        ]);
    };

    const fetchStudentGrades = async (studentId: string) => {
        const { data } = await supabase.from('notas').select('*').eq('estudiante_id', studentId).order('id', { ascending: false });
        setStudentGrades(data || []);
    };

    const fetchStudentInscriptions = async (studentId: string) => {
        const { data } = await supabase.from('inscripciones').select('curso_id').eq('estudiante_id', studentId);
        setStudentInscriptions((data || []).map(i => i.curso_id));
    };

    const fetchStudentFinancial = async (studentId: string) => {
        const { data } = await supabase.from('pagos').select('*').eq('student_id', studentId).order('date', { ascending: false });
        setStudentPayments(data || []);
    };

    const handleSendCreds = async () => {
        if (!selectedStudent || !hasFullAccess) return;
        
        const email = editEmail;
        const name = editName;
        const password = editPassword || selectedStudent.password;
        const role = selectedStudent.rol;

        if (!email) return alert("El estudiante no tiene correo registrado.");

        setIsSaving(true);
        try {
            const res = await fetch('/.netlify/functions/send-welcome-email', {
                method: 'POST',
                body: JSON.stringify({ email, name, password, role })
            });
            if (res.ok) alert(`Credenciales enviadas correctamente a ${name}`);
            else alert("Error al enviar el correo. Revisa la configuración del servicio.");
        } catch (e) { alert("Error de conexión con el servidor."); }
        finally { setIsSaving(false); }
    };

    const handleDeleteItem = async (table: string, id: string) => {
        if (!confirm("¿Eliminar registro definitivamente?")) return;
        await supabase.from(table).delete().eq('id', id);
        if (table === 'asignaciones') fetchAssignments();
        if (table === 'examenes') fetchExams();
        if (table === 'mensajes') fetchAnnouncements();
        if (table === 'recursos') fetchResources();
        if (table === 'notas') fetchStudentGrades(selectedStudent!.id);
        if (table === 'pagos') fetchStudentFinancial(selectedStudent!.id);
    };

    const handleUpdateProfile = async () => {
        if (!selectedStudent || !hasFullAccess) return;
        setIsSaving(true);
        await supabase.from('estudiantes').update({ 
            nombre: editName, 
            email: editEmail, 
            password: editPassword,
            activo: editActivo 
        }).eq('id', selectedStudent.id);
        
        setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, nombre: editName, email: editEmail, password: editPassword, activo: editActivo } : s));
        
        setIsSaving(false);
        alert("Perfil y estado actualizados correctamente.");
    };

    const toggleInscription = async (courseId: string) => {
        if (!selectedStudent || !hasFullAccess) return;
        const isEnrolled = studentInscriptions.includes(courseId);
        if (isEnrolled) {
            await supabase.from('inscripciones').delete().eq('estudiante_id', selectedStudent.id).eq('curso_id', courseId);
        } else {
            await supabase.from('inscripciones').insert({ estudiante_id: selectedStudent.id, curso_id: courseId });
        }
        await fetchStudentInscriptions(selectedStudent.id);
    };

    const handleAddGrade = async () => {
        if (!newGrade.courseId || !newGrade.score || !selectedStudent) return alert("Completa los datos de la nota.");
        setIsSaving(true);
        await supabase.from('notas').insert({
            estudiante_id: selectedStudent.id,
            curso_id: newGrade.courseId,
            titulo_asignacion: newGrade.title || "Evaluación",
            puntuacion: parseFloat(newGrade.score),
            puntuacion_maxima: 100
        });
        setNewGrade({ courseId: '', title: '', score: '' });
        await fetchStudentGrades(selectedStudent.id);
        setIsSaving(false);
    };

    const handleAddPayment = async () => {
        if (!newPayment.amount || !selectedStudent || !hasFullAccess) return;
        setIsSaving(true);
        await supabase.from('pagos').insert({
            student_id: selectedStudent.id,
            amount: parseFloat(newPayment.amount),
            date: newPayment.date,
            description: newPayment.desc || "Mensualidad",
            method: newPayment.method,
            verified: true
        });
        setNewPayment({ amount: '', date: new Date().toISOString().split('T')[0], desc: '', method: 'Zelle' });
        await fetchStudentFinancial(selectedStudent.id);
        setIsSaving(false);
    };

    const loadAttendanceList = async () => {
        if (!attCourse) return;
        const { data: inscritos } = await supabase.from('inscripciones').select('estudiante_id, estudiantes(nombre, avatar_url)').eq('curso_id', attCourse);
        const { data: existentes } = await supabase.from('asistencias').select('*').eq('curso_id', attCourse).eq('fecha', attDate);
        setAttList((inscritos || []).map((i: any) => ({
            id: i.estudiante_id, nombre: i.estudiantes.nombre, avatar: i.estudiantes.avatar_url,
            estado: existentes?.find(e => e.estudiante_id === i.estudiante_id)?.estado || 'ninguno'
        })));
    };

    const cycleAttendance = async (studentId: string, currentStatus: string) => {
        // Ciclo de estados: Ninguno -> Presente -> Ausente -> Ninguno (Elimina registro)
        let nextStatus = 'presente';
        if (currentStatus === 'presente') nextStatus = 'ausente';
        else if (currentStatus === 'ausente') nextStatus = 'ninguno';

        if (nextStatus === 'ninguno') {
            const { error } = await supabase.from('asistencias').delete()
                .eq('estudiante_id', studentId)
                .eq('curso_id', attCourse)
                .eq('fecha', attDate);
            if (!error) setAttList(prev => prev.map(a => a.id === studentId ? { ...a, estado: 'ninguno' } : a));
        } else {
            const { error } = await supabase.from('asistencias').upsert({ 
                estudiante_id: studentId, 
                curso_id: attCourse, 
                fecha: attDate, 
                estado: nextStatus 
            }, { onConflict: 'estudiante_id,curso_id,fecha' });
            if (!error) setAttList(prev => prev.map(a => a.id === studentId ? { ...a, estado: nextStatus } : a));
        }
    };

    const handleAddAssignment = async () => {
        if (!newItem.courseId || !newItem.title || !newItem.date) return alert("Completa los datos de la tarea.");
        setIsSaving(true);
        const { error } = await supabase.from('asignaciones').insert({
            curso_id: newItem.courseId,
            titulo: newItem.title,
            fecha_entrega: newItem.date,
            entregado: false
        });
        if (!error) {
            setNewItem({ courseId: '', title: '', date: '', time: '', content: '', type: 'pdf' });
            await fetchAssignments();
        }
        setIsSaving(false);
    };

    const handleAddExam = async () => {
        if (!newItem.courseId || !newItem.title || !newItem.date || !newItem.time) return alert("Completa los datos del examen.");
        setIsSaving(true);
        const { error } = await supabase.from('examenes').insert({
            curso_id: newItem.courseId,
            titulo: newItem.title,
            fecha: newItem.date,
            hora: newItem.time
        });
        if (!error) {
            setNewItem({ courseId: '', title: '', date: '', time: '', content: '', type: 'pdf' });
            await fetchExams();
        }
        setIsSaving(false);
    };

    const handlePostAnnouncement = async () => {
        if (!newItem.title || !newItem.content) return alert("Debes incluir asunto y contenido.");
        setIsSaving(true);
        await supabase.from('mensajes').insert({ 
            remitente: user.name, 
            asunto: newItem.title, 
            contenido: newItem.content, // Aseguramos guardar el contenido
            leido: false, 
            fecha_envio: new Date().toISOString() 
        });
        setNewItem({ courseId: '', title: '', date: '', time: '', content: '', type: 'pdf' });
        await fetchAnnouncements();
        setIsSaving(false);
    };

    const handleDownloadPDF = () => {
        if (!selectedStudent) return;
        const doc = new jsPDF();
        doc.addImage(SCHOOL_LOGO_URL, 'PNG', 15, 15, 30, 30);
        doc.setFontSize(22); doc.setTextColor(30, 58, 138); 
        doc.text("Latin Theological Seminary", 50, 25);
        doc.text("Boletín Oficial de Calificaciones", 50, 38);
        doc.setFontSize(12); doc.setTextColor(0);
        doc.text(`Estudiante: ${selectedStudent.nombre}`, 15, 65);
        const tableData = studentGrades.map(g => [adminCourses.find(c => c.id === g.curso_id)?.nombre || g.curso_id, g.titulo_asignacion, g.puntuacion]);
        autoTable(doc, { 
            startY: 85, head: [['Materia', 'Asignación', 'Nota']], body: tableData,
            theme: 'striped', headStyles: { fillColor: [30, 58, 138] }
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
                    { id: 'students', label: 'Estudiantes', icon: UserGroupIcon },
                    { id: 'courses', label: 'Materias', icon: BookOpenIcon },
                    { id: 'resources', label: 'Materiales', icon: LinkIcon },
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
                    <div className="p-6 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="relative w-full max-w-lg">
                            <input type="text" placeholder="Buscar alumno..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-gray-700 shadow-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            <SearchIcon className="w-6 h-6 absolute left-4 top-3.5 text-blue-500"/>
                        </div>
                        {isAdmin && (
                            <button 
                                onClick={() => setShowNewMemberModal(true)}
                                className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-green-700 transition-all flex items-center tracking-widest"
                            >
                                <PlusIcon className="w-5 h-5 mr-2"/> Nuevo Miembro
                            </button>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead><tr className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase text-gray-400 font-black tracking-widest"><th className="px-8 py-5">Estudiante</th><th className="px-8 py-5">Rol</th><th className="px-8 py-5">Estado</th><th className="px-8 py-5 text-right">Acciones</th></tr></thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {students.filter(s => s.nombre.toLowerCase().includes(studentSearchTerm.toLowerCase())).map(s => (
                                    <tr key={s.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-8 py-5 flex items-center font-bold text-sm text-gray-800 dark:text-gray-200">
                                            <img src={s.avatar_url} className="w-12 h-12 rounded-2xl mr-5 shadow-md border-2 border-white"/>
                                            {s.nombre}
                                        </td>
                                        <td className="px-8 py-5 text-xs text-blue-500 font-black uppercase">{s.rol}</td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center">
                                                <span className={`h-2 w-2 rounded-full mr-2 ${s.activo ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                                <span className={`text-[10px] font-black uppercase ${s.activo ? 'text-green-600' : 'text-red-600'}`}>
                                                    {s.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button onClick={() => handleSelectStudent(s)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 tracking-widest shadow-lg">Gestionar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL PARA NUEVO MIEMBRO */}
            {showNewMemberModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border dark:border-gray-700">
                        <div className="bg-blue-600 p-8 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter">Registrar Miembro</h3>
                                <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1">LTS Administration System</p>
                            </div>
                            <button onClick={() => setShowNewMemberModal(false)} className="bg-white/20 hover:bg-white/40 p-2 rounded-full transition-colors">
                                <XIcon className="w-6 h-6"/>
                            </button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                                <input 
                                    type="text" 
                                    value={newMember.nombre} 
                                    onChange={e => setNewMember({...newMember, nombre: e.target.value})}
                                    placeholder="Ej: Juan Pérez"
                                    className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-none shadow-inner text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                                <input 
                                    type="email" 
                                    value={newMember.email} 
                                    onChange={e => setNewMember({...newMember, email: e.target.value})}
                                    placeholder="correo@ejemplo.com"
                                    className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-none shadow-inner text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña de Acceso</label>
                                <input 
                                    type="text" 
                                    value={newMember.password} 
                                    onChange={e => setNewMember({...newMember, password: e.target.value})}
                                    placeholder="Contraseña inicial"
                                    className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-none shadow-inner text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rol en Sistema</label>
                                    <select 
                                        value={newMember.rol}
                                        onChange={e => setNewMember({...newMember, rol: e.target.value})}
                                        className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-none shadow-inner text-sm font-black uppercase focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                    >
                                        <option value="estudiante">Estudiante</option>
                                        <option value="profesor">Profesor</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Estado</label>
                                    <select 
                                        value={newMember.activo ? 'true' : 'false'}
                                        onChange={e => setNewMember({...newMember, activo: e.target.value === 'true'})}
                                        className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-none shadow-inner text-sm font-black uppercase focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                    >
                                        <option value="true">Activo</option>
                                        <option value="false">Inactivo</option>
                                    </select>
                                </div>
                            </div>
                            <button 
                                onClick={handleCreateMember}
                                disabled={isSaving}
                                className={`w-full py-5 mt-4 rounded-[2rem] font-black text-[11px] uppercase shadow-xl tracking-widest transition-all transform active:scale-95 ${isSaving ? 'bg-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                            >
                                {isSaving ? 'Guardando en la Nube...' : 'Crear Cuenta de Miembro'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'students' && selectedStudent && (
                <div className="animate-fade-in space-y-6">
                    <div className="flex justify-between items-center bg-gray-100 p-4 rounded-3xl border border-gray-200">
                        <button onClick={() => setSelectedStudent(null)} className="flex items-center text-blue-600 font-black uppercase text-[10px] tracking-widest"><ChevronLeftIcon className="h-5 w-5 mr-1"/> Volver</button>
                        <button onClick={handleDownloadPDF} className="bg-white text-gray-700 border px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center hover:bg-gray-50 transition-all shadow-sm"><DownloadIcon className="w-4 h-4 mr-2"/> PDF de Notas</button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border-t-8 border-blue-600">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center"><PencilIcon className="w-4 h-4 mr-2"/> Perfil Académico</h3>
                            <div className="flex flex-col items-center mb-6">
                                <div className="relative">
                                    <img src={selectedStudent.avatar_url} className="w-24 h-24 rounded-3xl shadow-xl border-4 border-white mb-4"/>
                                    <div className={`absolute -bottom-2 -right-2 p-1.5 rounded-full border-4 border-white shadow-lg ${editActivo ? 'bg-green-500' : 'bg-red-500'}`}>
                                        {editActivo ? <CheckIcon className="w-3 h-3 text-white"/> : <XIcon className="w-3 h-3 text-white"/>}
                                    </div>
                                </div>
                                <h4 className="text-center font-black text-gray-800 text-lg leading-tight mt-2">{selectedStudent.nombre}</h4>
                                <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mt-1">{selectedStudent.rol}</p>
                                
                                <div className="w-full mt-6 p-1 bg-gray-100 dark:bg-gray-700 rounded-2xl flex relative h-12 shadow-inner">
                                    <button onClick={() => setEditActivo(true)} className={`flex-1 flex items-center justify-center text-[10px] font-black uppercase tracking-widest z-10 transition-colors ${editActivo ? 'text-white' : 'text-gray-400'}`}>Activo</button>
                                    <button onClick={() => setEditActivo(false)} className={`flex-1 flex items-center justify-center text-[10px] font-black uppercase tracking-widest z-10 transition-colors ${!editActivo ? 'text-white' : 'text-gray-400'}`}>Inactivo</button>
                                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl transition-all duration-300 shadow-lg ${editActivo ? 'left-1 bg-green-500' : 'left-[calc(50%+1px)] bg-red-500'}`}></div>
                                </div>

                                {hasFullAccess && (
                                    <button onClick={handleSendCreds} disabled={isSaving} className="w-full mt-4 bg-amber-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-amber-600 transition-all flex items-center justify-center tracking-widest"><MailIcon className="w-5 h-5 mr-2"/> Enviar Credenciales</button>
                                )}
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Email de Acceso</label><input value={editEmail} onChange={e => setEditEmail(e.target.value)} disabled={!hasFullAccess} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 text-xs font-bold border-none shadow-inner outline-none focus:ring-1 focus:ring-blue-500"/></div>
                                {hasFullAccess && <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Clave de Seguridad</label><input type="text" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Contraseña" className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 text-xs font-bold border-none shadow-inner outline-none focus:ring-1 focus:ring-blue-500"/></div>}
                                {hasFullAccess && <button onClick={handleUpdateProfile} className="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black text-[10px] uppercase shadow-xl hover:bg-blue-700 transition-all transform active:scale-95">Guardar Cambios</button>}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border-t-8 border-green-500">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center"><BookOpenIcon className="w-4 h-4 mr-2"/> Inscripciones</h3>
                            <div className="space-y-3 overflow-y-auto max-h-[450px]">
                                {adminCourses.map(course => {
                                    const isEnrolled = studentInscriptions.includes(course.id);
                                    return (
                                        <div key={course.id} onClick={() => hasFullAccess && toggleInscription(course.id)} className={`flex justify-between items-center p-4 rounded-2xl border-2 transition-all ${isEnrolled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100 cursor-pointer hover:border-blue-200'}`}>
                                            <p className={`text-[11px] font-black truncate ${isEnrolled ? 'text-green-800' : 'text-gray-500'}`}>{course.nombre}</p>
                                            <div className={`p-2 rounded-xl ${isEnrolled ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-300'}`}><CheckIcon className="w-4 h-4"/></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border-t-8 border-amber-500">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center"><ChartBarIcon className="w-4 h-4 mr-2"/> Calificaciones</h3>
                            <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 mb-6 space-y-3">
                                <select value={newGrade.courseId} onChange={e => setNewGrade({...newGrade, courseId: e.target.value})} className="w-full p-3 text-[10px] rounded-xl border-none font-black uppercase shadow-sm">
                                    <option value="">Elegir Materia...</option>
                                    {adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                                <div className="flex gap-2">
                                    <input placeholder="Nota" value={newGrade.score} onChange={e => setNewGrade({...newGrade, score: e.target.value})} className="flex-1 p-3 text-xs rounded-xl border-none font-bold shadow-sm"/>
                                    <button onClick={handleAddGrade} className="bg-amber-500 text-white p-3 rounded-xl hover:bg-amber-600"><PlusIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                            <div className="space-y-3 overflow-y-auto max-h-[250px]">
                                {studentGrades.map(g => (
                                    <div key={g.id} className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center group shadow-sm transition-all hover:bg-white">
                                        <div className="truncate"><p className="text-[9px] font-black text-blue-500 uppercase">{(adminCourses.find(c => c.id === g.curso_id)?.nombre || 'LTS').substring(0,12)}</p><p className="text-xs font-bold text-gray-800 truncate">{g.titulo_asignacion}</p></div>
                                        <div className="flex items-center space-x-2"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black shadow-inner">{g.puntuacion}</span><button onClick={() => handleDeleteItem('notas', g.id)} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><TrashIcon className="w-4 h-4"/></button></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border-t-8 border-indigo-500">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center"><CurrencyDollarIcon className="w-4 h-4 mr-2"/> Finanzas</h3>
                            {hasFullAccess ? (
                                <>
                                    <div className="bg-indigo-50 p-4 rounded-3xl border border-indigo-100 mb-6 space-y-3">
                                        <input type="number" placeholder="Monto ($)" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} className="w-full p-3 text-xs rounded-xl border-none font-black shadow-sm"/>
                                        <div className="flex gap-2"><select value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})} className="flex-1 p-3 text-[10px] rounded-xl border-none font-black shadow-sm"><option value="Zelle">Zelle</option><option value="Pago Móvil">Pago Móvil</option></select><button onClick={handleAddPayment} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700"><PlusIcon className="w-5 h-5"/></button></div>
                                    </div>
                                    <div className="space-y-3 overflow-y-auto max-h-[250px]">
                                        {studentPayments.map(p => (
                                            <div key={p.id} className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center group shadow-sm transition-all hover:bg-white">
                                                <div className="truncate"><p className="text-[9px] font-black text-gray-400 uppercase">{p.date}</p><p className="text-xs font-bold text-gray-800 truncate">{p.method}</p></div>
                                                <span className="text-green-600 text-xs font-black ml-2">${p.amount}</span>
                                                <button onClick={() => handleDeleteItem('pagos', p.id)} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><TrashIcon className="w-4 h-4"/></button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-10"><CurrencyDollarIcon className="w-16 h-16 mb-4"/><p className="text-[10px] font-black uppercase tracking-widest">Módulo Restringido</p></div>}
                        </div>
                    </div>
                </div>
            )}

            {/* --- CONTENIDO MATERIALES --- */}
            {activeTab === 'resources' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-indigo-500 h-fit space-y-6">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-gray-200 uppercase text-xs tracking-widest"><UploadIcon className="w-6 h-6 mr-3 text-indigo-600"/> Publicar Recurso Educativo</h3>
                        <div className="space-y-5">
                            <select value={newItem.courseId} onChange={e => setNewItem({...newItem, courseId: e.target.value})} className="w-full p-4 text-xs border rounded-2xl font-black uppercase bg-gray-50 shadow-inner border-none outline-none"><option value="">Seleccionar Materia...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                            <input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="Título / Descripción corta" className="w-full p-4 text-xs bg-gray-50 border-none rounded-2xl font-bold shadow-inner outline-none"/>
                            <div className="grid grid-cols-4 gap-2">
                                {['pdf', 'video', 'audio', 'link'].map(t => (
                                    <button key={t} onClick={() => { setNewItem({...newItem, type: t as any, content: ''}); setSelectedFile(null); }} className={`p-3 rounded-xl border-2 text-[8px] font-black uppercase transition-all ${newItem.type === t ? 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-md' : 'border-gray-100 text-gray-400'}`}>{t}</button>
                                ))}
                            </div>
                            
                            {newItem.type === 'link' ? (
                                <div className="space-y-2 animate-fade-in">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Enlace del Recurso (URL)</label>
                                    <input type="text" value={newItem.content} onChange={e => setNewItem({...newItem, content: e.target.value})} placeholder="https://..." className="w-full p-4 text-xs border-2 border-indigo-100 rounded-2xl italic outline-none focus:border-indigo-400 shadow-inner bg-indigo-50/10 transition-all"/>
                                </div>
                            ) : (
                                <div onClick={() => fileInputRef.current?.click()} className={`w-full p-10 border-2 border-dashed rounded-[2rem] cursor-pointer text-center flex flex-col items-center transition-all ${selectedFile ? 'border-green-400 bg-green-50 shadow-inner' : 'border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50 hover:border-indigo-400'}`}>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                    <UploadIcon className="w-10 h-10 text-indigo-500 mb-2"/>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{selectedFile ? `Archivo: ${selectedFile.name}` : 'Haga clic para seleccionar archivo'}</p>
                                    {selectedFile && <p className="text-[8px] text-green-600 mt-2 font-black uppercase">✓ Archivo listo para subir</p>}
                                </div>
                            )}

                            <button onClick={handlePostResource} disabled={isSaving} className={`w-full py-5 rounded-[2.5rem] font-black text-[11px] uppercase shadow-xl tracking-widest transition-all ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}>{isSaving ? 'Subiendo archivo, por favor espere...' : 'Publicar en Biblioteca'}</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl overflow-hidden border h-[600px] flex flex-col"><div className="p-8 bg-gray-50 border-b flex justify-between items-center"><h3 className="font-black text-[11px] uppercase text-gray-400 tracking-widest">Biblioteca Digital LTS</h3><span className="bg-indigo-100 text-indigo-600 text-[9px] font-black px-4 py-1.5 rounded-full shadow-sm">{courseResources.length} Archivos Totales</span></div><div className="flex-1 overflow-y-auto divide-y">{courseResources.map(res => (<div key={res.id} className="p-6 flex items-center justify-between hover:bg-gray-100 transition-all"><div className="flex items-center truncate"><div className={`p-4 rounded-2xl mr-5 shadow-sm ${res.type === 'link' ? 'bg-indigo-50 text-indigo-500' : 'bg-blue-50 text-blue-500'}`}>{res.type === 'link' ? <LinkIcon className="w-6 h-6"/> : <DocumentTextIcon className="w-6 h-6"/>}</div><div className="truncate"><p className="text-sm font-black text-gray-800 truncate">{res.title}</p><p className="text-[9px] text-indigo-500 font-black uppercase tracking-widest mt-1">{(adminCourses.find(c => c.id === res.courseId)?.nombre || 'General')}</p></div></div><button onClick={() => handleDeleteItem('recursos', res.id)} className="text-gray-300 hover:text-red-500 p-2 transition-colors"><TrashIcon className="w-5 h-5"/></button></div>))}</div></div>
                </div>
            )}

            {/* --- CONTENIDO MATERIAS --- */}
            {activeTab === 'courses' && !selectedCourse && (
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700 animate-fade-in">
                    <div className="p-8 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 flex justify-between items-center">
                        <div className="relative w-full max-w-lg">
                            <input type="text" placeholder="Buscar materia por nombre o código..." value={courseSearchTerm} onChange={(e) => setCourseSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-gray-700 shadow-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                            <SearchIcon className="w-6 h-6 absolute left-4 top-3.5 text-blue-500"/>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead><tr className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase text-gray-400 font-black tracking-widest"><th className="px-10 py-6">Materia</th><th className="px-10 py-6">Profesor</th><th className="px-10 py-6">Créditos</th><th className="px-10 py-6 text-right">Gestión</th></tr></thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {adminCourses.filter(c => c.nombre.toLowerCase().includes(courseSearchTerm.toLowerCase()) || c.id.toLowerCase().includes(courseSearchTerm.toLowerCase())).map(c => (
                                    <tr key={c.id} className="hover:bg-blue-50/40 dark:hover:bg-gray-700/30 transition-colors group">
                                        <td className="px-10 py-6 font-bold text-sm text-gray-800 dark:text-gray-200">{c.nombre} <br/> <span className="text-[9px] text-blue-500 uppercase font-black tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">{c.id}</span></td>
                                        <td className="px-10 py-6 text-sm font-medium text-gray-600 dark:text-gray-400">{c.profesor}</td>
                                        <td className="px-10 py-6 text-sm font-black text-blue-600">{c.creditos}</td>
                                        <td className="px-10 py-6 text-right"><button onClick={() => setSelectedCourse(c)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-blue-700 tracking-widest shadow-lg transition-all transform group-hover:scale-105">Editar Ficha</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'courses' && selectedCourse && (
                <div className="animate-fade-in space-y-6">
                    <button onClick={() => setSelectedCourse(null)} className="flex items-center text-blue-600 font-black uppercase text-[10px] tracking-widest bg-white px-6 py-3 rounded-2xl hover:bg-gray-50 transition-all shadow-md"><ChevronLeftIcon className="w-5 h-5 mr-1"/> Volver al Catálogo</button>
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3.5rem] shadow-2xl border-t-8 border-blue-500 space-y-8">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-800 dark:text-gray-200 border-b pb-6">Editor de Materia: <span className="text-blue-600">{selectedCourse.nombre}</span></h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Oficial</label><input value={selectedCourse.nombre} onChange={e => setSelectedCourse({...selectedCourse, nombre: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 text-sm font-bold border-none shadow-inner outline-none focus:ring-2 focus:ring-blue-500 transition-all"/></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Profesor Asignado</label><input value={selectedCourse.profesor} onChange={e => setSelectedCourse({...selectedCourse, profesor: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 text-sm font-bold border-none shadow-inner outline-none focus:ring-2 focus:ring-blue-500 transition-all"/></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Créditos Académicos</label><input type="number" value={selectedCourse.creditos} onChange={e => setSelectedCourse({...selectedCourse, creditos: parseInt(e.target.value)})} className="w-full p-4 rounded-2xl bg-gray-50 text-sm font-bold border-none shadow-inner outline-none focus:ring-2 focus:ring-blue-500 transition-all"/></div>
                                <div className="space-y-2 pt-4 bg-blue-50/30 p-6 rounded-3xl border border-blue-100">
                                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">URL de Foto de Materia</label>
                                    <div className="flex gap-4 items-start"><div className="flex-1"><input type="text" placeholder="https://ejemplo.com/foto.jpg" value={selectedCourse.image_url || ''} onChange={e => setSelectedCourse({...selectedCourse, image_url: e.target.value})} className="w-full p-4 rounded-2xl bg-white text-sm italic border-2 border-blue-100 shadow-sm focus:border-blue-500 outline-none transition-all"/><p className="text-[9px] text-gray-500 ml-1 italic mt-2 uppercase tracking-tight">Inserte el enlace directo a la imagen.</p></div><div className="w-24 h-24 rounded-2xl bg-gray-200 overflow-hidden border-2 border-white shadow-lg flex-shrink-0 relative group">{selectedCourse.image_url ? <img src={selectedCourse.image_url} alt="Vista previa" className="w-full h-full object-cover transition-transform group-hover:scale-110" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/150?text=Error+Enlace'; e.currentTarget.className = "w-full h-full object-contain opacity-50"; }}/> : <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400 font-black uppercase text-center p-2">Sin Foto</div>}</div></div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción General (Resumen)</label><textarea rows={3} value={selectedCourse.descripcion} onChange={e => setSelectedCourse({...selectedCourse, descripcion: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 text-sm font-medium border-none shadow-inner outline-none focus:ring-2 focus:ring-blue-500 transition-all"></textarea></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Guía Académica y Contenido Detallado</label><textarea rows={8} value={selectedCourse.contenido_detallado} onChange={e => setSelectedCourse({...selectedCourse, contenido_detallado: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 text-sm font-medium border-none shadow-inner outline-none focus:ring-2 focus:ring-blue-500 transition-all"></textarea></div>
                            </div>
                        </div>
                        <button onClick={handleUpdateCourse} className="bg-blue-600 text-white w-full py-6 rounded-[2.5rem] font-black text-[12px] uppercase shadow-2xl hover:bg-blue-700 tracking-widest transition-all transform hover:-translate-y-1 active:scale-95">Guardar Ficha Técnica de la Materia</button>
                    </div>
                </div>
            )}

            {/* --- OTROS MÓDULOS --- */}
            {(activeTab === 'assignments' || activeTab === 'exams') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-blue-500 h-fit space-y-6">
                        <h3 className="font-black flex items-center text-gray-700 uppercase text-xs tracking-widest"><PlusIcon className="w-6 h-6 mr-3 text-blue-600"/> Nuevo Registro de {activeTab === 'assignments' ? 'Tarea' : 'Examen'}</h3>
                        <div className="space-y-5">
                            <select value={newItem.courseId} onChange={e => setNewItem({...newItem, courseId: e.target.value})} className="w-full p-4 text-xs bg-gray-50 border-none rounded-2xl font-black uppercase shadow-inner"><option value="">Seleccionar Materia...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                            <input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="Título / Tema" className="w-full p-4 text-xs bg-gray-50 border-none rounded-2xl font-bold shadow-inner"/>
                            <div className="flex gap-4"><input type="date" value={newItem.date} onChange={e => setNewItem({...newItem, date: e.target.value})} className="flex-1 p-4 text-xs bg-gray-50 border-none rounded-2xl font-bold shadow-inner outline-none"/>{activeTab === 'exams' && <input type="time" value={newItem.time} onChange={e => setNewItem({...newItem, time: e.target.value})} className="w-32 p-4 text-xs bg-gray-50 border-none rounded-2xl font-bold shadow-inner outline-none"/>}</div>
                            <button onClick={activeTab === 'assignments' ? handleAddAssignment : handleAddExam} className="w-full bg-blue-600 text-white py-4 rounded-3xl font-black text-[10px] uppercase shadow-xl hover:bg-blue-700 tracking-widest transition-all">Publicar Actividad</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border h-[600px] flex flex-col"><div className="p-8 bg-gray-50 border-b font-black text-[10px] uppercase text-gray-400 tracking-widest">Actividades Programadas</div><div className="flex-1 overflow-y-auto divide-y">{(activeTab === 'assignments' ? allAssignments : allExams).map((item: any) => (<div key={item.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-all"><div className="truncate mr-4"><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full inline-block mb-1">{(adminCourses.find(c => c.id === item.curso_id)?.nombre || 'General')}</p><p className="text-sm font-bold text-gray-800 truncate">{item.titulo}</p><p className="text-[9px] text-gray-400 flex items-center mt-2 font-black uppercase"><CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-blue-400"/> {item.fecha_entrega || item.fecha}</p></div><button onClick={() => handleDeleteItem(activeTab === 'assignments' ? 'asignaciones' : 'examenes', item.id)} className="text-gray-300 hover:text-red-500 p-2"><TrashIcon className="w-5 h-5"/></button></div>))}</div></div>
                </div>
            )}

            {activeTab === 'attendance' && (
                <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl animate-fade-in border-t-8 border-green-500 space-y-8">
                    <div className="flex flex-col md:flex-row gap-6 items-end bg-gray-50 p-8 rounded-[2.5rem] shadow-inner border border-gray-100"><div className="flex-1 space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Materia para Pase de Lista</label><select value={attCourse} onChange={e => setAttCourse(e.target.value)} className="w-full p-4 rounded-2xl border-none text-sm font-black uppercase shadow-md outline-none focus:ring-2 focus:ring-green-500 transition-all"><option value="">Seleccionar Materia...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div><div className="w-full md:w-64 space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha de Clase</label><input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} className="w-full p-4 rounded-2xl border-none text-sm font-black shadow-md outline-none"/></div><button onClick={loadAttendanceList} className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-green-700 h-[56px] tracking-widest transition-all transform active:scale-95">Listar Grupo</button></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{attList.map(alumno => (
                        <div 
                            key={alumno.id} 
                            onClick={() => cycleAttendance(alumno.id, alumno.estado)} 
                            className={`flex items-center justify-between p-6 rounded-[2rem] cursor-pointer transition-all border-2 shadow-sm transform hover:-translate-y-1 ${alumno.estado === 'presente' ? 'bg-green-50 border-green-200 shadow-green-100' : alumno.estado === 'ausente' ? 'bg-red-50 border-red-200 shadow-red-100' : 'bg-gray-50 border-gray-100 shadow-inner'}`}
                        >
                            <div className="flex items-center">
                                <img src={alumno.avatar} className="w-12 h-12 rounded-2xl mr-4 border-2 border-white shadow-md object-cover"/>
                                <div>
                                    <p className="text-xs font-black text-gray-800 tracking-tight">{alumno.nombre}</p>
                                    <p className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${alumno.estado === 'ninguno' ? 'text-gray-400' : 'text-blue-500'}`}>{alumno.estado === 'ninguno' ? 'Sin Marcar' : alumno.estado}</p>
                                </div>
                            </div>
                            {alumno.estado === 'presente' ? <CheckCircleIcon className="w-7 h-7 text-green-500"/> : alumno.estado === 'ausente' ? <XIcon className="w-7 h-7 text-red-500"/> : <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300"></div>}
                        </div>
                    ))}</div>
                </div>
            )}

            {activeTab === 'announcements' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-indigo-500 h-fit space-y-6">
                        <h3 className="font-black flex items-center text-gray-700 uppercase text-xs tracking-widest"><PlusIcon className="w-6 h-6 mr-3 text-indigo-600"/> Redactar Anuncio</h3>
                        <div className="space-y-4"><input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="Asunto del Mensaje" className="w-full p-5 text-xs bg-gray-50 border-none rounded-3xl font-black shadow-inner outline-none"/><textarea rows={5} value={newItem.content} onChange={e => setNewItem({...newItem, content: e.target.value})} placeholder="Escribe aquí el contenido detallado del anuncio para los alumnos..." className="w-full p-5 text-xs bg-gray-50 border-none rounded-3xl font-medium shadow-inner outline-none"></textarea><button onClick={handlePostAnnouncement} className="w-full bg-indigo-600 text-white py-5 rounded-[2.5rem] font-black text-[11px] uppercase shadow-xl hover:bg-indigo-700 flex items-center justify-center tracking-widest transition-all"><SendIcon className="w-5 h-5 mr-3"/> Publicar en Tablón</button></div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border h-[600px] flex flex-col"><div className="p-8 bg-gray-50 border-b font-black text-[10px] uppercase text-gray-400 tracking-widest">Anuncios Enviados</div><div className="flex-1 overflow-y-auto divide-y">{allAnnouncements.map(msg => (<div key={msg.id} className="p-6 hover:bg-gray-50 transition-all flex justify-between items-start group"><div className="truncate"><p className="text-sm font-black text-gray-800">{msg.asunto}</p><p className="text-[9px] font-black text-indigo-500 uppercase mt-2 flex items-center"><ClockIcon className="w-3.5 h-3.5 mr-1.5"/> {new Date(msg.fecha_envio).toLocaleDateString()} - {new Date(msg.fecha_envio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></div><button onClick={() => handleDeleteItem('mensajes', msg.id)} className="text-gray-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all"><TrashIcon className="w-5 h-5"/></button></div>))}</div></div>
                </div>
            )}
        </div>
    );
};

export default TeacherPanel;
