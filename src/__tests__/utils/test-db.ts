import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

// Conectar a la DB en memoria antes de todas las pruebas
export const connectTestDB = async () => {
    // Si ya hay una conexión, la cerramos primero
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
};

// Limpiar datos después de cada prueba individual
export const clearTestDB = async () => {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
        const collection = collections[key];
        
        // CORRECCIÓN QA: Verificamos que 'collection' exista antes de usarla
        if (collection) {
            await collection.deleteMany({});
        }
    }
};

// Desconectar y cerrar el servidor después de todas las pruebas
export const closeTestDB = async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
};