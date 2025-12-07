
import { Resend } from 'resend';
import type { Handler } from '@netlify/functions';

const resend = new Resend('re_1AbvSvgr_K2xi97piBy25HsPF6LfWKc5T');
const LOGO_URL = "https://cdn.myportfolio.com/d435fa58-d32c-4141-8a15-0f2bfccdea41/1ac05fb8-e508-4c03-b550-d2b907caadbd_rw_600.png?h=7572d326e4292f32557ac73606fd0ece";

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { email, name, password, role } = JSON.parse(event.body || '{}');

        // Validación básica
        if (!email || !name || !password) {
            console.error('Missing fields:', { email, name, hasPassword: !!password });
            return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos requeridos' }) };
        }

        // Limpieza de espacios en el correo
        const cleanEmail = email.trim();

        const subject = `Bienvenido al Latin Theological Seminary`;
        
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Helvetica', 'Arial', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background-color: #1e3a8a; padding: 30px; text-align: center; }
                .header img { height: 80px; width: auto; }
                .content { padding: 40px 30px; color: #333333; }
                .h1 { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #1e3a8a; }
                .p { font-size: 16px; line-height: 1.6; margin-bottom: 20px; }
                .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 20px 0; text-align: center; }
                .label { font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 5px; }
                .value { font-size: 18px; font-weight: bold; color: #0f172a; margin-bottom: 15px; font-family: monospace; }
                .btn { display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px; margin-top: 20px; }
                .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="${LOGO_URL}" alt="LTS Logo" />
                </div>
                <div class="content">
                    <div class="h1">¡Bienvenido, ${name}!</div>
                    <div class="p">
                        Nos complace darte la bienvenida al <strong>Latin Theological Seminary</strong>. 
                        Se ha creado tu cuenta de ${role === 'profesor' ? 'Profesor' : 'Estudiante'} exitosamente.
                    </div>
                    <div class="p">
                        A continuación encontrarás tus credenciales de acceso personal. Por favor, guárdalas en un lugar seguro.
                    </div>
                    
                    <div class="card">
                        <div class="label">Usuario / Nombre</div>
                        <div class="value">${name}</div>
                        
                        <div class="label">Contraseña Temporal</div>
                        <div class="value" style="background: #e2e8f0; padding: 5px 10px; border-radius: 4px;">${password}</div>
                    </div>

                    <div style="text-align: center;">
                        <a href="https://ltsdashboard.netlify.app" class="btn" style="color: #ffffff;">Ingresar al Portal</a>
                    </div>
                </div>
                <div class="footer">
                    © ${new Date().getFullYear()} Latin Theological Seminary.<br>
                    Si tienes problemas para acceder, contacta a la dirección académica.
                </div>
            </div>
        </body>
        </html>
        `;

        console.log(`Intentando enviar correo a: ${cleanEmail}`);

        const data = await resend.emails.send({
            from: 'LTS Admin <onboarding@resend.dev>',
            to: [cleanEmail],
            subject: subject,
            html: htmlContent,
        });

        console.log('Respuesta de Resend:', data);

        if (data.error) {
             throw new Error(data.error.message);
        }

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error('Error en send-welcome-email:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: (error as Error).message }),
        };
    }
};
