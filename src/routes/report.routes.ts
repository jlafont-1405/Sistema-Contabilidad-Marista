import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';

const router = Router();
const controller = new ReportController();

// 👇 Aquí es donde fallaba. Asegúrate que diga .downloadExcel
router.get('/excel', controller.downloadExcel);

export default router;