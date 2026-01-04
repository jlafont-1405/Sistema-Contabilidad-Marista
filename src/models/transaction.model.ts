import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
    date: Date;
    type: 'ingreso' | 'egreso'; // <--- NUEVO CAMPO CRÍTICO
    amount: number;
    description: string;
    category: string;
    imageUrl?: string;
    createdAt: Date;
}

const TransactionSchema: Schema = new Schema({
    date: { type: Date, required: true, default: Date.now },
    type: { 
        type: String, 
        required: true, 
        enum: ['ingreso', 'egreso'], // Solo permite estas dos opciones
        default: 'egreso'
    },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    imageUrl: { type: String, required: false }
}, {
    timestamps: true,
    versionKey: false
});

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);