/**
 * public/admin.js
 * Lógica del panel de administración oculto para Rey del Puesto.
 */

const AdminState = {
  token: sessionStorage.getItem('admin_token') || '',
  anuncios: [],
  stats: {}
};

// Elementos DOM
const DOMElements = {
  pantallaLogin: document.getElementById('pantalla-login'),
  pantallaDashboard: document.getElementById('pantalla-dashboard'),
  formLogin: document.getElementById('form-login'),
  inputUser: document.getElementById('admin-user'),
  inputPass: document.getElementById('admin-pass'),
  loginError: document.getElementById('login-error'),
  btnLogin: document.getElementById('btn-login'),
  btnLogout: document.getElementById('btn-logout'),
  btnRefrescar: document.getElementById('btn-refrescar'),

  // Métricas
  metricOnlineReal: document.getElementById('metric-online-real'),
  metricActivos: document.getElementById('metric-activos'),
  metricTotalUsd: document.getElementById('metric-total-usd'),
  metricTotalArs: document.getElementById('metric-total-ars'),

  // Tabla
  tablaBody: document.getElementById('tabla-anuncios-body'),

  // Modal Crear Directo
  modalCrear: document.getElementById('modal-crear'),
  btnAbrirCrear: document.getElementById('btn-abrir-crear'),
  btnCerrarCrear: document.getElementById('btn-cerrar-crear'),
  formCrear: document.getElementById('form-crear'),
  crearMonto: document.getElementById('crear-monto'),
  crearTitulo: document.getElementById('crear-titulo'),
  crearLink: document.getElementById('crear-link'),
  tabCrearSubir: document.getElementById('tab-crear-subir'),
  tabCrearLink: document.getElementById('tab-crear-link'),
  panelCrearSubir: document.getElementById('panel-crear-subir'),
  panelCrearLink: document.getElementById('panel-crear-link'),
  crearArchivoImagen: document.getElementById('crear-archivo-imagen'),
  crearImagenUrl: document.getElementById('crear-imagen-url'),
  crearImagenFinal: document.getElementById('crear-imagen-final'),
  crearEstadoCompresion: document.getElementById('crear-estado-compresion'),
  crearTextoCompresion: document.getElementById('crear-texto-compresion'),
  crearPreviewContainer: document.getElementById('crear-preview-container'),
  crearPreviewImg: document.getElementById('crear-preview-img'),
  crearPreviewInfo: document.getElementById('crear-preview-info'),
  crearBtnQuitarImagen: document.getElementById('crear-btn-quitar-imagen'),
  crearDescripcion: document.getElementById('crear-descripcion'),
  crearWhatsapp: document.getElementById('crear-whatsapp'),
  crearInstagram: document.getElementById('crear-instagram'),
  crearEstado: document.getElementById('crear-estado'),
  crearError: document.getElementById('crear-error'),
  btnGuardarCrear: document.getElementById('btn-guardar-crear'),

  // Modal Editar
  modalEdit: document.getElementById('modal-editar'),
  btnCerrarEdit: document.getElementById('btn-cerrar-edit'),
  formEdit: document.getElementById('form-editar'),
  editIdBadge: document.getElementById('edit-id-badge'),
  editId: document.getElementById('edit-id'),
  editTitulo: document.getElementById('edit-titulo'),
  editLink: document.getElementById('edit-link'),
  editImagen: document.getElementById('edit-imagen'),
  editDescripcion: document.getElementById('edit-descripcion'),
  editWhatsapp: document.getElementById('edit-whatsapp'),
  editInstagram: document.getElementById('edit-instagram'),
  editEstado: document.getElementById('edit-estado'),
  editError: document.getElementById('edit-error'),
  btnGuardarEdit: document.getElementById('btn-guardar-edit')
};

// Formateadores
const formatArs = (monto) => '$' + Math.round(Number(monto)).toLocaleString('es-AR') + ' ARS';
const formatUsd = (monto) => '$' + Number(monto).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' USD';
const escapeHtml = (str) => {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  if (AdminState.token) {
    mostrarDashboard();
  } else {
    mostrarLogin();
  }

  // Listener login
  if (DOMElements.formLogin) {
    DOMElements.formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = DOMElements.inputUser.value.trim();
      const password = DOMElements.inputPass.value.trim();

      DOMElements.btnLogin.disabled = true;
      DOMElements.btnLogin.textContent = 'Verificando...';
      DOMElements.loginError.classList.add('hidden');

      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          AdminState.token = data.token;
          sessionStorage.setItem('admin_token', data.token);
          mostrarDashboard();
        } else {
          throw new Error(data.error || 'Credenciales incorrectas');
        }
      } catch (err) {
        DOMElements.loginError.textContent = err.message;
        DOMElements.loginError.classList.remove('hidden');
      } finally {
        DOMElements.btnLogin.disabled = false;
        DOMElements.btnLogin.textContent = 'Iniciar Sesión';
      }
    });
  }

  // Logout
  if (DOMElements.btnLogout) {
    DOMElements.btnLogout.addEventListener('click', () => {
      sessionStorage.removeItem('admin_token');
      AdminState.token = '';
      mostrarLogin();
    });
  }

  // Refrescar
  if (DOMElements.btnRefrescar) {
    DOMElements.btnRefrescar.addEventListener('click', cargarDatosDashboard);
  }

  // Modal crear directo
  if (DOMElements.btnAbrirCrear) {
    DOMElements.btnAbrirCrear.addEventListener('click', abrirModalCrear);
  }
  if (DOMElements.btnCerrarCrear) {
    DOMElements.btnCerrarCrear.addEventListener('click', cerrarModalCrear);
  }
  if (DOMElements.formCrear) {
    DOMElements.formCrear.addEventListener('submit', guardarNuevaPublicacionAdmin);
  }
  configurarUploaderAdmin();

  // Modal editar cerrar
  if (DOMElements.btnCerrarEdit) {
    DOMElements.btnCerrarEdit.addEventListener('click', cerrarModalEdit);
  }

  // Guardar edición
  if (DOMElements.formEdit) {
    DOMElements.formEdit.addEventListener('submit', guardarEdicionAnuncio);
  }
});

function mostrarLogin() {
  DOMElements.pantallaLogin.classList.remove('hidden');
  DOMElements.pantallaDashboard.classList.add('hidden');
  DOMElements.inputPass.value = '';
}

function mostrarDashboard() {
  DOMElements.pantallaLogin.classList.add('hidden');
  DOMElements.pantallaDashboard.classList.remove('hidden');
  cargarDatosDashboard();
}

/**
 * Consulta la API y carga estadísticas y listado de anuncios
 */
async function cargarDatosDashboard() {
  try {
    const res = await fetch('/api/admin/datos', {
      headers: { 'Authorization': 'Bearer ' + AdminState.token }
    });

    if (res.status === 401 || res.status === 403) {
      sessionStorage.removeItem('admin_token');
      AdminState.token = '';
      mostrarLogin();
      return;
    }

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Error al obtener datos');

    AdminState.anuncios = data.anuncios || [];
    AdminState.stats = data.stats || {};

    // Actualizar métricas
    if (DOMElements.metricOnlineReal) {
      DOMElements.metricOnlineReal.textContent = data.visitantes_reales || 1;
    }
    if (DOMElements.metricActivos) {
      DOMElements.metricActivos.textContent = data.stats.activos || 0;
    }
    if (DOMElements.metricTotalUsd) {
      DOMElements.metricTotalUsd.textContent = formatUsd(data.stats.total_usd || 0);
    }
    if (DOMElements.metricTotalArs) {
      DOMElements.metricTotalArs.textContent = formatArs(data.stats.total_ars || 0);
    }

    renderizarTablaAnuncios();
  } catch (err) {
    console.error('Error al cargar dashboard:', err);
    alert('Error al cargar datos del panel: ' + err.message);
  }
}

/**
 * Renderiza las filas de la tabla de anuncios
 */
function renderizarTablaAnuncios() {
  if (!DOMElements.tablaBody) return;

  if (AdminState.anuncios.length === 0) {
    DOMElements.tablaBody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-slate-500 text-xs">
          No hay publicaciones registradas aún en el sistema.
        </td>
      </tr>
    `;
    return;
  }

  DOMElements.tablaBody.innerHTML = AdminState.anuncios.map((ad) => {
    let redes = {};
    try {
      redes = typeof ad.redes_json === 'string' ? JSON.parse(ad.redes_json) : (ad.redes_json || {});
    } catch (e) {
      redes = {};
    }

    const estadoBadge = ad.estado === 'activo'
      ? `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🟢 Activo</span>`
      : `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">⏳ ${ad.estado}</span>`;

    const miniatura = ad.imagen_url
      ? `<img src="${escapeHtml(ad.imagen_url)}" class="w-9 h-9 rounded-lg object-cover bg-slate-800 shrink-0" onerror="this.remove()">`
      : `<div class="w-9 h-9 rounded-lg bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">📢</div>`;

    return `
      <tr class="hover:bg-slate-800/40 transition-colors">
        <td class="py-3 px-4 font-mono font-bold text-amber-400 text-xs">#${ad.id}</td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            ${miniatura}
            <div class="min-w-0 max-w-xs">
              <a href="${escapeHtml(ad.link_url)}" target="_blank" class="font-bold text-white hover:underline truncate block">
                ${escapeHtml(ad.titulo)}
              </a>
              <span class="text-[11px] text-slate-400 truncate block">
                ${escapeHtml(ad.descripcion || 'Sin descripción')}
              </span>
            </div>
          </div>
        </td>
        <td class="py-3 px-4 font-bold text-white font-display">${formatUsd(ad.monto_usd)}</td>
        <td class="py-3 px-4 font-mono text-xs text-sky-400">${formatArs(ad.monto_ars)}</td>
        <td class="py-3 px-4">${estadoBadge}</td>
        <td class="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">${(ad.created_at || '').substring(0, 16)}</td>
        <td class="py-3 px-4 text-right">
          <div class="inline-flex items-center gap-2">
            <button onclick="abrirModalEditar(${ad.id})" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold border border-slate-700 transition-colors cursor-pointer" title="Modificar">
              ✏️ Editar
            </button>
            <button onclick="eliminarAnuncio(${ad.id})" class="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/20 transition-colors cursor-pointer" title="Eliminar">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Abre el modal para editar un anuncio
 */
window.abrirModalEditar = function (id) {
  const ad = AdminState.anuncios.find((a) => a.id === id);
  if (!ad) return;

  let redes = {};
  try {
    redes = typeof ad.redes_json === 'string' ? JSON.parse(ad.redes_json) : (ad.redes_json || {});
  } catch (e) {
    redes = {};
  }

  DOMElements.editId.value = ad.id;
  DOMElements.editIdBadge.textContent = '#' + ad.id;
  DOMElements.editTitulo.value = ad.titulo || '';
  DOMElements.editLink.value = ad.link_url || '';
  DOMElements.editImagen.value = ad.imagen_url || '';
  DOMElements.editDescripcion.value = ad.descripcion || '';
  DOMElements.editWhatsapp.value = redes.whatsapp || '';
  DOMElements.editInstagram.value = redes.instagram || '';
  DOMElements.editEstado.value = ad.estado || 'activo';

  DOMElements.editError.classList.add('hidden');
  DOMElements.modalEdit.classList.remove('hidden');
};

window.cerrarModalEdit = function () {
  if (DOMElements.modalEdit) {
    DOMElements.modalEdit.classList.add('hidden');
  }
};

/**
 * Guarda los cambios realizados en el formulario de edición
 */
async function guardarEdicionAnuncio(e) {
  e.preventDefault();

  const id = DOMElements.editId.value;
  const titulo = DOMElements.editTitulo.value.trim();
  const link_url = DOMElements.editLink.value.trim();
  const imagen_url = DOMElements.editImagen.value.trim();
  const descripcion = DOMElements.editDescripcion.value.trim();
  const whatsapp = DOMElements.editWhatsapp.value.trim();
  const instagram = DOMElements.editInstagram.value.trim();
  const estado = DOMElements.editEstado.value;

  DOMElements.btnGuardarEdit.disabled = true;
  DOMElements.btnGuardarEdit.textContent = 'Guardando...';

  try {
    const res = await fetch(`/api/admin/anuncios/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AdminState.token
      },
      body: JSON.stringify({
        titulo,
        descripcion,
        link_url,
        imagen_url,
        estado,
        redes: {
          whatsapp: whatsapp || null,
          instagram: instagram || null
        }
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Error al guardar');

    cerrarModalEdit();
    cargarDatosDashboard();
  } catch (err) {
    DOMElements.editError.textContent = err.message;
    DOMElements.editError.classList.remove('hidden');
  } finally {
    DOMElements.btnGuardarEdit.disabled = false;
    DOMElements.btnGuardarEdit.textContent = 'Guardar Cambios';
  }
}

/**
 * Elimina un anuncio con confirmación previa
 */
window.eliminarAnuncio = async function (id) {
  if (!confirm(`¿Estás seguro de que querés eliminar el anuncio #${id}? Esta acción no se puede deshacer.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/anuncios/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + AdminState.token }
    });
    const data = await res.json();

    if (!res.ok || !data.success) throw new Error(data.error || 'Error al eliminar');
    cargarDatosDashboard();
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

/**
 * Abre el modal para crear un anuncio directo
 */
window.abrirModalCrear = function () {
  if (DOMElements.formCrear) DOMElements.formCrear.reset();
  limpiarPreviewCrear();
  if (DOMElements.crearError) DOMElements.crearError.classList.add('hidden');
  if (DOMElements.modalCrear) {
    DOMElements.modalCrear.classList.remove('hidden');
    setTimeout(() => {
      if (DOMElements.crearMonto) DOMElements.crearMonto.focus();
    }, 50);
  }
};

window.cerrarModalCrear = function () {
  if (DOMElements.modalCrear) {
    DOMElements.modalCrear.classList.add('hidden');
  }
};

function limpiarPreviewCrear() {
  if (DOMElements.crearImagenFinal) DOMElements.crearImagenFinal.value = '';
  if (DOMElements.crearArchivoImagen) DOMElements.crearArchivoImagen.value = '';
  if (DOMElements.crearImagenUrl) DOMElements.crearImagenUrl.value = '';
  if (DOMElements.crearPreviewContainer) DOMElements.crearPreviewContainer.classList.add('hidden');
  if (DOMElements.crearPreviewImg) DOMElements.crearPreviewImg.src = '';
  if (DOMElements.crearPreviewInfo) DOMElements.crearPreviewInfo.textContent = '';
  if (DOMElements.crearEstadoCompresion) DOMElements.crearEstadoCompresion.classList.add('hidden');
}

/**
 * Configura los eventos del selector de imagen en el modal de creación admin
 */
function configurarUploaderAdmin() {
  if (!DOMElements.tabCrearSubir || !DOMElements.tabCrearLink) return;

  DOMElements.tabCrearSubir.addEventListener('click', () => {
    DOMElements.tabCrearSubir.className = 'px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 shadow-xs cursor-pointer';
    DOMElements.tabCrearLink.className = 'px-2 py-0.5 rounded-md text-slate-400 hover:text-white cursor-pointer';
    DOMElements.panelCrearSubir.classList.remove('hidden');
    DOMElements.panelCrearLink.classList.add('hidden');
  });

  DOMElements.tabCrearLink.addEventListener('click', () => {
    DOMElements.tabCrearLink.className = 'px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 shadow-xs cursor-pointer';
    DOMElements.tabCrearSubir.className = 'px-2 py-0.5 rounded-md text-slate-400 hover:text-white cursor-pointer';
    DOMElements.panelCrearLink.classList.remove('hidden');
    DOMElements.panelCrearSubir.classList.add('hidden');
  });

  // Archivo con auto-compresión
  if (DOMElements.crearArchivoImagen) {
    DOMElements.crearArchivoImagen.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('El archivo seleccionado debe ser una imagen válida.');
        return;
      }

      await procesarYSubirImagenAdmin(file);
    });
  }

  // URL manual con debounce
  if (DOMElements.crearImagenUrl) {
    let t = null;
    DOMElements.crearImagenUrl.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const url = (DOMElements.crearImagenUrl.value || '').trim();
        if (!url) {
          limpiarPreviewCrear();
          return;
        }
        DOMElements.crearImagenFinal.value = url;
        mostrarPreviewAdmin(url, null);
      }, 350);
    });
  }

  if (DOMElements.crearBtnQuitarImagen) {
    DOMElements.crearBtnQuitarImagen.addEventListener('click', limpiarPreviewCrear);
  }
}

async function procesarYSubirImagenAdmin(file) {
  try {
    if (DOMElements.crearEstadoCompresion) DOMElements.crearEstadoCompresion.classList.remove('hidden');
    if (DOMElements.btnGuardarCrear) DOMElements.btnGuardarCrear.disabled = true;

    const imgBitmap = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Formato de imagen inválido.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Error de lectura de archivo.'));
      reader.readAsDataURL(file);
    });

    const MAX_WIDTH = 1200;
    const MAX_HEIGHT = 630;
    let width = imgBitmap.width;
    let height = imgBitmap.height;

    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imgBitmap, 0, 0, width, height);

    let compressedDataUrl = canvas.toDataURL('image/webp', 0.82);
    if (!compressedDataUrl.startsWith('data:image/webp')) {
      compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
    }

    const res = await fetch('/api/subir-imagen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: compressedDataUrl, filename: file.name })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Error al subir');

    DOMElements.crearImagenFinal.value = data.url;
    const pesoKb = (data.sizeBytes / 1024).toFixed(0);
    mostrarPreviewAdmin(data.url, `${pesoKb} KB (Optimizada)`);
  } catch (err) {
    alert('Error con la imagen: ' + err.message);
  } finally {
    if (DOMElements.crearEstadoCompresion) DOMElements.crearEstadoCompresion.classList.add('hidden');
    if (DOMElements.btnGuardarCrear) DOMElements.btnGuardarCrear.disabled = false;
  }
}

function mostrarPreviewAdmin(url, info = null) {
  if (!DOMElements.crearPreviewContainer) return;
  DOMElements.crearPreviewContainer.classList.remove('hidden');
  DOMElements.crearPreviewImg.src = url;
  if (DOMElements.crearPreviewInfo) {
    DOMElements.crearPreviewInfo.textContent = info ? `⚡ ${info}` : '';
  }
}

/**
 * Guarda una nueva publicación directa desde el panel de admin
 */
async function guardarNuevaPublicacionAdmin(e) {
  e.preventDefault();

  const monto_usd = Number(DOMElements.crearMonto.value);
  const titulo = DOMElements.crearTitulo.value.trim();
  const link_url = DOMElements.crearLink.value.trim();
  const imagen_url = (DOMElements.crearImagenFinal.value || '').trim();
  const descripcion = DOMElements.crearDescripcion.value.trim();
  const whatsapp = DOMElements.crearWhatsapp.value.trim();
  const instagram = DOMElements.crearInstagram.value.trim();
  const estado = DOMElements.crearEstado.value || 'activo';

  if (!titulo || !link_url || !monto_usd) {
    DOMElements.crearError.textContent = 'Monto, título y enlace web son obligatorios.';
    DOMElements.crearError.classList.remove('hidden');
    return;
  }

  DOMElements.btnGuardarCrear.disabled = true;
  DOMElements.btnGuardarCrear.textContent = 'Publicando...';
  DOMElements.crearError.classList.add('hidden');

  try {
    const res = await fetch('/api/admin/anuncios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AdminState.token
      },
      body: JSON.stringify({
        monto_usd,
        titulo,
        link_url,
        imagen_url,
        descripcion,
        estado,
        redes: {
          whatsapp: whatsapp || null,
          instagram: instagram || null
        }
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Error al crear publicación');

    cerrarModalCrear();
    cargarDatosDashboard();
  } catch (err) {
    DOMElements.crearError.textContent = err.message;
    DOMElements.crearError.classList.remove('hidden');
  } finally {
    DOMElements.btnGuardarCrear.disabled = false;
    DOMElements.btnGuardarCrear.textContent = '👑 Publicar en Cartelera Directo';
  }
}
