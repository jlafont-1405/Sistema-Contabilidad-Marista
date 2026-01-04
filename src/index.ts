import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { connectDB } from './config/db';
import transactionRoutes from './routes/transaction.routes';
import reportRoutes from './routes/report.routes';

// 1. Configuración Inicial
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// 2. Conectar a Base de Datos
connectDB();

// 3. Middlewares Globales
app.use(cors());          // Permite conexiones externas
app.use(express.json());  // Permite leer JSON en los formularios

// 4. Archivos Estáticos (Frontend y Fotos)
// '/uploads' -> Para ver las facturas
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// '/' -> Para servir la página web (index.html se carga automático)
app.use(express.static(path.join(__dirname, '../public')));

// 5. Rutas de la API (Backend)
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);

// 6. Arrancar Servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor Marista corriendo en http://localhost:${PORT}`);
});