import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';
import transactionRoutes from './routes/transaction.routes';
import reportRoutes from './routes/report.routes';
import authRoutes from './routes/auth.routes';

// Inicialización
const app: Application = express();

// Middlewares Globales
app.use(cors());          // <--- QA FIX: CORS siempre debe ir primero o muy arriba
app.use(express.json());

// Archivos Estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);

// Ruta base de sanidad (Health Check) - Vital para Render y QA
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', env: process.env.NODE_ENV });
});

export default app;