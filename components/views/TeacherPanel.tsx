
import React, { useState, useEffect } from 'react';
import { supabase } from '../../application/supabase.ts';
import { 
    PencilIcon, UserGroupIcon, PlusIcon, TrashIcon, ClipboardListIcon, 
    AcademicCapIcon, CalendarIcon, CheckIcon, DownloadIcon, MailIcon, 
    BookOpenIcon, SearchIcon, CurrencyDollarIcon, XIcon, 
    ChevronLeftIcon, VideoIcon, MusicIcon, DocumentTextIcon, LinkIcon, 
    ChartBarIcon, ClockIcon
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
    const isTeacher = user.role === 'profesor';

    const [activeTab, setActiveTab] = useState<'students' | 'assignments' | 'exams' | 'attendance' | 'announcements' | 'resources'>('students');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Datos Principales
    const [students, setStudents] = useState<StudentData[]>([]);
    const [adminCourses, setAdminCourses] = useState<CourseAdminData[]>([]);
    const [courseResources, setCourseResources] = useState<Resource[]>([]);
    const [studentSearchTerm, setStudentSearchTerm] = useState('');

    // Gestión de Alumno Seleccionado
    const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
    const [studentGrades, setStudentGrades] = useState<GradeData[]>([]);
    const [studentInscriptions, setStudentInscriptions] = useState<string[]>([]);
    const [studentPayments, setStudentPayments] = useState<Payment[]>([]);

    // Estados para Creación de Items
    const [newResCourse, setNewResCourse] = useState('');
    const [newResTitle, setNewResTitle] = useState('');
    const [newResUrl, setNewResUrl] = useState('');
    const [newResType, setNewResType] = useState<'pdf' | 'video' | 'audio' | 'link'>('pdf');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [newAssignCourse, setNewAssignCourse] = useState('');
    const [newAssignTitle, setNewAssignTitle] = useState('');
    const [newAssignDate, setNewAssignDate] = useState('');
    const [assignments, setAssignments] = useState<any[]>([]);

    const [newExamCourse, setNewExamCourse] = useState('');
    const [newExamTitle, setNewExamTitle] = useState('');
    const [newExamDate, setNewExamDate] = useState('');
    const [exams, setExams] = useState<any[]>([]);

    const [newAnnounceMsg, setNewAnnounceMsg] = useState('');
    const [announcements, setAnnouncements] = useState<any[]>([]);

    const [attendanceCourse, setAttendanceCourse] = useState('');
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});

    // Finanzas Alumno
    const [newPayAmount, setNewPayAmount] = useState<number>(0);
    const [newPayDesc, setNewPayDesc] = useState('');
    const [newPayMethod, setNewPayMethod] = useState('Zelle');

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
            id: r.id, courseId: r.course_id, title: r.titulo, url: r.url, type: r.tipo, createdAt: r.created_at
        })));
    };

    // --- LOGICA DE ALUMNOS ---
    const handleSelectStudent = async (student: StudentData) => {
        setSelectedStudent(student);
        const [gradesRes, inscRes, paymentsRes] = await Promise.all([
            supabase.from('notas').select('*').eq('estudiante_id', student.id),
            supabase.from('inscripciones').select('curso_id').eq('estudiante_id', student.id),
            supabase.from('pagos').select('*').eq('student_id', student.id).order('date', { ascending: false })
        ]);
        setStudentGrades(gradesRes.data || []);
        setStudentInscriptions((inscRes.data || []).map(i => i.curso_id));
        setStudentPayments(paymentsRes.data || []);
    };

    const handleAddPayment = async () => {
        if (!selectedStudent || newPayAmount <= 0) return;
        setIsSaving(true);
        const { error } = await supabase.from('pagos').insert({
            student_id: selectedStudent.id,
            amount: newPayAmount,
            description: newPayDesc || 'Mensualidad',
            method: newPayMethod,
            date: new Date().toISOString().split('T')[0],
            verified: true,
            type: 'tuition'
        });
        setIsSaving(false);
        if (!error) {
            alert("Pago registrado con éxito");
            setNewPayAmount(0);
            setNewPayDesc('');
            handleSelectStudent(selectedStudent);
        }
    };

    // --- LOGICA DE ASISTENCIA ---
    const markAttendance = async (studentId: string, status: string) => {
        if (!attendanceCourse) return;
        setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
        const { data: exist } = await supabase.from('asistencias')
            .select('id')
            .eq('estudiante_id', studentId)
            .eq('curso_id', attendanceCourse)
            .eq('fecha', attendanceDate)
            .single();

        if (exist) {
            await supabase.from('asistencias').update({ estado: status }).eq('id', exist.id);
        } else {
            await supabase.from('asistencias').insert({
                estudiante_id: studentId,
                curso_id: attendanceCourse,
                fecha: attendanceDate,
                estado: status
            });
        }
    };

    // --- LOGICA DE TAREAS Y EXAMENES ---
    const fetchAssignments = async () => {
        const { data } = await supabase.from('asignaciones').select('*').order('fecha_entrega', { ascending: false });
        setAssignments(data || []);
    };

    const handleAddAssignment = async () => {
        if (!newAssignCourse || !newAssignTitle) return;
        await supabase.from('asignaciones').insert({
            curso_id: newAssignCourse,
            titulo: newAssignTitle,
            fecha_entrega: newAssignDate || null
        });
        setNewAssignTitle('');
        fetchAssignments();
    };

    const fetchExams = async () => {
        const { data } = await supabase.from('examenes').select('*').order('fecha', { ascending: false });
        setExams(data || []);
    };

    const handleAddExam = async () => {
        if (!newExamCourse || !newExamTitle) return;
        await supabase.from('examenes').insert({
            curso_id: newExamCourse,
            titulo: newExamTitle,
            fecha: newExamDate || null
        });
        setNewExamTitle('');
        fetchExams();
    };

    // --- ANUNCIOS ---
    const fetchAnnouncements = async () => {
        const { data } = await supabase.from('mensajes').select('*').order('fecha_envio', { ascending: false });
        setAnnouncements(data || []);
    };

    const handleAddAnnounce = async () => {
        if (!newAnnounceMsg) return;
        await supabase.from('mensajes').insert({
            remitente: 'Dirección LTS',
            asunto: newAnnounceMsg,
            leido: false,
            fecha_envio: new Date().toISOString()
        });
        setNewAnnounceMsg('');
        fetchAnnouncements();
    };

    useEffect(() => {
        if (activeTab === 'assignments') fetchAssignments();
        if (activeTab === 'exams') fetchExams();
        if (activeTab === 'announcements') fetchAnnouncements();
        if (activeTab === 'resources') fetchResources();
    }, [activeTab]);

    if (loading) return (
        <div className="p-10 text-center flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-blue-600 font-black uppercase text-xs tracking-widest">Sincronizando LTS...</p>
        </div>
    );

    return (
        <div className="space-y-6 pb-20 max-w-[1600px] mx-auto px-4">
            <h1 className="text-3xl font-black flex items-center text-gray-800 dark:text-white tracking-tighter">
                <UserGroupIcon className="h-9 w-9 mr-4 text-blue-600"/>
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

            {/* VISTA ALUMNOS (DETALLE FINANCIERO INCLUIDO) */}
            {activeTab === 'students' && !selectedStudent && (
                 <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-gray-700 animate-fade-in">
                    <div className="p-6 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                        <div className="relative w-full max-w-lg">
                            <input 
                                type="text" 
                                placeholder="Buscar alumno..." 
                                value={studentSearchTerm} 
                                onChange={(e) => setStudentSearchTerm(e.target.value)} 
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-gray-700 shadow-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
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

            {activeTab === 'students' && selectedStudent && (
                <div className="animate-fade-in space-y-8 pb-12">
                    <button onClick={() => setSelectedStudent(null)} className="flex items-center text-blue-600 font-black uppercase text-[10px] tracking-widest"><ChevronLeftIcon className="w-5 h-5 mr-1"/> Volver a Lista</button>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* REGISTRO DE PAGO */}
                        <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-xl border-t-8 border-green-500 space-y-6">
                            <h3 className="text-xs font-black uppercase text-gray-400 flex items-center"><CurrencyDollarIcon className="w-4 h-4 mr-2"/> Registrar Pago Manual</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Monto ($)</label>
                                    <input type="number" value={newPayAmount} onChange={e => setNewPayAmount(Number(e.target.value))} className="w-full p-4 rounded-2xl border dark:bg-gray-700 font-bold" placeholder="25.00"/>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Método</label>
                                    <select value={newPayMethod} onChange={e => setNewPayMethod(e.target.value)} className="w-full p-4 rounded-2xl border dark:bg-gray-700 font-bold">
                                        <option value="Zelle">Zelle</option>
                                        <option value="Pago Móvil">Pago Móvil</option>
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Transferencia">Transferencia</option>
                                    </select>
                                </div>
                                <button onClick={handleAddPayment} disabled={isSaving} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-green-700 transition-all">Confirmar Pago</button>
                            </div>
                        </div>

                        {/* HISTORIAL PAGOS */}
                        <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-xl border dark:border-gray-700">
                            <h3 className="text-xs font-black uppercase text-gray-400 mb-6">Últimos Pagos</h3>
                            <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                                {studentPayments.map(pay => (
                                    <div key={pay.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex justify-between items-center border border-transparent hover:border-green-200 transition-all">
                                        <div>
                                            <p className="font-bold text-sm text-gray-800 dark:text-white">${pay.amount.toFixed(2)}</p>
                                            <p className="text-[10px] font-black text-green-500 uppercase">{pay.method} - {pay.date}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-400 font-bold italic">{pay.description}</p>
                                        </div>
                                    </div>
                                ))}
                                {studentPayments.length === 0 && <p className="text-center text-gray-400 italic text-sm py-10">No hay pagos registrados.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA ASISTENCIA */}
            {activeTab === 'attendance' && (
                <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl p-10 space-y-8 animate-fade-in border-t-8 border-blue-500">
                    <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-gray-50 dark:bg-gray-900 p-6 rounded-3xl">
                        <div className="flex-1 w-full">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Seleccionar Materia</label>
                            <select value={attendanceCourse} onChange={e => setAttendanceCourse(e.target.value)} className="w-full p-4 text-xs rounded-2xl border dark:bg-gray-700 font-black uppercase shadow-sm">
                                <option value="">--- Escoger Materia ---</option>
                                {adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>
                        <div className="w-full md:w-auto">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Fecha</label>
                            <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="w-full p-4 text-xs rounded-2xl border dark:bg-gray-700 font-black uppercase shadow-sm"/>
                        </div>
                    </div>

                    {attendanceCourse ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {students.map(student => (
                                <div key={student.id} className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-700 group hover:shadow-xl transition-all">
                                    <div className="flex items-center">
                                        <img src={student.avatar_url} className="w-10 h-10 rounded-xl mr-4"/>
                                        <span className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase truncate max-w-[120px]">{student.nombre}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => markAttendance(student.id, 'presente')} 
                                            className={`p-3 rounded-xl transition-all shadow-md ${attendanceMap[student.id] === 'presente' ? 'bg-green-600 text-white scale-110' : 'bg-white dark:bg-gray-800 text-gray-300 hover:text-green-500'}`}
                                        >
                                            <CheckIcon className="w-5 h-5"/>
                                        </button>
                                        <button 
                                            onClick={() => markAttendance(student.id, 'ausente')} 
                                            className={`p-3 rounded-xl transition-all shadow-md ${attendanceMap[student.id] === 'ausente' ? 'bg-red-600 text-white scale-110' : 'bg-white dark:bg-gray-800 text-gray-300 hover:text-red-500'}`}
                                        >
                                            <XIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-gray-50 dark:bg-gray-900 rounded-[3rem] border-2 border-dashed border-gray-200">
                            <BookOpenIcon className="w-16 h-16 text-gray-300 mx-auto mb-4"/>
                            <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Selecciona una materia para pasar asistencia</p>
                        </div>
                    )}
                </div>
            )}

            {/* VISTA TAREAS Y EXAMENES */}
            {(activeTab === 'assignments' || activeTab === 'exams') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    {/* FORMULARIO */}
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-indigo-500 h-fit space-y-6">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-gray-200 uppercase text-xs tracking-widest">
                            <PlusIcon className="w-6 h-6 mr-3 text-indigo-600"/>
                            Crear Nuevo Registro
                        </h3>
                        <div className="space-y-4">
                            <select 
                                value={activeTab === 'assignments' ? newAssignCourse : newExamCourse} 
                                onChange={e => activeTab === 'assignments' ? setNewAssignCourse(e.target.value) : setNewExamCourse(e.target.value)} 
                                className="w-full p-4 rounded-2xl border dark:bg-gray-700 font-bold text-xs"
                            >
                                <option value="">Seleccionar Materia...</option>
                                {adminCourses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                            <input 
                                type="text" 
                                value={activeTab === 'assignments' ? newAssignTitle : newExamTitle} 
                                onChange={e => activeTab === 'assignments' ? setNewAssignTitle(e.target.value) : setNewExamTitle(e.target.value)} 
                                placeholder="Título (Ej: Examen Parcial I)" 
                                className="w-full p-4 rounded-2xl border dark:bg-gray-700 font-bold text-xs"
                            />
                            <input 
                                type="date" 
                                value={activeTab === 'assignments' ? newAssignDate : newExamDate} 
                                onChange={e => activeTab === 'assignments' ? setNewAssignDate(e.target.value) : setNewExamDate(e.target.value)} 
                                className="w-full p-4 rounded-2xl border dark:bg-gray-700 font-bold text-xs"
                            />
                            <button 
                                onClick={activeTab === 'assignments' ? handleAddAssignment : handleAddExam} 
                                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-indigo-700"
                            >
                                Guardar Programación
                            </button>
                        </div>
                    </div>

                    {/* LISTADO */}
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl border dark:border-gray-700 overflow-hidden">
                        <div className="p-6 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 font-black text-[10px] uppercase tracking-widest text-gray-400">
                            Próximos Registros
                        </div>
                        <div className="divide-y dark:divide-gray-700 max-h-[500px] overflow-y-auto">
                            {(activeTab === 'assignments' ? assignments : exams).map(item => (
                                <div key={item.id} className="p-5 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <div>
                                        <p className="font-bold text-sm text-gray-800 dark:text-white">{item.titulo}</p>
                                        <p className="text-[10px] font-black text-indigo-500 uppercase">
                                            {adminCourses.find(c => c.id === item.curso_id)?.nombre || item.curso_id}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase">{item.fecha_entrega || item.fecha}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA ANUNCIOS */}
            {activeTab === 'announcements' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-t-8 border-amber-500 space-y-6">
                        <h3 className="font-black flex items-center text-gray-700 dark:text-gray-200 uppercase text-xs tracking-widest">
                            <MailIcon className="w-6 h-6 mr-3 text-amber-500"/>
                            Enviar Anuncio Global
                        </h3>
                        <textarea 
                            value={newAnnounceMsg} 
                            onChange={e => setNewAnnounceMsg(e.target.value)} 
                            placeholder="Escribe aquí el mensaje para todos los estudiantes..." 
                            className="w-full p-6 rounded-[2rem] border dark:bg-gray-700 font-medium text-sm h-40 resize-none"
                        />
                        <button onClick={handleAddAnnounce} className="w-full bg-amber-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-amber-700 transition-all">Publicar Anuncio</button>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl border dark:border-gray-700 overflow-hidden">
                        <div className="p-6 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 font-black text-[10px] uppercase tracking-widest text-gray-400">Historial de Anuncios</div>
                        <div className="divide-y dark:divide-gray-700 max-h-[500px] overflow-y-auto">
                            {announcements.map(ann => (
                                <div key={ann.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Global</span>
                                        <span className="text-[9px] text-gray-400 font-bold">{new Date(ann.fecha_envio).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{ann.asunto}</p>
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
