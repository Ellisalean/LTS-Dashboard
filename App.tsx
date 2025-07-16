import React, { useState, useCallback } from 'react';
import Login from './components/Login.tsx';
import Dashboard from './components/Dashboard.tsx';
import { User } from './types.ts';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);

    const handleLogin = useCallback(async (username: string, password: string): Promise<boolean> => {
        try {
            const response = await fetch('/.netlify/functions/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                const userData: User = await response.json();
                setUser(userData);
                return true;
            }
            
            return false;

        } catch (error) {
            console.error("Error connecting to login service:", error);
            return false;
        }
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
