import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    username: string;
    password: string;
    role: 'admin' | 'guest';
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'guest'], default: 'guest' }
});

// 🔒 Middleware de Mongoose: Antes de guardar, encriptar la contraseña
// Quitamos el parámetro 'next' y el genérico <IUser> en .pre, 
// y tipamos explícitamente 'this: IUser' en la función.
UserSchema.pre('save', async function (this: IUser) {
    // 1. Si la contraseña no se modificó, no hacemos nada (termina la función)
    if (!this.isModified('password')) return;

    // 2. Generar el hash
    // No hace falta try/catch aquí; si falla, la promesa se rechaza sola y Mongoose captura el error.
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// 🔑 Método para verificar contraseña (lo usaremos en el Login)
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);