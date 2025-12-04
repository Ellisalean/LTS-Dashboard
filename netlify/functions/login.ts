import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { RAW_DATA } from "../../application/data.ts";
import { Student, User } from "../../types.ts";

// Helper to clean keys with spaces, invisible characters, and case inconsistencies.
const cleanData = (data: any[]): { [key: string]: any }[] => {
    if (!Array.isArray(data)) return [];
    return data.map(item => {
        const cleanedItem: { [key: string]: any } = {};
        for (const key in item) {
             const cleanedKey = key.trim().toUpperCase();
             cleanedItem[cleanedKey] = item[key];
        }
        return cleanedItem;
    });
};


// This is our secure backend data processing.
// The raw student data is only accessible on the server.
const students: Student[] = cleanData(RAW_DATA.Estudiantes).map((s: any) => ({
    name: s['ESTUDIANTE'],
    email: s['EMAIL'],
    password: String(s['CONTRASEÑA'] || '').trim(),
    active: s['ACTIVO'] === 'SI',
}));

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

        const student = students.find(s => s.name && s.name.toLowerCase() === username.toLowerCase());
        
        if (student && student.active && student.password === password) {
            // On success, return user data (without the password!)
            const userPayload: User = {
                name: student.name,
                email: student.email || 'No disponible',
                // Use email if available, otherwise use name to generate a unique avatar
                avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(student.email || student.name)}`
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
        console.error('Login function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};

export { handler };