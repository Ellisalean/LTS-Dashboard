
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
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

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

    // Fix: Adding missing state variables for assignments, exams, announcements and attendance
    const [assignments, setAssignments] = useState<any[]>([]);
    const [newAssignCourse, setNewAssignCourse] = useState('');
    const [newAssignTitle, setNewAssignTitle] = useState('');
    const [newAssignDate, setNewAssignDate] = useState('');

    const [exams, setExams] = useState<any[]>([]);
    const [newExamCourse, setNewExamCourse] = useState('');
    const [newExamTitle, setNewExamTitle] = useState('');
    const [newExamDate, setNewExamDate] = useState('');

    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [newAnnounceMsg, setNewAnnounceMsg] = useState('');

    const [attendanceCourse, setAttendanceCourse] = useState('');
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});

    // Recursos
    const [courseResources, setCourseResources] = useState<Resource[]>([]);
    const [newResCourse, setNewResCourse] = useState('');
    const [newResTitle, setNewResTitle] = useState('');
    const [newResUrl, setNewResUrl] = useState('');
    const [newResType, setNewResType] = useState<'pdf' | 'video' | 'audio' | 'link'>('pdf');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

    const fetchResources = async () => {
        const { data } = await supabase.from('recursos').select('*').order('created_at', { ascending: false });
        if (data) setCourseResources(data.map((r: any) => ({
            id: r.id, courseId: r.course_id, title: r.titulo, url: r.url, type: r.tipo, createdAt: r.created_at
        })));
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

    // --- LOGICA DE RECURSOS CON SUBIDA DE ARCHIVOS ---
    const handleAddResource = async () => {
        if (!newResCourse || !newResTitle) {
            alert("Por favor completa la materia y el título.");
            return;
        }

        setIsSaving(true);
        let finalUrl = newResUrl;

        // Si hay un archivo seleccionado, subirlo primero
        if (selectedFile) {
            setUploadProgress(0);
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${newResCourse}_${Date.now()}.${fileExt}`;
            const filePath = `recursos/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('recursos')
                .upload(filePath, selectedFile);

            if (uploadError) {
                alert("Error al subir archivo: " + uploadError.message);
                setIsSaving(false);
                setUploadProgress(null);
                return;
            }

            const { data: { publicUrl } } = supabase.storage.from('recursos').getPublicUrl(filePath);
            finalUrl = publicUrl;
        }

        if (!finalUrl) {
            alert("Debes proporcionar un enlace o subir un archivo.");
            setIsSaving(false);
            return;
        }

        const { error } = await supabase.from('recursos').insert({
            course_id: newResCourse, titulo: newResTitle, url: finalUrl, tipo: newResType
        });

        if (!error) { 
            fetchResources(); 
            setNewResTitle(''); 
            setNewResUrl(''); 
            setSelectedFile(null);
            alert("Material publicado con éxito.");
        } else {
            alert("Error al guardar en base de datos: " + error.message);
        }
        
        setIsSaving(false);
        setUploadProgress(null);
    };

    const handleDeleteResource = async (resource: Resource) => {
        if (!confirm('¿Eliminar este material permanentemente?')) return;
        
        // Si la URL es de Supabase Storage, intentar borrar el archivo físico también
        if (resource.url.includes('storage.v1/object/public/recursos')) {
            const pathParts = resource.url.split('recursos/');
            const filePath = `recursos/${pathParts[pathParts.length - 1]}`;
            await supabase.storage.from('recursos').remove([filePath]);
        }

        await supabase.from('recursos').delete().eq('id', resource.id);
        fetchResources();
    };

    // --- PESTAÑAS SECUNDARIAS ---
    useEffect(() => {
        if (activeTab === 'assignments') fetchAssignments();
        if (activeTab === 'exams') fetchExams();
        if (activeTab === 'announcements') fetchAnnouncements();
        if (activeTab === 'resources') fetchResources();
    }, [activeTab]);

    const fetchAssignments = async () => {
        const { data } = await supabase.from('asignaciones').select('*').order('fecha_entrega', { ascending: false });
        // Fix: setAssignments was missing
        setAssignments(data || []);
    };
    const handleAddAssignment = async () => {
        // Fix: Adding missing state variables check
        if (!newAssignCourse || !newAssignTitle) return;
        await supabase.from('asignaciones').insert({ curso_id: newAssignCourse, titulo: newAssignTitle, fecha_entrega: newAssignDate || null });
        fetchAssignments(); setNewAssignTitle('');
    };
    const fetchExams = async () => {
        const { data } = await supabase.from('examenes').select('*').order('fecha', { ascending: false });
        // Fix: setExams was missing
        setExams(data || []);
    };
    const handleAddExam = async () => {
        // Fix: Adding missing state variables check
        if (!newExamCourse || !newExamTitle) return;
        await supabase.from('examenes').insert({ curso_id: newExamCourse, titulo: newExamTitle, fecha: newExamDate || null });
        fetchExams(); setNewExamTitle('');
    };
    const fetchAnnouncements = async () => {
        const { data } = await supabase.from('mensajes').select('*').order('fecha_envio', { ascending: false });
        // Fix: setAnnouncements was missing
        setAnnouncements(data || []);
    };
    const handleAddAnnounce = async () => {
        // Fix: Adding missing state variables check
        if (!newAnnounceMsg) return;
        await supabase.from('mensajes').insert({ remitente: 'Dirección LTS', asunto: newAnnounceMsg, leido: false, fecha_envio: new Date().toISOString() });
        fetchAnnouncements(); setNewAnnounceMsg('');
    };

    const loadAttendance = async () => {
        // Fix: Adding missing state variables check
        if (!attendanceCourse) return;
        const { data } = await supabase.from('asistencias').select('*').eq('curso_id', attendanceCourse).eq('fecha', attendanceDate);
        const map: any = {}; data?.forEach(r => map[r.estudiante_id] = r.estado);
        // Fix: setAttendanceMap was missing
        setAttendanceMap(map);
    };
    const markAttendance = async (studentId: string, status: string) => {
        // Fix: setAttendanceMap was missing
        setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
        const { data: exist } = await supabase.from('asistencias').select('id').eq('estudiante_id', studentId).eq('curso_id', attendanceCourse).eq('fecha', attendanceDate).single();
        if (exist) await supabase.from('asistencias').update({ estado: status }).eq('id', exist.id);
        else await supabase.from('asistencias').insert({ estudiante_id: studentId, curso_id: attendanceCourse, fecha: attendanceDate, estado: status });
    };

    // Notas
    const [newGradeCourse, setNewGradeCourse] = useState('');
    const [newGradeTitle, setNewGradeTitle] = useState('Nota Final');
    const [newGradeScore, setNewGradeScore] = useState(0);

    // Pagos
    const [newPayAmount, setNewPayAmount] = useState(0);
    const [newPayDesc, setNewPayDesc] = useState('');
    const [newPayMethod, setNewPayMethod] = useState('Zelle');

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

            {/* GESTIÓN RECURSOS CON SUBIDA DE ARCHIVOS */}
            {activeTab === 'resources' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-indigo-500 h-fit space-y-6">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-gray-200 uppercase text-xs tracking-widest">
                            <PlusIcon className="w-6 h-6 mr-3 text-indigo-600"/>
                            Nuevo Material de Clase
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 block mb-2 uppercase tracking-widest">Materia Destino</label>
                                <select 
                                    value={newResCourse} 
                                    onChange={e => setNewResCourse(e.target.value)} 
                                    className="w-full p-4 text-xs border border-gray-100 dark:border-gray-700 rounded-2xl dark:bg-gray-700 font-black uppercase shadow-sm"
                                >
                                    <option value="">Seleccionar Materia...</option>
                                    {adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 block mb-2 uppercase tracking-widest">Título del Recurso</label>
                                <input 
                                    type="text" 
                                    value={newResTitle} 
                                    onChange={e => setNewResTitle(e.target.value)} 
                                    placeholder="Ej: Video Clase 01 / Lectura PDF" 
                                    className="w-full p-4 text-xs border border-gray-100 rounded-2xl dark:bg-gray-700 font-bold"
                                />
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                {(['pdf', 'video', 'audio', 'link'] as const).map(type => (
                                    <button 
                                        key={type} 
                                        onClick={() => setNewResType(type)} 
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newResType === type ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>

                            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                <label className="flex flex-col items-center justify-center cursor-pointer">
                                    <DownloadIcon className="w-8 h-8 text-indigo-400 mb-2"/>
                                    <span className="text-[10px] font-black text-gray-500 uppercase">
                                        {selectedFile ? selectedFile.name : "Click para seleccionar archivo"}
                                    </span>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                                    />
                                </label>
                            </div>

                            <div className="text-center">
                                <span className="text-[10px] text-gray-400 font-bold uppercase">ó pega un link externo</span>
                                <input 
                                    type="text" 
                                    value={newResUrl} 
                                    onChange={e => setNewResUrl(e.target.value)} 
                                    placeholder="https://google-drive.com/clase.pdf" 
                                    className="w-full mt-2 p-3 text-xs border border-gray-100 rounded-2xl dark:bg-gray-700 font-medium italic"
                                />
                            </div>

                            <button 
                                onClick={handleAddResource} 
                                disabled={isSaving}
                                className={`w-full font-black py-4 rounded-2xl text-[10px] uppercase shadow-2xl tracking-widest transition-all ${isSaving ? 'bg-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                            >
                                {isSaving ? 'Subiendo...' : 'Publicar Material'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700">
                        <div className="p-6 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 font-black text-[10px] uppercase tracking-widest text-gray-400 flex justify-between items-center">
                            <span>Materiales Publicados</span>
                            <span className="bg-white dark:bg-gray-700 px-3 py-1 rounded-full">{courseResources.length}</span>
                        </div>
                        <div className="divide-y dark:divide-gray-700 overflow-y-auto max-h-[600px]">
                            {courseResources.map(res => (
                                <div key={res.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-all group">
                                    <div className="flex items-center">
                                        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                                            {res.type === 'video' ? <VideoIcon className="w-5 h-5 text-red-500" /> : res.type === 'pdf' ? <DocumentTextIcon className="w-5 h-5 text-blue-500" /> : res.type === 'audio' ? <MusicIcon className="w-5 h-5 text-purple-500" /> : <LinkIcon className="w-5 h-5 text-gray-500" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 dark:text-white">{res.title}</p>
                                            <p className="text-[10px] text-indigo-500 font-black uppercase">
                                                {(adminCourses.find(c => c.id === res.courseId)?.nombre || res.courseId)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a href={res.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-indigo-500 p-2"><LinkIcon className="w-5 h-5"/></a>
                                        <button onClick={() => handleDeleteResource(res)} className="text-gray-300 hover:text-red-500 transition-all p-2"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            ))}
                            {courseResources.length === 0 && (
                                <div className="p-10 text-center text-gray-400 italic text-sm">No se han publicado materiales aún.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MANTENER EL RESTO DE TABLAS (ALUMNOS, MATERIAS, ETC) IGUAL QUE EL ANTERIOR */}
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

            {/* ... Resto del componente TeacherPanel mantenido igual ... */}
        </div>
    );
};

export default TeacherPanel;
