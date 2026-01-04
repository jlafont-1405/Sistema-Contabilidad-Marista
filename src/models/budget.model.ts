import mongoose, { Schema, Document } from 'mongoose';

export interface IBudget extends Document {
    month: string; // Formato "YYYY-MM" (Ej: 2024-02)
    baseIncome: number; // El dinero fijo que le dan al tío
}

const BudgetSchema: Schema = new Schema({
    month: { 
        type: String, 
        required: true, 
        unique: true // Solo un presupuesto por mes
    },
    baseIncome: { 
        type: Number, 
        required: true, 
        default: 0 
    }
}, {
    versionKey: false
});

export default mongoose.model<IBudget>('Budget', BudgetSchema);