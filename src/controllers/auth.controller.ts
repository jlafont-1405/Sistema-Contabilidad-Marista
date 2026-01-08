import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';

export class AuthController {

// REGISTRO (Para crear tu usuario Admin inicial)
    public register = async (req: Request, res: Response) => {
        try {
            const { username, password, role } = req.body;
            
            console.log("Intentando registrar:", username); // Log para verificar que entra

            // Validar si ya existe
            const existingUser = await User.findOne({ username });
            if (existingUser) return res.status(400).json({ message: 'El usuario ya existe' });

            const newUser = new User({ username, password, role });
            await newUser.save();

            res.status(201).json({ message: 'Usuario creado exitosamente' });
        } catch (error: any) { // Agregamos 'any' para poder leer las propiedades
            console.error("🔴 ERROR DETALLADO:", error);
            
            // 👇 ESTO ES LO IMPORTANTE: Enviamos el mensaje técnico a Postman
            res.status(500).json({ 
                message: 'Error al registrar usuario', 
                errorDetail: error.message || error 
            });
        }
    }

    // LOGIN (Generar Token)
    public login = async (req: Request, res: Response) => {
        try {
            const { username, password } = req.body;

            // 1. Buscar usuario
            const user = await User.findOne({ username });
            if (!user) return res.status(400).json({ message: 'Credenciales inválidas' });

            // 2. Comparar contraseña (usando el método que creamos en el modelo)
            const isMatch = await user.comparePassword(password);
            if (!isMatch) return res.status(400).json({ message: 'Credenciales inválidas' });

            // 3. Crear Token (JWT)
            // IMPORTANTE: Este token contiene el ID y el ROL del usuario
            const payload = { id: user._id, role: user.role, username: user.username };
            const secret = process.env.JWT_SECRET || 'secreto_super_seguro';
            
            const token = jwt.sign(payload, secret, { expiresIn: '8h' }); // Dura 8 horas

            res.json({ token, role: user.role, username: user.username });
            // ... dentro de public register = async ...
        } catch (error) {
            // 👇 AGREGA ESTA LÍNEA para ver el error en la terminal de VS Code
            console.error("🔴 ERROR REAL DEL SERVIDOR:", error); 
            
            // 👇 Modifica esto temporalmente para ver el error en Postman también
            res.status(500).json({ message: 'Error al registrar usuario', error: error });
        }
    }
    
}