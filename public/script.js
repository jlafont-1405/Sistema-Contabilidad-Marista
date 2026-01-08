// --- CONFIGURACIÓN ---
const API_URL = 'http://localhost:3000/api/transactions';
let myChart = null;
let editingId = null;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Aplicación iniciada");
    
    // 1. Verificar Auth
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn("🔒 No hay token, redirigiendo...");
        window.location.href = '/login.html';
        return;
    }

    // 2. Configurar Fechas (Zona Horaria Local)
    const dateInput = document.querySelector('input[name="date"]');
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    if(dateInput) dateInput.value = now.toISOString().slice(0,10);

    const monthSelector = document.getElementById('monthSelector');
    if(monthSelector) {
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        monthSelector.value = `${yyyy}-${mm}`;
        monthSelector.addEventListener('change', loadData);
    }

    // 3. LISTENERS ESTRATÉGICOS (Aquí arreglamos la "desconexión")
    
    // A. Botón Fijar Base
    const btnFijarBase = document.getElementById('btnFijarBase');
    if(btnFijarBase) btnFijarBase.addEventListener('click', updateBaseIncome);

    // B. Logout
    const btnLogout = document.getElementById('btnLogout');
    if(btnLogout) btnLogout.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/login.html';
    });

    // C. Cancelar Edición
    const btnCancel = document.getElementById('cancelEditBtn');
    if(btnCancel) btnCancel.addEventListener('click', cancelEdit);

    // D. Cambio de Tipo (Ingreso/Egreso)
    document.querySelectorAll('input[name="type"]').forEach(input => {
        input.addEventListener('change', toggleCategoryColor);
    });

    // E. Submit del Formulario
    const form = document.getElementById('transactionForm');
    if(form) form.addEventListener('submit', handleFormSubmit);

    // F. DELEGACIÓN DE EVENTOS PARA LA TABLA (Vital para botones dinámicos)
    const tbody = document.getElementById('transactionTableBody');
    if(tbody) {
        tbody.addEventListener('click', (e) => {
            // Buscar si el click fue dentro de un botón de acción
            const btnEdit = e.target.closest('.btn-edit');
            const btnDelete = e.target.closest('.btn-delete');

            if (btnEdit) {
                const id = btnEdit.dataset.id;
                fetchTransactionForEdit(id);
            }
            if (btnDelete) {
                const id = btnDelete.dataset.id;
                deleteTx(id);
            }
        });
    }

    // Carga inicial
    loadData();
});

// --- HELPER AUTH ---
function getAuthHeaders() {
    return { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
}

// --- LÓGICA DE DATOS ---
async function loadData() {
    console.log("🔄 Cargando datos...");
    const month = document.getElementById('monthSelector').value;
    
    try {
        const res = await fetch(`${API_URL}?month=${month}`, { headers: getAuthHeaders() });
        
        if (res.status === 401) {
            localStorage.clear();
            window.location.href = '/login.html';
            return;
        }

        const data = await res.json();
        
        // 1. Extraemos las transacciones
        const transactions = Array.isArray(data) ? data : (data.transactions || []);
        
        // 2. Extraemos el presupuesto (Base) que viene del backend 👈 ¡ESTO FALTABA!
        // Si no viene nada, asumimos 0
        const baseAmount = data.budget || 0;

        console.log(`📦 Datos: ${transactions.length} transacciones. Base: ${baseAmount}`);
        
        renderTable(transactions);
        
        // 3. Pasamos AMBOS datos a la función de resumen 👈
        updateSummary(transactions, baseAmount); 
        
        renderChart(transactions);

    } catch (error) {
        console.error("❌ Error cargando datos:", error);
    }
}

// --- RENDERIZADO ---
function renderTable(transactions) {
    const tbody = document.getElementById('transactionTableBody');
    tbody.innerHTML = '';

    transactions.forEach(tx => {
        const date = new Date(tx.date).toLocaleDateString('es-VE', {day: 'numeric', month: 'short'});
        const isIncome = tx.type === 'ingreso';
        const colorClass = isIncome ? 'text-green-600' : 'text-red-600';
        const sign = isIncome ? '+' : '-';
        
        const typeBadge = isIncome 
            ? `<span class="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold border border-green-200">INGRESO</span>`
            : `<span class="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-bold border border-red-200">EGRESO</span>`;

        const imageHtml = tx.imageUrl 
            ? `<a href="${tx.imageUrl}" target="_blank" class="text-blue-500 hover:text-blue-700 block text-center">📷</a>` 
            : '<span class="text-gray-300 block text-center">-</span>';

        const row = document.createElement('tr');
        row.className = "border-b hover:bg-gray-50 transition";
        row.innerHTML = `
            <td class="p-3 text-gray-500 font-medium">${date}</td>
            <td class="p-3">
                <div class="font-bold text-gray-700">${tx.description}</div>
                <div class="text-xs text-gray-400 mt-1 uppercase tracking-wide">${tx.category || 'General'}</div>
            </td>
            <td class="p-3 text-center">${typeBadge}</td>
            <td class="p-3 text-right font-bold text-base ${colorClass}">${sign}$${Number(tx.amount).toFixed(2)}</td>
            <td class="p-3">${imageHtml}</td>
            <td class="p-3 text-center">
                <div class="flex justify-center gap-2">
                    <button class="btn-edit p-2 text-yellow-500 hover:bg-yellow-50 rounded transition" data-id="${tx._id}" title="Editar">✏️</button>
                    <button class="btn-delete p-2 text-red-500 hover:bg-red-50 rounded transition" data-id="${tx._id}" title="Eliminar">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// --- FORMULARIO Y ACCIONES ---
async function handleFormSubmit(e) {
    e.preventDefault();
    console.log("💾 Intentando guardar...");

    const btn = document.getElementById('saveBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Procesando...';

    const formData = new FormData(e.target);

    try {
        let url = API_URL;
        let method = 'POST';

        if (editingId) {
            url = `${API_URL}/${editingId}`;
            method = 'PUT'; // Ojo: Express debe soportar PUT en esta ruta
        }

        console.log(`📡 Enviando ${method} a ${url}`);

        const res = await fetch(url, {
            method: method,
            headers: getAuthHeaders(), // Importante: fetch con FormData NO lleva Content-Type manual
            body: formData
        });

        if (res.ok) {
            console.log("✅ Guardado exitoso");
            cancelEdit();
            loadData();
        } else {
            const err = await res.json();
            alert(`Error: ${err.message}`);
            console.error("❌ Error backend:", err);
        }
    } catch (error) {
        console.error("❌ Error network:", error);
        alert("Error de conexión");
    } finally {
        btn.disabled = false;
        // Restaurar texto según estado (edición o normal)
        toggleCategoryColor(); 
    }
}

async function fetchTransactionForEdit(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`, { headers: getAuthHeaders() });
        const tx = await res.json();
        startEdit(tx);
    } catch (error) {
        console.error("Error obteniendo transaccion:", error);
    }
}

function startEdit(tx) {
    editingId = tx._id;
    const form = document.getElementById('transactionForm');
    
    form.description.value = tx.description;
    form.amount.value = tx.amount;
    form.category.value = tx.category;
    form.date.value = tx.date.split('T')[0];

    // Radio
    const radio = form.querySelector(`input[name="type"][value="${tx.type}"]`);
    if(radio) radio.checked = true;

    // UI Updates
    document.getElementById('saveBtn').innerHTML = 'Actualizar Movimiento 🔄';
    document.getElementById('cancelEditBtn').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toggleCategoryColor();
}

function cancelEdit() {
    editingId = null;
    document.getElementById('transactionForm').reset();
    
    // Restaurar fecha local hoy
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.querySelector('input[name="date"]').value = now.toISOString().slice(0,10);

    document.getElementById('cancelEditBtn').classList.add('hidden');
    toggleCategoryColor(); // Restaura el botón a su estado normal
}

async function deleteTx(id) {
    if(!confirm('¿Borrar este movimiento permanentemente?')) return;

    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if(res.ok) loadData();
        else alert("No se pudo borrar");
    } catch (error) {
        console.error(error);
    }
}

// --- FIJAR BASE ---
async function updateBaseIncome() {
    console.log("💰 Click en Fijar Base");
    const amountStr = prompt("Ingrese el monto base (Ej: 500):");
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if(isNaN(amount)) {
        alert("Número inválido");
        return;
    }

    const month = document.getElementById('monthSelector').value;

    try {
        // OJO: Esta es la ruta que debe coincidir con el backend
        const res = await fetch(`${API_URL}/budget`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ month, amount })
        });

        if(res.ok) {
            alert("Base actualizada");
            loadData();
        } else {
            console.error("Error fijando base", await res.json());
            alert("Error al guardar base");
        }
    } catch (error) {
        console.error("❌ Error de red:", error);
    }
}

// --- UTILS ---
function toggleCategoryColor() {
    const isIncome = document.querySelector('input[name="type"][value="ingreso"]').checked;
    const btn = document.getElementById('saveBtn');
    
    if (editingId) {
        btn.innerHTML = 'Actualizar Movimiento 🔄';
        btn.className = 'w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-lg transition shadow-md flex justify-center items-center gap-2';
    } else if (isIncome) {
        btn.innerHTML = 'Guardar Ingreso 💰';
        btn.className = 'w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition shadow-md flex justify-center items-center gap-2';
    } else {
        btn.innerHTML = 'Guardar Egreso 💸';
        btn.className = 'w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition shadow-md flex justify-center items-center gap-2';
    }
}

// Ahora recibe (transactions, baseAmount) 👈
function updateSummary(transactions, baseAmount = 0) {
    // 1. Sumar Ingresos y Egresos
    const ing = transactions.filter(t => t.type === 'ingreso').reduce((a, b) => a + Number(b.amount), 0);
    const egr = transactions.filter(t => t.type === 'egreso').reduce((a, b) => a + Number(b.amount), 0);
    
    // 2. Actualizar los cuadros pequeños
    const baseEl = document.getElementById('totalBase');
    if(baseEl) baseEl.innerText = `$${Number(baseAmount).toFixed(2)}`; // 👈 Pintamos la Base Azul

    document.getElementById('totalIngresos').innerText = `$${ing.toFixed(2)}`;
    document.getElementById('totalEgresos').innerText = `$${egr.toFixed(2)}`;
    
    // 3. Calcular Balance Final (Caja = Base + Ingresos - Egresos)
    const balance = Number(baseAmount) + ing - egr; // 👈 Matemática corregida
    
    const balEl = document.getElementById('totalBalance');
    if(balEl) {
        balEl.innerText = `$${balance.toFixed(2)}`;
        // Si hay dinero es blanco, si debemos es rojo
        balEl.className = `text-3xl font-bold ${balance >= 0 ? 'text-white' : 'text-red-400'}`;
    }
}

function renderChart(transactions) {
    const ctx = document.getElementById('myChart');
    if (!ctx) return;
    
    const egresos = transactions.filter(t => t.type === 'egreso');
    const categories = {};
    
    egresos.forEach(t => {
        let cat = t.category || 'Otros';
        cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
        categories[cat] = (categories[cat] || 0) + Number(t.amount);
    });

    if (myChart) myChart.destroy();
    
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}