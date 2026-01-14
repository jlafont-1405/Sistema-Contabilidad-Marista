import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { upload } from '../middleware/upload.middleware';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();
const controller = new TransactionController();

// --- 1. Rutas de Lectura ---
// Solución: Pasamos solo (req, res) porque tu controller no pide 'next'
router.get('/', verifyToken, (req, res, next) => controller.getByMonth(req, res));

// --- 2. Rutas de Escritura (Protegidas para cualquier usuario logueado) ---

router.post('/', 
    verifyToken, 
    upload.single('invoice'), 
    (req, res, next) => controller.create(req, res)
);

router.post('/budget', 
    verifyToken, 
    (req, res, next) => controller.setBudget(req, res)
);

router.delete('/:id', 
    verifyToken, 
    (req, res, next) => controller.delete(req, res)
);

router.put('/:id', 
    verifyToken, 
    upload.single('invoice'), 
    (req, res, next) => controller.update(req, res)
);

export default router;