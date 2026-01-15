import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import Transaction from '../models/transaction.model';
import Budget from '../models/budget.model';
import User from '../models/user.model'; // ✨ 1. Importamos el modelo User

interface AuthRequest extends Request {
    user?: { id: string; role: string; username: string; };
}

export class ReportController {

    public downloadExcel = async (req: AuthRequest, res: Response) => {
        try {
            if (!req.user || !req.user.id) return res.status(401).send("Acceso denegado.");

            // ✨ 2. OBTENER DATOS DEL USUARIO
            // Buscamos el usuario para saber su nombre real
            const userDoc = await User.findById(req.user.id);
            // Si tiene nombre lo usamos, si no, usamos el username del token, o "Usuario"
            const personalName = userDoc ? ((userDoc as any).name || req.user.username) : 'Usuario';
            const cleanName = personalName.replace(/[^a-zA-Z0-9 ]/g, ""); // Nombre limpio para archivo

            // --- Obtener Transacciones ---
            const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: 1 });

            const workbook = new ExcelJS.Workbook();
            
            // ✨ 3. CAMBIAR METADATA DEL ARCHIVO
            // En lugar de 'Sistema Marista', ahora dice el nombre del dueño
            workbook.creator = personalName; 
            workbook.lastModifiedBy = 'Gestión Marista App';
            workbook.created = new Date();

            if (transactions.length === 0) {
                const ws = workbook.addWorksheet('Resumen');
                ws.addRow([`Hola ${personalName}, aún no tienes movimientos registrados.`]);
            } else {
                const groupedData: { [key: string]: typeof transactions } = {};
                
                transactions.forEach(tx => {
                    const date = new Date(tx.date);
                    const monthName = date.toLocaleString('es-VE', { month: 'long', timeZone: 'UTC' });
                    const year = date.getUTCFullYear();
                    const sheetName = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
                    
                    if (!groupedData[sheetName]) groupedData[sheetName] = [];
                    groupedData[sheetName].push(tx);
                });

                for (const [sheetName, monthTxs] of Object.entries(groupedData)) {
                    if (!monthTxs || monthTxs.length === 0) continue;

                    const worksheet = workbook.addWorksheet(sheetName);

                    // --- Configurar Columnas (Esto crea la fila de encabezados automáticamente) ---
                    worksheet.columns = [
                        { header: 'Fecha', key: 'date', width: 12 },
                        { header: 'Tipo', key: 'type', width: 10 },
                        { header: 'Categoría', key: 'category', width: 25 }, // Un poco más ancha
                        { header: 'Descripción', key: 'description', width: 35 },
                        { header: 'Monto', key: 'amount', width: 15 },
                        { header: 'Soporte', key: 'link', width: 15 },
                    ];

                    // ✨ 4. INSERTAR TÍTULO PERSONALIZADO AL INICIO
                    // Insertamos una fila NUEVA al principio (Fila 1), empujando todo hacia abajo
                    worksheet.insertRow(1, [`REPORTE DE: ${personalName.toUpperCase()}`]);
                    
                    // Fusionamos las celdas de la A1 a la F1 para que sea un título centrado
                    worksheet.mergeCells('A1:F1');
                    
                    // Estilo del Título Personalizado
                    const titleRow = worksheet.getRow(1);
                    titleRow.height = 30; // Más alto
                    titleRow.getCell(1).font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };
                    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } }; // Azul oscuro
                    titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

                    // --- Estilo de los Encabezados de Tabla (Ahora están en la Fila 2) ---
                    const headerRow = worksheet.getRow(2);
                    headerRow.font = { bold: true, color: { argb: '000000' } };
                    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } }; // Gris claro
                    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };


                    // --- LÓGICA DE DATOS (Igual que antes) ---
                    const firstTx = monthTxs[0]; 
                    if (!firstTx) continue; 
                    const firstDate = new Date(firstTx.date); 
                    const y = firstDate.getUTCFullYear();
                    const m = String(firstDate.getUTCMonth() + 1).padStart(2, '0');
                    const monthStr = `${y}-${m}`;

                    const budgetDoc = await Budget.findOne({ userId: req.user.id, month: monthStr });
                    let baseAmount = 0;
                    if (budgetDoc) {
                        const valAmount = Number((budgetDoc as any).amount);
                        const valBase = Number((budgetDoc as any).baseIncome);
                        if (!isNaN(valAmount)) baseAmount = valAmount;
                        else if (!isNaN(valBase)) baseAmount = valBase;
                    }

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
                        row.getCell('date').numFmt = 'dd/mm/yyyy';

                        if (tx.imageUrl) {
                            const cell = row.getCell('link');
                            cell.value = { text: 'Ver Foto 📷', hyperlink: tx.imageUrl };
                            cell.font = { color: { argb: '2563EB' }, underline: true };
                        }
                    });

                    worksheet.addRow([]);

                    // --- RESUMEN ---
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
            // ✨ 5. NOMBRE DEL ARCHIVO PERSONALIZADO
            // Ahora el archivo se llamará "Reporte_JeanClaude.xlsx"
            res.setHeader('Content-Disposition', `attachment; filename=Reporte_${cleanName}.xlsx`);

            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            
            await workbook.xlsx.write(res);
            res.end();

        } catch (error) {
            console.error("Error Excel:", error);
            res.status(500).send('Error generando el reporte.');
        }
    }
}