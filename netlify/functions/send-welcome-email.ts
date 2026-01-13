
import type { Handler } from '@netlify/functions';

const LOGO_URL = "https://cdn.myportfolio.com/d435fa58-d32c-4141-8a15-0f2bfccdea41/1ac05fb8-e508-4c03-b550-d2b907caadbd_rw_600.png?h=7572d326e4292f32557ac73606fd0ece";

export const handler: Handler = async (event) => {
    // Solo permitir peticiones POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { email, name, password, role } = JSON.parse(event.body || '{}');
        const BREVO_API_KEY = process.env.BREVO_API_KEY;

        if (!BREVO_API_KEY) {
            console.error('Error: BREVO_API_KEY no configurada en Netlify');
            return { statusCode: 500, body: JSON.stringify({ error: 'Configuración de servidor incompleta' }) };
        }

        if (!email || !name || !password) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos requeridos (email, nombre o clave)' }) };
        }

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f4f8; margin: 0; padding: 0; }
                .wrapper { width: 100%; table-layout: fixed; background-color: #f0f4f8; padding-bottom: 40px; }
                .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; color: #1a202c; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
                .header { background-color: #1e3a8a; text-align: center; padding: 40px 20px; }
                .header img { height: 90px; width: auto; }
                .content { padding: 40px 30px; text-align: left; }
                .title { font-size: 24px; font-weight: 800; color: #1e3a8a; margin-bottom: 20px; }
                .text { font-size: 16px; line-height: 1.6; color: #4a5568; margin-bottom: 25px; }
                .credentials-box { background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 25px; margin: 30px 0; text-align: center; }
                .label { font-size: 11px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 1.5px; margin-bottom: 8px; }
                .value { font-size: 18px; font-weight: 800; color: #1e293b; margin-bottom: 15px; font-family: 'Courier New', monospace; }
                .btn-container { text-align: center; margin-top: 30px; }
                .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 15px 35px; border-radius: 10px; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
                .footer { text-align: center; padding: 30px; font-size: 12px; color: #94a3b8; }
            </style>
        </head>
        <body>
            <div class="wrapper">
                <table class="main">
                    <tr>
                        <td class="header">
                            <img src="${LOGO_URL}" alt="Latin Theological Seminary">
                        </td>
                    </tr>
                    <tr>
                        <td class="content">
                            <div class="title">¡Bienvenido al Seminario!</div>
                            <div class="text">
                                Estimado(a) <strong>${name}</strong>,<br><br>
                                Es un honor darte la bienvenida oficial a nuestra comunidad académica. Tu cuenta como <strong>${role.toUpperCase()}</strong> ha sido activada en nuestro portal digital.
                            </div>
                            
                            <div class="credentials-box">
                                <div class="label">Usuario de Acceso</div>
                                <div class="value">${name}</div>
                                
                                <div class="label">Contraseña Temporal</div>
                                <div class="value" style="color: #2563eb; background: #eff6ff; padding: 8px 15px; border-radius: 6px;">${password}</div>
                            </div>

                            <div class="text">
                                Puedes acceder ahora mismo para revisar tus cursos, materiales y estado financiero.
                            </div>

                            <div class="btn-container">
                                <a href="https://ltsdashboard.netlify.app" class="btn">Acceder al Dashboard</a>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">
                            © ${new Date().getFullYear()} Latin Theological Seminary.<br>
                            Este es un correo automático, por favor no respondas a esta dirección.
                        </td>
                    </tr>
                </table>
            </div>
        </body>
        </html>
        `;

        // Llamada a la API de Brevo (v3)
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: "Administración LTS", email: "latintheologicalseminary@gmail.com" },
                to: [{ email: email.trim(), name: name }],
                subject: "Tus credenciales de acceso - Latin Theological Seminary",
                htmlContent: htmlContent
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Error de Brevo:', data);
            throw new Error(data.message || 'Error al enviar el correo a través de Brevo');
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Email enviado correctamente', id: data.messageId }),
        };

    } catch (error) {
        console.error('Excepción en función de email:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: (error as Error).message }),
        };
    }
};
