
import React, { useState, useCallback } from 'react';
import Login from './components/Login.tsx';
import Dashboard from './components/Dashboard.tsx';
import { User } from './types.ts';
import { supabase } from './application/supabase.ts';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);

    const handleLogin = useCallback(async (username: string, password: string): Promise<boolean> => {
        try {
            // Consulta directa a Supabase (Table Login)
            const { data: student, error } = await supabase
                .from('estudiantes')
                .select('*')
                .eq('nombre', username.trim())
                .single();

            if (error || !student) {
                console.error("User not found or DB error", error);
                return false;
            }

            // Validar contraseña (texto plano como en tus datos)
            const storedPass = String(student.password || '').trim();
            const inputPass = password.trim();

            if (student.activo && storedPass === inputPass) {
                // Determinar el rol correctamente
                let role: 'admin' | 'estudiante' | 'profesor' = 'estudiante';
                if (student.rol === 'admin') role = 'admin';
                else if (student.rol === 'profesor') role = 'profesor';

                const userPayload: User = {
                    name: student.nombre,
                    email: student.email || 'No disponible',
                    avatarUrl: student.avatar_url || `https://i.pravatar.cc/150?u=${encodeURIComponent(student.nombre)}`,
                    role: role
                };
                setUser(userPayload);
                return true;
            }
        } catch (err) {
            console.error("Login error:", err);
        }
            
        return false;
    }, []);

    const handleLogout = useCallback(() => {
        setUser(null);
    }, []);

    if (!user) {
        return <Login onLogin={handleLogin} />;
    }

    return <Dashboard user={user} onLogout={handleLogout} />;
};

export default App;
