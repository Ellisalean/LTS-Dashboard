import React, { useState, useRef, useEffect } from 'react';
import { SCHOOL_LOGO_URL } from '../constants.ts';
import { migrateDataToSupabase } from '../application/migration.ts';

interface LoginProps {
    onLogin: (username: string, password: string) => Promise<boolean>;
}

const ConsoleModal: React.FC<{ logs: string[]; onClose: () => void; isFinished: boolean }> = ({ logs, onClose, isFinished }) => {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
            <div className="bg-gray-900 w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden border border-gray-700 flex flex-col max-h-[80vh]">
                <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                    <h3 className="text-gray-200 font-mono text-sm">Terminal de Migración v1.0</h3>
                    {isFinished && (
                        <button 
                            onClick={onClose}
                            className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
                        >
                            CERRAR
                        </button>
                    )}
                </div>
                <div className="p-4 overflow-y-auto font-mono text-xs md:text-sm space-y-1 flex-1">
                    {logs.map((log, index) => {
                        const isError = log.includes('Error') || log.includes('falló');
                        const isSuccess = log.includes('Éxito') || log.includes('Correctamente');
                        const isInfo = log.includes('migrados') || log.includes('Iniciando');
                        
                        let colorClass = "text-gray-300";
                        if (isError) colorClass = "text-red-400 font-bold";
                        else if (isSuccess) colorClass = "text-green-400 font-bold";
                        else if (isInfo) colorClass = "text-blue-300";

                        return (
                            <div key={index} className={`${colorClass} break-words`}>
                                <span className="text-gray-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                {log}
                            </div>
                        );
                    })}
                    <div ref={endRef} />
                </div>
            </div>
        </div>
    );
};

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Estados para la migración visual
    const [showConsole, setShowConsole] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [migrationFinished, setMigrationFinished] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const success = await onLogin(username, password);
        if (!success) {
            setError('Credenciales incorrectas o usuario inactivo.');
        }
        setLoading(false);
    };

    const handleMigration = async () => {
        setShowConsole(true);
        setLogs(['Iniciando sistema de migración...', 'Esperando confirmación del usuario...']);
        setMigrationFinished(false);

        // Pequeño delay para que se renderice el modal antes de bloquear
        setTimeout(async () => {
             setLogs(prev => [...prev, 'Conectando con Supabase...']);
             
             try {
                 const result = await migrateDataToSupabase((msg) => {
                     setLogs(prev => [...prev, msg]);
                 });
                 
                 if (result.success) {
                     setLogs(prev => [...prev, '✨ PROCESO COMPLETADO CON ÉXITO ✨']);
                 } else {
                     setLogs(prev => [...prev, '❌ PROCESO FINALIZADO CON ERRORES']);
                 }
             } catch (e) {
                 setLogs(prev => [...prev, `Error crítico: ${(e as any).message}`]);
             } finally {
                 setMigrationFinished(true);
             }
        }, 500);
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 flex-col relative">
            
            {showConsole && (
                <ConsoleModal 
                    logs={logs} 
                    onClose={() => setShowConsole(false)} 
                    isFinished={migrationFinished} 
                />
            )}

            <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl z-10">
                <div className="text-center">
                    <div className="flex justify-center mx-auto mb-4">
                      <img 
                        src={SCHOOL_LOGO_URL} 
                        alt="LTS Logo" 
                        className="h-24 w-auto object-contain drop-shadow-md"
                      />
                    </div>
                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Latin Theological Seminary
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Inicie sesión en su cuenta de estudiante
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="username" className="sr-only">Nombre de estudiante</label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Nombre de estudiante "
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label htmlFor="password-input" className="sr-only">Contraseña</label>
                            <input
                                id="password-input"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Contraseña"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-500 text-center pt-2">{error}</p>}

                    <div>
                        <button 
                          type="submit" 
                          className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors disabled:bg-blue-400 dark:disabled:bg-blue-800"
                          disabled={loading}
                        >
                            {loading ? 'Verificando...' : 'Iniciar Sesión'}
                        </button>
                    </div>
                </form>
            </div>
            
            {/* 
            BOTÓN OCULTO POR SEGURIDAD. DESCOMENTAR SOLO SI ES NECESARIO RE-MIGRAR DATOS
            <button 
                onClick={handleMigration}
                className="mt-8 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline z-10"
            >
                Inicializar datos en la Nube (Solo Admin)
            </button>
            */}
        </div>
    );
};

export default Login;