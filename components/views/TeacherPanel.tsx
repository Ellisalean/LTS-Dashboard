
import React, { useState, useEffect } from 'react';
import { supabase } from '../../application/supabase.ts';
import { PencilIcon, UserGroupIcon, PlusIcon, TrashIcon, ClipboardListIcon, AcademicCapIcon, CalendarIcon, CheckIcon, DownloadIcon, MailIcon, BookOpenIcon, HomeIcon, ChatIcon } from '../Icons.tsx';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import { User } from '../../types.ts';

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

interface AssignmentData {
    id: string;
    curso_id: string;
    titulo: string;
    fecha_entrega: string;
}

interface ExamData {
    id: string;
    curso_id: string;
    titulo: string;
    fecha: string;
    hora: string;
}

interface AnnouncementData {
    id: string;
    remitente: string;
    asunto: string;
    fecha_envio: string;
}

// Interfaz para Cursos en el panel docente
interface CourseAdminData {
    id: string;
    nombre: string;
    profesor: string;
    descripcion: string;
    contenido_detallado?: string;
    creditos: number;
}

// Helper para convertir URL de imagen a Base64 para el PDF
const getImageData = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Importante para evitar bloqueos CORS
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } else {
                reject(new Error('No ctx'));
            }
        };
        img.onerror = (e) => {
            console.error("Error cargando imagen:", e);
            reject(e);
        };
    });
};

// URL DEL LOGO REAL
const LOGO_URL = "https://cdn.myportfolio.com/d435fa58-d32c-4141-8a15-0f2bfccdea41/1ac05fb8-e508-4c03-b550-d2b907caadbd_rw_600.png?h=7572d326e4292f32557ac73606fd0ece";

interface TeacherPanelProps {
    user: User;
}

const TeacherPanel: React.FC<TeacherPanelProps> = ({ user }) => {
    // --- CONTROL DE PERMISOS ---
    const isSuperAdmin = user.role === 'admin';
    const isTeacher = user.role === 'profesor';

    // ESTADO GENERAL
    const [activeTab, setActiveTab] = useState<'students' | 'assignments' | 'exams' | 'attendance' | 'announcements' | 'courses'>('students');
    const [coursesList, setCoursesList] = useState<{id: string, nombre: string}[]>([]);
    const [loading, setLoading] = useState(true);

    // --- ESTADO ESTUDIANTES ---
    const [students, setStudents] = useState<StudentData[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
    
    // Estados para Edición de Perfil
    const [editPhotoUrl, setEditPhotoUrl] = useState('');
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState(''); 

    const [studentGrades, setStudentGrades] = useState<GradeData[]>([]);
    const [confirmDeleteStudentId, setConfirmDeleteStudentId] = useState<string | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
    
    // Crear Usuario (Estudiante o Profesor)
    const [isCreatingStudent, setIsCreatingStudent] = useState(false);
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentEmail, setNewStudentEmail] = useState('');
    const [newStudentPassword, setNewStudentPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState('estudiante'); // ESTADO PARA EL ROL

    // Formulario Notas
    const [newGradeCourse, setNewGradeCourse] = useState('');
    const [newGradeTitle, setNewGradeTitle] = useState('Nota Final');
    const [newGradeScore, setNewGradeScore] = useState(0);
    const [confirmDeleteGradeId, setConfirmDeleteGradeId] = useState<string | null>(null);

    // --- ESTADO ASIGNACIONES ---
    const [assignments, setAssignments] = useState<AssignmentData[]>([]);
    const [newAssignCourse, setNewAssignCourse] = useState('');
    const [newAssignTitle, setNewAssignTitle] = useState('');
    const [newAssignDate, setNewAssignDate] = useState('');
    const [confirmDeleteAssignId, setConfirmDeleteAssignId] = useState<string | null>(null);

    // --- ESTADO EXAMENES ---
    const [exams, setExams] = useState<ExamData[]>([]);
    const [newExamCourse, setNewExamCourse] = useState('');
    const [newExamTitle, setNewExamTitle] = useState('Examen Final');
    const [newExamDate, setNewExamDate] = useState('');
    const [newExamTime, setNewExamTime] = useState('09:00');
    const [confirmDeleteExamId, setConfirmDeleteExamId] = useState<string | null>(null);

    // --- ESTADO ASISTENCIA ---
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceCourse, setAttendanceCourse] = useState('');
    const [attendanceList, setAttendanceList] = useState<Record<string, string>>({});

    // --- ESTADO ANUNCIOS ---
    const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
    const [newAnnounceSender, setNewAnnounceSender] = useState('Dirección Académica');
    const [newAnnounceContent, setNewAnnounceContent] = useState('');
    const [confirmDeleteAnnounceId, setConfirmDeleteAnnounceId] = useState<string | null>(null);

    // --- ESTADO CURSOS (NUEVO) ---
    const [adminCourses, setAdminCourses] = useState<CourseAdminData[]>([]);
    const [editingCourse, setEditingCourse] = useState<CourseAdminData | null>(null);

    // CARGA INICIAL
    useEffect(() => {
        const init = async () => {
            await fetchCourses();
            await fetchStudents();
            setLoading(false);
        };
        init();
    }, [user]);

    // CARGA DE DATOS SEGUN PESTAÑA
    useEffect(() => {
        if (activeTab === 'assignments') fetchAssignments();
        if (activeTab === 'exams') fetchExams();
        if (activeTab === 'announcements' && isSuperAdmin) fetchAnnouncements();
        if (activeTab === 'courses') fetchAdminCourses();
    }, [activeTab]);

    // --- FETCHERS ---
    const fetchCourses = async () => {
        // FILTRO DE CURSOS SEGÚN ROL
        let query = supabase.from('cursos').select('id, nombre, profesor').order('nombre');
        
        // Si es profesor, solo traemos SUS cursos
        if (isTeacher) {
            query = query.eq('profesor', user.name);
        }

        const { data } = await query;
        if (data) setCoursesList(data);
    };

    const fetchAdminCourses = async () => {
        // ORDENADO POR ID
        let query = supabase.from('cursos').select('*').order('id', { ascending: true });
        
        // Si es profesor, solo puede administrar SUS cursos
        if (isTeacher) {
            query = query.eq('profesor', user.name);
        }

        const { data } = await query;
        if (data) setAdminCourses(data);
    };

    const fetchStudents = async () => {
        const { data } = await supabase.from('estudiantes').select('*').order('nombre');
        if (data) setStudents(data);
    };

    const fetchAssignments = async () => {
        const { data } = await supabase.from('asignaciones').select('*').order('fecha_entrega', { ascending: false });
        if (data) {
            if (isTeacher) {
                const myCourseIds = coursesList.map(c => c.id);
                setAssignments(data.filter((a: any) => myCourseIds.includes(a.curso_id)));
            } else {
                setAssignments(data);
            }
        }
    };

    const fetchExams = async () => {
        const { data } = await supabase.from('examenes').select('*').order('fecha', { ascending: false });
        if (data) {
             if (isTeacher) {
                const myCourseIds = coursesList.map(c => c.id);
                setExams(data.filter((e: any) => myCourseIds.includes(e.curso_id)));
            } else {
                setExams(data);
            }
        }
    };

    const fetchAnnouncements = async () => {
        if (!isSuperAdmin) return;
        const { data } = await supabase.from('mensajes').select('*').order('fecha_envio', { ascending: false });
        if (data) setAnnouncements(data);
    };

    const fetchStudentGrades = async (studentId: string) => {
        let query = supabase.from('notas').select('*').eq('estudiante_id', studentId);
        const { data } = await query;
        
        if (data) {
             if (isTeacher) {
                const myCourseIds = coursesList.map(c => c.id);
                setStudentGrades(data.filter((g: any) => myCourseIds.includes(g.curso_id)));
            } else {
                setStudentGrades(data);
            }
        }
    };

    // --- HANDLERS ESTUDIANTES ---
    const handleSelectStudent = (student: StudentData) => {
        setSelectedStudent(student);
        // Cargar datos para edición
        setEditPhotoUrl(student.avatar_url || '');
        setEditName(student.nombre);
        setEditEmail(student.email || '');
        setEditPassword(student.password || ''); // Precargar contraseña
        
        fetchStudentGrades(student.id);
        setConfirmDeleteGradeId(null);
    };

    const handleCreateStudent = async () => {
        if (!isSuperAdmin) return; 
        if (!newStudentName || !newStudentPassword) return;

        const { error } = await supabase.from('estudiantes').insert({
            nombre: newStudentName,
            email: newStudentEmail || null,
            password: newStudentPassword,
            rol: newUserRole, // AQUI SE USA EL ROL SELECCIONADO
            activo: true,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(newStudentName)}&background=random&color=fff`
        });

        if (!error) {
            setNewStudentName('');
            setNewStudentEmail('');
            setNewStudentPassword('');
            setNewUserRole('estudiante'); // Reset
            setIsCreatingStudent(false);
            fetchStudents();
        } else {
            alert('Error al crear usuario: ' + error.message);
        }
    };

    const handleDeleteStudent = async (id: string) => {
        if (!isSuperAdmin) return;
        const { error } = await supabase.from('estudiantes').delete().eq('id', id);
        
        if (!error) {
            fetchStudents();
            setConfirmDeleteStudentId(null);
            if (selectedStudent?.id === id) setSelectedStudent(null);
        } else {
            if (error.message.includes('foreign key constraint')) {
                alert("No se puede borrar el usuario porque tiene notas, asignaciones o mensajes asociados. Borra sus registros primero.");
            } else {
                alert("Error al borrar: " + error.message);
            }
        }
    };

    const handleUpdateStudentProfile = async () => {
        if (!selectedStudent) return;
        
        // Construir objeto de actualización
        const updates: any = {
            avatar_url: editPhotoUrl,
            nombre: editName,
            email: editEmail
        };

        // Solo actualizar contraseña si se escribió algo
        if (editPassword && editPassword.trim() !== '') {
            updates.password = editPassword;
        }

        const { error } = await supabase.from('estudiantes').update(updates).eq('id', selectedStudent.id);
        
        if (!error) {
            const btn = document.getElementById('save-profile-btn');
            if(btn) { btn.innerText = '¡Guardado!'; setTimeout(() => btn.innerText = 'Actualizar Datos', 2000); }
            
            // Actualizar estado local
            setSelectedStudent({...selectedStudent, ...updates});
            fetchStudents();
        } else {
            alert("Error al actualizar perfil: " + error.message);
        }
    };

    const handleToggleActive = async (student: StudentData) => {
        if (!isSuperAdmin) return;
        const { error } = await supabase.from('estudiantes').update({ activo: !student.activo }).eq('id', student.id);
        if (!error) fetchStudents();
    };

    // --- EMAIL HANDLER (NUEVO) ---
    const handleSendCredentials = async (student: StudentData) => {
        if (!student.email) {
            alert("Este usuario no tiene un correo electrónico registrado. Por favor edita su perfil y agrega uno.");
            return;
        }
        
        if (!confirm(`¿Enviar credenciales a ${student.email}?`)) return;

        setSendingEmailId(student.id);

        try {
            const response = await fetch('/.netlify/functions/send-welcome-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: student.email,
                    name: student.nombre,
                    password: student.password, 
                    role: student.rol
                })
            });

            const result = await response.json();

            if (response.ok) {
                alert(`✅ Correo enviado exitosamente a ${student.nombre}`);
            } else {
                alert(`❌ Error al enviar correo: ${result.error || 'Desconocido'}`);
            }
        } catch (error) {
            console.error(error);
            alert("❌ Error de conexión al enviar el correo.");
        } finally {
            setSendingEmailId(null);
        }
    };

    const handleAddGrade = async () => {
        if (!selectedStudent || !newGradeCourse) return;
        const { error } = await supabase.from('notas').insert({
            estudiante_id: selectedStudent.id,
            curso_id: newGradeCourse,
            titulo_asignacion: newGradeTitle,
            puntuacion: newGradeScore,
            puntuacion_maxima: 100
        });
        if (!error) {
            fetchStudentGrades(selectedStudent.id);
            setNewGradeScore(0);
        }
    };

    const handleDeleteGrade = async (id: string) => {
        const { error } = await supabase.from('notas').delete().eq('id', id);
        if (!error && selectedStudent) {
            fetchStudentGrades(selectedStudent.id);
            setConfirmDeleteGradeId(null);
        }
    };

    // --- HANDLER CURSOS ---
    const handleUpdateCourse = async () => {
        if (!editingCourse) return;
        const profName = isTeacher ? user.name : editingCourse.profesor;

        const { error } = await supabase.from('cursos').update({
            descripcion: editingCourse.descripcion,
            contenido_detallado: editingCourse.contenido_detallado,
            profesor: profName,
            creditos: editingCourse.creditos
        }).eq('id', editingCourse.id);

        if (!error) {
            setEditingCourse(null);
            fetchAdminCourses();
        } else {
            alert('Error al actualizar curso: ' + error.message);
        }
    };

    // --- PDF GENERATOR ---
    const handleDownloadReport = async () => {
        if (!selectedStudent) return;
        setIsGeneratingPdf(true);
        
        try {
            const JsPDFClass = (jsPDF as any).jsPDF || jsPDF;
            const doc = new JsPDFClass();
            const autoTableFunc = (autoTable as any).default || autoTable;

            let logoBase64 = null;
            try {
                logoBase64 = await getImageData(LOGO_URL);
            } catch (err) {
                console.warn("No se pudo cargar el logo, se usará fallback", err);
            }

            if (logoBase64) {
                doc.addImage(logoBase64, 'PNG', 14, 12, 20, 20);
            } else {
                doc.setFillColor(23, 37, 84);
                doc.rect(14, 12, 20, 20, 'F');
                doc.setFillColor(255, 255, 255);
                doc.setFontSize(8);
                doc.text("LTS", 16, 24);
            }

            doc.setFontSize(22);
            doc.setTextColor(23, 37, 84);
            doc.text("Latin Theological Seminary", 40, 23);
            
            doc.setFontSize(14);
            doc.setTextColor(100);
            doc.text("Boletín Oficial de Calificaciones", 40, 30);

            doc.setDrawColor(23, 37, 84);
            doc.setLineWidth(0.5);
            doc.line(14, 38, 196, 38);
            
            doc.setFontSize(11);
            doc.setTextColor(50);
            doc.text(`Nombre del Alumno:`, 14, 50);
            doc.setFont("helvetica", "bold");
            doc.text(selectedStudent.nombre, 55, 50);
            
            doc.setFont("helvetica", "normal");
            doc.text(`Correo Electrónico:`, 14, 58);
            doc.text(selectedStudent.email || 'No registrado', 55, 58);

            doc.text(`Fecha de Emisión:`, 14, 66);
            doc.text(new Date().toLocaleDateString(), 55, 66);

            const tableData = studentGrades.map(g => [
                coursesList.find(c => c.id === g.curso_id)?.nombre || g.curso_id,
                g.titulo_asignacion,
                `${g.puntuacion} / ${g.puntuacion_maxima}`
            ]);

            autoTableFunc(doc, {
                startY: 75,
                head: [['Materia / Curso', 'Evaluación', 'Calificación']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [23, 37, 84], textColor: [255, 255, 255] },
                styles: { fontSize: 10, cellPadding: 3 },
                alternateRowStyles: { fillColor: [240, 245, 255] }
            });

            const pageCount = (doc as any).internal.getNumberOfPages();
            for(let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(10);
                doc.setTextColor(150);
                doc.text(`Página ${i} de ${pageCount}`, 196, 285, { align: 'right' });
                doc.text("Este documento es un reporte oficial del sistema LTS.", 14, 285);
            }

            doc.save(`Boletin_${selectedStudent.nombre.replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error("Error generando PDF:", error);
            alert("Error al generar el PDF: " + (error as any).message);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // --- HANDLERS ASISTENCIA ---
    const handleLoadAttendance = async () => {
        if (!attendanceCourse || !attendanceDate) return;
        
        const { data } = await supabase.from('asistencias')
            .select('estudiante_id, estado')
            .eq('curso_id', attendanceCourse)
            .eq('fecha', attendanceDate);
            
        const currentStatus: Record<string, string> = {};
        students.forEach(s => currentStatus[s.id] = 'ausente'); 
        
        if (data) {
            data.forEach((r: any) => {
                currentStatus[r.estudiante_id] = r.estado;
            });
        }
        setAttendanceList(currentStatus);
    };

    const handleMarkAttendance = async (studentId: string, status: string) => {
        setAttendanceList(prev => ({ ...prev, [studentId]: status }));

        const { data: existing } = await supabase.from('asistencias')
            .select('id')
            .eq('estudiante_id', studentId)
            .eq('curso_id', attendanceCourse)
            .eq('fecha', attendanceDate)
            .single();

        if (existing) {
            await supabase.from('asistencias').update({ estado: status }).eq('id', existing.id);
        } else {
            await supabase.from('asistencias').insert({
                estudiante_id: studentId,
                curso_id: attendanceCourse,
                fecha: attendanceDate,
                estado: status
            });
        }
    };

    // --- HANDLERS ASIGNACIONES & EXAMENES ---
    const handleAddAssignment = async () => {
        if (!newAssignCourse || !newAssignTitle) return;
        const { error } = await supabase.from('asignaciones').insert({
            curso_id: newAssignCourse,
            titulo: newAssignTitle,
            fecha_entrega: newAssignDate || null
        });
        if (!error) { setNewAssignTitle(''); setNewAssignDate(''); fetchAssignments(); }
    };
    const handleDeleteAssignment = async (id: string) => {
        const { error } = await supabase.from('asignaciones').delete().eq('id', id);
        if (!error) { fetchAssignments(); setConfirmDeleteAssignId(null); }
    };
    const handleAddExam = async () => {
        if (!newExamCourse || !newExamTitle) return;
        const { error } = await supabase.from('examenes').insert({
            curso_id: newExamCourse,
            titulo: newExamTitle,
            fecha: newExamDate || null,
            hora: newExamTime
        });
        if (!error) { setNewExamTitle(''); setNewExamDate(''); fetchExams(); }
    };
    const handleDeleteExam = async (id: string) => {
        const { error } = await supabase.from('examenes').delete().eq('id', id);
        if (!error) { fetchExams(); setConfirmDeleteExamId(null); }
    };

    // --- HANDLERS ANUNCIOS ---
    const handleAddAnnouncement = async () => {
        if (!isSuperAdmin) return;
        if (!newAnnounceContent) return;
        const { error } = await supabase.from('mensajes').insert({
            remitente: newAnnounceSender || 'Dirección',
            asunto: newAnnounceContent,
            leido: false,
            fecha_envio: new Date().toISOString()
        });
        if (!error) { 
            setNewAnnounceContent(''); 
            fetchAnnouncements(); 
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        if (!isSuperAdmin) return;
        const { error } = await supabase.from('mensajes').delete().eq('id', id);
        if (!error) {
            fetchAnnouncements();
            setConfirmDeleteAnnounceId(null);
        }
    };


    if (loading) return <div className="p-8 text-center text-gray-500">Cargando panel de administración...</div>;

    // --- RENDERIZADO ---

    // 1. VISTA DE DETALLE ESTUDIANTE (Sub-view)
    if (selectedStudent && activeTab === 'students') {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setSelectedStudent(null)} className="text-blue-600 hover:underline flex items-center">← Volver a la lista</button>
                    <div className="flex space-x-2">
                        {isSuperAdmin && (
                            <button 
                                onClick={() => handleSendCredentials(selectedStudent)}
                                disabled={sendingEmailId === selectedStudent.id}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 shadow disabled:opacity-50"
                            >
                                <MailIcon className="h-5 w-5 mr-2"/>
                                {sendingEmailId === selectedStudent.id ? 'Enviando...' : 'Enviar Credenciales'}
                            </button>
                        )}
                        <button 
                            onClick={handleDownloadReport} 
                            disabled={isGeneratingPdf}
                            className="bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-900 shadow disabled:opacity-50"
                        >
                            <DownloadIcon className="h-5 w-5 mr-2"/>
                            {isGeneratingPdf ? 'Generando...' : 'Descargar Boletín PDF'}
                        </button>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Perfil & Edición */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Perfil: {selectedStudent.nombre}</h2>
                        
                        <div className="flex flex-col items-center space-y-4 mb-6">
                            <img src={editPhotoUrl || selectedStudent.avatar_url} className="w-32 h-32 rounded-full object-cover border-4 border-blue-500" />
                        </div>

                        {/* FORMULARIO DE EDICIÓN (SOLO ADMIN) */}
                        {isSuperAdmin ? (
                            <div className="space-y-3 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Foto URL</label>
                                    <input type="text" value={editPhotoUrl} onChange={(e) => setEditPhotoUrl(e.target.value)} className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:text-white text-sm" placeholder="https://..." />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Nombre Completo</label>
                                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Correo Electrónico</label>
                                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:text-white text-sm" placeholder="nombre@correo.com" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Contraseña (Opcional)</label>
                                    <input type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:text-white text-sm" placeholder="Escribe para cambiarla" />
                                </div>
                                <button id="save-profile-btn" onClick={handleUpdateStudentProfile} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-bold transition-colors">
                                    Actualizar Datos Personales
                                </button>
                            </div>
                        ) : (
                            <div className="text-center">
                                <p className="text-gray-600 dark:text-gray-400">{selectedStudent.email}</p>
                                <p className="text-sm text-gray-500 capitalize">{selectedStudent.rol}</p>
                            </div>
                        )}
                    </div>

                    {/* Notas */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Gestión de Notas</h2>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4 border border-gray-200 dark:border-gray-600 space-y-2">
                            <select value={newGradeCourse} onChange={(e) => setNewGradeCourse(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-800 dark:text-white">
                                <option value="">Seleccionar Curso...</option>
                                {coursesList.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                            <input type="text" placeholder="Título (Ej: Examen Final)" value={newGradeTitle} onChange={(e) => setNewGradeTitle(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-800 dark:text-white" />
                            <div className="flex space-x-2">
                                <input type="number" placeholder="0-100" value={newGradeScore} onChange={(e) => setNewGradeScore(Number(e.target.value))} className="w-24 p-2 rounded border dark:bg-gray-800 dark:text-white" />
                                <button onClick={handleAddGrade} disabled={!newGradeCourse} className="flex-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center disabled:opacity-50"><PlusIcon className="h-5 w-5 mr-1" /> Nota</button>
                            </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                            {studentGrades.map(grade => (
                                <div key={grade.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded shadow-sm border border-gray-100 dark:border-gray-700">
                                    <div>
                                        <div className="font-bold text-sm text-gray-800 dark:text-gray-200">{coursesList.find(c => c.id === grade.curso_id)?.nombre || grade.curso_id}</div>
                                        <div className="text-xs text-gray-500">{grade.titulo_asignacion}</div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className={`font-bold text-sm ${grade.puntuacion >= 70 ? 'text-green-500' : 'text-red-500'}`}>{grade.puntuacion}</span>
                                        {confirmDeleteGradeId === grade.id ? (
                                            <div className="flex space-x-1">
                                                <button onClick={() => handleDeleteGrade(grade.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded">Si</button>
                                                <button onClick={() => setConfirmDeleteGradeId(null)} className="text-xs bg-gray-300 text-gray-800 px-2 py-1 rounded">No</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setConfirmDeleteGradeId(grade.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="h-4 w-4" /></button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. VISTA PRINCIPAL (TABS)
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                    <UserGroupIcon className="h-8 w-8 mr-3 text-amber-500"/>
                    {isSuperAdmin ? 'Panel de Dirección' : `Panel Docente: ${user.name}`}
                </h1>
            </div>

            {/* TABS NAVIGATION */}
            <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg w-full md:w-fit overflow-x-auto">
                <button onClick={() => setActiveTab('students')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'students' ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>Estudiantes</button>
                <button onClick={() => setActiveTab('courses')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'courses' ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>Cursos</button>
                <button onClick={() => setActiveTab('assignments')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'assignments' ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>Asignaciones</button>
                <button onClick={() => setActiveTab('exams')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'exams' ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>Exámenes</button>
                <button onClick={() => setActiveTab('attendance')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'attendance' ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>Asistencia</button>
                {isSuperAdmin && (
                    <button onClick={() => setActiveTab('announcements')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'announcements' ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>Anuncios</button>
                )}
            </div>

            {/* TAB CONTENT: COURSES */}
            {activeTab === 'courses' && (
                <div className="grid grid-cols-1 gap-6">
                    {editingCourse ? (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md animate-fade-in">
                            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center">
                                <PencilIcon className="h-6 w-6 mr-2 text-blue-500"/>
                                Editando Curso: {editingCourse.nombre}
                            </h2>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción Corta (Tarjeta)</label>
                                        <input 
                                            type="text" 
                                            value={editingCourse.descripcion || ''} 
                                            onChange={(e) => setEditingCourse({...editingCourse, descripcion: e.target.value})}
                                            className="w-full p-2 mt-1 rounded border dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profesor</label>
                                        <input 
                                            type="text" 
                                            value={editingCourse.profesor || ''} 
                                            onChange={(e) => setEditingCourse({...editingCourse, profesor: e.target.value})}
                                            className={`w-full p-2 mt-1 rounded border dark:bg-gray-700 dark:text-white ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            disabled={!isSuperAdmin} 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Créditos</label>
                                    <input 
                                        type="number" 
                                        value={editingCourse.creditos || 0} 
                                        onChange={(e) => setEditingCourse({...editingCourse, creditos: Number(e.target.value)})}
                                        className="w-24 p-2 mt-1 rounded border dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contenido Detallado / Syllabus (Reseña Larga)</label>
                                    <textarea 
                                        value={editingCourse.contenido_detallado || ''} 
                                        onChange={(e) => setEditingCourse({...editingCourse, contenido_detallado: e.target.value})}
                                        className="w-full p-2 mt-1 rounded border dark:bg-gray-700 dark:text-white h-48"
                                        placeholder="Escribe aquí todo el contenido, objetivos o reseña detallada del curso..."
                                    />
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button onClick={() => setEditingCourse(null)} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Cancelar</button>
                                    <button onClick={handleUpdateCourse} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold">Guardar Cambios</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                            <div className="overflow-x-auto"> {/* WRAPPER FOR HORIZONTAL SCROLLING */}
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nombre</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Profesor</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Créditos</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {adminCourses.map(c => (
                                            <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-500 dark:text-gray-400">{c.id}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{c.nombre}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{c.profesor}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-300">{c.creditos}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <button onClick={() => setEditingCourse(c)} className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 font-medium flex items-center justify-end w-full">
                                                        <PencilIcon className="h-4 w-4 mr-1"/> Editar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: STUDENTS */}
            {activeTab === 'students' && (
                <div className="space-y-4">
                    {isSuperAdmin && (
                        <div className="flex justify-end">
                            <button 
                                onClick={() => setIsCreatingStudent(!isCreatingStudent)} 
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center shadow-sm"
                            >
                                <PlusIcon className="h-5 w-5 mr-2"/>
                                {isCreatingStudent ? 'Cancelar Registro' : 'Registrar Usuario'}
                            </button>
                        </div>
                    )}

                    {isCreatingStudent && isSuperAdmin && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-green-200 dark:border-green-900 animate-fade-in">
                            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Datos del Nuevo Usuario</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <input type="text" placeholder="Nombre Completo" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className="p-2 rounded border dark:bg-gray-700 dark:text-white" />
                                <input type="email" placeholder="Correo Electrónico (Opcional)" value={newStudentEmail} onChange={(e) => setNewStudentEmail(e.target.value)} className="p-2 rounded border dark:bg-gray-700 dark:text-white" />
                                <input type="text" placeholder="Contraseña de Acceso" value={newStudentPassword} onChange={(e) => setNewStudentPassword(e.target.value)} className="p-2 rounded border dark:bg-gray-700 dark:text-white" />
                                
                                {/* SELECTOR DE ROL AÑADIDO */}
                                <select 
                                    value={newUserRole} 
                                    onChange={(e) => setNewUserRole(e.target.value)} 
                                    className="p-2 rounded border dark:bg-gray-700 dark:text-white bg-white dark:bg-gray-800"
                                >
                                    <option value="estudiante">Estudiante</option>
                                    <option value="profesor">Profesor</option>
                                </select>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button onClick={handleCreateStudent} disabled={!newStudentName || !newStudentPassword} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50 font-bold">Guardar Usuario</button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                        <div className="overflow-x-auto"> {/* WRAPPER FOR HORIZONTAL SCROLLING */}
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Usuario</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Rol</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {students.map((student) => (
                                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4 whitespace-nowrap flex items-center">
                                                <img className="h-8 w-8 rounded-full object-cover mr-3" src={student.avatar_url} />
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{student.nombre}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${student.rol === 'profesor' ? 'bg-purple-100 text-purple-800' : student.rol === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                                    {student.rol || 'estudiante'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {isSuperAdmin ? (
                                                    <button onClick={() => handleToggleActive(student)} className={`px-2 py-1 text-xs font-bold rounded-full ${student.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{student.activo ? 'ACTIVO' : 'INACTIVO'}</button>
                                                ) : (
                                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${student.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{student.activo ? 'ACTIVO' : 'INACTIVO'}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex justify-end space-x-3 items-center">
                                                    {isSuperAdmin && student.email && (
                                                        <button 
                                                            onClick={() => handleSendCredentials(student)}
                                                            disabled={sendingEmailId === student.id}
                                                            className={`text-gray-500 hover:text-blue-600 transition-colors ${sendingEmailId === student.id ? 'opacity-50' : ''}`}
                                                            title="Enviar credenciales por correo"
                                                        >
                                                            <MailIcon className="h-5 w-5" />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleSelectStudent(student)} className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 text-sm font-medium"><PencilIcon className="h-4 w-4 inline mr-1"/>Gestionar</button>
                                                    {isSuperAdmin && (
                                                        <>
                                                            {confirmDeleteStudentId === student.id ? (
                                                                <div className="flex space-x-1 animate-fade-in">
                                                                    <button onClick={() => handleDeleteStudent(student.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Si</button>
                                                                    <button onClick={() => setConfirmDeleteStudentId(null)} className="text-xs bg-gray-300 text-gray-800 px-2 py-1 rounded hover:bg-gray-400">No</button>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => setConfirmDeleteStudentId(student.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="h-5 w-5"/></button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: ATTENDANCE */}
            {activeTab === 'attendance' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Curso</label>
                            <select value={attendanceCourse} onChange={(e) => setAttendanceCourse(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white">
                                <option value="">Seleccionar Curso...</option>
                                {coursesList.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                            <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white" />
                        </div>
                        <button onClick={handleLoadAttendance} disabled={!attendanceCourse} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 h-[42px] font-bold">
                            Cargar Lista
                        </button>
                    </div>

                    {Object.keys(attendanceList).length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden animate-fade-in">
                            <div className="overflow-x-auto"> {/* WRAPPER FOR HORIZONTAL SCROLLING */}
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estudiante</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado de Asistencia</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {students.filter(s => s.activo).map((student) => (
                                            <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-6 py-4 flex items-center">
                                                    <img className="h-8 w-8 rounded-full object-cover mr-3" src={student.avatar_url} />
                                                    <span className="text-gray-900 dark:text-white font-medium">{student.nombre}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                                        <button 
                                                            onClick={() => handleMarkAttendance(student.id, 'presente')}
                                                            className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${attendanceList[student.id] === 'presente' ? 'bg-green-500 text-white shadow' : 'text-gray-500 hover:bg-gray-200'}`}
                                                        >
                                                            Presente
                                                        </button>
                                                        <button 
                                                            onClick={() => handleMarkAttendance(student.id, 'ausente')}
                                                            className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${attendanceList[student.id] === 'ausente' ? 'bg-red-500 text-white shadow' : 'text-gray-500 hover:bg-gray-200'}`}
                                                        >
                                                            Ausente
                                                        </button>
                                                        <button 
                                                            onClick={() => handleMarkAttendance(student.id, 'justificado')}
                                                            className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${attendanceList[student.id] === 'justificado' ? 'bg-blue-500 text-white shadow' : 'text-gray-500 hover:bg-gray-200'}`}
                                                        >
                                                            Justificado
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: ASSIGNMENTS (Reuse existing) */}
            {activeTab === 'assignments' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md h-fit">
                        <h2 className="text-lg font-bold mb-4 flex items-center text-gray-800 dark:text-white"><ClipboardListIcon className="h-5 w-5 mr-2 text-blue-500"/>Nueva Asignación</h2>
                        <div className="space-y-3">
                            <select value={newAssignCourse} onChange={(e) => setNewAssignCourse(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white">
                                <option value="">Seleccionar Curso...</option>
                                {coursesList.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                            <input type="text" placeholder="Título de la tarea" value={newAssignTitle} onChange={(e) => setNewAssignTitle(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white" />
                            <input type="date" value={newAssignDate} onChange={(e) => setNewAssignDate(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white" />
                            <button onClick={handleAddAssignment} disabled={!newAssignCourse || !newAssignTitle} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">Crear Asignación</button>
                        </div>
                    </div>
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                        <div className="overflow-x-auto"> {/* WRAPPER FOR HORIZONTAL SCROLLING */}
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Curso</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tarea</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Entrega</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {assignments.map(a => (
                                        <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">{coursesList.find(c => c.id === a.curso_id)?.nombre || a.curso_id}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{a.titulo}</td>
                                            <td className="px-6 py-4 text-sm text-right text-gray-500 dark:text-gray-400">{a.fecha_entrega ? new Date(a.fecha_entrega).toLocaleDateString() : 'Sin fecha'}</td>
                                            <td className="px-6 py-4 text-right">
                                                {confirmDeleteAssignId === a.id ? (
                                                    <div className="flex justify-end space-x-2">
                                                        <button onClick={() => handleDeleteAssignment(a.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded">Borrar</button>
                                                        <button onClick={() => setConfirmDeleteAssignId(null)} className="text-xs bg-gray-300 text-gray-800 px-2 py-1 rounded">X</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setConfirmDeleteAssignId(a.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="h-5 w-5"/></button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: EXAMS (Reuse existing) */}
            {activeTab === 'exams' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md h-fit">
                        <h2 className="text-lg font-bold mb-4 flex items-center text-gray-800 dark:text-white"><AcademicCapIcon className="h-5 w-5 mr-2 text-red-500"/>Nuevo Examen</h2>
                        <div className="space-y-3">
                            <select value={newExamCourse} onChange={(e) => setNewExamCourse(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white">
                                <option value="">Seleccionar Curso...</option>
                                {coursesList.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                            <input type="text" placeholder="Título (Ej: Examen Final)" value={newExamTitle} onChange={(e) => setNewExamTitle(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white" />
                            <div className="flex space-x-2">
                                <input type="date" value={newExamDate} onChange={(e) => setNewExamDate(e.target.value)} className="flex-1 p-2 rounded border dark:bg-gray-700 dark:text-white" />
                                <input type="time" value={newExamTime} onChange={(e) => setNewExamTime(e.target.value)} className="w-24 p-2 rounded border dark:bg-gray-700 dark:text-white" />
                            </div>
                            <button onClick={handleAddExam} disabled={!newExamCourse || !newExamTitle} className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50">Programar Examen</button>
                        </div>
                    </div>
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                        <div className="overflow-x-auto"> {/* WRAPPER FOR HORIZONTAL SCROLLING */}
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Curso</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Examen</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha/Hora</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {exams.map(e => (
                                        <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">{coursesList.find(c => c.id === e.curso_id)?.nombre || e.curso_id}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{e.titulo}</td>
                                            <td className="px-6 py-4 text-sm text-right text-gray-500 dark:text-gray-400">
                                                {e.fecha ? new Date(e.fecha).toLocaleDateString() : 'Sin fecha'} - {e.hora}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {confirmDeleteExamId === e.id ? (
                                                    <div className="flex justify-end space-x-2">
                                                        <button onClick={() => handleDeleteExam(e.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded">Borrar</button>
                                                        <button onClick={() => setConfirmDeleteExamId(null)} className="text-xs bg-gray-300 text-gray-800 px-2 py-1 rounded">X</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setConfirmDeleteExamId(e.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="h-5 w-5"/></button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: ANNOUNCEMENTS (RESTAURADO) */}
            {activeTab === 'announcements' && isSuperAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Formulario */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md h-fit">
                        <h2 className="text-lg font-bold mb-4 flex items-center text-gray-800 dark:text-white">
                            <ChatIcon className="h-5 w-5 mr-2 text-purple-500"/>
                            Nuevo Anuncio Global
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remitente</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: Dirección Académica" 
                                    value={newAnnounceSender} 
                                    onChange={(e) => setNewAnnounceSender(e.target.value)} 
                                    className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensaje</label>
                                <textarea 
                                    placeholder="Escribe el anuncio aquí..." 
                                    value={newAnnounceContent} 
                                    onChange={(e) => setNewAnnounceContent(e.target.value)} 
                                    className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white h-32 resize-none"
                                />
                            </div>
                            <button 
                                onClick={handleAddAnnouncement} 
                                disabled={!newAnnounceContent} 
                                className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50 font-bold shadow-md transition-colors"
                            >
                                Publicar Anuncio
                            </button>
                        </div>
                    </div>
                    
                    {/* Lista */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Remitente</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Mensaje</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {announcements.map(a => (
                                        <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(a.fecha_envio).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                                                {a.remitente}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">
                                                {a.asunto}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                {confirmDeleteAnnounceId === a.id ? (
                                                    <div className="flex justify-end space-x-2">
                                                        <button onClick={() => handleDeleteAnnouncement(a.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded">Borrar</button>
                                                        <button onClick={() => setConfirmDeleteAnnounceId(null)} className="text-xs bg-gray-300 text-gray-800 px-2 py-1 rounded">X</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setConfirmDeleteAnnounceId(a.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="h-5 w-5"/></button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {announcements.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                                No hay anuncios publicados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherPanel;
