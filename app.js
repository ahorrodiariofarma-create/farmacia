// --- CONFIGURACIÓN DE SUPABASE ---
// ⚠️ IMPORTANTE: Reemplaza estos valores con los de tu proyecto en Supabase (Settings -> API)
const SUPABASE_URL = 'https://ohjxvhjvsimncxhpnxuv.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oanh2aGp2c2ltbmN4aHBueHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MzUzNTksImV4cCI6MjA4MTIxMTM1OX0.7AAv4IpGXa2JQ4LRuZGNDR-kTwkf0WRTVMluA9Pc3JQ';

// CORRECCIÓN DEL ERROR: Usamos 'createClient' directamente y llamamos a la variable 'cliente'
const { createClient } = supabase;
const cliente = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- REFERENCIAS DOM ---
const tabInventario = document.getElementById('tab-inventario');
const tabVentas = document.getElementById('tab-ventas');
const vistaInventario = document.getElementById('vista-inventario');
const vistaVentas = document.getElementById('vista-ventas');
const gridInventario = document.getElementById('grid-inventario');
const buscador = document.getElementById('buscador');
const filtroCategoria = document.getElementById('filtro-categoria');
const filtroEstado = document.getElementById('filtro-estado');
const loadingStock = document.getElementById('loading-stock');
const tablaVentasBody = document.getElementById('tabla-ventas-body');
const totalVentasDinero = document.getElementById('total-ventas-dinero');
const totalItemsVendidos = document.getElementById('total-items-vendidos');
const vacioVentas = document.getElementById('vacio-ventas');

const tabCompras = document.getElementById('tab-compras');
const vistaCompras = document.getElementById('vista-compras');
const tablaComprasBody = document.getElementById('tabla-compras-body');
const vacioCompras = document.getElementById('vacio-compras');

let inventarioCache = [];
let ventasCache = [];
let chartInstance = null;
let datosVentasGlobal = [];

async function iniciar() {
    configurarTabs();
    await cargarDatos();
    configurarEventosInventario();
}

function configurarTabs() {
    const activar = (btn, vista) => {
        // Resetear todos
        [tabInventario, tabVentas, tabCompras].forEach(t => 
            t.className = "px-6 py-2 rounded-full font-bold text-sm transition-all bg-white text-slate-500 hover:bg-slate-100 cursor-pointer"
        );
        [vistaInventario, vistaVentas, vistaCompras].forEach(v => v.classList.add('hidden'));
        
        // Activar seleccionado
        btn.className = "px-6 py-2 rounded-full font-bold text-sm transition-all bg-blue-600 text-white shadow-lg shadow-blue-500/30 cursor-default";
        vista.classList.remove('hidden');
    };

    tabInventario.addEventListener('click', () => activar(tabInventario, vistaInventario));
    tabVentas.addEventListener('click', () => activar(tabVentas, vistaVentas));
    
    // NUEVO: Evento para Compras
    tabCompras.addEventListener('click', () => {
        activar(tabCompras, vistaCompras);
        cargarListaCompras(); // Carga al hacer clic
    });
}
async function cargarDatos() {
    try {
        // CORRECCIÓN: Usamos 'cliente' en lugar de 'supabase'
        const { data: dataInv, error: errorInv } = await cliente
            .from('inventario')
            .select('*')
            .order('producto', { ascending: true });

        if (errorInv) throw errorInv;

        inventarioCache = dataInv || [];
        llenarFiltroCategorias(inventarioCache);
        renderizarInventario(inventarioCache);

        // CORRECCIÓN: Usamos 'cliente' en lugar de 'supabase'
        const { data: dataVentas, error: errorVentas } = await cliente
            .from('ventas')
            .select('*')
            .order('fecha', { ascending: false })
            .limit(100);

        if (errorVentas) throw errorVentas;

        ventasCache = dataVentas || [];
        renderizarVentas(ventasCache);

    } catch (error) {
        console.error("Error Supabase:", error);
        gridInventario.innerHTML = `<div class="col-span-full text-center text-red-500 py-10">
            Error de conexión: ${error.message}
        </div>`;
    }
}

function renderizarGrafica(datosVentas) {
    const ctx = document.getElementById('graficaVentas').getContext('2d');
    
    // 1. Agrupar ventas por día (últimos 7 días)
    const ventasPorDia = {};
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    // Inicializar últimos 7 días en 0
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('es-MX'); // Clave: dd/mm/aaaa
        ventasPorDia[key] = { 
            total: 0, 
            label: diasSemana[d.getDay()] 
        };
    }

    // Sumar totales
    datosVentas.forEach(v => {
        const fecha = new Date(v.fecha).toLocaleDateString('es-MX');
        if (ventasPorDia[fecha]) {
            ventasPorDia[fecha].total += parseFloat(v.total_linea);
        }
    });

    // Preparar arrays para Chart.js
    const labels = Object.values(ventasPorDia).map(d => d.label);
    const data = Object.values(ventasPorDia).map(d => d.total);

    // 2. Destruir gráfica previa si existe
    if (chartInstance) {
        chartInstance.destroy();
    }

    // 3. Crear nueva gráfica
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Venta Total ($)',
                data: data,
                backgroundColor: 'rgba(59, 130, 246, 0.6)', // Azul Tailwind
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Ventas de la Semana' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

let chartInstancia = null;


function actualizarGrafica(periodo = 'semana') {
    const canvas = document.getElementById('graficaVentas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Usamos los datos guardados globalmente
    const datos = datosVentasGlobal || []; 

    let mapaVentas = {};
    let labels = [];
    let dataValues = [];
    let tituloGrafica = '';

    const hoy = new Date();
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const mesesAnio = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    // 1. INICIALIZACIÓN DEL EJE X (SEGÚN PERIODO)
    if (periodo === 'semana') {
        tituloGrafica = 'Últimos 7 Días';
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(hoy.getDate() - i);
            const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
            const label = diasSemana[d.getDay()];      // Lun, Mar...
            mapaVentas[key] = 0;
            labels.push(label);
        }
    } else if (periodo === 'mes') {
        tituloGrafica = 'Últimos 30 Días';
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(hoy.getDate() - i);
            const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
            const label = d.getDate();                 // 1, 2, 3...
            mapaVentas[key] = 0;
            labels.push(label);
        }
    } else if (periodo === 'anio') {
        tituloGrafica = 'Último Año';
        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(hoy.getMonth() - i);
            // Clave: YYYY-MM
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = mesesAnio[d.getMonth()];     // Ene, Feb...
            mapaVentas[key] = 0;
            labels.push(label);
        }
    }

    // 2. LLENADO DE DATOS (SUMAR TOTALES)
    datos.forEach(venta => {
        if (!venta.fecha) return;
        
        // Convertir fecha de venta
        const fechaObj = new Date(venta.fecha);
        let key = '';

        if (periodo === 'anio') {
            key = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth() + 1).padStart(2, '0')}`;
        } else {
            key = fechaObj.toISOString().split('T')[0];
        }

        // Si la fecha coincide con nuestro rango inicializado, sumamos
        if (mapaVentas.hasOwnProperty(key)) {
            mapaVentas[key] += parseFloat(venta.total_linea || 0);
        }
    });

    // Extraer valores en el orden correcto de las etiquetas
    dataValues = Object.values(mapaVentas);

    // 3. RENDERIZADO (DESTRUIR Y CREAR)
    if (chartInstancia) {
        chartInstancia.destroy();
    }

    chartInstancia = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ventas ($)',
                data: dataValues,
                backgroundColor: 'rgba(59, 130, 246, 0.6)', // Azul
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: `Ventas (${tituloGrafica})` },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '$' + context.raw.toLocaleString('en-US', {minimumFractionDigits: 2});
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderizarVentas(datos) {
    if (!datos || datos.length === 0) {
        vacioVentas.classList.remove('hidden');
        return;
    }
    vacioVentas.classList.add('hidden');

    let dineroTotal = 0;
    let itemsTotal = 0;
    const gruposTickets = {};

    // 1. Agrupar datos por Ticket
    datos.forEach(venta => {
        const ticket = venta.ticket || 'S/N';
        const totalLinea = parseFloat(venta.total_linea || 0);
        const cant = parseInt(venta.cantidad || 1);

        // Sumar a globales
        dineroTotal += totalLinea;
        itemsTotal += cant;

        if (!gruposTickets[ticket]) {
            gruposTickets[ticket] = {
                fecha: venta.fecha,
                ticket: ticket,
                productos: [],
                totalTicket: 0,
                totalItemsTicket: 0
            };
        }

        // Agregar detalle al grupo
        gruposTickets[ticket].productos.push({
            nombre: venta.nombre_producto || 'Sin nombre',
            cantidad: cant
        });
        gruposTickets[ticket].totalTicket += totalLinea;
        gruposTickets[ticket].totalItemsTicket += cant;
    });

    // 2. Generar HTML iterando los grupos
    const htmlFilas = Object.values(gruposTickets).map(grupo => {
        const fecha = grupo.fecha || '---';
        const fechaCorta = fecha.includes('T') ? fecha.split('T')[0] : fecha.split(' ')[0];

        // Crear lista visual de productos
        const listaProductos = grupo.productos
            .map(p => `<div class="truncate text-xs">• <b>(${p.cantidad})</b> ${p.nombre}</div>`)
            .join('');

        return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 align-top">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-xs font-bold text-slate-700">${fechaCorta}</div>
                    <div class="text-[10px] text-slate-400">#${grupo.ticket}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex flex-col gap-1">
                        ${listaProductos}
                    </div>
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="bg-blue-100 text-blue-700 py-1 px-2 rounded text-xs font-bold">
                        ${grupo.totalItemsTicket}
                    </span>
                </td>
                <td class="px-6 py-4 text-right font-bold text-emerald-600">
                    $${grupo.totalTicket.toFixed(2)}
                </td>
            </tr>
        `;
    }).join('');

    tablaVentasBody.innerHTML = htmlFilas;
    totalVentasDinero.textContent = `$${dineroTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    totalItemsVendidos.textContent = `${itemsTotal} items vendidos`;

    datosVentasGlobal = datos;
    actualizarGrafica('semana');
}

function cambiarPeriodo(periodo) {
    if (datosVentasGlobal.length > 0) {
        actualizarGrafica(periodo);
    }
}

function llenarFiltroCategorias(datos) {
    const categorias = [...new Set(datos.map(i => i.categoria))].sort();
    filtroCategoria.innerHTML = '<option value="">📂 Todas las Categorías</option>';
    categorias.forEach(cat => {
        if(cat) {
            const opt = document.createElement('option');
            opt.value = cat; 
            opt.textContent = cat;
            filtroCategoria.appendChild(opt);
        }
    });
}

function configurarEventosInventario() {
    const aplicar = () => {
        const term = buscador.value.toLowerCase();
        const cat = filtroCategoria.value;
        const est = filtroEstado.value;

        const filtered = inventarioCache.filter(item => {
            const nombre = (item.producto || '').toLowerCase();
            const desc = (item.descripcion || '').toLowerCase();
            const codigo = String(item.id || ''); 
            const matchText = nombre.includes(term) || desc.includes(term) || codigo.includes(term);
            const matchCat = cat === "" || item.categoria === cat;
            let matchEst = true;
            if (est === 'agotarse') matchEst = (item.stock || 0) < 5;
            if (est === 'caducar') {
                if(!item.caducidad) { matchEst = false; } else {
                    const fechaItem = new Date(item.caducidad);
                    const hoy = new Date();
                    const diff = (fechaItem - hoy) / (1000 * 60 * 60 * 24);
                    matchEst = diff > 0 && diff <= 30;
                }
            }
            return matchText && matchCat && matchEst;
        });

        if (est === 'vendidos') {
            filtered.sort((a, b) => (b.ventas_totales || 0) - (a.ventas_totales || 0));
        }
        renderizarInventario(filtered);
    };
    buscador.addEventListener('input', aplicar);
    filtroCategoria.addEventListener('change', aplicar);
    filtroEstado.addEventListener('change', aplicar);
}

function renderizarInventario(datos) {
    if (!datos.length) {
        gridInventario.innerHTML = '<div class="col-span-full text-center text-gray-400 py-10">No hay resultados</div>';
        return;
    }
    if(loadingStock) loadingStock.style.display = 'none';
    gridInventario.innerHTML = datos.map(item => {
        const nombre = item.producto || 'Producto';
        const descripcion = item.descripcion || '';
        const precio = item.precio_unidad || 0;
        const stock = item.stock !== null ? item.stock : 0;
        const categoria = item.categoria || 'VAR';
        const isLow = stock < 5;
        const isZero = stock === 0;
        let badgeColor = isLow ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-emerald-100 text-emerald-800';
        if (isZero) badgeColor = 'bg-slate-100 text-slate-500';

        return `
        <article class="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all border border-slate-100 p-4 flex flex-col group">
            <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] font-bold tracking-wider text-gray-400 uppercase truncate max-w-[70%]">${categoria}</span>
                <span class="w-2 h-2 rounded-full bg-green-500" title="En Línea"></span>
            </div>
            <h3 class="font-bold text-gray-800 text-sm leading-tight mb-1 truncate group-hover:text-blue-600 transition-colors" title="${nombre}">
                ${nombre}
            </h3>
            <p class="text-[10px] text-gray-400 truncate mb-4">${descripcion}</p>
            <div class="mt-auto flex justify-between items-end border-t border-gray-50 pt-3">
                <span class="text-lg font-bold text-slate-700 font-mono">$${precio.toFixed(2)}</span>
                <span class="px-2 py-1 rounded-md text-xs font-bold ${badgeColor} flex items-center gap-1">
                    ${isLow ? '⚠' : ''} ${stock} un
                </span>
            </div>
        </article>`;
    }).join('');
}


async function cargarListaCompras() {
    tablaComprasBody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Cargando lista...</td></tr>';
    
    try {
        const { data, error } = await cliente
            .from('lista_compras')
            .select('*')
            .order('tipo', { ascending: false }); // Urgente primero

        if (error) throw error;

        if (!data || data.length === 0) {
            tablaComprasBody.innerHTML = '';
            vacioCompras.classList.remove('hidden');
            return;
        }

        vacioCompras.classList.add('hidden');
        tablaComprasBody.innerHTML = data.map(item => {
            const esUrgente = item.tipo === 'URGENTE';
            const badgeColor = esUrgente ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-600';
            
            return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-4 py-3">
                    <span class="${badgeColor} px-2 py-1 rounded text-[10px] font-bold border border-opacity-20 uppercase">
                        ${item.tipo}
                    </span>
                </td>
                <td class="px-4 py-3">
                    <div class="font-medium text-slate-700">${item.nombre}</div>
                    <div class="text-[10px] text-slate-400">ID: ${item.id_producto}</div>
                    <div class="text-[10px] text-slate-300">Generado: ${new Date(item.created_at).toLocaleDateString()}</div>
                </td>
                <td class="px-4 py-3 text-center font-mono text-red-600 font-bold">
                    ${item.stock_actual}
                </td>
                <td class="px-4 py-3 text-center font-mono text-emerald-600 font-bold bg-emerald-50 rounded">
                    +${item.cantidad_sugerida}
                </td>
            </tr>`;
        }).join('');

    } catch (error) {
        console.error("Error cargando lista compras:", error);
        tablaComprasBody.innerHTML = '<tr><td colspan="4" class="text-center text-red-500 py-4">Error al cargar datos</td></tr>';
    }
}

iniciar();
