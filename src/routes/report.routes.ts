import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();
const controller = new ReportController();

// 👇 Aquí es donde fallaba. Asegúrate que diga .downloadExcel

router.get('/excel', verifyToken, (req, res) => controller.downloadExcel(req, res));
export default router;