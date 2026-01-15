// --- CONFIGURACIÓN ---
// Lo que necesitas (Correcto)
const API_URL = '/api/transactions';let myChart = null;
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
        
        const transactions = Array.isArray(data) ? data : (data.transactions || []);
        const baseAmount = data.budget || 0;

        console.log(`📦 Datos: ${transactions.length} transacciones. Base: ${baseAmount}`);
        
        renderTable(transactions);
        
        // --- ⚡ EFECTO V2.0: ANIMACIÓN DE TOTALES ⚡ ---
        // Calculamos los totales antes de animar
        const ingresos = transactions
            .filter(t => t.type === 'ingreso')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const egresos = transactions
            .filter(t => t.type === 'egreso')
            .reduce((sum, t) => sum + t.amount, 0);

        const balanceFinal = (baseAmount + ingresos) - egresos;

        // Disparamos las animaciones individuales
        animateNumber('totalBase', baseAmount);
        animateNumber('totalIngresos', ingresos);
        animateNumber('totalEgresos', egresos);
        animateNumber('totalBalance', balanceFinal);
        // ----------------------------------------------
        
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

        // En renderTable:
const imageHtml = tx.imageUrl 
    ? `<button onclick="showImage('${tx.imageUrl}', '${tx.description}')" class="text-blue-500 hover:text-blue-700 block text-center text-lg">📷</button>` 
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
    // Guardamos texto original del botón dinámico (puede ser "Guardar Ingreso" o "Guardar Egreso")
    // Lo ideal es regenerarlo al final con toggleCategoryColor, así que solo ponemos el spinner
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Procesando...';

    const formData = new FormData(e.target);

    try {
        let url = API_URL;
        let method = 'POST';

        if (editingId) {
            url = `${API_URL}/${editingId}`;
            method = 'PUT';
        }

        const res = await fetch(url, {
            method: method,
            headers: getAuthHeaders(),
            body: formData
        });

        if (res.ok) {
            // 📳 Vibración
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(50); 
            }
            
            cancelEdit(); // Limpia el form
            loadData();   // Recarga la tabla

            // ✨ TOAST DE ÉXITO (No bloquea la pantalla)
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
            
            Toast.fire({
                icon: 'success',
                title: editingId ? 'Movimiento actualizado' : 'Movimiento guardado'
            });

        } else {
            const err = await res.json();
            Swal.fire('Error', err.message || 'Error al guardar', 'error');
        }
    } catch (error) {
        console.error("❌ Error network:", error);
        Swal.fire('Error', 'Error de conexión', 'error');
    } finally {
        btn.disabled = false;
        toggleCategoryColor(); // Restaura el texto y color correcto del botón
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
    // Usamos SweetAlert para confirmar
    const result = await Swal.fire({
        title: '¿Borrar movimiento?',
        text: "No podrás deshacer esta acción",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, borrar',
        cancelButtonText: 'Cancelar'
    });

    // Si el usuario dijo que NO, salimos de la función
    if (!result.isConfirmed) return;

    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if(res.ok) {
            // Opcional: Una mini alerta de éxito o solo recargar
            Swal.fire({
                title: 'Eliminado',
                icon: 'success',
                timer: 1500, // Se cierra sola en 1.5 seg
                showConfirmButton: false
            });
            loadData();
        } else {
            Swal.fire('Error', "No se pudo borrar el movimiento", 'error');
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Fallo de red al intentar borrar', 'error');
    }
}

// --- FIJAR BASE ---
async function updateBaseIncome() {
    console.log("💰 Click en Fijar Base");
    
    // Reemplazo del prompt nativo
    const { value: amountStr } = await Swal.fire({
        title: 'Fijar Base Mensual',
        input: 'number',
        inputLabel: 'Ingresa el monto inicial del mes',
        inputPlaceholder: 'Ej: 500',
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value) {
                return '¡Necesitas escribir un monto!';
            }
        }
    });

    if (!amountStr) return; // Si canceló o no puso nada

    const amount = parseFloat(amountStr);
    const month = document.getElementById('monthSelector').value;

    try {
        const res = await fetch(`${API_URL}/budget`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ month, amount })
        });

        if(res.ok) {
            Swal.fire('¡Éxito!', 'Base actualizada correctamente', 'success');
            loadData();
        } else {
            const err = await res.json();
            Swal.fire('Error', 'No se pudo guardar la base', 'error');
        }
    } catch (error) {
        console.error("❌ Error de red:", error);
        Swal.fire('Error', 'Error de conexión', 'error');
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

// Al final de script.js
function toggleForm() {
    console.log("🔄 Alternando formulario...");
    const container = document.getElementById('formContainer');
    if (window.innerWidth < 1024) {
        container.classList.toggle('form-open');
    }
}

/**
 * Anima un número desde 0 hasta el valor final
 * @param {string} id - El ID del elemento HTML
 * @param {number} endValue - El número final al que llegar
 */
function animateNumber(id, endValue) {
    const element = document.getElementById(id);
    if (!element) return;

    let startValue = 0;
    const duration = 1000; // 1 segundo de duración
    const frameRate = 60; // 60 cuadros por segundo para suavidad total
    const totalFrames = Math.round(duration / (1000 / frameRate));
    const increment = endValue / totalFrames;
    let currentFrame = 0;

    const counter = setInterval(() => {
        currentFrame++;
        startValue += increment;

        // Formatear como moneda mientras cuenta
        element.innerText = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(startValue);

        if (currentFrame >= totalFrames) {
            // Asegurar que termine en el número exacto
            element.innerText = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(endValue);
            clearInterval(counter);
        }
    }, 1000 / frameRate);
}

// --- LÓGICA DE ELIMINAR CUENTA ---

const deleteModal = document.getElementById('deleteModal');

function openDeleteModal() {
    deleteModal.classList.remove('hidden');
    deleteModal.classList.add('flex');
}

function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    deleteModal.classList.remove('flex');
}

// Cerrar si hacen clic fuera del modal
deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) closeDeleteModal();
});

// Manejar el envío del formulario de eliminar cuenta
document.getElementById('deleteAccountForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    
    // Primero preguntamos si está seguro
    const confirmResult = await Swal.fire({
        title: '¿Estás completamente seguro?',
        text: "¡Se borrarán todos tus datos y no podrás recuperarlos!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar mi cuenta',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmResult.isConfirmed) return;

    btn.disabled = true;
    btn.innerHTML = 'Eliminando...';

    const formData = new FormData(e.target);
    const password = formData.get('password');

    try {
        const res = await fetch(`${API_URL.replace('/transactions', '/auth/me')}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ password })
        });

        const data = await res.json();

        if (res.ok) {
            await Swal.fire('¡Adiós!', 'Tu cuenta ha sido eliminada correctamente.', 'success');
            localStorage.clear();
            window.location.href = 'login.html';
        } else {
            Swal.fire('Error', data.message || 'Contraseña incorrecta', 'error');
            btn.disabled = false;
            btn.innerHTML = originalText;
        }

    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Problema de conexión con el servidor', 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});

// Función para ver comprobante sin salir de la página
function showImage(url, text) {
    Swal.fire({
        imageUrl: url,
        imageAlt: 'Comprobante',
        title: text,
        showConfirmButton: false,
        showCloseButton: true,
        background: '#fff',
        backdrop: `rgba(0,0,0,0.8)` // Fondo oscuro elegante
    });
}

// --- EXPORTAR A EXCEL (Versión Backend PRO) ---
const btnExcel = document.getElementById('btnExcel');

if (btnExcel) {
    btnExcel.addEventListener('click', async () => {
        
        const originalContent = btnExcel.innerHTML;
        btnExcel.innerHTML = '<span class="loader"></span> Generando...'; // O poner '⏳'
        btnExcel.disabled = true;

        try {
            // Llamamos al backend enviando el TOKEN
            const res = await fetch('/api/reports/excel', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                // El nombre lo pone el navegador, pero podemos sugerir uno
                a.download = `Reporte_Marista_${new Date().toISOString().slice(0,7)}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                
                // Alerta bonita
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
                Toast.fire({ icon: 'success', title: '¡Reporte descargado! 📥' });

            } else {
                const txt = await res.text();
                Swal.fire('Atención', 'No se pudo descargar: ' + txt, 'warning');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Fallo de conexión', 'error');
        } finally {
            btnExcel.innerHTML = originalContent;
            btnExcel.disabled = false;
        }
    });
}

// --- EFECTO "SOLO CALENDARIO" AL BAJAR ---
const topBar = document.getElementById('topBar');
const collapsibleBtns = document.querySelectorAll('.collapsible');

if (topBar && collapsibleBtns.length > 0) {
    
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;

        // Si bajamos más de 20px... ESCONDER BOTONES
        if (scrollY > 20) {
            collapsibleBtns.forEach(btn => {
                // Truco CSS via JS para colapsar suavemente
                btn.style.maxWidth = '0px';
                btn.style.padding = '0px';
                btn.style.opacity = '0';
                btn.style.margin = '0px';
                btn.style.flex = '0'; // Pierde su fuerza para empujar
            });
        } 
        // Si estamos arriba del todo... MOSTRAR BOTONES
        else {
            collapsibleBtns.forEach(btn => {
                btn.style.maxWidth = '500px'; // Un valor alto para que recupere su tamaño natural
                btn.style.padding = '';       // Padding original (clase Tailwind)
                btn.style.opacity = '1';
                btn.style.margin = '';        // Margin original (gap del padre)
                btn.style.flex = '1';         // Vuelve a ocupar 33%
            });
        }
    });
}