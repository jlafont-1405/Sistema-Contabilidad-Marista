import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import Transaction from '../models/transaction.model'; // <--- ¡Aquí está el cambio clave!

export class ReportController {

    public downloadMonthlyReport = async (req: Request, res: Response) => {
        try {
            // 1. Crear el Libro de Excel
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Movimientos del Mes');

            // 2. Definir las Columnas (Agregamos "Tipo")
            worksheet.columns = [
                { header: 'Fecha', key: 'date', width: 15 },
                { header: 'Tipo', key: 'type', width: 10 }, // Nueva columna
                { header: 'Categoría', key: 'category', width: 20 },
                { header: 'Descripción', key: 'description', width: 30 },
                { header: 'Monto ($)', key: 'amount', width: 15 },
                { header: 'Factura (Ref)', key: 'imageUrl', width: 40 }
            ];

            // 3. Obtener los datos (Ordenados por fecha)
            const transactions = await Transaction.find().sort({ date: 1 });

            // 4. Agregar las filas
            transactions.forEach(tx => {
                const row = worksheet.addRow({
                    date: tx.date.toISOString().split('T')[0],
                    type: tx.type.toUpperCase(), // INGRESO o EGRESO
                    category: tx.category,
                    description: tx.description,
                    amount: tx.amount,
                    imageUrl: tx.imageUrl || 'Sin soporte'
                });

                // Pintar de color según el tipo
                if (tx.type === 'ingreso') {
                    row.getCell('type').font = { color: { argb: '008000' }, bold: true }; // Verde
                    row.getCell('amount').font = { color: { argb: '008000' } };
                } else {
                    row.getCell('type').font = { color: { argb: 'FF0000' }, bold: true }; // Rojo
                    row.getCell('amount').font = { color: { argb: 'FF0000' } };
                }
            });

            // 5. Estilo Profesional (Negritas en la cabecera)
            worksheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '000080' } // Fondo Azul
            };
            
            // Calcular Balance Final
            const totalIngresos = transactions
                .filter(t => t.type === 'ingreso')
                .reduce((sum, t) => sum + t.amount, 0);

            const totalEgresos = transactions
                .filter(t => t.type === 'egreso')
                .reduce((sum, t) => sum + t.amount, 0);

            const balance = totalIngresos - totalEgresos;

            worksheet.addRow({}); // Fila vacía
            
            // Fila de Resumen
            const totalRow = worksheet.addRow(['', '', '', 'BALANCE FINAL:', balance]);
            totalRow.font = { bold: true, size: 14 };
            // Color del balance
            totalRow.getCell(5).font = { 
                bold: true, 
                color: { argb: balance >= 0 ? '008000' : 'FF0000' } 
            };

            // 6. Configurar la respuesta HTTP
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                'attachment; filename=' + 'Reporte_Marista.xlsx'
            );

            // 7. Escribir el archivo
            await workbook.xlsx.write(res);
            res.end();

        } catch (error) {
            console.error(error);
            res.status(500).send('Error al generar el reporte Excel');
        }
    };
}