import mongoose, { Schema, Document } from 'mongoose';

export interface IBudget extends Document {
    userId: string;
    month: string;
    baseIncome: number;
    amount:number;
}

const BudgetSchema: Schema = new Schema({
    userId: { type: String, required: true, index: true }, 
    month: { 
        type: String, 
        required: true 
        // ❌ QUITAMOS 'unique: true' DE AQUÍ
    },
    baseIncome: { 
        type: Number, 
        required: true, 
        default: 0 
    }
}, {
    versionKey: false
});

// ✅ LA SOLUCIÓN MÁGICA: Índice Compuesto
// Esto significa: La combinación de (Usuario + Mes) debe ser única.
BudgetSchema.index({ userId: 1, month: 1 }, { unique: true });

export default mongoose.model<IBudget>('Budget', BudgetSchema);