import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    username: string;
    email: string; // 👈 AGREGADO: Vital para registro y futuro contacto
    password: string;
    role: 'admin' | 'guest'; // Útil para que solo tú veas paneles avanzados
    resetPasswordToken?: string; // 👈 Opcional
    resetPasswordExpire?: Date;  // 👈 Opcional
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
    username: { 
        type: String, 
        required: true, 
        trim: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, // 👈 IMPORTANTE: No puede haber 2 cuentas con el mismo correo
        lowercase: true, 
        trim: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        enum: ['admin', 'guest'], 
        default: 'guest' 
    },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date }
}, {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
    versionKey: false
});

// 🔒 Middleware: Encriptar contraseña
UserSchema.pre('save', async function (this: IUser) {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// 🔑 Comparar contraseña
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);