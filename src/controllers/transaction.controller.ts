import { Request, Response } from 'express';
import Transaction from '../models/transaction.model';
import Budget from '../models/budget.model'; // Asegúrate de que este modelo exista
import fs from 'fs';
import path from 'path';

export class TransactionController {

    // 1. Crear Movimiento
    public create = async (req: Request, res: Response) => {
        try {
            console.log("📥 Recibido en Backend:", req.body);
            
            const { date, type, amount, description, category } = req.body;

            const transactionData: any = {
                date,
                type,
                amount: Number(amount),
                description,
                category
            };

            if (req.file && req.file.path) {
                transactionData.imageUrl = req.file.path;
            }

            const newTransaction = new Transaction(transactionData);
            await newTransaction.save();
            
            // 👇 Agregué esto: Devolver el objeto creado ayuda a confirmar
            res.status(201).json(newTransaction); 

        } catch (error: any) {
            console.error("🔴 ERROR CRÍTICO AL GUARDAR:", error);
            res.status(500).json({ message: 'Error al guardar', error: error.message });
        }
    };

    /// 2. OBTENER POR MES (Versión Blindada UTC)
public getByMonth = async (req: Request, res: Response) => {
    try {
        const { month } = req.query; // "2026-01"

        if (!month || typeof month !== 'string') {
            return res.status(400).json({ message: 'Falta mes (?month=YYYY-MM)' });
        }

        // --- CÁLCULO DE FECHAS UTC EXACTAS ---
        // Separamos el string "2026-01" manualmente
        const [yearStr, monthStr] = month.split('-');
        const year = Number(yearStr);
        const monthIndex = Number(monthStr) - 1; // Enero es 0 en JS

        // Creamos fecha inicio: Día 1 a las 00:00:00.000 UTC exacto
        const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
        
        // Creamos fecha fin: Día 0 del siguiente mes (último día del actual) a las 23:59:59.999 UTC
        const endDate = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

        console.log(`🔎 Buscando entre: ${startDate.toISOString()} y ${endDate.toISOString()}`);

        // -------------------------------------

        // B. Buscar Transacciones
        const transactions = await Transaction.find({
            date: {
                $gte: startDate,
                $lte: endDate
            }
        }).sort({ date: -1 }); // Ordenar: más recientes primero

        // C. Buscar Presupuesto
        const budgetDoc = await Budget.findOne({ month: month });
        const baseIncome = budgetDoc ? budgetDoc.baseIncome : 0;

        // D. Responder
        res.json({
            transactions: transactions,
            budget: baseIncome
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener datos' });
    }
}

    // 3. Establecer Presupuesto (Aquí estaba el error de nombre)
    public setBudget = async (req: Request, res: Response) => {
        try {
            // ❌ ANTES: const { monthStr, amount } = req.body;
            // ✅ AHORA: Usamos 'month' porque así lo manda el JS del frontend
            const { month, amount } = req.body; 
            
            console.log(`💰 Fijando base para ${month}: $${amount}`);

            if (!month || amount === undefined) {
                 return res.status(400).json({ message: 'Faltan datos (month, amount)' });
            }

            // Guardar o Actualizar
            const budget = await Budget.findOneAndUpdate(
                { month: month },          // Busca por "2026-01"
                { baseIncome: amount },    // Actualiza el monto
                { new: true, upsert: true } // Crea si no existe
            );

            res.json(budget);

        } catch (error) {
            console.error("Error setting budget:", error);
            res.status(500).json({ message: 'Error guardando presupuesto' });
        }
    };

    // 4. Eliminar
    public delete = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const tx = await Transaction.findById(id);
            if (!tx) return res.status(404).json({ message: 'No encontrado' });

            if (tx.imageUrl) {
                const absolutePath = path.resolve(tx.imageUrl);
                if (fs.existsSync(absolutePath)) {
                    try { fs.unlinkSync(absolutePath); } catch(e) { console.error("Error borrando img", e); }
                }
            }
            await Transaction.findByIdAndDelete(id);
            res.json({ message: '✅ Eliminado' });
        } catch (error) {
            res.status(500).json({ message: 'Error eliminando' });
        }
    };

    // 5. Actualizar
    public update = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Si subieron imagen nueva en el update
            if (req.file && req.file.path) {
                updateData.imageUrl = req.file.path;
            }

            const updatedTx = await Transaction.findByIdAndUpdate(id, updateData, { new: true });
            if (!updatedTx) return res.status(404).json({ message: 'Transacción no encontrada' });

            res.json(updatedTx);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al actualizar' });
        }
    };
}