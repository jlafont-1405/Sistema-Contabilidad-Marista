import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';
import Transaction from '../models/transaction.model'; 
import Budget from '../models/budget.model';           

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
}