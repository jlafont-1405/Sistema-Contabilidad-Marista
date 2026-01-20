import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    username: string;
    email: string; // 👈 AGREGADO: Vital para registro y futuro contacto
    password: string;
    role: 'guest' | 'admin';
    lastLogin: Date;
    photoUrl: string;
    isActive: boolean; // Útil para que solo tú veas paneles avanzados
    resetPasswordToken?: string; // 👈 Opcional
    resetPasswordExpire?: Date;  // 👈 Opcional
    name?: string; // 👈 AGREGAR ESTO
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
        enum: ['guest', 'admin'], 
        default: 'guest' 
    },
    lastLogin: { 
        type: Date, 
        default: null 
    },
    photoUrl: {
        type: String,
        default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' // Foto por defecto
    },
    isActive: {
        type: Boolean,
        default: true
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