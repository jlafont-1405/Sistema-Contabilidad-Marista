import { Request, Response } from 'express';
import Transaction from '../models/transaction.model';
import Budget from '../models/budget.model';
import fs from 'fs';
import path from 'path';

export class TransactionController {

// Crear Movimiento (Ingreso o Egreso)
    public create = async (req: Request, res: Response) => {
        try {
            console.log("📥 Recibido en Backend:", req.body);
            console.log("📸 Archivo recibido:", req.file); // Ver si llega archivo

            const { date, type, amount, description, category } = req.body;

            // 1. Preparar el objeto básico (Convertimos monto a Número)
            const transactionData: any = {
                date,
                type,
                amount: Number(amount), // <--- FORZAMOS A NÚMERO
                description,
                category
            };

            // 2. Solo agregamos la imagen si realmente existe (evita errores de undefined)
            if (req.file && req.file.path) {
                transactionData.imageUrl = req.file.path;
            }

            // 3. Crear y Guardar
            const newTransaction = new Transaction(transactionData);
            await newTransaction.save();
            
            console.log("✅ Guardado en BD con éxito");
            res.status(201).json({ message: '✅ Movimiento guardado' });

        } catch (error: any) {
            console.error("🔴 ERROR CRÍTICO AL GUARDAR:", error); // Mírame si falla
            res.status(500).json({ message: 'Error al guardar', error: error.message });
        }
    };

    // Obtener Movimientos FILTRADOS por MES
    public getByMonth = async (req: Request, res: Response) => {
        try {
            const { year, month } = req.query; // Recibimos ?year=2024&month=2

            if (!year || !month) {
                return res.status(400).json({ message: 'Falta año o mes' });
            }

            // Crear rango de fechas: Desde el día 1 hasta el último del mes
            const startDate = new Date(Number(year), Number(month) - 1, 1);
            const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);

            // Buscar transacciones en ese rango
            const transactions = await Transaction.find({
                date: { $gte: startDate, $lte: endDate }
            }).sort({ date: -1 });

            // Buscar el Presupuesto Base de ese mes (formato YYYY-MM)
            // Agregamos '0' al mes si es menor a 10 (ej: 2024-02)
            const monthStr = `${year}-${String(month).padStart(2, '0')}`;
            const budget = await Budget.findOne({ month: monthStr });

            res.json({
                transactions,
                baseIncome: budget ? budget.baseIncome : 0 // Si no existe, es 0
            });

        } catch (error: any) {
            res.status(500).json({ message: 'Error obteniendo datos' });
        }
    };

    // Establecer Presupuesto Mensual
    public setBudget = async (req: Request, res: Response) => {
        try {
            const { monthStr, amount } = req.body; // { monthStr: "2024-02", amount: 500 }
            
            // upsert: true -> Si existe actualiza, si no existe lo crea
            const budget = await Budget.findOneAndUpdate(
                { month: monthStr },
                { baseIncome: amount },
                { new: true, upsert: true }
            );
            res.json(budget);
        } catch (error) {
            res.status(500).json({ message: 'Error guardando presupuesto' });
        }
    };

    // Eliminar (Igual que antes)
    public delete = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const tx = await Transaction.findById(id);
            if (!tx) return res.status(404).json({ message: 'No encontrado' });

            if (tx.imageUrl) {
                const absolutePath = path.resolve(tx.imageUrl);
                if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
            }
            await Transaction.findByIdAndDelete(id);
            res.json({ message: '✅ Eliminado' });
        } catch (error) {
            res.status(500).json({ message: 'Error eliminando' });
        }
    };
    public update = async (req: any, res: any) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // { new: true } devuelve el objeto actualizado
            const updatedTx = await Transaction.findByIdAndUpdate(id, updateData, { new: true });

            if (!updatedTx) {
                return res.status(404).json({ message: 'Transacción no encontrada' });
            }

            res.json(updatedTx);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al actualizar la transacción' });
        }
};
}