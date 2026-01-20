import { Router } from 'express';
// 1. Importamos todas las funciones directamente (ya no existe la Clase)
import { 
    register, 
    login, 
    deleteAccount, 
    forgotPassword, 
    resetPassword, 
    getAllUsers 
} from '../controllers/auth.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

// ❌ YA NO NECESITAS ESTO: const controller = new AuthController();

// 2. Usamos las funciones directamente
router.post('/register', register);
router.post('/login', login);
router.delete('/me', verifyToken, deleteAccount); // Asegúrate de importar deleteAccount
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

// 3. Ruta de admin
router.get('/users', getAllUsers);

export default router;