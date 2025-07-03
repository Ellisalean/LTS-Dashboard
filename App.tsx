import React, { useState, useCallback } from 'react';
import Login from './components/Login.tsx';
import Dashboard from './components/Dashboard.tsx';
import { User } from './types.ts';
import { MOCK_STUDENTS } from './constants.ts';

// Simple hash function to get a seed for the avatar from the name
const getAvatarSeed = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        const char = name.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);

    const handleLogin = useCallback((username: string, password: string): boolean => {
        const student = MOCK_STUDENTS.find(s => s.name.toLowerCase() === username.toLowerCase());
        
        if (student && student.active && student.password === password) {
            setUser({
                name: student.name,
                email: student.email,
                avatarUrl: `https://picsum.photos/seed/${getAvatarSeed(student.name)}/100/100`
            });
            return true;
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