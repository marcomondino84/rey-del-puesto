/**
 * public/app.js
 * Lógica frontend de la aplicación Rey del Puesto.
 * Maneja la interacción en tiempo real, renderizado de componentes y cotizaciones.
 */

// Estado global de la aplicación
const AppState = {
  cotizacionArs: 1350,
  minimoUsdRequerido: 1,
  anuncioRey: null,
  anuncios: [],
  isLoading: false
};

// Elementos del DOM
const DOM = {
  tickerArs: document.getElementById('ticker-ars'),
  btnAbrirPuja: document.getElementById('btn-abrir-puja'),
  btnCtaText: document.getElementById('btn-cta-text'),
  heroContainer: document.getElementById('hero-king-container'),
  rankingList: document.getElementById('ranking-list'),
  badgeTotal: document.getElementById('badge-total-anuncios'),
  alertBanner: document.getElementById('alert-banner'),
  
  // Modal de Puja
  modalPuja: document.getElementById('modal-puja'),
  btnCerrarModal: document.getElementById('btn-cerrar-modal'),
  formPuja: document.getElementById('form-puja'),
  inputMontoUsd: document.getElementById('input-monto-usd'),
  badgeMinimoInfo: document.getElementById('badge-minimo-info'),
  calculoArsEstimado: document.getElementById('calculo-ars-estimado'),
  formErrorMsg: document.getElementById('form-error-msg'),
  btnSubmitPuja: document.getElementById('btn-submit-puja'),
  btnSubmitIcon: document.getElementById('btn-submit-icon'),
  btnSubmitText: document.getElementById('btn-submit-text'),

  // Campos del formulario
  inputTitulo: document.getElementById('input-titulo'),
  inputLink: document.getElementById('input-link'),
  inputImagen: document.getElementById('input-imagen'),
  inputDescripcion: document.getElementById('input-descripcion'),
  inputWhatsapp: document.getElementById('input-whatsapp'),
  inputInstagram: document.getElementById('input-instagram')
};

// Formateador de moneda en pesos argentinos
const formatArs = (amount) => {
  return '$' + Math.round(Number(amount)).toLocaleString('es-AR') + ' ARS';
};

// Formateador de moneda en USD
const formatUsd = (amount) => {
  return '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' USD';
};

// Sanitizador básico para evitar XSS al renderizar texto
const escapeHtml = (str) => {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/**
 * Consulta la API y recarga todos los anuncios y cotizaciones
 */
async function cargarDatosCartelera() {
  try {
    const response = await fetch('/api/anuncios');
    if (!response.ok) throw new Error('Error al consultar el servidor');
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Error desconocido');

    AppState.cotizacionArs = Number(data.cotizacion_usd_ars) || 1350;
    AppState.minimoUsdRequerido = Number(data.minimo_usd_requerido) || 1;
    AppState.anuncioRey = data.anuncio_rey;
    AppState.anuncios = data.anuncios_puestos_2_100 || [];

    renderizarInterfaz();
  } catch (err) {
    console.error('Error al cargar datos:', err);
    mostrarAlerta('No se pudieron actualizar los anuncios en vivo. Reintentando...', 'error');
  }
}

/**
 * Renderiza todos los elementos visuales basados en el estado actual
 */
function renderizarInterfaz() {
  // 1. Header Ticker y Botón CTA
  if (DOM.tickerArs) {
    DOM.tickerArs.textContent = '$' + AppState.cotizacionArs.toLocaleString('es-AR');
  }
  
  if (DOM.btnCtaText) {
    DOM.btnCtaText.textContent = `Ser el Rey del Puesto (Desde ${formatUsd(AppState.minimoUsdRequerido)})`;
  }

  // 2. Contador de anuncios
  const totalActivos = (AppState.anuncioRey ? 1 : 0) + AppState.anuncios.length;
  if (DOM.badgeTotal) {
    DOM.badgeTotal.textContent = `${totalActivos} / 100 puestos ocupados`;
  }

  // 3. Renderizar el Rey Actual (Hero #1)
  renderizarHeroRey();

  // 4. Renderizar lista Top 2 al 100
  renderizarTopLista();

  // 5. Actualizar límites del formulario de puja
  actualizarLimitesPuja();
}

/**
 * Renderiza la tarjeta destacada Hero del Puesto #1
 */
function renderizarHeroRey() {
  if (!DOM.heroContainer) return;

  const rey = AppState.anuncioRey;

  if (!rey) {
    // Estado inicial: Nadie ha reclamado el trono todavía
    DOM.heroContainer.innerHTML = `
      <div class="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-100 border-2 border-dashed border-amber-300 rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-3xl animate-bounce">
          👑
        </div>
        <div class="max-w-md">
          <h3 class="text-2xl font-black text-slate-900 font-display">El Trono está Vacante</h3>
          <p class="text-sm text-slate-600 mt-1">
            Sé el primer Rey de la cartelera y mostrá tu marca o proyecto a todo el mundo por solo <strong>$1 USD</strong>.
          </p>
        </div>
        <button onclick="abrirModalPuja()" class="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm shadow-md transition-all cursor-pointer">
          👑 Reclamar el Puesto #1 por $1 USD
        </button>
      </div>
    `;
    return;
  }

  // Deserializar redes sociales
  let redes = {};
  try {
    redes = typeof rey.redes_json === 'string' ? JSON.parse(rey.redes_json) : (rey.redes_json || {});
  } catch (e) {
    redes = {};
  }

  const redesHtml = `
    ${redes.whatsapp ? `
      <a href="https://wa.me/${encodeURIComponent(redes.whatsapp.replace(/[^0-9]/g, ''))}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-colors">
        <span>💬</span> WhatsApp
      </a>
    ` : ''}
    ${redes.instagram ? `
      <a href="https://instagram.com/${encodeURIComponent(redes.instagram.replace('@', ''))}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200 text-xs font-bold transition-colors">
        <span>📸</span> ${escapeHtml(redes.instagram.startsWith('@') ? redes.instagram : '@' + redes.instagram)}
      </a>
    ` : ''}
  `;

  const bannerImg = rey.imagen_url ? `
    <div class="w-full md:w-72 lg:w-80 h-52 shrink-0 rounded-2xl overflow-hidden bg-slate-900 relative group">
      <img src="${escapeHtml(rey.imagen_url)}" alt="${escapeHtml(rey.titulo)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.onerror=null; this.parentElement.style.display='none';">
    </div>
  ` : '';

  DOM.heroContainer.innerHTML = `
    <div class="king-glow bg-white border-2 border-amber-400 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 lg:gap-8 items-start relative overflow-hidden">
      
      <!-- Fondo decorativo sutil -->
      <div class="absolute -right-16 -top-16 w-56 h-56 bg-gradient-to-br from-amber-400/20 to-yellow-300/10 rounded-full blur-2xl pointer-events-none"></div>

      <!-- Imagen/Banner si existe -->
      ${bannerImg}

      <!-- Información del Rey -->
      <div class="flex-1 flex flex-col justify-between h-full space-y-4 w-full">
        <div>
          <!-- Badges de estatus y monto -->
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span class="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-xs font-black tracking-wide uppercase shadow-xs">
              <span class="animate-pulse">👑</span> PUESTO #1 / ACTUAL REY
            </span>
            <div class="text-right">
              <span class="text-xs text-slate-500 font-semibold block">Puja ganadora:</span>
              <span class="text-xl sm:text-2xl font-black text-amber-600 font-display tracking-tight">
                ${formatUsd(rey.monto_usd)}
              </span>
            </div>
          </div>

          <!-- Título -->
          <h3 class="text-2xl sm:text-3xl font-black text-slate-900 font-display leading-tight">
            ${escapeHtml(rey.titulo)}
          </h3>

          <!-- Descripción -->
          ${rey.descripcion ? `
            <p class="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
              ${escapeHtml(rey.descripcion)}
            </p>
          ` : ''}
        </div>

        <!-- Enlaces salientes y redes sociales -->
        <div class="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            ${redesHtml}
          </div>

          <a href="${escapeHtml(rey.link_url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-md transition-all">
            <span>Visitar Sitio Web</span>
            <span class="text-base">↗</span>
          </a>
        </div>
      </div>

    </div>
  `;
}

/**
 * Renderiza la lista horizontal y compacta de los puestos #2 al #100
 */
function renderizarTopLista() {
  if (!DOM.rankingList) return;

  const lista = AppState.anuncios;

  if (lista.length === 0) {
    DOM.rankingList.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-sm">
        <p class="font-semibold text-slate-700">Aún no hay anuncios en los puestos #2 al #100.</p>
        <p class="text-xs text-slate-400 mt-1">¡Cuando alguien le robe el puesto al rey actual, su anuncio pasará a esta lista de honor!</p>
      </div>
    `;
    return;
  }

  DOM.rankingList.innerHTML = lista.map((ad, index) => {
    const puestoNumero = index + 2; // Puesto #2 en adelante

    let redes = {};
    try {
      redes = typeof ad.redes_json === 'string' ? JSON.parse(ad.redes_json) : (ad.redes_json || {});
    } catch (e) {
      redes = {};
    }

    const miniaturaHtml = ad.imagen_url ? `
      <div class="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
        <img src="${escapeHtml(ad.imagen_url)}" alt="${escapeHtml(ad.titulo)}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center text-base\\'>🌐</div>'">
      </div>
    ` : `
      <div class="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-lg text-slate-400">
        📢
      </div>
    `;

    return `
      <div class="ad-row bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4 shadow-2xs">
        
        <!-- Número de puesto -->
        <div class="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-xl bg-slate-100 text-slate-700 font-display font-black text-sm sm:text-base flex items-center justify-center border border-slate-200">
          #${puestoNumero}
        </div>

        <!-- Miniatura -->
        ${miniaturaHtml}

        <!-- Detalle principal -->
        <div class="flex-1 min-w-0 pr-2">
          <div class="flex items-center gap-2">
            <a href="${escapeHtml(ad.link_url)}" target="_blank" rel="noopener noreferrer" class="font-bold text-slate-900 text-sm sm:text-base hover:text-amber-600 transition-colors truncate">
              ${escapeHtml(ad.titulo)}
            </a>
            <span class="text-xs text-slate-400 shrink-0">↗</span>
          </div>

          ${ad.descripcion ? `
            <p class="text-xs text-slate-500 truncate mt-0.5 max-w-xl">
              ${escapeHtml(ad.descripcion)}
            </p>
          ` : ''}

          <!-- Microiconos de redes -->
          <div class="flex items-center gap-2 mt-1">
            ${redes.whatsapp ? `
              <a href="https://wa.me/${encodeURIComponent(redes.whatsapp.replace(/[^0-9]/g, ''))}" target="_blank" rel="noopener noreferrer" class="text-emerald-600 text-xs font-semibold hover:underline" title="WhatsApp">
                💬 WhatsApp
              </a>
            ` : ''}
            ${redes.instagram ? `
              <a href="https://instagram.com/${encodeURIComponent(redes.instagram.replace('@', ''))}" target="_blank" rel="noopener noreferrer" class="text-pink-600 text-xs font-semibold hover:underline" title="Instagram">
                📸 ${escapeHtml(redes.instagram.startsWith('@') ? redes.instagram : '@' + redes.instagram)}
              </a>
            ` : ''}
          </div>
        </div>

        <!-- Monto en USD pagado -->
        <div class="shrink-0 text-right pl-2 border-l border-slate-100">
          <span class="font-black text-slate-900 text-sm sm:text-base font-display block">
            ${formatUsd(ad.monto_usd)}
          </span>
          <span class="text-[11px] text-slate-400 font-medium hidden sm:block">
            Puesto #${puestoNumero}
          </span>
        </div>

      </div>
    `;
  }).join('');
}

/**
 * Actualiza los límites y cálculos dinámicos del formulario de puja
 */
function actualizarLimitesPuja() {
  const min = AppState.minimoUsdRequerido;
  if (DOM.inputMontoUsd) {
    DOM.inputMontoUsd.min = min;
    if (!DOM.inputMontoUsd.value || Number(DOM.inputMontoUsd.value) < min) {
      DOM.inputMontoUsd.value = min;
    }
  }

  if (DOM.badgeMinimoInfo) {
    DOM.badgeMinimoInfo.textContent = `Mínimo: ${formatUsd(min)}`;
  }

  calcularArsEstimado();
}

/**
 * Calcula el monto estimado en pesos argentinos según el dólar blue
 */
function calcularArsEstimado() {
  if (!DOM.calculoArsEstimado || !DOM.inputMontoUsd) return;

  const montoUsd = Number(DOM.inputMontoUsd.value) || AppState.minimoUsdRequerido;
  const totalArs = montoUsd * AppState.cotizacionArs;
  DOM.calculoArsEstimado.textContent = formatArs(totalArs);
}

/**
 * Abre el modal de puja y sincroniza los valores
 */
function abrirModalPuja() {
  actualizarLimitesPuja();
  if (DOM.formErrorMsg) {
    DOM.formErrorMsg.classList.add('hidden');
    DOM.formErrorMsg.textContent = '';
  }
  if (DOM.modalPuja) {
    DOM.modalPuja.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    DOM.inputTitulo.focus();
  }
}

/**
 * Cierra el modal de puja
 */
function cerrarModalPuja() {
  if (DOM.modalPuja) {
    DOM.modalPuja.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

/**
 * Maneja el envío del formulario de puja
 */
async function procesarEnvioPuja(e) {
  e.preventDefault();

  const montoUsd = Number(DOM.inputMontoUsd.value);
  const titulo = DOM.inputTitulo.value.trim();
  const linkUrl = DOM.inputLink.value.trim();
  const imagenUrl = DOM.inputImagen.value.trim();
  const descripcion = DOM.inputDescripcion.value.trim();
  const whatsapp = DOM.inputWhatsapp.value.trim();
  const instagram = DOM.inputInstagram.value.trim();

  // Validación en frontend
  if (montoUsd < AppState.minimoUsdRequerido) {
    mostrarErrorFormulario(`El monto mínimo para ser el Rey del Puesto es ${formatUsd(AppState.minimoUsdRequerido)}.`);
    return;
  }

  if (!titulo) {
    mostrarErrorFormulario('El título del anuncio es obligatorio.');
    return;
  }

  if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
    mostrarErrorFormulario('El enlace web debe comenzar con http:// o https://');
    return;
  }

  // Deshabilitar botón y activar spinner
  DOM.btnSubmitPuja.disabled = true;
  DOM.btnSubmitIcon.textContent = '⏳';
  DOM.btnSubmitText.textContent = 'Generando orden de pago en Mercado Pago...';

  try {
    const payload = {
      titulo,
      descripcion,
      link_url: linkUrl,
      imagen_url: imagenUrl,
      monto_usd: montoUsd,
      redes: {
        whatsapp: whatsapp || null,
        instagram: instagram || null
      }
    };

    const response = await fetch('/api/crear-puja', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Ocurrió un error al procesar la puja.');
    }

    // Redirigir al Checkout Pro de Mercado Pago (o simulador de prueba)
    if (data.init_point) {
      window.location.href = data.init_point;
    } else {
      throw new Error('No se recibió la URL de pago de Mercado Pago.');
    }
  } catch (err) {
    mostrarErrorFormulario(err.message);
    DOM.btnSubmitPuja.disabled = false;
    DOM.btnSubmitIcon.textContent = '⚡';
    DOM.btnSubmitText.textContent = 'Continuar al Pago con Mercado Pago';
  }
}

function mostrarErrorFormulario(mensaje) {
  if (DOM.formErrorMsg) {
    DOM.formErrorMsg.textContent = mensaje;
    DOM.formErrorMsg.classList.remove('hidden');
  }
}

/**
 * Muestra alertas tipo banner en la parte superior
 */
function mostrarAlerta(mensaje, tipo = 'info') {
  if (!DOM.alertBanner) return;

  const colores = {
    exito: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    error: 'bg-rose-50 border-rose-300 text-rose-800',
    info: 'bg-amber-50 border-amber-300 text-amber-800'
  };

  DOM.alertBanner.className = `p-4 rounded-2xl border ${colores[tipo] || colores.info} flex items-center justify-between shadow-xs`;
  DOM.alertBanner.innerHTML = `
    <div class="flex items-center gap-2.5 text-sm font-semibold">
      <span>${tipo === 'exito' ? '🎉' : tipo === 'error' ? '⚠️' : 'ℹ️'}</span>
      <span>${mensaje}</span>
    </div>
    <button onclick="this.parentElement.classList.add('hidden')" class="text-xs font-bold px-2 py-1 hover:opacity-75 cursor-pointer">
      Cerrar
    </button>
  `;
  DOM.alertBanner.classList.remove('hidden');
}

/**
 * Revisa si volvemos de Mercado Pago con el resultado del pago en la URL
 */
function revisarParametrosUrl() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('pago') || params.get('status');
  const anuncioId = params.get('id');

  if (status === 'exito' || status === 'approved') {
    mostrarAlerta('¡Felicitaciones! Tu pago fue procesado con éxito y tu anuncio ya está activo en la cartelera.', 'exito');
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (status === 'fallo' || status === 'failure') {
    mostrarAlerta('El pago no pudo procesarse o fue cancelado. Podés volver a intentar cuando quieras.', 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (status === 'pendiente' || status === 'pending') {
    mostrarAlerta('Tu pago está pendiente de acreditación. Apenas Mercado Pago lo confirme, se activará tu anuncio.', 'info');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// -------------------------------------------------------------
// EVENT LISTENERS & INICIALIZACIÓN
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Inicialización de datos
  cargarDatosCartelera();
  revisarParametrosUrl();

  // Abrir y cerrar modal
  if (DOM.btnAbrirPuja) {
    DOM.btnAbrirPuja.addEventListener('click', abrirModalPuja);
  }

  if (DOM.btnCerrarModal) {
    DOM.btnCerrarModal.addEventListener('click', cerrarModalPuja);
  }

  // Cerrar modal al hacer click fuera
  if (DOM.modalPuja) {
    DOM.modalPuja.addEventListener('click', (e) => {
      if (e.target === DOM.modalPuja) {
        cerrarModalPuja();
      }
    });
  }

  // Cerrar modal con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && DOM.modalPuja && !DOM.modalPuja.classList.contains('hidden')) {
      cerrarModalPuja();
    }
  });

  // Cálculo en vivo ARS en el modal
  if (DOM.inputMontoUsd) {
    DOM.inputMontoUsd.addEventListener('input', calcularArsEstimado);
  }

  // Envío del formulario
  if (DOM.formPuja) {
    DOM.formPuja.addEventListener('submit', procesarEnvioPuja);
  }

  // Recarga periódica suave cada 30 segundos
  setInterval(cargarDatosCartelera, 30000);
});

// Exponer funciones globales para botones inline si fuera necesario
window.abrirModalPuja = abrirModalPuja;
window.cerrarModalPuja = cerrarModalPuja;
