
// ... imports permanecen igual ...
import React, { useState, useEffect } from 'react';
import { supabase } from '../../application/supabase.ts';
import { PencilIcon, UserGroupIcon, PlusIcon, TrashIcon, ClipboardListIcon, AcademicCapIcon, CalendarIcon, CheckIcon, DownloadIcon, MailIcon, BookOpenIcon, HomeIcon, ChatIcon, SearchIcon, CurrencyDollarIcon, CreditCardIcon } from '../Icons.tsx';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import { User, Payment } from '../../types.ts';
import { DEGREE_PROGRAM_NAME } from '../../constants.ts';

// ... interfaces permanecen igual ...
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

interface CourseAdminData {
    id: string;
    nombre: string;
    profesor: string;
    descripcion: string;
    contenido_detallado?: string;
    creditos: number;
}

const getImageData = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
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

const LOGO_URL = "https://cdn.myportfolio.com/d435fa58-d32c-4141-8a15-0f2bfccdea41/1ac05fb8-e508-4c03-b550-d2b907caadbd_rw_600.png?h=7572d326e4292f32557ac73606fd0ece";

interface TeacherPanelProps {
    user: User;
}

const TeacherPanel: React.FC<TeacherPanelProps> = ({ user }) => {
    const isSuperAdmin = user.role === 'admin';
    const isTeacher = user.role === 'profesor';

    const [activeTab, setActiveTab] = useState<'students' | 'assignments' | 'exams' | 'attendance' | 'announcements' | 'courses' | 'finance'>('students');
    const [coursesList, setCoursesList] = useState<{id: string, nombre: string}[]>([]);
    const [loading, setLoading] = useState(true);

    const [students, setStudents] = useState<StudentData[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    
    const [editPhotoUrl, setEditPhotoUrl] = useState('');
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState(''); 

    const [studentGrades, setStudentGrades] = useState<GradeData[]>([]);
    const [confirmDeleteStudentId, setConfirmDeleteStudentId] = useState<string | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
    
    const [isCreatingStudent, setIsCreatingStudent] = useState(false);
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentEmail, setNewStudentEmail] = useState('');
    const [newStudentPassword, setNewStudentPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState('estudiante');

    const [newGradeCourse, setNewGradeCourse] = useState('');
    const [newGradeTitle, setNewGradeTitle] = useState('Nota Final');
    const [newGradeScore, setNewGradeScore] = useState(0);
    const [confirmDeleteGradeId, setConfirmDeleteGradeId] = useState<string | null>(null);

    const [assignments, setAssignments] = useState<AssignmentData[]>([]);
    const [newAssignCourse, setNewAssignCourse] = useState('');
    const [newAssignTitle, setNewAssignTitle] = useState('');
    const [newAssignDate, setNewAssignDate] = useState('');
    const [confirmDeleteAssignId, setConfirmDeleteAssignId] = useState<string | null>(null);

    const [exams, setExams] = useState<ExamData[]>([]);
    const [newExamCourse, setNewExamCourse] = useState('');
    const [newExamTitle, setNewExamTitle] = useState('Examen Final');
    const [newExamDate, setNewExamDate] = useState('');
    const [newExamTime, setNewExamTime] = useState('09:00');
    const [confirmDeleteExamId, setConfirmDeleteExamId] = useState<string | null>(null);

    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceCourse, setAttendanceCourse] = useState('');
    const [attendanceList, setAttendanceList] = useState<Record<string, string>>({});

    const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
    const [newAnnounceSender, setNewAnnounceSender] = useState('Dirección Académica');
    const [newAnnounceContent, setNewAnnounceContent] = useState('');
    const [confirmDeleteAnnounceId, setConfirmDeleteAnnounceId] = useState<string | null>(null);
    
    const [remindersEnabled, setRemindersEnabled] = useState(localStorage.getItem('LTS_PAYMENT_REMINDERS') !== 'false');

    const [adminCourses, setAdminCourses] = useState<CourseAdminData[]>([]);
    const [editingCourse, setEditingCourse] = useState<CourseAdminData | null>(null);

    const [financeStudent, setFinanceStudent] = useState('');
    const [studentPayments, setStudentPayments] = useState<Payment[]>([]);
    const [financeStats, setFinanceStats] = useState({ paid: 0, debt: 0, expected: 0 });
    
    // CAMBIO: Fecha por defecto a OCTUBRE
    const [calcMonthlyFee, setCalcMonthlyFee] = useState(25);
    const [calcStartDate, setCalcStartDate] = useState('2024-10-01'); // Default Oct 2024

    const [newPayAmount, setNewPayAmount] = useState(20);
    const [newPayDesc, setNewPayDesc] = useState('Mensualidad');
    const [newPayMethod, setNewPayMethod] = useState('Zelle');
    const [newPayRef, setNewPayRef] = useState('');
    const [newPayDate, setNewPayDate] = useState(new Date().toISOString().split('T')[0]);

    // ... el resto de la lógica permanece igual ...
    
    useEffect(() => {
        const init = async () => {
            await fetchCourses();
            await fetchStudents();
            setLoading(false);
        };
        init();
    }, [user]);

    useEffect(() => {
        if (activeTab === 'assignments') fetchAssignments();
        if (activeTab === 'exams') fetchExams();
        if (activeTab === 'announcements' && isSuperAdmin) fetchAnnouncements();
        if (activeTab === 'courses') fetchAdminCourses();
    }, [activeTab]);

    useEffect(() => {
        if (financeStudent) {
            calculateFinanceStats();
        }
    }, [financeStudent, studentPayments, calcMonthlyFee, calcStartDate]);

    const calculateFinanceStats = () => {
        const startDate = new Date(calcStartDate);
        const now = new Date();
        
        let monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
        if (monthsDiff < 0) monthsDiff = 0;
        const totalMonths = monthsDiff + 1;

        const inscriptionFee = 10;
        const expectedTotal = inscriptionFee + (calcMonthlyFee * totalMonths);
        const totalPaid = studentPayments.reduce((acc, curr) => acc + curr.amount, 0);

        setFinanceStats({ 
            paid: totalPaid, 
            debt: expectedTotal - totalPaid,
            expected: expectedTotal
        });
    };

    const fetchCourses = async () => {
        let query = supabase.from('cursos').select('id, nombre, profesor').order('nombre');
        if (isTeacher) {
            query = query.eq('profesor', user.name);
        }
        const { data } = await query;
        if (data) setCoursesList(data);
    };

    const fetchAdminCourses = async () => {
        let query = supabase.from('cursos').select('*').order('id', { ascending: true });
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

    const fetchStudentPayments = async (studentId: string) => {
        const { data } = await supabase.from('pagos').select('*').eq('student_id', studentId).order('date', { ascending: false });
        const allRecords = (data || []) as Payment[];
        
        const planConfig = allRecords.find(r => r.type === 'plan_config');
        if (planConfig) {
            setCalcMonthlyFee(planConfig.amount);
            if(planConfig.date) {
                setCalcStartDate(new Date(planConfig.date).toISOString().split('T')[0]);
            }
        } else {
            setCalcMonthlyFee(25);
            setCalcStartDate('2024-10-01'); // CAMBIO: Default Octubre
        }

        setStudentPayments(allRecords.filter(r => r.type !== 'plan_config'));
    }

    // ... handlers ...
    const handleSelectStudent = (student: StudentData) => {
        setSelectedStudent(student);
        setEditPhotoUrl(student.avatar_url || '');
        setEditName(student.nombre);
        setEditEmail(student.email || '');
        setEditPassword(student.password || '');
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
            rol: newUserRole,
            activo: true,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(newStudentName)}&background=random&color=fff`
        });

        if (!error) {
            setNewStudentName('');
            setNewStudentEmail('');
            setNewStudentPassword('');
            setNewUserRole('estudiante');
            setIsCreatingStudent(false);
            fetchStudents();
        } else {
            alert('Error al crear usuario: ' + error.message);
        }
    };

    const handleDeleteStudent = async (id: string) => {
        if (!isSuperAdmin) return;
        if (!confirm("⚠️ ADVERTENCIA: Esta acción eliminará al estudiante y TODOS sus datos relacionados (Notas, Pagos, Asistencias, Chat). ¿Estás seguro?")) return;

        const { error } = await supabase.from('estudiantes').delete().eq('id', id);
        
        if (!error) {
            alert("✅ Estudiante eliminado completamente del sistema.");
            fetchStudents();
            setConfirmDeleteStudentId(null);
            if (selectedStudent?.id === id) setSelectedStudent(null);
        } else {
            if (error.message.includes('foreign key constraint')) {
                alert("AVISO DE SEGURIDAD: No se puede borrar porque hay registros asociados en una tabla no configurada (probablemente CHAT). Ejecuta el SQL de 'Chat Cascade' en Supabase.");
            } else {
                alert("Error al borrar: " + error.message);
            }
        }
    };

    const handleUpdateStudentProfile = async () => {
        if (!selectedStudent) return;
        const updates: any = {
            avatar_url: editPhotoUrl,
            nombre: editName,
            email: editEmail
        };
        if (editPassword && editPassword.trim() !== '') {
            updates.password = editPassword;
        }
        const { error } = await supabase.from('estudiantes').update(updates).eq('id', selectedStudent.id);
        if (!error) {
            const btn = document.getElementById('save-profile-btn');
            if(btn) { btn.innerText = '¡Guardado!'; setTimeout(() => btn.innerText = 'Actualizar Datos', 2000); }
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

    const handleAddPayment = async () => {
        if(!financeStudent) return;
        if(!newPayDate) { alert("Por favor selecciona una fecha válida."); return; }
        const type = newPayDesc.toLowerCase().includes('inscrip') ? 'inscription' : 'tuition';
        const { error } = await supabase.from('pagos').insert({
            student_id: financeStudent,
            amount: newPayAmount,
            date: new Date(newPayDate).toISOString(),
            description: newPayDesc,
            method: newPayMethod,
            reference: newPayRef,
            type: type,
            verified: true
        });
        if(!error) {
            fetchStudentPayments(financeStudent);
            setNewPayRef('');
            alert("Pago registrado correctamente.");
        } else {
            alert("Error al registrar pago: " + error.message);
        }
    };

    const handleDeletePayment = async (id: string) => {
        if(!confirm("¿Seguro que deseas eliminar este registro de pago?")) return;
        await supabase.from('pagos').delete().eq('id', id);
        if(financeStudent) fetchStudentPayments(financeStudent);
    }

    // MODIFICADO: AHORA GUARDA EL VALOR DEL INPUT (state)
    const handleSavePlanConfig = async () => {
        if (!financeStudent) return;
        
        await supabase.from('pagos').delete().eq('student_id', financeStudent).eq('type', 'plan_config');
        const { error } = await supabase.from('pagos').insert({
            student_id: financeStudent,
            amount: calcMonthlyFee, // Usa el valor del estado (input manual)
            type: 'plan_config',
            description: 'Configuración Plan Mensual',
            date: new Date(calcStartDate).toISOString(),
            method: 'SISTEMA',
            verified: true
        });
        if (!error) {
            alert("Configuración de plan guardada correctamente.");
        } else {
            alert("Error guardando plan: " + error.message);
        }
    };

    // ... (el resto del código handleDownloadReport, etc. es igual) ...
    const handleDownloadReport = async () => {
        if (!selectedStudent) return;
        setIsGeneratingPdf(true);
        try {
            const JsPDFClass = (jsPDF as any).jsPDF || jsPDF;
            const doc = new JsPDFClass();
            const autoTableFunc = (autoTable as any).default || autoTable;
            let logoBase64 = null;
            try { logoBase64 = await getImageData(LOGO_URL); } catch (err) {}
            if (logoBase64) { doc.addImage(logoBase64, 'PNG', 14, 12, 20, 20); } else { doc.setFillColor(23, 37, 84); doc.rect(14, 12, 20, 20, 'F'); doc.setFillColor(255, 255, 255); doc.setFontSize(8); doc.text("LTS", 16, 24); }
            doc.setFontSize(22); doc.setTextColor(23, 37, 84); doc.text("Latin Theological Seminary", 40, 23);
            doc.setFontSize(14); doc.setTextColor(100); doc.text("Boletín Oficial de Calificaciones", 40, 30);
            doc.setDrawColor(23, 37, 84); doc.setLineWidth(0.5); doc.line(14, 38, 196, 38);
            doc.setFontSize(11); doc.setTextColor(50); doc.text(`Nombre del Alumno:`, 14, 50); doc.setFont("helvetica", "bold"); doc.text(selectedStudent.nombre, 55, 50);
            doc.setFont("helvetica", "normal"); doc.text(`Correo Electrónico:`, 14, 58); doc.text(selectedStudent.email || 'No registrado', 55, 58);
            doc.text(`Fecha de Emisión:`, 14, 66); doc.text(new Date().toLocaleDateString(), 55, 66);
            doc.setFont("helvetica", "bold"); doc.text(`Programa:`, 14, 74); doc.setFont("helvetica", "normal"); doc.text(DEGREE_PROGRAM_NAME, 55, 74);
            const tableData = studentGrades.map(g => [coursesList.find(c => c.id === g.curso_id)?.nombre || g.curso_id, g.titulo_asignacion, `${g.puntuacion} / ${g.puntuacion_maxima}`]);
            autoTableFunc(doc, { startY: 82, head: [['Materia / Curso', 'Evaluación', 'Calificación']], body: tableData, theme: 'striped', headStyles: { fillColor: [23, 37, 84], textColor: [255, 255, 255] }, styles: { fontSize: 10, cellPadding: 3 }, alternateRowStyles: { fillColor: [240, 245, 255] } });
            const pageCount = (doc as any).internal.getNumberOfPages();
            for(let i = 1; i <= pageCount; i++) { doc.setPage(i); doc.setFontSize(10); doc.setTextColor(150); doc.text(`Página ${i} de ${pageCount}`, 196, 285, { align: 'right' }); doc.text("Este documento es un reporte oficial del sistema LTS.", 14, 285); }
            doc.save(`Boletin_${selectedStudent.nombre.replace(/\s+/g, '_')}.pdf`);
        } catch (error) { alert("Error al generar el PDF: " + (error as any).message); } finally { setIsGeneratingPdf(false); }
    };

    const handleLoadAttendance = async () => {
        if (!attendanceCourse || !attendanceDate) return;
        const { data } = await supabase.from('asistencias').select('estudiante_id, estado').eq('curso_id', attendanceCourse).eq('fecha', attendanceDate);
        const currentStatus: Record<string, string> = {};
        students.forEach(s => currentStatus[s.id] = 'ausente'); 
        if (data) { data.forEach((r: any) => { currentStatus[r.estudiante_id] = r.estado; }); }
        setAttendanceList(currentStatus);
    };

    const handleMarkAttendance = async (studentId: string, status: string) => {
        setAttendanceList(prev => ({ ...prev, [studentId]: status }));
        const { data: existing } = await supabase.from('asistencias').select('id').eq('estudiante_id', studentId).eq('curso_id', attendanceCourse).eq('fecha', attendanceDate).single();
        if (existing) { await supabase.from('asistencias').update({ estado: status }).eq('id', existing.id); } else { await supabase.from('asistencias').insert({ estudiante_id: studentId, curso_id: attendanceCourse, fecha: attendanceDate, estado: status }); }
    };

    const handleAddAssignment = async () => { if (!newAssignCourse || !newAssignTitle) return; const { error } = await supabase.from('asignaciones').insert({ curso_id: newAssignCourse, titulo: newAssignTitle, fecha_entrega: newAssignDate || null }); if (!error) { setNewAssignTitle(''); setNewAssignDate(''); fetchAssignments(); } };
    const handleDeleteAssignment = async (id: string) => { const { error } = await supabase.from('asignaciones').delete().eq('id', id); if (!error) { fetchAssignments(); setConfirmDeleteAssignId(null); } };
    const handleAddExam = async () => { if (!newExamCourse || !newExamTitle) return; const { error } = await supabase.from('examenes').insert({ curso_id: newExamCourse, titulo: newExamTitle, fecha: newExamDate || null, hora: newExamTime }); if (!error) { setNewExamTitle(''); setNewExamDate(''); fetchExams(); } };
    const handleDeleteExam = async (id: string) => { const { error } = await supabase.from('examenes').delete().eq('id', id); if (!error) { fetchExams(); setConfirmDeleteExamId(null); } };
    const handleAddAnnouncement = async () => { if (!isSuperAdmin) return; if (!newAnnounceContent) return; const { error } = await supabase.from('mensajes').insert({ remitente: newAnnounceSender || 'Dirección', asunto: newAnnounceContent, leido: false, fecha_envio: new Date().toISOString() }); if (!error) { setNewAnnounceContent(''); fetchAnnouncements(); } };
    const handleDeleteAnnouncement = async (id: string) => { if (!isSuperAdmin) return; const { error } = await supabase.from('mensajes').delete().eq('id', id); if (!error) { fetchAnnouncements(); setConfirmDeleteAnnounceId(null); } };
    const handleToggleReminders = () => { const newValue = !remindersEnabled; setRemindersEnabled(newValue); localStorage.setItem('LTS_PAYMENT_REMINDERS', String(newValue)); alert(`Recordatorios de pago automáticos ${newValue ? 'ACTIVADOS' : 'DESACTIVADOS'} exitosamente.`); };

    const filteredStudents = students.filter(student => student.nombre.toLowerCase().includes(studentSearchTerm.toLowerCase()) || (student.email && student.email.toLowerCase().includes(studentSearchTerm.toLowerCase())));

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando panel de administración...</div>;

    // ... VISTAS ...
    if (selectedStudent && activeTab === 'students') {
        return (
            <div className="space-y-6 animate-fade-in">
                {/* ... (código existente del detalle de estudiante) ... */}
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setSelectedStudent(null)} className="text-blue-600 hover:underline flex items-center">← Volver a la lista</button>
                    <div className="flex space-x-2">
                        {isSuperAdmin && (
                            <button onClick={() => handleSendCredentials(selectedStudent)} disabled={sendingEmailId === selectedStudent.id} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 shadow disabled:opacity-50">
                                <MailIcon className="h-5 w-5 mr-2"/> {sendingEmailId === selectedStudent.id ? 'Enviando...' : 'Enviar Credenciales'}
                            </button>
                        )}
                        <button onClick={handleDownloadReport} disabled={isGeneratingPdf} className="bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-900 shadow disabled:opacity-50">
                            <DownloadIcon className="h-5 w-5 mr-2"/> {isGeneratingPdf ? 'Generando...' : 'Descargar Boletín PDF'}
                        </button>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Perfil: {selectedStudent.nombre}</h2>
                        <div className="flex flex-col items-center space-y-4 mb-6">
                            <img src={editPhotoUrl || selectedStudent.avatar_url} className="w-32 h-32 rounded-full object-cover border-4 border-blue-500" />
                            <div className="text-center px-4">
                                <span className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full mb-2 uppercase tracking-wide">{selectedStudent.rol || 'Estudiante'}</span>
                                <p className="text-gray-600 dark:text-gray-300 font-medium">{DEGREE_PROGRAM_NAME}</p>
                            </div>
                        </div>
                        {isSuperAdmin ? (
                            <div className="space-y-3 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div><label className="text-xs font-bold text-gray-500 uppercase">Foto URL</label><input type="text" value={editPhotoUrl} onChange={(e) => setEditPhotoUrl(e.target.value)} className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:text-white text-sm" placeholder="https://..." /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase">Nombre Completo</label><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:text-white text-sm" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase">Correo Electrónico</label><input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:text-white text-sm" placeholder="nombre@correo.com" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase">Contraseña (Opcional)</label><input type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:text-white text-sm" placeholder="Escribe para cambiarla" /></div>
                                <button id="save-profile-btn" onClick={handleUpdateStudentProfile} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-bold transition-colors">Actualizar Datos Personales</button>
                            </div>
                        ) : (
                            <div className="text-center"><p className="text-gray-600 dark:text-gray-400">{selectedStudent.email}</p></div>
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Gestión de Notas</h2>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4 border border-gray-200 dark:border-gray-600 space-y-2">
                            <select value={newGradeCourse} onChange={(e) => setNewGradeCourse(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-800 dark:text-white">
                                <option value="">Seleccionar Curso...</option> {coursesList.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
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

    // ... (El resto del return principal sigue igual hasta TAB FINANCE) ...
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center"><UserGroupIcon className="h-8 w-8 mr-3 text-amber-500"/>{isSuperAdmin ? 'Panel de Dirección' : `Panel Docente: ${user.name}`}</h1>
            </div>
            {/* TABS */}
            <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg w-full md:w-fit overflow-x-auto">
                <button onClick={() => setActiveTab('students')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'students' ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>Estudiantes</button>
                <button onClick={() => setActiveTab('courses')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'courses' ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>Cursos</button>
                <button onClick={() => setActiveTab('assignments')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'assignments' ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>Asignaciones</button>
                <button onClick={() => setActiveTab('exams')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'exams' ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>Exámenes</button>
                <button onClick={() => setActiveTab('attendance')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'attendance' ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>Asistencia</button>
                {isSuperAdmin && ( <button onClick={() => setActiveTab('finance')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'finance' ? 'bg-white text-green-600 shadow-sm dark:bg-gray-800 dark:text-green-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>Finanzas</button> )}
                {isSuperAdmin && ( <button onClick={() => setActiveTab('announcements')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'announcements' ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>Anuncios</button> )}
            </div>

            {/* TAB COURSES, STUDENTS, ETC (Same content) */}
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
                                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción Corta (Tarjeta)</label><input type="text" value={editingCourse.descripcion || ''} onChange={(e) => setEditingCourse({...editingCourse, descripcion: e.target.value})} className="w-full p-2 mt-1 rounded border dark:bg-gray-700 dark:text-white"/></div>
                                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profesor</label><input type="text" value={editingCourse.profesor || ''} onChange={(e) => setEditingCourse({...editingCourse, profesor: e.target.value})} className={`w-full p-2 mt-1 rounded border dark:bg-gray-700 dark:text-white ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!isSuperAdmin} /></div>
                                </div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Créditos</label><input type="number" value={editingCourse.creditos || 0} onChange={(e) => setEditingCourse({...editingCourse, creditos: Number(e.target.value)})} className="w-24 p-2 mt-1 rounded border dark:bg-gray-700 dark:text-white"/></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contenido Detallado / Syllabus (Reseña Larga)</label><textarea value={editingCourse.contenido_detallado || ''} onChange={(e) => setEditingCourse({...editingCourse, contenido_detallado: e.target.value})} className="w-full p-2 mt-1 rounded border dark:bg-gray-700 dark:text-white h-48" placeholder="Escribe aquí todo el contenido, objetivos o reseña detallada del curso..."/></div>
                                <div className="flex justify-end space-x-3">
                                    <button onClick={() => setEditingCourse(null)} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Cancelar</button>
                                    <button onClick={handleUpdateCourse} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold">Guardar Cambios</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                            <div className="overflow-x-auto">
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
                                                    <button onClick={() => setEditingCourse(c)} className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 font-medium flex items-center justify-end w-full"><PencilIcon className="h-4 w-4 mr-1"/> Editar</button>
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

            {/* TAB: STUDENTS (Hidden for brevity, same as original) */}
            {activeTab === 'students' && (
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="relative w-full md:w-96">
                            <input type="text" placeholder="Buscar alumno por nombre o correo..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                            <SearchIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400"/>
                        </div>
                        {isSuperAdmin && (
                            <button onClick={() => setIsCreatingStudent(!isCreatingStudent)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center shadow-sm whitespace-nowrap">
                                <PlusIcon className="h-5 w-5 mr-2"/>
                                {isCreatingStudent ? 'Cancelar' : 'Registrar Usuario'}
                            </button>
                        )}
                    </div>
                    {isCreatingStudent && isSuperAdmin && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-green-200 dark:border-green-900 animate-fade-in">
                            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Datos del Nuevo Usuario</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <input type="text" placeholder="Nombre Completo" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className="p-2 rounded border dark:bg-gray-700 dark:text-white" />
                                <input type="email" placeholder="Correo Electrónico (Opcional)" value={newStudentEmail} onChange={(e) => setNewStudentEmail(e.target.value)} className="p-2 rounded border dark:bg-gray-700 dark:text-white" />
                                <input type="text" placeholder="Contraseña de Acceso" value={newStudentPassword} onChange={(e) => setNewStudentPassword(e.target.value)} className="p-2 rounded border dark:bg-gray-700 dark:text-white" />
                                <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} className="p-2 rounded border dark:bg-gray-700 dark:text-white bg-white dark:bg-gray-800">
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
                        <div className="overflow-x-auto">
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
                                    {filteredStudents.map((student) => (
                                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4 whitespace-nowrap flex items-center">
                                                <img className="h-8 w-8 rounded-full object-cover mr-3" src={student.avatar_url} />
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{student.nombre}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${student.rol === 'profesor' ? 'bg-purple-100 text-purple-800' : student.rol === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{student.rol || 'estudiante'}</span>
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
                                                        <button onClick={() => handleSendCredentials(student)} disabled={sendingEmailId === student.id} className={`text-gray-500 hover:text-blue-600 transition-colors ${sendingEmailId === student.id ? 'opacity-50' : ''}`} title="Enviar credenciales por correo"><MailIcon className="h-5 w-5" /></button>
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

            {/* TAB: ATTENDANCE */}
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
                        <button onClick={handleLoadAttendance} disabled={!attendanceCourse} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 h-[42px] font-bold">Cargar Lista</button>
                    </div>
                    {Object.keys(attendanceList).length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden animate-fade-in">
                            <div className="overflow-x-auto">
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
                                                        <button onClick={() => handleMarkAttendance(student.id, 'presente')} className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${attendanceList[student.id] === 'presente' ? 'bg-green-500 text-white shadow' : 'text-gray-500 hover:bg-gray-200'}`}>Presente</button>
                                                        <button onClick={() => handleMarkAttendance(student.id, 'ausente')} className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${attendanceList[student.id] === 'ausente' ? 'bg-red-500 text-white shadow' : 'text-gray-500 hover:bg-gray-200'}`}>Ausente</button>
                                                        <button onClick={() => handleMarkAttendance(student.id, 'justificado')} className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${attendanceList[student.id] === 'justificado' ? 'bg-blue-500 text-white shadow' : 'text-gray-500 hover:bg-gray-200'}`}>Justificado</button>
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

            {activeTab === 'assignments' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md h-fit">
                        <h2 className="text-lg font-bold mb-4 flex items-center text-gray-800 dark:text-white"><ClipboardListIcon className="h-5 w-5 mr-2 text-blue-500"/>Nueva Asignación</h2>
                        <div className="space-y-3">
                            <select value={newAssignCourse} onChange={(e) => setNewAssignCourse(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white"><option value="">Seleccionar Curso...</option>{coursesList.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                            <input type="text" placeholder="Título de la tarea" value={newAssignTitle} onChange={(e) => setNewAssignTitle(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white" />
                            <input type="date" value={newAssignDate} onChange={(e) => setNewAssignDate(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white" />
                            <button onClick={handleAddAssignment} disabled={!newAssignCourse || !newAssignTitle} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">Crear Asignación</button>
                        </div>
                    </div>
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                        <div className="overflow-x-auto">
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
                                                    <div className="flex justify-end space-x-2"><button onClick={() => handleDeleteAssignment(a.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded">Borrar</button><button onClick={() => setConfirmDeleteAssignId(null)} className="text-xs bg-gray-300 text-gray-800 px-2 py-1 rounded">X</button></div>
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

            {activeTab === 'exams' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md h-fit">
                        <h2 className="text-lg font-bold mb-4 flex items-center text-gray-800 dark:text-white"><AcademicCapIcon className="h-5 w-5 mr-2 text-red-500"/>Nuevo Examen</h2>
                        <div className="space-y-3">
                            <select value={newExamCourse} onChange={(e) => setNewExamCourse(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white"><option value="">Seleccionar Curso...</option>{coursesList.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                            <input type="text" placeholder="Título (Ej: Examen Final)" value={newExamTitle} onChange={(e) => setNewExamTitle(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white" />
                            <div className="flex space-x-2"><input type="date" value={newExamDate} onChange={(e) => setNewExamDate(e.target.value)} className="flex-1 p-2 rounded border dark:bg-gray-700 dark:text-white" /><input type="time" value={newExamTime} onChange={(e) => setNewExamTime(e.target.value)} className="w-24 p-2 rounded border dark:bg-gray-700 dark:text-white" /></div>
                            <button onClick={handleAddExam} disabled={!newExamCourse || !newExamTitle} className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50">Programar Examen</button>
                        </div>
                    </div>
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                        <div className="overflow-x-auto">
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
                                            <td className="px-6 py-4 text-sm text-right text-gray-500 dark:text-gray-400">{e.fecha ? new Date(e.fecha).toLocaleDateString() : 'Sin fecha'} - {e.hora}</td>
                                            <td className="px-6 py-4 text-right">
                                                {confirmDeleteExamId === e.id ? (
                                                    <div className="flex justify-end space-x-2"><button onClick={() => handleDeleteExam(e.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded">Borrar</button><button onClick={() => setConfirmDeleteExamId(null)} className="text-xs bg-gray-300 text-gray-800 px-2 py-1 rounded">X</button></div>
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

            {activeTab === 'announcements' && isSuperAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-2 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Recordatorios de Pago Automáticos</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Si está activo, los estudiantes verán una alerta roja cuando tengan cuotas vencidas.</p>
                        </div>
                        <button onClick={handleToggleReminders} className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${remindersEnabled ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-200 text-gray-600 border border-gray-300'}`}>{remindersEnabled ? 'ACTIVADO' : 'DESACTIVADO'}</button>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md h-fit">
                        <h2 className="text-lg font-bold mb-4 flex items-center text-gray-800 dark:text-white"><ChatIcon className="h-5 w-5 mr-2 text-purple-500"/>Nuevo Anuncio Global</h2>
                        <div className="space-y-3">
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remitente</label><input type="text" placeholder="Ej: Dirección Académica" value={newAnnounceSender} onChange={(e) => setNewAnnounceSender(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensaje</label><textarea placeholder="Escribe el anuncio aquí..." value={newAnnounceContent} onChange={(e) => setNewAnnounceContent(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white h-32 resize-none"/></div>
                            <button onClick={handleAddAnnouncement} disabled={!newAnnounceContent} className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50 font-bold shadow-md transition-colors">Publicar Anuncio</button>
                        </div>
                    </div>
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
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(a.fecha_envio).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{a.remitente}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{a.asunto}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                {confirmDeleteAnnounceId === a.id ? (
                                                    <div className="flex justify-end space-x-2"><button onClick={() => handleDeleteAnnouncement(a.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded">Borrar</button><button onClick={() => setConfirmDeleteAnnounceId(null)} className="text-xs bg-gray-300 text-gray-800 px-2 py-1 rounded">X</button></div>
                                                ) : (
                                                    <button onClick={() => setConfirmDeleteAnnounceId(a.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="h-5 w-5"/></button>
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

            {activeTab === 'finance' && isSuperAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                            <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white flex items-center"><SearchIcon className="h-5 w-5 mr-2 text-blue-500"/>Seleccionar Alumno</h2>
                            <select value={financeStudent} onChange={(e) => { setFinanceStudent(e.target.value); fetchStudentPayments(e.target.value); }} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white">
                                <option value="">-- Elige un estudiante --</option>
                                {students.filter(s => s.rol === 'estudiante').map(s => (<option key={s.id} value={s.id}>{s.nombre}</option>))}
                            </select>
                            {financeStudent && (
                                <div className="mt-6 pt-6 border-t dark:border-gray-700">
                                    <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                        <p className="text-xs font-bold text-yellow-800 dark:text-yellow-500 uppercase mb-2">Configurar Plan de Pago</p>
                                        
                                        {/* MONTO PERSONALIZABLE */}
                                        <div className="mb-3">
                                            <label className="text-sm text-gray-600 dark:text-gray-300 mb-1 block">Monto Mensual ($):</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="number" 
                                                    value={calcMonthlyFee}
                                                    onChange={(e) => setCalcMonthlyFee(Number(e.target.value))}
                                                    className="w-20 p-1 rounded border dark:bg-gray-700 dark:text-white text-center font-bold"
                                                />
                                                <button onClick={() => setCalcMonthlyFee(20)} className="text-xs bg-gray-200 dark:bg-gray-700 px-2 rounded hover:bg-gray-300 transition-colors">$20</button>
                                                <button onClick={() => setCalcMonthlyFee(25)} className="text-xs bg-gray-200 dark:bg-gray-700 px-2 rounded hover:bg-gray-300 transition-colors">$25</button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col mb-4">
                                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1">Inicio de Cobro:</label>
                                            <input type="date" value={calcStartDate} onChange={(e) => setCalcStartDate(e.target.value)} className="text-xs p-1 rounded border dark:bg-gray-700 dark:text-white" />
                                        </div>

                                        <button 
                                            onClick={handleSavePlanConfig} 
                                            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold py-2 rounded transition-colors"
                                        >
                                            Guardar Configuración del Plan
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div><p className="text-xs text-gray-500 dark:text-gray-400">Total Esperado</p><p className="text-lg font-bold text-gray-800 dark:text-white">${financeStats.expected}</p></div>
                                        <div><p className="text-xs text-gray-500 dark:text-gray-400">Total Pagado</p><p className="text-lg font-bold text-green-600">${financeStats.paid}</p></div>
                                    </div>
                                    <div className="mt-4 text-center">
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Deuda Actual Calculada</p>
                                        <p className={`text-3xl font-bold ${financeStats.debt > 0 ? 'text-red-500' : 'text-green-500'}`}>${financeStats.debt}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {financeStudent && (
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-green-500">
                                <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white flex items-center"><CurrencyDollarIcon className="h-5 w-5 mr-2 text-green-500"/>Registrar Pago</h2>
                                <div className="space-y-3">
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Monto ($)</label><input type="number" value={newPayAmount} onChange={(e) => setNewPayAmount(Number(e.target.value))} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white" /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Fecha de Pago</label><input type="date" value={newPayDate} onChange={(e) => setNewPayDate(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white" /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Concepto</label><input type="text" value={newPayDesc} onChange={(e) => setNewPayDesc(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white" placeholder="Mensualidad Enero" /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Método</label><select value={newPayMethod} onChange={(e) => setNewPayMethod(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white"><option>Pago Móvil</option><option>Zelle</option><option>Efectivo</option><option>Transferencia</option><option>Tarjeta (POS)</option></select></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Referencia</label><input type="text" value={newPayRef} onChange={(e) => setNewPayRef(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white" placeholder="#123456" /></div>
                                    <button onClick={handleAddPayment} className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 mt-2">Procesar Pago</button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden flex flex-col">
                         <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                            <h3 className="font-bold text-gray-800 dark:text-white">Historial de Transacciones</h3>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Concepto</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Método</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Monto</th>
                                        <th className="px-6 py-3 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {studentPayments.length > 0 ? (
                                        studentPayments.map(p => (
                                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{new Date(p.date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{p.description}{p.type === 'inscription' && <span className="ml-2 px-1 bg-yellow-100 text-yellow-800 text-[10px] rounded uppercase">Inscripción</span>}</td>
                                                <td className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">{p.method} <br/> <span className="text-[10px]">{p.reference}</span></td>
                                                <td className="px-6 py-4 text-right text-sm font-bold text-green-600">${p.amount}</td>
                                                <td className="px-6 py-4 text-right"><button onClick={() => handleDeletePayment(p.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="h-4 w-4"/></button></td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">{financeStudent ? "No hay pagos registrados." : "Selecciona un estudiante para ver su historial."}</td></tr>
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
