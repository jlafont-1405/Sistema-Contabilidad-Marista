const API_URL = '/api/transactions';
const monthSelector = document.getElementById('monthSelector');

// --- AL INICIO DEL ARCHIVO (Variables globales) ---
let myChart = null; // Variable para guardar la instancia del gráfico

// 1. Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Poner el mes actual en el selector por defecto
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    monthSelector.value = `${yyyy}-${mm}`;
    
    // Poner fecha de hoy en el input date
    const dateInput = document.querySelector('input[name="date"]');
    if(dateInput) dateInput.valueAsDate = today;

    loadData(); // Cargar datos iniciales
});

// Escuchar cambios en el mes
monthSelector.addEventListener('change', loadData);

// 2. Función Maestra: Cargar Datos y Calcular Totales
async function loadData() {
    const [year, month] = monthSelector.value.split('-');
    
    try {
        const res = await fetch(`${API_URL}?year=${year}&month=${month}`);
        const data = await res.json();
        
        // Manejo defensivo por si data devuelve null o undefined
        const transactions = data.transactions || [];
        const baseIncome = data.baseIncome || 0;

        renderTable(transactions);
        calculateTotals(transactions, baseIncome);
        renderChart(transactions);


    } catch (error) {
        console.error("Error cargando datos:", error);
    }
}

// 3. Renderizar Tabla con Colores
function renderTable(transactions) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    transactions.forEach(tx => {
        const date = new Date(tx.date).toLocaleDateString('es-VE', {day: 'numeric', month: 'short'});
        const isIncome = tx.type === 'ingreso';
        const colorClass = isIncome ? 'text-green-600' : 'text-red-600';
        const sign = isIncome ? '+' : '-';
        // Iconos según categoría o tipo
        const icon = tx.category === 'Asignación Provincial' ? '🏛️' : (isIncome ? '💰' : '🧾');

        // CORRECCIÓN IMPORTANTE: Si tx.imageUrl viene de Cloudinary, ya trae 'https://...'. 
        // Quitamos la barra '/' inicial en el href para que no busque en localhost.
        const imageHtml = tx.imageUrl 
            ? `<a href="${tx.imageUrl}" target="_blank" class="text-blue-500 hover:text-blue-700" title="Ver Factura">
                 <i class="ph ph-image text-xl"></i>
               </a>` 
            : '<span class="text-gray-300">-</span>';

        const row = `
            <tr class="border-b hover:bg-gray-50 transition">
                <td class="p-3 text-gray-500">${date}</td>
                <td class="p-3 font-medium">
                    ${tx.description} <br> 
                    <span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded border">${tx.category}</span>
                </td>
                <td class="p-3">
                    <span class="text-xs font-bold ${isIncome ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} px-2 py-1 rounded-full border border-opacity-20">
                        ${tx.type.toUpperCase()}
                    </span>
                </td>
                <td class="p-3 text-right font-bold ${colorClass}">${sign}$${tx.amount.toFixed(2)}</td>
                <td class="p-3 text-center">${imageHtml}</td>
                <td class="p-3 text-center flex justify-center gap-2">
                <button onclick='startEdit(${JSON.stringify(tx)})' class="text-gray-400 hover:text-blue-500 transition p-2 rounded hover:bg-blue-50">
                    <i class="ph ph-pencil-simple text-lg"></i>
                </button>
                
                <button onclick="deleteTx('${tx._id}')" class="text-gray-400 hover:text-red-500 transition p-2 rounded hover:bg-red-50">
                    <i class="ph ph-trash text-lg"></i>
                </button>
</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// 4. Calcular Matemáticas Financieras
function calculateTotals(transactions, baseIncome) {
    let totalIngresos = 0; // Suma de ingresos extra
    let totalEgresos = 0;

    transactions.forEach(tx => {
        if (tx.type === 'ingreso') totalIngresos += tx.amount;
        else totalEgresos += tx.amount;
    });

    // Matemática final: (Base + Ingresos Extra) - Gastos
    const finalBalance = (baseIncome + totalIngresos) - totalEgresos;

    // Actualizar UI
    const baseDisplay = document.getElementById('baseIncomeDisplay');
    if(baseDisplay) baseDisplay.textContent = `$${baseIncome.toFixed(2)}`;

    const totalIncDisplay = document.getElementById('totalIncomeDisplay');
    if(totalIncDisplay) totalIncDisplay.textContent = `$${(baseIncome + totalIngresos).toFixed(2)}`;

    const totalExpDisplay = document.getElementById('totalExpenseDisplay');
    if(totalExpDisplay) totalExpDisplay.textContent = `$${totalEgresos.toFixed(2)}`;
    
    const balanceEl = document.getElementById('finalBalanceDisplay');
    if (balanceEl) {
        balanceEl.textContent = `$${finalBalance.toFixed(2)}`;
        // Quitamos clases previas y añadimos las nuevas según el signo
        balanceEl.className = `text-3xl font-bold ${finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`;
    }
}

// 5. Fijar Monto Base del Mes
async function updateBaseIncome() {
    const amount = prompt("Ingrese el monto base asignado para este mes (Ej: 500):");
    if (!amount || isNaN(amount)) return;

    try {
        const res = await fetch(`${API_URL}/budget`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                monthStr: monthSelector.value, 
                amount: Number(amount) 
            })
        });

        if (res.ok) loadData(); 
    } catch (error) {
        console.error("Error actualizando presupuesto:", error);
    }
}

// 6. Cambios visuales en el formulario
function toggleCategoryColor() {
    const typeInputs = document.querySelectorAll('input[name="type"]');
    // Encontrar cuál está checkeado
    let type = 'egreso';
    typeInputs.forEach(input => {
        if(input.checked) type = input.value;
    });

    const btn = document.getElementById('saveBtn');
    
    if (type === 'ingreso') {
        btn.innerHTML = 'Guardar Ingreso 💰'; // Usamos innerHTML para mantener iconos si los hubiera
        btn.className = 'w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition shadow-md flex justify-center items-center gap-2';
    } else {
        btn.innerHTML = 'Guardar Egreso 💸';
        btn.className = 'w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition shadow-md flex justify-center items-center gap-2';
    }
}

document.getElementById('transactionForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('saveBtn');
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Procesando...';

    const formData = new FormData(e.target);

    try {
        let res;
        
        // --- DECISIÓN CLAVE ---
        if (editingId) {
            // MODO EDICIÓN (PUT)
            // FormData envía multipart, pero nuestro backend espera solo los campos de texto en el PUT.
            // Fetch con FormData funciona bien, el backend con upload.none() lo parseará.
            res = await fetch(`${API_URL}/${editingId}`, { 
                method: 'PUT', 
                body: formData 
            });
        } else {
            // MODO CREACIÓN (POST)
            res = await fetch(API_URL, { method: 'POST', body: formData });
        }
        // ----------------------

        if (res.ok) {
            cancelEdit(); // Esto limpia el formulario y resetea variables
            loadData();   // Recarga la tabla y gráficos
        } else {
            const errorData = await res.json();
            alert(`Error: ${errorData.message}`);
        }

    } catch (error) {
        console.error("Error:", error);
        alert('Error de conexión.');
    } finally {
        btn.disabled = false;
        // Si falló, restauramos el texto correcto según el modo
        if (editingId) btn.innerHTML = 'Actualizar Movimiento 🔄';
        else btn.innerHTML = originalContent;
    }
});

// 8. Borrar
async function deleteTx(id) {
    if(confirm('¿Está seguro de borrar este movimiento permanentemente?')) {
        try {
            const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            if(res.ok) {
                loadData();
            } else {
                alert("No se pudo borrar el elemento");
            }
        } catch (error) {
            console.error("Error borrando:", error);
        }
    }
}

// --- NUEVA FUNCIÓN (Pégala al final del archivo) ---

function renderChart(transactions) {
    const ctx = document.getElementById('expenseChart').getContext('2d');

    // 1. Filtrar solo egresos
    const expenses = transactions.filter(t => t.type === 'egreso');

    // 2. Agrupar por categoría y sumar montos
    // Resultado esperado: { "Alimentación": 500, "Transporte": 200 ... }
    const totalsByCategory = expenses.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
    }, {});

    // 3. Preparar datos para Chart.js
    const labels = Object.keys(totalsByCategory);
    const dataValues = Object.values(totalsByCategory);

    // Si no hay gastos, mostramos un gráfico vacío o limpiamos
    if (labels.length === 0) {
        if (myChart) myChart.destroy();
        return;
    }

    // 4. Configuración de Colores (Paleta profesional)
    const backgroundColors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#C9CBCF', '#2ecc71'
    ];

    // 5. Destruir gráfico anterior si existe (IMPORTANTE para evitar bugs visuales)
    if (myChart) {
        myChart.destroy();
    }

    // 6. Crear el nuevo gráfico
    myChart = new Chart(ctx, {
        type: 'doughnut', // Tipo 'torta' pero con hueco en medio (muy moderno)
        data: {
            labels: labels,
            datasets: [{
                label: 'Gastos por Categoría',
                data: dataValues,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Se adapta al div contenedor
            plugins: {
                legend: {
                    position: 'right', // Leyenda a la derecha
                }
            }
        }
    });
}

// Activar Modo Edición
function startEdit(tx) {
    editingId = tx._id; // Guardamos el ID que estamos editando
    
    // 1. Llenar el formulario con los datos
    const form = document.getElementById('transactionForm');
    form.description.value = tx.description;
    form.amount.value = tx.amount;
    form.category.value = tx.category;
    
    // Fecha: El input date requiere formato YYYY-MM-DD
    const dateObj = new Date(tx.date);
    form.date.value = dateObj.toISOString().split('T')[0];

    // Radios (Ingreso/Egreso)
    if (tx.type === 'ingreso') {
        document.querySelector('input[name="type"][value="ingreso"]').checked = true;
    } else {
        document.querySelector('input[name="type"][value="egreso"]').checked = true;
    }

    // 2. Cambiar UI
    document.getElementById('saveBtn').innerHTML = 'Actualizar Movimiento 🔄';
    document.getElementById('cancelEditBtn').classList.remove('hidden'); // Mostrar botón cancelar
    
    // Scrollear hacia arriba para que vea el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    toggleCategoryColor(); // Para que se ajuste el color del botón
}

// Cancelar Modo Edición
function cancelEdit() {
    editingId = null;
    document.getElementById('transactionForm').reset();
    
    // Restaurar UI
    document.getElementById('saveBtn').innerHTML = 'Guardar Egreso 💸';
    document.getElementById('cancelEditBtn').classList.add('hidden');
    
    // Restaurar fecha hoy
    document.querySelector('input[name="date"]').valueAsDate = new Date();
    
    toggleCategoryColor();
}