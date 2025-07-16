import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { RAW_DATA } from "../../application/data.ts";
import { Student } from "../../types.ts";

// This is our secure backend data processing.
// The raw student data is only accessible on the server.
const students: Student[] = RAW_DATA.Estudiantes.map((s: any) => {
    // Clean up keys that might have extra spaces
    const studentKey = Object.keys(s).find(k => k.trim().toUpperCase() === 'ESTUDIANTE');
    const passwordKey = Object.keys(s).find(k => k.trim().toUpperCase() === 'CONTRASEÑA');
    const activeKey = Object.keys(s).find(k => k.trim().toUpperCase() === 'ACTIVO');
    const emailKey = Object.keys(s).find(k => k.trim().toUpperCase() === 'EMAIL');

    return {
        name: studentKey ? s[studentKey] : 'Unknown',
        email: emailKey ? s[emailKey] : 'No disponible',
        password: passwordKey ? String(s[passwordKey] || '').trim() : '',
        active: activeKey ? s[activeKey] === 'SI' : false,
    };
});


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

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
        };
    }

    try {
        const { username, password } = JSON.parse(event.body || '{}');

        if (!username || !password) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Username and password are required.' }),
            };
        }

        const student = students.find(s => s.name.toLowerCase() === username.toLowerCase());
        
        if (student && student.active && student.password === password) {
            // On success, return user data (without the password!)
            const userPayload = {
                name: student.name,
                email: student.email,
                avatarUrl: `https://i.pravatar.cc/150?u=${student.email}` // Using a more consistent avatar service
            };
            
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userPayload),
            };
        } else {
            // On failure, return an authorization error
            return {
                statusCode: 401,
                body: JSON.stringify({ message: 'Credenciales incorrectas o usuario inactivo.' }),
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};

export { handler };
