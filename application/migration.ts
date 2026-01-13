
import { supabase } from './supabase.ts';
import { RAW_DATA } from './data.ts';

// Helper to clean keys similar to what we did in constants
const cleanData = (data: any[]) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => {
        const cleanedItem: { [key: string]: any } = {};
        for (const key in item) {
             const cleanedKey = key.trim();
             cleanedItem[cleanedKey] = item[key];
        }
        return cleanedItem;
    });
};

export const migrateDataToSupabase = async (log: (msg: string) => void) => {
    log("Verificando conexión con base de datos...");
    try {
        const { error: healthError } = await supabase.from('estudiantes').select('count', { count: 'exact', head: true });
        if (healthError) throw new Error(`No se pudo conectar. Error: ${healthError.message}`);
        log("Conexión exitosa. Tablas detectadas.");

        const { error: paymentCheck } = await supabase.from('pagos').select('count', { count: 'exact', head: true });
        if (paymentCheck && paymentCheck.code === '42P01') {
            log("⚠️ LA TABLA 'pagos' NO EXISTE. Por favor ejecuta el SQL en Supabase Editor.");
        }

        const { error: resourceCheck } = await supabase.from('recursos').select('count', { count: 'exact', head: true });
        if (resourceCheck && resourceCheck.code === '42P01') {
            log("⚠️ LA TABLA 'recursos' NO EXISTE. Ejecuta: create table recursos (id uuid default gen_random_uuid() primary key, course_id text references cursos(id) on delete cascade, titulo text, url text, tipo text, created_at timestamptz default now());");
        }

        // 1. Migrar Estudiantes
        log("Procesando Estudiantes...");
        const rawStudents = cleanData(RAW_DATA.Estudiantes);
        let studentsAdded = 0;
        for (const s of rawStudents) {
            const { data: existing } = await supabase.from('estudiantes').select('id').eq('nombre', s.ESTUDIANTE).single();
            if (!existing) {
                const { error: insertError } = await supabase.from('estudiantes').insert({
                    nombre: s.ESTUDIANTE, email: s.Email || s.EMAIL || null, password: String(s.Contraseña || s.CONTRASEÑA || '').trim(),
                    matricula: new Date().toISOString(), activo: (s.Activo || s.ACTIVO) === 'SI', avatar_url: `https://i.pravatar.cc/150?u=${encodeURIComponent(s.Email || s.ESTUDIANTE)}`
                });
                if (insertError) log(`Error insertando ${s.ESTUDIANTE}: ${insertError.message}`);
                else studentsAdded++;
            }
        }
        log(`Estudiantes completados. Nuevos: ${studentsAdded}`);

        log("Generando mapa de IDs de estudiantes...");
        const { data: dbStudents } = await supabase.from('estudiantes').select('id, nombre');
        const studentMap = dbStudents?.reduce((acc: any, cur: any) => ({ ...acc, [cur.nombre]: cur.id }), {}) || {};

        // 2. Migrar Cursos
        log("Procesando Cursos...");
        const rawCourses = cleanData(RAW_DATA.Cursos);
        let coursesAdded = 0;
        for (const c of rawCourses) {
             const { data: existing } = await supabase.from('cursos').select('id').eq('id', c.id).single();
             if(!existing) {
                 const { error } = await supabase.from('cursos').insert({ id: c.id, nombre: c.nombre, profesor: c.profesor, creditos: c.créditos, estado: (c.estado || '').trim(), descripcion: c.descripcion });
                 if(error) log(`Error curso ${c.id}: ${error.message}`);
                 else coursesAdded++;
             }
        }
        log(`Cursos completados. Nuevos: ${coursesAdded}`);

        // 3. Migrar Asignaciones
        log("Procesando Asignaciones...");
        const rawAssign = cleanData(RAW_DATA.Asignaciones);
        let assignAdded = 0;
        for (const a of rawAssign) {
            const { data: existing } = await supabase.from('asignaciones').select('id').eq('titulo', a.titulo).eq('curso_id', a.curso_id).single();
            if(!existing) {
                let date = null; if(a.fecha_entrega) { const parts = a.fecha_entrega.split('/'); if(parts.length === 3) date = `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`; }
                const { error } = await supabase.from('asignaciones').insert({ curso_id: a.curso_id, titulo: a.titulo, fecha_entrega: date, entregado: a.entregado === true || a.entregado === 'SI' });
                 if(error) log(`Error asignación ${a.titulo}: ${error.message}`);
                 else assignAdded++;
            }
        }
        log(`Asignaciones completadas. Nuevas: ${assignAdded}`);

        // 4. Migrar Exámenes
        log("Procesando Exámenes...");
        const rawExams = cleanData(RAW_DATA.Examenes);
        let examsAdded = 0;
        for (const e of rawExams) {
             const { data: existing } = await supabase.from('examenes').select('id').eq('titulo', e.titulo).eq('curso_id', e.curso_id).single();
            if(!existing) {
                 let date = null; if(e.fecha) { const parts = e.fecha.split('/'); if(parts.length === 3) date = `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`; }
                const { error } = await supabase.from('examenes').insert({ curso_id: e.curso_id, titulo: e.titulo, fecha: date, hora: e.hora });
                if(error) log(`Error examen ${e.titulo}: ${error.message}`);
                else examsAdded++;
            }
        }
        log(`Exámenes completados. Nuevos: ${examsAdded}`);

        // 5. Migrar Notas
        log("Procesando Notas...");
        const rawGrades = cleanData(RAW_DATA.Notas);
        let gradesAdded = 0;
        for (const g of rawGrades) {
            const studentId = studentMap[g.nombre_estudiante];
            if (studentId) {
                 const { data: existing } = await supabase.from('notas').select('id').eq('estudiante_id', studentId).eq('curso_id', g.curso_id).eq('titulo_asignacion', g.titulo_asignacion).single();
                if(!existing) {
                    const { error } = await supabase.from('notas').insert({ curso_id: g.curso_id, estudiante_id: studentId, titulo_asignacion: g.titulo_asignacion, puntuacion: g.puntuacion, puntuacion_maxima: g.puntuacion_maxima || 100 });
                    if(error) log(`Error nota ${g.nombre_estudiante}: ${error.message}`);
                    else gradesAdded++;
                }
            }
        }
        log(`Notas completadas. Nuevas: ${gradesAdded}`);

        // 6. Migrar Mensajes
        log("Procesando Mensajes...");
        const rawMsgs = cleanData(RAW_DATA.Mensajes);
        let msgsAdded = 0;
        for (const m of rawMsgs) {
             const { data: existing } = await supabase.from('mensajes').select('id').eq('asunto', m.asunto).eq('remitente', m.remitente).single();
             if(!existing) {
                 await supabase.from('mensajes').insert({ remitente: m.remitente, asunto: m.asunto, leido: m.leido === true, fecha_envio: new Date().toISOString() });
                 msgsAdded++;
             }
        }
        log(`Mensajes completados. Nuevos: ${msgsAdded}`);
        
        return { success: true, message: "Datos migrados correctamente a Supabase" };
    } catch (error) {
        log(`ERROR FATAL: ${(error as any).message}`);
        return { success: false, message: "Error al migrar datos" };
    }
}
