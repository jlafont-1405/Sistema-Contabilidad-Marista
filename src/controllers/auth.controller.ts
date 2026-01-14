import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';
import Transaction from '../models/transaction.model'; 
import Budget from '../models/budget.model';           
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro_marista';

export class AuthController {

    // 1. REGISTRO (Corregido para Email + AutoLogin)
    public register = async (req: Request, res: Response) => {
        try {
            console.log("📝 Intentando registrar:", req.body.email);
            
            // Usamos email para validación, username es cosmético
            const { username, email, password, role } = req.body; 

            // A. Validar si ya existe el CORREO (No el username)
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Este correo ya está registrado' });
            }

            // B. Crear Usuario
            // Nota: Si no mandan rol, el modelo pone 'guest' por defecto
            const newUser = new User({ username, email, password, role });
            await newUser.save();

            // C. Generar Token de una vez (Auto-Login) 🚀
            const token = jwt.sign(
                { id: newUser._id, role: newUser.role, username: newUser.username }, 
                JWT_SECRET, 
                { expiresIn: '24h' }
            );

            console.log("✅ Usuario registrado:", newUser.email);

            res.status(201).json({ 
                message: 'Usuario creado exitosamente',
                token, // 👈 Importante para que el frontend entre directo
                user: { id: newUser._id, username: newUser.username, email: newUser.email }
            });

        } catch (error: any) {
            console.error("🔴 ERROR REGISTRO:", error);
            res.status(500).json({ 
                message: 'Error al registrar usuario', 
                errorDetail: error.message || error 
            });
        }
    }

    // 2. LOGIN (Corregido para buscar por Email)
    public login = async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body; // 👈 Ahora esperamos email

            // A. Buscar usuario por EMAIL
            const user = await User.findOne({ email });
            if (!user) return res.status(400).json({ message: 'Credenciales inválidas' });

            // B. Comparar contraseña
            const isMatch = await user.comparePassword(password);
            if (!isMatch) return res.status(400).json({ message: 'Credenciales inválidas' });

            // C. Crear Token
            const payload = { id: user._id, role: user.role, username: user.username };
            
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

            res.json({ token, role: user.role, username: user.username });

        } catch (error) {
            console.error("🔴 ERROR LOGIN:", error);
            res.status(500).json({ message: 'Error en el servidor', error: error });
        }
    }

    // 3. ELIMINAR CUENTA (Borrado en Cascada) 🗑️
    // En src/controllers/auth.controller.ts

public deleteAccount = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id; // Del Token
        const { password } = req.body; // 👈 Del formulario de confirmación

        if (!password) {
            return res.status(400).json({ message: 'Se requiere la contraseña para confirmar' });
        }

        // 1. Buscar al usuario para verificar la contraseña
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        // 2. Verificar si la contraseña es correcta
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Contraseña incorrecta. No se eliminó nada.' });
        }

        console.log(`💀 Eliminando cuenta de: ${user.email}`);

        // 3. Borrado en Cascada (Todo limpio)
        await Transaction.deleteMany({ userId });
        await Budget.deleteMany({ userId });
        await User.findByIdAndDelete(userId);

        res.json({ message: 'Cuenta eliminada correctamente' });

    } catch (error) {
        console.error("Error eliminando cuenta:", error);
        res.status(500).json({ message: 'Error interno al eliminar cuenta' });
    }
};

// 4. OLVIDÉ CONTRASEÑA (Versión Final con Gmail 📧)
    public forgotPassword = async (req: Request, res: Response) => {
        // 👇 CORRECCIÓN 1: Definimos 'user' aquí afuera para que el 'catch' la pueda ver
        let user: any; 

        try {
            const { email } = req.body;
            
            // 👇 CORRECCIÓN 2: Quitamos 'const' porque ya la definimos arriba
            user = await User.findOne({ email });

            if (!user) {
                return res.status(404).json({ message: 'No existe usuario con ese correo' });
            }

            // 1. Generar Token
            const resetToken = crypto.randomBytes(20).toString('hex');
            user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 min

            // Guardamos el token antes de intentar enviar el correo
            await user.save();

            const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
            // 2. URL del Frontend
            const resetUrl = `${baseUrl}/reset-password.html?token=${resetToken}`;

            // 3. Configurar el "Cartero" (Gmail)
            const transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 587,
                secure: false, // IMPORTANTE: true para puerto 465
                auth: {
                    user: process.env.EMAIL_USER, // Tu correo
                    pass: process.env.EMAIL_PASS  // Tu contraseña de aplicación de 16 letras
                },
                tls: {
                    rejectUnauthorized: false
                },
                // 👇 ESTA ES LA MAGIA PARA ARREGLAR EL TIMEOUT EN RENDER:
                family: 4 // Obliga a usar IPv4 (evita bloqueos de IPv6)
            } as any);

            // 4. Configurar el Mensaje
            const mailOptions = {
                from: `"Soporte Marist Manager" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: 'Recuperar Contraseña - Marist Manager 🔐',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #1e3a8a; text-align: center;">Sistema Marista</h2>
                        <p>Hola,</p>
                        <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Restablecer Contraseña</a>
                        </div>
                        <p style="font-size: 14px; color: #999; text-align: center;">Este enlace expira en 10 minutos.</p>
                    </div>
                `
            };

            // 5. Enviar
            await transporter.sendMail(mailOptions);

            console.log(`✅ Correo enviado a ${user.email}`);
            res.status(200).json({ success: true, message: 'Correo enviado. Revisa tu bandeja de entrada.' });

        } catch (error) {
            console.error("🔴 Error enviando correo:", error);
            
            // 👇 AHORA SÍ FUNCIONA: Si falló el correo, borramos el token para no dejarlo 'sucio'
            if (user) {
                user.resetPasswordToken = undefined;
                user.resetPasswordExpire = undefined;
                await user.save();
            }
            
            res.status(500).json({ message: 'Hubo un error técnico al enviar el correo.' });
        }
    };

    // 👇 5. RESTABLECER CONTRASEÑA (Guardar nueva)
    public resetPassword = async (req: Request, res: Response) => {
        try {
            // Hash del token que viene en la URL para compararlo con el de la BD
            const resetToken = crypto.createHash('sha256').update(req.params.resettoken as string).digest('hex');

            const user = await User.findOne({
                resetPasswordToken: resetToken,
                resetPasswordExpire: { $gt: Date.now() } // Verificar que no haya expirado
            });

            if (!user) {
                return res.status(400).json({ message: 'Token inválido o expirado' });
            }

            // Guardar nueva contraseña
            user.password = req.body.password;
            
            // Limpiar token usado
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;

            await user.save();

            res.status(200).json({ success: true, message: 'Contraseña actualizada exitosamente' });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al resetear contraseña' });
        }
    };
}
