
import React, { useState, useEffect } from 'react';
import { supabase } from '../../application/supabase.ts';
import { 
    PencilIcon, UserGroupIcon, PlusIcon, TrashIcon, ClipboardListIcon, 
    AcademicCapIcon, CalendarIcon, CheckIcon, DownloadIcon, MailIcon, 
    BookOpenIcon, SearchIcon, CurrencyDollarIcon, XIcon, 
    ChevronLeftIcon, VideoIcon, MusicIcon, DocumentTextIcon, LinkIcon, 
    ChartBarIcon, ClockIcon, CheckCircleIcon
} from '../Icons.tsx';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
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

    // Detalle del Alumno Seleccionado
    const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [studentGrades, setStudentGrades] = useState<GradeData[]>([]);
    const [studentInscriptions, setStudentInscriptions] = useState<string[]>([]);
    const [studentPayments, setStudentPayments] = useState<Payment[]>([]);

    // Estados para Materiales
    const [newResCourse, setNewResCourse] = useState('');
    const [newResTitle, setNewResTitle] = useState('');
    const [newResUrl, setNewResUrl] = useState('');
    const [newResType, setNewResType] = useState<'pdf' | 'video' | 'audio' | 'link'>('pdf');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Estados para Registro de Notas
    const [newGradeCourse, setNewGradeCourse] = useState('');
    const [newGradeTitle, setNewGradeTitle] = useState('Nota Final');
    const [newGradeScore, setNewGradeScore] = useState(0);

    // Estados para Finanzas
    const [newPayAmount, setNewPayAmount] = useState(0);
    const [newPayDesc, setNewPayDesc] = useState('');
    const [newPayMethod, setNewPayMethod] = useState('ZELLE');

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

    // --- ACCIONES DE ALUMNO ---
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
        const { error } = await supabase.from('estudiantes')
            .update({ nombre: editName, email: editEmail, password: editPassword })
            .eq('id', selectedStudent.id);
        setIsSaving(false);
        if (!error) alert("Perfil actualizado correctamente.");
    };

    const toggleInscription = async (courseId: string) => {
        if (!selectedStudent) return;
        const isEnrolled = studentInscriptions.includes(courseId);
        if (isEnrolled) {
            await supabase.from('inscripciones').delete().eq('estudiante_id', selectedStudent.id).eq('curso_id', courseId);
            setStudentInscriptions(prev => prev.filter(id => id !== courseId));
        } else {
            await supabase.from('inscripciones').insert({ estudiante_id: selectedStudent.id, curso_id: courseId });
            setStudentInscriptions(prev => [...prev, courseId]);
        }
    };

    const handleAddGrade = async () => {
        if (!selectedStudent || !newGradeCourse) return;
        setIsSaving(true);
        const { data, error } = await supabase.from('notas').insert({
            estudiante_id: selectedStudent.id,
            curso_id: newGradeCourse,
            titulo_asignacion: newGradeTitle,
            puntuacion: newGradeScore,
            puntuacion_maxima: 100
        }).select();
        if (!error && data) {
            setStudentGrades(prev => [data[0], ...prev]);
            setNewGradeScore(0);
        }
        setIsSaving(false);
    };

    const handleDeleteGrade = async (id: string) => {
        if (!confirm("¿Eliminar esta nota?")) return;
        await supabase.from('notas').delete().eq('id', id);
        setStudentGrades(prev => prev.filter(g => g.id !== id));
    };

    const handleAddPayment = async () => {
        if (!selectedStudent || newPayAmount <= 0) return;
        setIsSaving(true);
        const { data, error } = await supabase.from('pagos').insert({
            student_id: selectedStudent.id,
            amount: newPayAmount,
            description: newPayDesc || 'Mensualidad',
            method: newPayMethod,
            date: new Date().toISOString().split('T')[0],
            type: 'tuition',
            verified: true
        }).select();
        if (!error && data) {
            setStudentPayments(prev => [data[0], ...prev]);
            setNewPayAmount(0); setNewPayDesc('');
        }
        setIsSaving(false);
    };

    const handleDeletePayment = async (id: string) => {
        if (!confirm("¿Eliminar registro de pago?")) return;
        await supabase.from('pagos').delete().eq('id', id);
        setStudentPayments(prev => prev.filter(p => p.id !== id));
    };

    // --- ACCIONES MATERIALES ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setNewResTitle(e.target.files[0].name.split('.')[0]);
            const ext = e.target.files[0].name.split('.').pop()?.toLowerCase();
            if (['pdf', 'doc', 'docx'].includes(ext!)) setNewResType('pdf');
            else if (['mp4', 'mov', 'avi'].includes(ext!)) setNewResType('video');
            else if (['mp3', 'wav'].includes(ext!)) setNewResType('audio');
        }
    };

    const handleUploadResource = async () => {
        if (!newResCourse || !newResTitle) { alert("Completa los campos"); return; }
        setIsSaving(true);
        let finalUrl = newResUrl;

        try {
            if (selectedFile) {
                const filePath = `${newResCourse}/${Date.now()}_${selectedFile.name}`;
                const { error: uploadError } = await supabase.storage.from('recursos').upload(filePath, selectedFile);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('recursos').getPublicUrl(filePath);
                finalUrl = publicUrl;
            }
            if (!finalUrl) throw new Error("Falta archivo o URL");
            await supabase.from('recursos').insert({ course_id: newResCourse, titulo: newResTitle, url: finalUrl, tipo: newResType });
            alert("Material publicado.");
            setNewResTitle(''); setNewResUrl(''); setSelectedFile(null);
            fetchResources();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteResource = async (id: string) => {
        if (!confirm("¿Eliminar este material?")) return;
        await supabase.from('recursos').delete().eq('id', id);
        fetchResources();
    };

    // --- EMAIL Y REPORTES ---
    const handleSendCreds = async () => {
        if (!selectedStudent) return;
        setIsSaving(true);
        try {
            const res = await fetch('/.netlify/functions/send-welcome-email', {
                method: 'POST',
                body: JSON.stringify({ email: editEmail, name: editName, password: editPassword, role: selectedStudent.rol })
            });
            if (res.ok) alert("Correo enviado exitosamente.");
            else alert("Error al enviar correo. Verifique la API Key.");
        } catch (e) { alert("Error de conexión."); }
        finally { setIsSaving(false); }
    };

    const handleDownloadPDF = () => {
        if (!selectedStudent) return;
        const doc = new jsPDF();
        doc.setFontSize(20); doc.text("Latin Theological Seminary", 105, 20, { align: 'center' });
        doc.setFontSize(10); doc.text("Boletín Oficial de Calificaciones", 105, 28, { align: 'center' });
        doc.setFontSize(12); doc.text(`Estudiante: ${selectedStudent.nombre}`, 20, 45);
        doc.text(`Email: ${selectedStudent.email}`, 20, 52);
        const tableData = studentGrades.map(g => [adminCourses.find(c => c.id === g.curso_id)?.nombre || g.curso_id, g.titulo_asignacion, g.puntuacion]);
        autoTable(doc, { startY: 60, head: [['Materia', 'Asignación', 'Nota']], body: tableData, theme: 'grid' });
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
                        className={`flex items-center px-6 py-3 rounded-2xl text-xs font-black uppercase transition-all whitespace-nowrap tracking-widest ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-xl' : 'text-gray-500 hover:bg-white/50'}`}
                    >
                        <tab.icon className="w-4 h-4 mr-2"/> {tab.label}
                    </button>
                ))}
            </div>

            {/* LISTA DE ALUMNOS */}
            {activeTab === 'students' && !selectedStudent && (
                 <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700 animate-fade-in">
                    <div className="p-6 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                        <div className="relative w-full max-w-lg">
                            <input 
                                type="text" 
                                placeholder="Buscar alumno..." 
                                value={studentSearchTerm} 
                                onChange={(e) => setStudentSearchTerm(e.target.value)} 
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-gray-700 shadow-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                            />
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

            {/* DETALLE ALUMNO (4 COLUMNAS SEGÚN CAPTURA) */}
            {activeTab === 'students' && selectedStudent && (
                <div className="animate-fade-in space-y-6">
                    <div className="flex justify-between items-center">
                        <button onClick={() => setSelectedStudent(null)} className="flex items-center text-blue-600 font-black uppercase text-[10px] tracking-widest"><ChevronLeftIcon className="w-5 h-5 mr-1"/> Volver</button>
                        <div className="flex space-x-2">
                            <button onClick={handleDownloadPDF} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center"><DownloadIcon className="w-4 h-4 mr-2"/> Descargar Notas</button>
                            <button onClick={handleSendCreds} className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center"><MailIcon className="w-4 h-4 mr-2"/> Enviar Credenciales</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {/* COL 1: INFORMACIÓN BÁSICA */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border dark:border-gray-700 border-t-8 border-blue-600 space-y-6">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Información Básica</h3>
                            <div className="flex flex-col items-center">
                                <img src={selectedStudent.avatar_url} className="w-24 h-24 rounded-3xl shadow-xl border-4 border-white mb-4"/>
                                <h4 className="text-center font-black text-gray-800 dark:text-white leading-tight">{selectedStudent.nombre}</h4>
                            </div>
                            <div className="space-y-4">
                                <div><label className="text-[9px] font-black text-gray-400 uppercase ml-1">Email</label><input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none text-sm font-bold shadow-inner"/></div>
                                <div><label className="text-[9px] font-black text-gray-400 uppercase ml-1">Contraseña</label><input value={editPassword} onChange={e => setEditPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none text-sm font-bold shadow-inner"/></div>
                                <button onClick={handleUpdateProfile} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-[11px] uppercase shadow-lg hover:bg-black transition-all">Actualizar Perfil</button>
                            </div>
                        </div>

                        {/* COL 2: TRIMESTRE ACTUAL */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border dark:border-gray-700 border-t-8 border-green-500">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Trimestre Actual</h3>
                            <p className="text-[10px] text-gray-400 italic mb-6">Activa materias para cursado.</p>
                            <div className="space-y-3 overflow-y-auto max-h-[450px] pr-2">
                                {adminCourses.map(course => (
                                    <div key={course.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl transition-all border border-transparent hover:border-green-200">
                                        <div className="flex-1 overflow-hidden mr-4">
                                            <p className="text-xs font-black text-gray-800 dark:text-gray-200 truncate">{course.nombre}</p>
                                            <p className="text-[9px] font-bold text-gray-400 truncate uppercase">Prof: {course.profesor}</p>
                                        </div>
                                        <button onClick={() => toggleInscription(course.id)} className={`p-2 rounded-xl transition-all shadow-md ${studentInscriptions.includes(course.id) ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-300 hover:text-blue-500'}`}>{studentInscriptions.includes(course.id) ? <CheckIcon className="w-4 h-4"/> : <PlusIcon className="w-4 h-4"/>}</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* COL 3: REGISTRO DE NOTAS */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border dark:border-gray-700 border-t-8 border-amber-500">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Registro de Notas</h3>
                            <div className="space-y-4 mb-6 p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-3xl border border-dashed border-amber-200">
                                <select value={newGradeCourse} onChange={e => setNewGradeCourse(e.target.value)} className="w-full p-4 text-[10px] font-black rounded-2xl border dark:bg-gray-700 uppercase"><option value="">Materia...</option>{adminCourses.filter(c => studentInscriptions.includes(c.id)).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                                <input placeholder="Nota Final" value={newGradeTitle} onChange={e => setNewGradeTitle(e.target.value)} className="w-full p-4 rounded-2xl bg-white dark:bg-gray-900 border-none text-xs font-bold shadow-sm"/>
                                <div className="flex gap-2"><input type="number" value={newGradeScore} onChange={e => setNewGradeScore(Number(e.target.value))} className="w-20 p-4 rounded-2xl bg-white dark:bg-gray-900 border-none text-sm font-black text-center shadow-sm"/><button onClick={handleAddGrade} className="flex-1 bg-amber-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-amber-600">Subir Nota</button></div>
                            </div>
                            <div className="space-y-3 overflow-y-auto max-h-[250px] pr-2">
                                {studentGrades.map(g => (
                                    <div key={g.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex justify-between items-center"><div className="overflow-hidden mr-2"><p className="text-[9px] font-black text-blue-500 uppercase">{(adminCourses.find(c => c.id === g.curso_id)?.nombre || 'MAT').substring(0,12)}</p><p className="text-xs font-bold text-gray-800 dark:text-white truncate">{g.titulo_asignacion}</p></div><div className="flex items-center gap-4"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black">{g.puntuacion}</span><button onClick={() => handleDeleteGrade(g.id)} className="text-gray-300 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button></div></div>
                                ))}
                            </div>
                        </div>

                        {/* COL 4: HISTORIAL FINANCIERO */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border dark:border-gray-700 border-t-8 border-indigo-500">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Historial Financiero</h3>
                            <div className="space-y-4 mb-6 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-3xl border border-dashed border-indigo-200">
                                <input type="number" value={newPayAmount} onChange={e => setNewPayAmount(Number(e.target.value))} className="w-full p-4 rounded-2xl bg-white dark:bg-gray-900 border-none text-center text-sm font-black shadow-sm" placeholder="0"/>
                                <input placeholder="Concepto (Ej: Octubre)" value={newPayDesc} onChange={e => setNewPayDesc(e.target.value)} className="w-full p-4 rounded-2xl bg-white dark:bg-gray-900 border-none text-xs font-bold shadow-sm"/>
                                <select value={newPayMethod} onChange={e => setNewPayMethod(e.target.value)} className="w-full p-4 text-[10px] font-black rounded-2xl border dark:bg-gray-700 uppercase"><option value="ZELLE">ZELLE</option><option value="EFECTIVO">EFECTIVO</option><option value="PAGO MÓVIL">PAGO MÓVIL</option></select>
                                <button onClick={handleAddPayment} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-blue-700">Registrar Pago</button>
                            </div>
                            <div className="space-y-3 overflow-y-auto max-h-[250px] pr-2">
                                {studentPayments.map(p => (
                                    <div key={p.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex justify-between items-center"><div className="overflow-hidden mr-2"><p className="text-[9px] font-black text-indigo-500 uppercase">{p.date}</p><p className="text-xs font-bold text-gray-800 dark:text-white truncate">{p.description}</p></div><div className="flex items-center gap-4"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black">${p.amount}</span><button onClick={() => handleDeletePayment(p.id)} className="text-gray-300 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button></div></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA MATERIALES (COMPLETA CON CARGA) */}
            {activeTab === 'resources' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-indigo-500 h-fit space-y-6">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-gray-200 uppercase text-xs tracking-widest"><PlusIcon className="w-6 h-6 mr-3 text-indigo-600"/> Nuevo Material</h3>
                        <div className="space-y-4">
                            <select value={newResCourse} onChange={e => setNewResCourse(e.target.value)} className="w-full p-4 text-xs border rounded-2xl dark:bg-gray-700 font-black uppercase"><option value="">Seleccionar Materia...</option>{adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                            <input type="text" value={newResTitle} onChange={e => setNewResTitle(e.target.value)} placeholder="Título del material" className="w-full p-4 text-xs border rounded-2xl dark:bg-gray-700 font-bold"/>
                            
                            <div className="p-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/50 hover:bg-white transition-all cursor-pointer relative group">
                                <DownloadIcon className="w-10 h-10 text-indigo-400 mb-2 group-hover:scale-110 transition-transform"/>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedFile ? selectedFile.name : "Subir archivo o documento"}</span>
                                <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>

                            <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-400 uppercase">Ó URL</span><input type="text" value={newResUrl} onChange={e => setNewResUrl(e.target.value)} placeholder="https://..." className="w-full p-4 pl-16 text-xs border rounded-2xl dark:bg-gray-700 font-medium italic"/></div>
                            <button onClick={handleUploadResource} disabled={isSaving} className={`w-full text-white font-black py-4 rounded-2xl text-[10px] uppercase shadow-2xl transition-all ${isSaving ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{isSaving ? 'Cargando...' : 'Publicar Material'}</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700">
                        <div className="p-6 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 font-black text-[10px] uppercase tracking-widest text-gray-400 flex justify-between items-center"><span>Materiales Publicados</span><span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full">{courseResources.length}</span></div>
                        <div className="divide-y dark:divide-gray-700 overflow-y-auto max-h-[600px]">
                            {courseResources.map(res => (
                                <div key={res.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-all group">
                                    <div className="flex items-center">
                                        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl mr-4 group-hover:scale-110 transition-transform">{res.type === 'video' ? <VideoIcon className="w-5 h-5 text-red-500" /> : res.type === 'pdf' ? <DocumentTextIcon className="w-5 h-5 text-blue-500" /> : res.type === 'audio' ? <MusicIcon className="w-5 h-5 text-purple-500" /> : <LinkIcon className="w-5 h-5 text-gray-500" />}</div>
                                        <div className="overflow-hidden mr-2"><p className="text-sm font-bold text-gray-800 dark:text-white truncate max-w-[200px]">{res.title}</p><p className="text-[9px] text-indigo-500 font-black uppercase">{(adminCourses.find(c => c.id === res.courseId)?.nombre || res.courseId)}</p></div>
                                    </div>
                                    <div className="flex items-center gap-2"><a href={res.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-indigo-500 p-2"><LinkIcon className="w-5 h-5"/></a><button onClick={() => handleDeleteResource(res.id)} className="text-gray-300 hover:text-red-500 p-2"><TrashIcon className="w-5 h-5"/></button></div>
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
