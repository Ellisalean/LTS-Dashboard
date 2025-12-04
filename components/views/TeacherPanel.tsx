
import React, { useState, useEffect } from 'react';
import { supabase } from '../../application/supabase.ts';
import { PencilIcon, UserGroupIcon, PlusIcon, TrashIcon, ClipboardListIcon, AcademicCapIcon, CalendarIcon, CheckIcon, DownloadIcon } from '../Icons.tsx';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';

interface StudentData {
    id: string;
    nombre: string;
    email: string;
    avatar_url: string;
    activo: boolean;
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

const TeacherPanel: React.FC = () => {
    // ESTADO GENERAL
    const [activeTab, setActiveTab] = useState<'students' | 'assignments' | 'exams' | 'attendance'>('students');
    const [coursesList, setCoursesList] = useState<{id: string, nombre: string}[]>([]);
    const [loading, setLoading] = useState(true);

    // --- ESTADO ESTUDIANTES ---
    const [students, setStudents] = useState<StudentData[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
    const [editPhotoUrl, setEditPhotoUrl] = useState('');
    const [studentGrades, setStudentGrades] = useState<GradeData[]>([]);
    const [confirmDeleteStudentId, setConfirmDeleteStudentId] = useState<string | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    
    // Crear Estudiante
    const [isCreatingStudent, setIsCreatingStudent] = useState(false);
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentEmail, setNewStudentEmail] = useState('');
    const [newStudentPassword, setNewStudentPassword] = useState('');

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
    const [attendanceList, setAttendanceList] = useState<Record<string, string>>({}); // {studentId: 'presente'}

    // CARGA INICIAL
    useEffect(() => {
        const init = async () => {
            await fetchCourses();
            await fetchStudents();
            setLoading(false);
        };
        init();
    }, []);

    // CARGA DE DATOS SEGUN PESTAÑA
    useEffect(() => {
        if (activeTab === 'assignments') fetchAssignments();
        if (activeTab === 'exams') fetchExams();
    }, [activeTab]);

    // --- FETCHERS ---
    const fetchCourses = async () => {
        const { data } = await supabase.from('cursos').select('id, nombre').order('nombre');
        if (data) setCoursesList(data);
    };

    const fetchStudents = async () => {
        const { data } = await supabase.from('estudiantes').select('*').order('nombre');
        if (data) setStudents(data);
    };

    const fetchAssignments = async () => {
        const { data } = await supabase.from('asignaciones').select('*').order('fecha_entrega', { ascending: false });
        if (data) setAssignments(data);
    };

    const fetchExams = async () => {
        const { data } = await supabase.from('examenes').select('*').order('fecha', { ascending: false });
        if (data) setExams(data);
    };

    const fetchStudentGrades = async (studentId: string) => {
        const { data } = await supabase.from('notas').select('*').eq('estudiante_id', studentId);
        if (data) setStudentGrades(data);
    };

    // --- HANDLERS ESTUDIANTES ---
    const handleSelectStudent = (student: StudentData) => {
        setSelectedStudent(student);
        setEditPhotoUrl(student.avatar_url || '');
        fetchStudentGrades(student.id);
        setConfirmDeleteGradeId(null);
    };

    const handleCreateStudent = async () => {
        if (!newStudentName || !newStudentPassword) return;

        const { error } = await supabase.from('estudiantes').insert({
            nombre: newStudentName,
            email: newStudentEmail || null,
            password: newStudentPassword,
            rol: 'estudiante',
            activo: true,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(newStudentName)}&background=random&color=fff`
        });

        if (!error) {
            setNewStudentName('');
            setNewStudentEmail('');
            setNewStudentPassword('');
            setIsCreatingStudent(false);
            fetchStudents();
        } else {
            alert('Error al crear estudiante: ' + error.message);
        }
    };

    const handleDeleteStudent = async (id: string) => {
        const { error } = await supabase.from('estudiantes').delete().eq('id', id);
        
        if (!error) {
            fetchStudents();
            setConfirmDeleteStudentId(null);
            if (selectedStudent?.id === id) setSelectedStudent(null);
        } else {
            if (error.message.includes('foreign key constraint')) {
                alert("No se puede borrar el estudiante porque tiene notas, asignaciones o mensajes asociados. Borra sus registros primero.");
            } else {
                alert("Error al borrar: " + error.message);
            }
        }
    };

    const handleUpdateStudent = async () => {
        if (!selectedStudent) return;
        const { error } = await supabase.from('estudiantes').update({ avatar_url: editPhotoUrl }).eq('id', selectedStudent.id);
        if (!error) {
            const btn = document.getElementById('save-photo-btn');
            if(btn) { btn.innerText = '¡Guardado!'; setTimeout(() => btn.innerText = 'Guardar Foto', 2000); }
            fetchStudents();
        }
    };

    const handleToggleActive = async (student: StudentData) => {
        const { error } = await supabase.from('estudiantes').update({ activo: !student.activo }).eq('id', student.id);
        if (!error) fetchStudents();
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

    // --- PDF GENERATOR ---
    const handleDownloadReport = async () => {
        if (!selectedStudent) return;
        setIsGeneratingPdf(true);
        
        try {
            // HACK: Manejar diferentes tipos de exportación (Default vs Named)
            const JsPDFClass = (jsPDF as any).jsPDF || jsPDF;
            const doc = new JsPDFClass();

            // HACK: Lo mismo para autoTable
            const autoTableFunc = (autoTable as any).default || autoTable;

            // 1. Obtener Logo
            let logoBase64 = null;
            try {
                logoBase64 = await getImageData(LOGO_URL);
            } catch (err) {
                console.warn("No se pudo cargar el logo, se usará fallback", err);
            }

            // Insertar Logo (X, Y, Ancho, Alto)
            if (logoBase64) {
                // Ajustar proporciones si es necesario, aquí usamos un cuadrado de 20x20 aprox
                doc.addImage(logoBase64, 'PNG', 14, 12, 20, 20);
            } else {
                // Fallback si falla la imagen
                doc.setFillColor(23, 37, 84);
                doc.rect(14, 12, 20, 20, 'F');
                doc.setFillColor(255, 255, 255);
                doc.setFontSize(8);
                doc.text("LTS", 16, 24);
            }

            // Header - Ajustado para dejar espacio al logo
            doc.setFontSize(22);
            doc.setTextColor(23, 37, 84); // Azul oscuro
            doc.text("Latin Theological Seminary", 40, 23);
            
            doc.setFontSize(14);
            doc.setTextColor(100);
            doc.text("Boletín Oficial de Calificaciones", 40, 30);

            // Línea divisoria
            doc.setDrawColor(23, 37, 84);
            doc.setLineWidth(0.5);
            doc.line(14, 38, 196, 38);
            
            // Información del Estudiante
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

            // Tabla de Notas
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
                headStyles: { fillColor: [23, 37, 84], textColor: [255, 255, 255] }, // Azul Institucional
                styles: { fontSize: 10, cellPadding: 3 },
                alternateRowStyles: { fillColor: [240, 245, 255] }
            });

            // Pie de página
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
        
        // Cargar registros existentes
        const { data } = await supabase.from('asistencias')
            .select('estudiante_id, estado')
            .eq('curso_id', attendanceCourse)
            .eq('fecha', attendanceDate);
            
        const currentStatus: Record<string, string> = {};
        students.forEach(s => currentStatus[s.id] = 'ausente'); // Default
        
        if (data) {
            data.forEach((r: any) => {
                currentStatus[r.estudiante_id] = r.estado;
            });
        }
        setAttendanceList(currentStatus);
    };

    const handleMarkAttendance = async (studentId: string, status: string) => {
        // Actualizar estado local
        setAttendanceList(prev => ({ ...prev, [studentId]: status }));

        // Upsert en DB
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

    // --- HANDLERS ASIGNACIONES & EXAMENES (Sin cambios importantes, solo contexto) ---
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


    if (loading) return <div className="p-8 text-center text-gray-500">Cargando panel de administración...</div>;

    // --- RENDERIZADO ---

    // 1. VISTA DE DETALLE ESTUDIANTE (Sub-view)
    if (selectedStudent && activeTab === 'students') {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setSelectedStudent(null)} className="text-blue-600 hover:underline flex items-center">← Volver a la lista</button>
                    <button 
                        onClick={handleDownloadReport} 
                        disabled={isGeneratingPdf}
                        className="bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-900 shadow disabled:opacity-50"
                    >
                        <DownloadIcon className="h-5 w-5 mr-2"/>
                        {isGeneratingPdf ? 'Generando...' : 'Descargar Boletín PDF'}
                    </button>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Perfil */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Perfil: {selectedStudent.nombre}</h2>
                        <div className="flex flex-col items-center space-y-4">
                            <img src={editPhotoUrl || selectedStudent.avatar_url} className="w-32 h-32 rounded-full object-cover border-4 border-blue-500" />
                            <input type="text" value={editPhotoUrl} onChange={(e) => setEditPhotoUrl(e.target.value)} className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:text-white" placeholder="URL de la foto" />
                            <button id="save-photo-btn" onClick={handleUpdateStudent} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Guardar Foto</button>
                        </div>
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
                    <UserGroupIcon className="h-8 w-8 mr-3 text-amber-500"/>Panel Docente
                </h1>
            </div>

            {/* TABS NAVIGATION */}
            <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg w-full md:w-fit overflow-x-auto">
                <button onClick={() => setActiveTab('students')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'students' ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>Estudiantes</button>
                <button onClick={() => setActiveTab('assignments')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'assignments' ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>Asignaciones</button>
                <button onClick={() => setActiveTab('exams')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'exams' ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>Exámenes</button>
                <button onClick={() => setActiveTab('attendance')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'attendance' ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>Asistencia</button>
            </div>

            {/* TAB CONTENT: STUDENTS */}
            {activeTab === 'students' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button 
                            onClick={() => setIsCreatingStudent(!isCreatingStudent)} 
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center shadow-sm"
                        >
                            <PlusIcon className="h-5 w-5 mr-2"/>
                            {isCreatingStudent ? 'Cancelar Registro' : 'Registrar Alumno'}
                        </button>
                    </div>

                    {isCreatingStudent && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-green-200 dark:border-green-900 animate-fade-in">
                            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Datos del Nuevo Alumno</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <input type="text" placeholder="Nombre Completo" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className="p-2 rounded border dark:bg-gray-700 dark:text-white" />
                                <input type="email" placeholder="Correo Electrónico (Opcional)" value={newStudentEmail} onChange={(e) => setNewStudentEmail(e.target.value)} className="p-2 rounded border dark:bg-gray-700 dark:text-white" />
                                <input type="text" placeholder="Contraseña de Acceso" value={newStudentPassword} onChange={(e) => setNewStudentPassword(e.target.value)} className="p-2 rounded border dark:bg-gray-700 dark:text-white" />
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button onClick={handleCreateStudent} disabled={!newStudentName || !newStudentPassword} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50 font-bold">Guardar Alumno</button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estudiante</th>
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
                                            <button onClick={() => handleToggleActive(student)} className={`px-2 py-1 text-xs font-bold rounded-full ${student.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{student.activo ? 'ACTIVO' : 'INACTIVO'}</button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex justify-end space-x-3 items-center">
                                                <button onClick={() => handleSelectStudent(student)} className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 text-sm font-medium"><PencilIcon className="h-4 w-4 inline mr-1"/>Gestionar</button>
                                                {confirmDeleteStudentId === student.id ? (
                                                    <div className="flex space-x-1 animate-fade-in">
                                                        <button onClick={() => handleDeleteStudent(student.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Si</button>
                                                        <button onClick={() => setConfirmDeleteStudentId(null)} className="text-xs bg-gray-300 text-gray-800 px-2 py-1 rounded hover:bg-gray-400">No</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setConfirmDeleteStudentId(student.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="h-5 w-5"/></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
            )}
        </div>
    );
};

export default TeacherPanel;
