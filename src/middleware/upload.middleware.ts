import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

// 1. Cargar variables de entorno
dotenv.config();

// 2. Configurar Cloudinary con tus llaves
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 3. Configurar el Almacenamiento EN LA NUBE
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (_req: any, file: any) => { // <--- CAMBIO AQUÍ: _req y tipos 'any'
        return {
            folder: 'marist-manager',
            format: 'jpg',
            public_id: file.fieldname + '-' + Date.now()
        };
    },
});

// 4. Filtro simple (Ya no necesitamos 'path')
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Verificamos si el tipo de archivo empieza con "image/"
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Error: Solo se permiten imágenes'));
    }
};

// 5. Exportar configuración
export const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // Límite de 10MB
});