import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { upload } from '../middleware/upload.middleware';
import { verifyToken, isAdmin } from '../middleware/auth.middleware';

const router = Router();
const controller = new TransactionController();

// --- 1. Rutas de Lectura ---
// Solución: Pasamos solo (req, res) porque tu controller no pide 'next'
router.get('/', verifyToken, (req, res, next) => controller.getByMonth(req, res));

// --- 2. Rutas de Escritura (Protegidas) ---

router.post('/', 
    verifyToken, 
    isAdmin, 
    upload.single('invoice'), 
    (req, res, next) => controller.create(req, res) // 👈 Aquí quitamos el 'next' del final
);

router.post('/budget', 
    verifyToken, 
    isAdmin, 
    (req, res, next) => controller.setBudget(req, res) // 👈 Aquí también
);

router.delete('/:id', 
    verifyToken, 
    isAdmin, 
    (req, res, next) => controller.delete(req, res) // 👈 Y aquí
);

router.put('/:id', 
    verifyToken, 
    isAdmin, 
    upload.single('invoice'), 
    (req, res, next) => controller.update(req, res) // 👈 Y aquí
);

export default router;