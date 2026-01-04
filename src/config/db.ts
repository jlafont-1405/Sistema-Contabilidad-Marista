import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        // Obtenemos la URL de las variables de entorno (Seguridad básica)
        const dbUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/marist-manager';

        await mongoose.connect(dbUri);

        console.log('✅ MongoDB Conectado Exitosamente');
        
    } catch (error) {
        console.error('❌ Error de conexión a MongoDB:', error);
        process.exit(1); // Detiene la app si no hay base de datos (Fail Fast)
    }
};