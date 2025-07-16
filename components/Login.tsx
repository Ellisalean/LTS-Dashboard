import React, { useState } from 'react';
import { LogoIcon } from './Icons.tsx';

interface LoginProps {
    onLogin: (username: string, password: string) => Promise<boolean>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const success = await onLogin(username, password);
        if (!success) {
            setError('Credenciales incorrectas o usuario inactivo. Inténtelo de nuevo.');
        }
        // No need to handle success here, App component will re-render the dashboard
        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
                <div className="text-center">
                    <div className="flex justify-center mx-auto text-blue-600 dark:text-blue-400">
                      <LogoIcon className="h-12 w-12"/>
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
                                placeholder="Nombre de estudiante"
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
                            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
