import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { upload } from '../middleware/upload.middleware';

const router = Router();
const controller = new TransactionController();

router.post('/', upload.single('invoice'), controller.create);
router.get('/', controller.getByMonth);
router.post('/budget', controller.setBudget);
router.delete('/:id', controller.delete);

// 👇 MIRA QUÉ LIMPIO QUEDA AHORA
router.put('/:id', upload.none(), controller.update);

export default router;