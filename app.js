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

let inventarioCache = [];
let ventasCache = [];

async function iniciar() {
    configurarTabs();
    await cargarDatos();
    configurarEventosInventario();
}

function configurarTabs() {
    const activar = (btn, vista) => {
        tabInventario.className = "px-6 py-2 rounded-full font-bold text-sm transition-all bg-white text-slate-500 hover:bg-slate-100 cursor-pointer";
        tabVentas.className = "px-6 py-2 rounded-full font-bold text-sm transition-all bg-white text-slate-500 hover:bg-slate-100 cursor-pointer";
        vistaInventario.classList.add('hidden');
        vistaVentas.classList.add('hidden');
        
        btn.className = "px-6 py-2 rounded-full font-bold text-sm transition-all bg-blue-600 text-white shadow-lg shadow-blue-500/30 cursor-default";
        vista.classList.remove('hidden');
    };

    tabInventario.addEventListener('click', () => activar(tabInventario, vistaInventario));
    tabVentas.addEventListener('click', () => activar(tabVentas, vistaVentas));
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

function renderizarVentas(datos) {
    if (!datos || datos.length === 0) {
        vacioVentas.classList.remove('hidden');
        return;
    }
    let dineroTotal = 0;
    let itemsTotal = 0;
    const htmlFilas = datos.map(venta => {
        const fecha = venta.fecha || '---';
        const producto = venta.detalles_compra || 'Sin detalles'; 
        const cantidad = venta.items_count || 1; 
        const total = venta.total || 0;
        const ticketID = venta.ticket || '#';
        dineroTotal += parseFloat(total);
        itemsTotal += parseInt(cantidad);
        const fechaCorta = fecha.split(' ')[0] || fecha;

        return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-xs font-bold text-slate-700">${fechaCorta}</div>
                    <div class="text-[10px] text-slate-400">#${ticketID}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm font-medium text-slate-700 max-w-xs truncate" title="${producto}">
                        ${producto}
                    </div>
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="bg-blue-100 text-blue-700 py-1 px-2 rounded text-xs font-bold">${cantidad}</span>
                </td>
                <td class="px-6 py-4 text-right font-bold text-emerald-600">$${parseFloat(total).toFixed(2)}</td>
            </tr>
        `;
    }).join('');
    tablaVentasBody.innerHTML = htmlFilas;
    totalVentasDinero.textContent = `$${dineroTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    totalItemsVendidos.textContent = `${itemsTotal} items vendidos (Reciente)`;
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

iniciar();
