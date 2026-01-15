import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import Transaction from '../models/transaction.model';
import Budget from '../models/budget.model';

interface AuthRequest extends Request {
    user?: { id: string; role: string; username: string; };
}

export class ReportController {

    public downloadExcel = async (req: AuthRequest, res: Response) => {
        try {
            if (!req.user || !req.user.id) return res.status(401).send("Acceso denegado.");

            // Ordenamos por fecha
            const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: 1 });

            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Sistema Marista';
            workbook.created = new Date();

            if (transactions.length === 0) {
                const ws = workbook.addWorksheet('Sin Movimientos');
                ws.addRow(['No tienes movimientos registrados.']);
            } else {
                const groupedData: { [key: string]: typeof transactions } = {};
                
                transactions.forEach(tx => {
                    const date = new Date(tx.date);
                    // Usamos UTC para agrupar también, evitando errores de borde de mes
                    const monthName = date.toLocaleString('es-VE', { month: 'long', timeZone: 'UTC' });
                    const year = date.getUTCFullYear();
                    const sheetName = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
                    
                    if (!groupedData[sheetName]) groupedData[sheetName] = [];
                    groupedData[sheetName].push(tx);
                });

                for (const [sheetName, monthTxs] of Object.entries(groupedData)) {
                    if (!monthTxs || monthTxs.length === 0) continue;

                    const worksheet = workbook.addWorksheet(sheetName);

                    // ✅ FIX 1: CALCULO DE FECHA EN UTC
                    // Evita que el 1 de Enero se convierta en 31 de Diciembre por la zona horaria
                    const firstTx = monthTxs[0]; 

                    // Si por algún milagro cósmico no existe, saltamos al siguiente
                    if (!firstTx) continue; 

                    // Ahora usamos 'firstTx' que TypeScript sabe que es seguro 100%
                    const firstDate = new Date(firstTx.date); 
                    
                    const y = firstDate.getUTCFullYear();
                    const m = String(firstDate.getUTCMonth() + 1).padStart(2, '0');
                    const monthStr = `${y}-${m}`;

                    // Buscar Budget
                    const budgetDoc = await Budget.findOne({ userId: req.user.id, month: monthStr });
                    
                    // ✅ FIX 2: BÚSQUEDA HÍBRIDA (amount O baseIncome)
                    // Si 'amount' no existe (porque se guardó como baseIncome), lo busca en el otro campo.
                    let baseAmount = 0;
                    if (budgetDoc) {
                        const valAmount = Number((budgetDoc as any).amount);
                        const valBase = Number((budgetDoc as any).baseIncome);
                        
                        // Toma el que sea un número válido y mayor que 0, o 0 si fallan ambos
                        if (!isNaN(valAmount)) baseAmount = valAmount;
                        else if (!isNaN(valBase)) baseAmount = valBase;
                    }

                    // --- El resto es igual (Visual) ---
                    worksheet.columns = [
                        { header: 'Fecha', key: 'date', width: 12 },
                        { header: 'Tipo', key: 'type', width: 10 },
                        { header: 'Categoría', key: 'category', width: 20 },
                        { header: 'Descripción', key: 'description', width: 35 },
                        { header: 'Monto', key: 'amount', width: 15 },
                        { header: 'Soporte', key: 'link', width: 15 },
                    ];

                    const headerRow = worksheet.getRow(1);
                    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
                    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
                    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

                    let totalIngresos = 0;
                    let totalEgresos = 0;

                    monthTxs.forEach(tx => {
                        const monto = Number((tx as any).amount) || 0; 
                        
                        if (tx.type === 'ingreso') totalIngresos += monto;
                        else totalEgresos += monto;

                        const row = worksheet.addRow({
                            date: new Date(tx.date),
                            type: tx.type === 'ingreso' ? 'INGRESO' : 'EGRESO',
                            category: (tx.category || 'General').toUpperCase(),
                            description: tx.description,
                            amount: monto,
                            link: tx.imageUrl ? 'Ver Foto 📷' : '-'
                        });

                        const color = tx.type === 'ingreso' ? '16A34A' : 'DC2626';
                        row.getCell('type').font = { color: { argb: color }, bold: true };
                        row.getCell('amount').font = { color: { argb: color }, bold: true };
                        row.getCell('amount').numFmt = '"$"#,##0.00';
                        row.getCell('date').numFmt = 'dd/mm/yyyy'; // Excel formateará esto visualmente

                        if (tx.imageUrl) {
                            const cell = row.getCell('link');
                            cell.value = { text: 'Ver Foto 📷', hyperlink: tx.imageUrl };
                            cell.font = { color: { argb: '2563EB' }, underline: true };
                        }
                    });

                    worksheet.addRow([]);

                    // Resumen
                    const rowBase = worksheet.addRow(['', '', '', 'BASE INICIAL:', baseAmount]);
                    rowBase.getCell(4).font = { bold: true };
                    rowBase.getCell(5).numFmt = '"$"#,##0.00';
                    rowBase.getCell(5).font = { color: { argb: '2563EB' }, bold: true };

                    const rowIng = worksheet.addRow(['', '', '', 'Total Ingresos (+):', totalIngresos]);
                    rowIng.getCell(5).numFmt = '"$"#,##0.00';
                    rowIng.getCell(5).font = { color: { argb: '16A34A' } };

                    const rowEgr = worksheet.addRow(['', '', '', 'Total Egresos (-):', totalEgresos]);
                    rowEgr.getCell(5).numFmt = '"$"#,##0.00';
                    rowEgr.getCell(5).font = { color: { argb: 'DC2626' } };

                    worksheet.addRow([]);

                    const balance = (baseAmount + totalIngresos) - totalEgresos;
                    const lastRow = worksheet.addRow(['', '', '', 'CAJA FINAL:', balance]);
                    
                    const cellBalance = lastRow.getCell(5);
                    cellBalance.font = { size: 14, bold: true, color: { argb: balance >= 0 ? '1E3A8A' : 'DC2626' } };
                    cellBalance.numFmt = '"$"#,##0.00';
                    
                    lastRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9C4' } };
                    lastRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9C4' } };
                    lastRow.getCell(4).font = { bold: true, size: 12 };
                    lastRow.getCell(4).alignment = { horizontal: 'right' };
                }
            }

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=Reporte_Marista.xlsx');
            await workbook.xlsx.write(res);
            res.end();

        } catch (error) {
            console.error("Error Excel:", error);
            res.status(500).send('Error generando el reporte.');
        }
    }
}