import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Interface para el contenido del Token
interface TokenPayload {
    id: string;
    role: string;
    username: string;
    iat: number;
    exp: number;
}

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    // 1. Buscar el token en el header "Authorization"
    const tokenHeader = req.header('Authorization');

    if (!tokenHeader) {
        // Si no envía nada, es un acceso denegado (401)
        return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token.' });
    }

    try {
        // El formato suele ser "Bearer <token>", así que quitamos "Bearer " si viene
        const token = tokenHeader.replace('Bearer ', '');

        const secret = process.env.JWT_SECRET || 'secreto_super_seguro';
        
        // 2. Verificar el token con la firma secreta
        const decoded = jwt.verify(token, secret) as TokenPayload;

        // 3. Guardar los datos del usuario dentro de la request para usarlos luego
        // (Aquí TypeScript se quejará si no hacemos el Paso 3)
        req.user = decoded;

        next(); // ¡Pase usted!
    } catch (error) {
        res.status(401).json({ message: 'Token inválido o expirado.' });
    }
};

// Middleware extra: Solo deja pasar si es Admin
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next(); // Es admin, pase.
    } else {
        res.status(403).json({ message: 'Acceso prohibido. Se requieren permisos de Administrador.' });
    }
};