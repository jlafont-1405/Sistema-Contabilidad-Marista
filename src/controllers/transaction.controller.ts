import { Request, Response } from 'express';
import Transaction from '../models/transaction.model';
import Budget from '../models/budget.model';
import fs from 'fs';
import path from 'path';

export class TransactionController {

    // 1. Crear Movimiento (Con Dueño)
    public create = async (req: Request, res: Response) => {
        try {
            console.log("📥 Recibido en Backend:", req.body);
            
            // 🛡️ SEGURIDAD: Obtenemos el ID del usuario del Token
            const userId = (req as any).user.id; 

            const { date, type, amount, description, category } = req.body;

            const transactionData: any = {
                userId, // 👈 ASIGNAMOS EL DUEÑO
                date,
                type,
                amount: Number(amount),
                description,
                category
            };
            
            // Nota: Aquí mantengo tu lógica actual de imágenes (local o cloudinary según configures luego)
            if (req.file && req.file.path) {
                transactionData.imageUrl = req.file.path;
            }

            const newTransaction = new Transaction(transactionData);
            await newTransaction.save();
            
            res.status(201).json(newTransaction); 

        } catch (error: any) {
            console.error("🔴 ERROR CRÍTICO AL GUARDAR:", error);
            res.status(500).json({ message: 'Error al guardar', error: error.message });
        }
    };

    // 2. OBTENER POR MES (Privado por Usuario)
    public getByMonth = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.id; // 👈 IDENTIFICAMOS AL USUARIO
            const { month } = req.query; // "2026-01"

            if (!month || typeof month !== 'string') {
                return res.status(400).json({ message: 'Falta mes (?month=YYYY-MM)' });
            }

            // --- CÁLCULO DE FECHAS UTC EXACTAS ---
            const [yearStr, monthStr] = month.split('-');
            const year = Number(yearStr);
            const monthIndex = Number(monthStr) - 1;

            const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
            const endDate = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

            console.log(`🔎 Buscando para usuario ${userId} entre: ${startDate.toISOString()} y ${endDate.toISOString()}`);

            // B. Buscar Transacciones (SOLO DEL USUARIO)
            const transactions = await Transaction.find({
                userId: userId, // 👈 FILTRO DE SEGURIDAD
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            }).sort({ date: -1 });

            // C. Buscar Presupuesto (SOLO DEL USUARIO)
            // Nota: Debemos asegurarnos de que el Budget Model también tenga userId
            const budgetDoc = await Budget.findOne({ userId: userId, month: month });
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

        // 3. Establecer Presupuesto (Privado)
        public setBudget = async (req: Request, res: Response) => {
            try {
                // 1. Extraer el userId del usuario autenticado.
                const userId = (req as any).user.id;
                const { month, amount } = req.body; 
    
                console.log(`💰 Fijando base para ${month} (User: ${userId}): $${amount}`);
    
                if (!month || amount === undefined) {
                    return res.status(400).json({ message: 'Faltan datos (month, amount)' });
                }
                
                // 2 & 3. Buscar por el filtro compuesto y asegurar que userId se guarda en un nuevo documento.
                // El operador `$setOnInsert` añade los campos solo si se está creando un documento (upsert).
                const budget = await Budget.findOneAndUpdate(
                    { userId: userId, month: month }, 
                    { 
                        $set: { baseIncome: amount },
                        $setOnInsert: { userId: userId, month: month }
                    },
                    { new: true, upsert: true } // 4. Mantener las opciones para devolver el doc nuevo/actualizado y crear si no existe.
                );
    
                res.json(budget);
    
            } catch (error) {
                console.error("Error setting budget:", error);
                res.status(500).json({ message: 'Error guardando presupuesto' });
            }
        };
    // 4. Eliminar (Solo si eres el dueño)
    public delete = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.id; // 👈 SEGURIDAD
            const { id } = req.params;

            // Buscamos documento que coincida en ID y en USUARIO
            const tx = await Transaction.findOne({ _id: id, userId: userId });
            
            if (!tx) return res.status(404).json({ message: 'No encontrado o no autorizado' });

            if (tx.imageUrl) {
                const absolutePath = path.resolve(tx.imageUrl);
                if (fs.existsSync(absolutePath)) {
                    try { fs.unlinkSync(absolutePath); } catch(e) { console.error("Error borrando img", e); }
                }
            }
            
            // Usamos deleteOne con el filtro compuesto
            await Transaction.deleteOne({ _id: id, userId: userId });
            res.json({ message: '✅ Eliminado' });
        } catch (error) {
            res.status(500).json({ message: 'Error eliminando' });
        }
    };

    // 5. Actualizar (Solo si eres el dueño)
    public update = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.id; // 👈 SEGURIDAD
            const { id } = req.params;
            const updateData = req.body;

            if (req.file && req.file.path) {
                updateData.imageUrl = req.file.path;
            }

            // Actualizamos SOLO si coincide ID y UserID
            const updatedTx = await Transaction.findOneAndUpdate(
                { _id: id, userId: userId }, 
                updateData, 
                { new: true }
            );

            if (!updatedTx) return res.status(404).json({ message: 'Transacción no encontrada o no autorizado' });

            res.json(updatedTx);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al actualizar' });
        }
    };
}