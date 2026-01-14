import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();
const controller = new AuthController();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.delete('/me', verifyToken, controller.deleteAccount);
router.post('/forgotpassword', controller.forgotPassword);
router.put('/resetpassword/:resettoken', controller.resetPassword);


export default router;