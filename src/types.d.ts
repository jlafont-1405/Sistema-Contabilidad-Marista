import { Express } from 'express';

declare global {
  namespace Express {
    interface Request {
      // Aquí le decimos: "Oye, las requests pueden tener un campo 'user' opcional"
      user?: {
        id: string;
        role: string;
        username: string;
        [key: string]: any;
      };
    }
  }
}

declare module 'multer-storage-cloudinary';
declare module 'cloudinary';


