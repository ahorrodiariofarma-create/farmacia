const JSON_URL = './inventario_local.json';

// --- REFERENCIAS DEL DOM ---
const gridInventario = document.getElementById('grid-inventario');
const buscador = document.getElementById('buscador');
const filtroCategoria = document.getElementById('filtro-categoria');
const filtroEstado = document.getElementById('filtro-estado');
const loadingStock = document.getElementById('loading-stock');

// Cache de datos
let inventarioCache = [];

// --- INICIO ---
async function iniciar() {
    await cargarDatos();
    configurarEventos();
}

// --- CARGA DE DATOS ---
async function cargarDatos() {
    try {
        const response = await fetch(JSON_URL);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        
        const dataCompleta = await response.json();
        
        // 1. Obtener inventario
        // Asegúrate de que los NaN ya estén corregidos a null en el JSON
        inventarioCache = dataCompleta.inventario_maestro || [];
        
        // 2. Llenar el Select de Categorías dinámicamente
        llenarFiltroCategorias(inventarioCache);

        // 3. Renderizar inicial
        aplicarFiltros();
        
        if (loadingStock) loadingStock.style.display = 'none';

    } catch (error) {
        console.error(error);
        gridInventario.innerHTML = `<p class="text-red-500 col-span-full">Error: ${error.message}. Revisa la consola.</p>`;
    }
}

// --- LLENAR SELECT DE CATEGORÍAS ---
function llenarFiltroCategorias(datos) {
    // Extraer categorías únicas y ordenarlas
    const categorias = [...new Set(datos.map(item => item.Categoria || 'Sin Categoría'))].sort();
    
    categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        filtroCategoria.appendChild(option);
    });
}

// --- EVENTOS ---
function configurarEventos() {
    buscador.addEventListener('input', aplicarFiltros);
    filtroCategoria.addEventListener('change', aplicarFiltros);
    filtroEstado.addEventListener('change', aplicarFiltros);
}

// --- LÓGICA MAESTRA DE FILTRADO ---
function aplicarFiltros() {
    const termino = buscador.value.toLowerCase();
    const catSeleccionada = filtroCategoria.value;
    const estadoSeleccionado = filtroEstado.value;

    let resultados = inventarioCache.filter(item => {
        // 1. Filtro Texto (Nombre, Descripción, Código)
        const nombre = (item.NombreEstandarizado || '').toLowerCase();
        const desc = (item.DescripcionDetallada || '').toLowerCase();
        const codigo = String(item.CodigoBarras || '').toLowerCase();
        const coincideTexto = nombre.includes(termino) || desc.includes(termino) || codigo.includes(termino);

        // 2. Filtro Categoría
        const catItem = item.Categoria || 'Sin Categoría';
        const coincideCategoria = catSeleccionada === "" || catItem === catSeleccionada;

        // 3. Filtro Estado (Lógica condicional)
        let coincideEstado = true;
        
        if (estadoSeleccionado === 'agotarse') {
            // Stock menor a 5
            const stock = item.Stock !== null ? item.Stock : 0;
            coincideEstado = stock < 5;
        } 
        else if (estadoSeleccionado === 'caducar') {
            // Lógica de fecha: Asume columna 'Caducidad' (YYYY-MM-DD)
            if (!item.Caducidad) {
                coincideEstado = false; // Si no tiene fecha, no se muestra
            } else {
                const fechaItem = new Date(item.Caducidad);
                const hoy = new Date();
                const diasDiferencia = (fechaItem - hoy) / (1000 * 60 * 60 * 24);
                coincideEstado = diasDiferencia > 0 && diasDiferencia <= 30; // Próximos 30 días
            }
        }
        // Nota: 'vendidos' se maneja mejor como ordenamiento posterior, no filtro estricto,
        // pero aquí lo incluimos si tuvieras una columna 'EsMasVendido' o similar.
        // Si no tienes dato de ventas en inventario_maestro, este filtro no hará nada exacto.

        return coincideTexto && coincideCategoria && coincideEstado;
    });

    // Ordenamiento especial para "Más Vendidos"
    if (estadoSeleccionado === 'vendidos') {
        // Si no tienes columna de ventas, ordenamos por stock ascendente (teoría: menos stock = más vendido)
        // O si tienes columna 'VentasAcumuladas', úsala aquí: b.VentasAcumuladas - a.VentasAcumuladas
        resultados.sort((a, b) => (a.Stock || 0) - (b.Stock || 0));
    }

    renderizarInventario(resultados);
}

// --- RENDERIZADO ---
function renderizarInventario(datos) {
    if (!datos || datos.length === 0) {
        gridInventario.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p class="text-gray-500 font-medium">No se encontraron productos.</p>
                <p class="text-sm text-gray-400">Intenta con otros filtros.</p>
            </div>`;
        return;
    }

    gridInventario.innerHTML = datos.map(item => {
        // Datos seguros
        const nombre = item.NombreEstandarizado || 'Producto sin nombre';
        const descripcion = item.DescripcionDetallada || '';
        const precio = item.PrecioVentaPublico || 0;
        const stock = item.Stock !== null ? item.Stock : 0;
        const categoria = item.Categoria || 'General';
        const esOnline = item.EnLinea === true;
        
        // Lógica visual de Stock
        const isLowStock = stock < 5;
        const isNoStock = stock === 0;
        
        // Colores dinámicos
        let stockBg = 'bg-emerald-100 text-emerald-800';
        let cardBorder = 'border-transparent';
        
        if (isNoStock) {
            stockBg = 'bg-slate-100 text-slate-500';
            cardBorder = 'border-slate-200 opacity-70';
        } else if (isLowStock) {
            stockBg = 'bg-red-100 text-red-700 animate-pulse'; // Parpadeo sutil si es crítico
            cardBorder = 'border-red-200 ring-1 ring-red-100';
        }

        return `
        <article class="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border ${cardBorder} flex flex-col overflow-hidden relative">
            
            <div class="px-4 pt-3 flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-gray-400">
                <span class="truncate max-w-[70%]">${categoria}</span>
                ${esOnline 
                    ? '<span class="flex items-center text-blue-500 gap-1"><span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>WEB</span>' 
                    : ''}
            </div>

            <div class="p-4 flex-1">
                <h3 class="font-bold text-gray-800 text-base leading-tight mb-1 group-hover:text-blue-600 transition-colors">
                    ${nombre}
                </h3>
                <p class="text-xs text-gray-500 line-clamp-2 h-8 leading-4">
                    ${descripcion}
                </p>
            </div>

            <div class="px-4 pb-4 pt-2 border-t border-gray-50 flex justify-between items-end bg-gray-50/50">
                <div>
                    <span class="block text-[10px] text-gray-400 mb-0.5">Precio</span>
                    <span class="text-lg font-bold text-slate-700 font-mono">$${precio.toFixed(2)}</span>
                </div>
                
                <div class="text-right">
                    <span class="px-2.5 py-1 rounded-md text-xs font-bold ${stockBg} inline-flex items-center gap-1">
                        ${isLowStock ? '⚠' : ''} ${stock} un
                    </span>
                </div>
            </div>
        </article>
        `;
    }).join('');
}

iniciar();