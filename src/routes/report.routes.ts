import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';

const router = Router();
const controller = new ReportController();

// GET /api/reports/excel
router.get('/excel', controller.downloadMonthlyReport);

export default router;