import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import Transaction from '../models/transaction.model';

export class ReportController {

    public downloadExcel = async (req: Request, res: Response) => {
        try {
            // 1. Obtener TODAS las transacciones ordenadas por fecha
            const transactions = await Transaction.find().sort({ date: 1 });

            if (transactions.length === 0) {
                return res.status(404).send("No hay movimientos para exportar.");
            }

            // 2. Crear el libro
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Sistema Marista';
            workbook.created = new Date();

            // 3. Agrupar transacciones por "Mes Año" (Ej: "Enero 2026")
            const groupedData: { [key: string]: typeof transactions } = {};

            transactions.forEach(tx => {
                // Truco para obtener el nombre del mes en español y Capitalizado
                const date = new Date(tx.date);
                const monthName = date.toLocaleString('es-VE', { month: 'long' });
                const year = date.getFullYear();
                const sheetName = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

                if (!groupedData[sheetName]) {
                    groupedData[sheetName] = [];
                }
                groupedData[sheetName].push(tx);
            });

            // 4. Generar una Hoja por cada Grupo (Mes)
            for (const [sheetName, monthTxs] of Object.entries(groupedData)) {
                
                // Crear la hoja (Tab)
                const worksheet = workbook.addWorksheet(sheetName);

                // Definir Columnas
                worksheet.columns = [
                    { header: 'Fecha', key: 'date', width: 12 },
                    { header: 'Tipo', key: 'type', width: 10 },
                    { header: 'Categoría', key: 'category', width: 20 },
                    { header: 'Descripción', key: 'description', width: 35 },
                    { header: 'Monto', key: 'amount', width: 15 }, // Sin símbolo $ aquí para formato numérico
                    { header: 'Soporte', key: 'link', width: 12 }, // Link a la foto
                ];

                // Estilo del Encabezado
                const headerRow = worksheet.getRow(1);
                headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
                headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '003366' } }; // Azul oscuro institucional
                headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
                
                // Agregar Filtros automáticos a los encabezados
                worksheet.autoFilter = {
                    from: 'A1',
                    to: { row: 1, column: 6 }
                };

                // Llenar datos del mes
                let totalIngresos = 0;
                let totalEgresos = 0;

                monthTxs.forEach(tx => {
                    // Sumar para balances
                    if (tx.type === 'ingreso') totalIngresos += tx.amount;
                    else totalEgresos += tx.amount;

                    const row = worksheet.addRow({
                        date: new Date(tx.date), // Pasamos objeto Date para formato Excel
                        type: tx.type.toUpperCase(),
                        category: tx.category,
                        description: tx.description,
                        amount: tx.amount,
                        link: tx.imageUrl ? 'Ver Soporte 🔗' : '-'
                    });

                    // FORMATO DE CELDAS

                    // 1. Fecha
                    row.getCell('date').numFmt = 'dd/mm/yyyy';
                    row.getCell('date').alignment = { horizontal: 'center' };

                    // 2. Colores de Ingreso/Egreso
                    const color = tx.type === 'ingreso' ? '008000' : 'FF0000'; // Verde : Rojo
                    row.getCell('type').font = { color: { argb: color }, bold: true };
                    row.getCell('type').alignment = { horizontal: 'center' };
                    row.getCell('amount').font = { color: { argb: color } };

                    // 3. Formato Moneda (Contabilidad)
                    row.getCell('amount').numFmt = '"$"#,##0.00;[Red]"\$"#,##0.00';

                    // 4. Hipervínculo a la imagen (Si existe)
                    if (tx.imageUrl) {
                        const cell = row.getCell('link');
                        cell.value = { text: 'Ver Foto 📷', hyperlink: tx.imageUrl };
                        cell.font = { color: { argb: '0000FF' }, underline: true };
                    }
                });

                // --- AGREGAR BALANCE FINAL DEL MES AL PIE DE PÁGINA ---
                worksheet.addRow([]); // Espacio vacío
                
                const balance = totalIngresos - totalEgresos;
                const lastRowIdx = worksheet.rowCount + 1;
                
                // Fila de Totales
                const balanceRow = worksheet.getRow(lastRowIdx);
                balanceRow.getCell(4).value = 'BALANCE DEL MES:';
                balanceRow.getCell(4).font = { bold: true };
                balanceRow.getCell(4).alignment = { horizontal: 'right' };

                const balanceCell = balanceRow.getCell(5);
                balanceCell.value = balance;
                balanceCell.numFmt = '"$"#,##0.00';
                balanceCell.font = { 
                    bold: true, 
                    size: 12, 
                    color: { argb: balance >= 0 ? '008000' : 'FF0000' } 
                };
                
                // Agregar un pequeño cuadro resumen abajo
                worksheet.addRow([]);
                worksheet.addRow(['', '', '', 'Total Ingresos:', totalIngresos]);
                worksheet.addRow(['', '', '', 'Total Egresos:', totalEgresos]);
            }

            // 5. Enviar respuesta
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=Contabilidad_Marista_Completa.xlsx');

            await workbook.xlsx.write(res);
            res.end();

        } catch (error) {
            console.error(error);
            res.status(500).send('Error generando Excel');
        }
    }
}