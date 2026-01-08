import dotenv from 'dotenv';
import app from './app'; // Importamos la app configurada
import { connectDB } from './config/db';

dotenv.config();

const PORT = process.env.PORT || 3000;

// Encendemos la DB y luego el Servidor
const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`🚀 Servidor Marista corriendo en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
    }
};

startServer();