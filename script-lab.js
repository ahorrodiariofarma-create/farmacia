let arregloCarrito = [];
let carruselInterval;

// Inyecta los datos desde el JSON a los contenedores correspondientes
async function inyectarDatos() {
    try {
        const peticion = await fetch('datos.json');
        const data = await peticion.json();
        
        const contenedorKits = document.getElementById('carruselKits');
        const contenedorLabs = document.querySelector('.grid-container');

        contenedorKits.innerHTML = '';
        contenedorLabs.innerHTML = '';

        data.forEach(item => {
            if (item.categoria === "Kits") {
                contenedorKits.innerHTML += `
                    <article class="tarjeta-kit">
                        <img src="${item.imagenUrl}" alt="${item.nombreEstandarizado}" onerror="this.src='https://via.placeholder.com/300x180?text=Sin+Imagen'">
                        <h3>${item.nombreEstandarizado}</h3>
                        <span class="precio">$${item.precioVentaPublico}</span>
                        <button class="btn-agregar" onclick="agregarAlCarrito('${item.nombreEstandarizado}', ${item.precioVentaPublico})">Agregar Kit</button>
                    </article>
                `;
            } else if (item.estudio) {
                contenedorLabs.innerHTML += `
                    <article class="tarjeta-lab">
                        <h3>${item.estudio}</h3>
                        <p class="indicaciones">${item.indicaciones}</p>
                        <span class="precio">$${item.precioSinIva}</span>
                        <button class="btn-agregar" onclick="agregarAlCarrito('${item.estudio}', ${item.precioSinIva})">Agregar al Carrito</button>
                    </article>
                `;
            }
        });

        iniciarCarruselAutomatico();

    } catch (error) {
        console.error("Error:", error);
    }
}

// Desplazamiento automatico del carrusel
function iniciarCarruselAutomatico() {
    const carrusel = document.getElementById('carruselKits');
    if (carruselInterval) clearInterval(carruselInterval);
    carruselInterval = setInterval(() => {
        let maxScroll = carrusel.scrollWidth - carrusel.clientWidth;
        if (carrusel.scrollLeft >= maxScroll - 10) {
            carrusel.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            carrusel.scrollBy({ left: carrusel.clientWidth, behavior: 'smooth' });
        }
    }, 4000);
}

// Pausar y reanudar el carrusel con la interaccion del usuario
document.getElementById('carruselKits').addEventListener('touchstart', () => clearInterval(carruselInterval));
document.getElementById('carruselKits').addEventListener('mousedown', () => clearInterval(carruselInterval));
document.getElementById('carruselKits').addEventListener('touchend', iniciarCarruselAutomatico);
document.getElementById('carruselKits').addEventListener('mouseup', iniciarCarruselAutomatico);

// Controles manuales laterales del carrusel
document.getElementById('btnAnterior').addEventListener('click', () => {
    const carrusel = document.getElementById('carruselKits');
    if (carrusel.scrollLeft <= 0) {
        carrusel.scrollTo({ left: carrusel.scrollWidth, behavior: 'smooth' });
    } else {
        carrusel.scrollBy({ left: -carrusel.clientWidth, behavior: 'smooth' });
    }
});

document.getElementById('btnSiguiente').addEventListener('click', () => {
    const carrusel = document.getElementById('carruselKits');
    let maxScroll = carrusel.scrollWidth - carrusel.clientWidth;
    if (carrusel.scrollLeft >= maxScroll - 10) {
        carrusel.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
        carrusel.scrollBy({ left: carrusel.clientWidth, behavior: 'smooth' });
    }
});

// Funciones del carrito
function agregarAlCarrito(nombre, precio) {
    arregloCarrito.push({ nombre, precio });
    actualizarVistaCarrito();
    toggleCarrito(true); 
}

function eliminarDelCarrito(indice) {
    arregloCarrito.splice(indice, 1);
    actualizarVistaCarrito();
}

function actualizarVistaCarrito() {
    const lista = document.getElementById('listaArticulos');
    lista.innerHTML = '';
    let total = 0;
    arregloCarrito.forEach((item, index) => {
        total += item.precio;
        lista.innerHTML += `
            <li style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span>${item.nombre} - $${item.precio}</span>
                <button class="btn-eliminar" onclick="eliminarDelCarrito(${index})">X</button>
            </li>`;
    });
    if (arregloCarrito.length > 0) {
        lista.innerHTML += `<li style="text-align: right; font-weight: bold; margin-top:10px;">Total: $${total.toFixed(2)}</li>`;
    }
}

// Control de visibilidad del carrito flotante
const carritoFlotante = document.getElementById('carritoFlotante');
const btnAbrirCarrito = document.getElementById('btnAbrirCarrito');
const btnCerrarCarrito = document.getElementById('btnCerrarCarrito');

function toggleCarrito(abrir) {
    if (abrir) {
        carritoFlotante.classList.remove('carrito-oculta');
    } else {
        carritoFlotante.classList.add('carrito-oculta');
    }
}

btnAbrirCarrito.addEventListener('click', () => toggleCarrito(true));
btnCerrarCarrito.addEventListener('click', () => toggleCarrito(false));

// Buscador para filtrar las tarjetas de laboratorio
document.getElementById('buscador').addEventListener('input', (e) => {
    const termino = e.target.value.toLowerCase();
    const tarjetas = document.querySelectorAll('.tarjeta-lab');
    
    tarjetas.forEach(tarjeta => {
        const titulo = tarjeta.querySelector('h3').textContent.toLowerCase();
        tarjeta.style.display = titulo.includes(termino) ? 'flex' : 'none';
    });
});

// Generacion del mensaje de pedido para WhatsApp
document.getElementById('botonWhatsapp').addEventListener('click', () => {
    if (arregloCarrito.length === 0) {
        alert("Tu carrito esta vacio.");
        return;
    }
    let mensaje = 'Hola, este es mi pedido:%0A';
    let total = 0;
    arregloCarrito.forEach(item => {
        mensaje += `- ${item.nombre}: $${item.precio}%0A`;
        total += item.precio;
    });
    mensaje += `%0ATotal a pagar: $${total.toFixed(2)}`;
    window.open('https://wa.me/521234567890?text=' + mensaje);
});

// Inicializacion del carrito oculto en moviles
if (window.innerWidth < 768) {
    toggleCarrito(false);
}

inyectarDatos();