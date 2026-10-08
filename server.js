/**
 * server.js
 * Servidor principal de "Rey del Puesto".
 * Desarrollado con Node.js, Express, SQLite y Mercado Pago SDK v2.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3050;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || '';
const DOLAR_FALLBACK = Number(process.env.DOLAR_BLUE_FALLBACK) || 1350;

// Configurar cliente de Mercado Pago si existe token válido
let mpClient = null;
let mpPreference = null;
let mpPayment = null;

if (MP_ACCESS_TOKEN && !MP_ACCESS_TOKEN.includes('TEST_ACCESS_TOKEN')) {
  try {
    mpClient = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
    mpPreference = new Preference(mpClient);
    mpPayment = new Payment(mpClient);
    console.log('💳 Mercado Pago SDK v2 inicializado correctamente.');
  } catch (err) {
    console.warn('⚠️ Error al configurar Mercado Pago SDK:', err.message);
  }
} else {
  console.log('ℹ️ Modo desarrollo: Mercado Pago no configurado o con token de prueba. Se activará simulador de pago.');
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------
// CACHÉ Y OBTENCIÓN DE COTIZACIÓN DÓLAR BLUE (DolarApi)
// -------------------------------------------------------------
let cotizacionCache = {
  venta: DOLAR_FALLBACK,
  actualizado: null,
  expira: 0
};

async function obtenerCotizacionDolarBlue() {
  const ahora = Date.now();
  // Caché de 5 minutos (300,000 ms) para evitar spam a la API
  if (cotizacionCache.actualizado && ahora < cotizacionCache.expira) {
    return cotizacionCache;
  }

  try {
    // Usar fetch nativo de Node.js 18+
    const response = await fetch('https://dolarapi.com/v1/dolares/blue', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000) // Timeout de 4 segundos
    });

    if (!response.ok) {
      throw new Error(`Respuesta HTTP no exitosa: ${response.status}`);
    }

    const data = await response.json();
    const precioVenta = Number(data.venta);

    if (precioVenta && !isNaN(precioVenta) && precioVenta > 0) {
      cotizacionCache = {
        venta: precioVenta,
        fechaActualizacion: data.fechaActualizacion || new Date().toISOString(),
        expira: ahora + (5 * 60 * 1000),
        fuente: 'dolarapi.com (blue)'
      };
      return cotizacionCache;
    }
  } catch (err) {
    console.warn(`⚠️ Falla al consultar DolarApi (${err.message}). Utilizando cotización de fallback ($${DOLAR_FALLBACK} ARS).`);
  }

  // Fallback seguro
  cotizacionCache = {
    venta: DOLAR_FALLBACK,
    fechaActualizacion: new Date().toISOString(),
    expira: ahora + (60 * 1000), // Reintentar en 1 minuto
    fuente: 'fallback_local'
  };
  return cotizacionCache;
}

// -------------------------------------------------------------
// ENDPOINTS DE LA API
// -------------------------------------------------------------

/**
 * GET /api/anuncios
 * Retorna la cotización actual, el valor mínimo para ser el #1 y el ranking de anuncios
 */
app.get('/api/anuncios', async (req, res) => {
  try {
    const cotizacion = await obtenerCotizacionDolarBlue();
    const minimoUsd = db.getMinimoUsdRequerido();
    const todosActivos = db.getAnunciosActivos(100);

    const rey = todosActivos.length > 0 ? todosActivos[0] : null;
    const puestosSiguientes = todosActivos.length > 1 ? todosActivos.slice(1) : [];

    res.json({
      success: true,
      cotizacion_usd_ars: cotizacion.venta,
      fuente_cotizacion: cotizacion.fuente,
      fecha_cotizacion: cotizacion.fechaActualizacion,
      minimo_usd_requerido: minimoUsd,
      anuncio_rey: rey,
      anuncios_puestos_2_100: puestosSiguientes,
      total_activos: todosActivos.length
    });
  } catch (err) {
    console.error('Error al obtener anuncios:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor al consultar la cartelera.' });
  }
});

/**
 * POST /api/crear-puja
 * Valida los datos y el monto contra la base de datos, calcula ARS y crea preferencia en Mercado Pago
 */
app.post('/api/crear-puja', async (req, res) => {
  try {
    const { titulo, descripcion, link_url, imagen_url, redes, monto_usd } = req.body;

    // 1. Validaciones básicas de entrada
    if (!titulo || typeof titulo !== 'string' || titulo.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'El título del anuncio es obligatorio.' });
    }

    if (!link_url || typeof link_url !== 'string' || !/^https?:\/\//i.test(link_url.trim())) {
      return res.status(400).json({ success: false, error: 'Debes proporcionar un enlace de destino válido (comenzando con http:// o https://).' });
    }

    const montoNumerico = Number(monto_usd);
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      return res.status(400).json({ success: false, error: 'El monto de la puja debe ser un número positivo.' });
    }

    // 2. VALIDACIÓN CRÍTICA CONTRA LA BASE DE DATOS
    const minimoRequerido = db.getMinimoUsdRequerido();
    if (montoNumerico < minimoRequerido) {
      return res.status(400).json({
        success: false,
        error: `El monto de la puja ($${montoNumerico} USD) es insuficiente. El mínimo actual para robar el Puesto #1 es $${minimoRequerido} USD.`
      });
    }

    // 3. Conversión a ARS según cotización actual
    const cotizacion = await obtenerCotizacionDolarBlue();
    const montoArs = Math.round(montoNumerico * cotizacion.venta);

    // 4. Serializar redes sociales
    const redesJson = typeof redes === 'object' ? JSON.stringify(redes) : (redes || '{}');

    // 5. Guardar en estado 'pendiente'
    const anuncioId = db.crearAnuncioPendiente({
      titulo: titulo.trim().substring(0, 100),
      descripcion: (descripcion || '').trim().substring(0, 300),
      link_url: link_url.trim(),
      imagen_url: (imagen_url || '').trim(),
      redes_json: redesJson,
      monto_usd: montoNumerico,
      monto_ars: montoArs
    });

    // 6. Generar preferencia en Mercado Pago
    let initPoint = '';
    let isSimulated = false;

    if (mpPreference) {
      try {
        const preferenceBody = {
          items: [
            {
              id: `puesto-${anuncioId}`,
              title: `Rey del Puesto #1: ${titulo.trim().substring(0, 40)}`,
              description: `Puja de subasta para ser el Rey del Puesto ($${montoNumerico} USD)`,
              quantity: 1,
              unit_price: Number(montoArs),
              currency_id: 'ARS'
            }
          ],
          external_reference: String(anuncioId)
        };

        const isPublicUrl = BASE_URL.startsWith('https://') && !BASE_URL.includes('localhost') && !BASE_URL.includes('127.0.0.1');

        if (isPublicUrl) {
          preferenceBody.notification_url = `${BASE_URL}/api/webhook-mp`;
          preferenceBody.back_urls = {
            success: `${BASE_URL}/?pago=exito&id=${anuncioId}`,
            pending: `${BASE_URL}/?pago=pendiente&id=${anuncioId}`,
            failure: `${BASE_URL}/?pago=fallo&id=${anuncioId}`
          };
          preferenceBody.auto_return = 'approved';
        } else {
          // En entorno de desarrollo local con localhost
          preferenceBody.back_urls = {
            success: `https://google.com`,
            pending: `https://google.com`,
            failure: `https://google.com`
          };
        }

        const mpRes = await mpPreference.create({ body: preferenceBody });
        initPoint = mpRes.init_point || mpRes.sandbox_init_point;
        db.actualizarPreferenceId(anuncioId, mpRes.id);
        console.log(`✅ Preferencia de Mercado Pago creada con éxito: ${mpRes.id}`);
      } catch (mpErr) {
        console.error('Error al crear preferencia con Mercado Pago:', mpErr);
        // Fallback a simulación si las credenciales fallan
        initPoint = `${BASE_URL}/simulador-pago.html?id=${anuncioId}&usd=${montoNumerico}&ars=${montoArs}`;
        isSimulated = true;
      }
    } else {
      // Modo simulación de desarrollo local
      initPoint = `${BASE_URL}/simulador-pago.html?id=${anuncioId}&usd=${montoNumerico}&ars=${montoArs}`;
      isSimulated = true;
    }

    res.json({
      success: true,
      anuncio_id: anuncioId,
      monto_usd: montoNumerico,
      monto_ars: montoArs,
      init_point: initPoint,
      simulated: isSimulated
    });
  } catch (err) {
    console.error('Error al crear puja:', err);
    res.status(500).json({ success: false, error: 'Error interno al procesar la puja.' });
  }
});

/**
 * POST /api/webhook-mp
 * Recepción y validación de notificaciones de pago de Mercado Pago (Idempotente)
 */
app.post('/api/webhook-mp', async (req, res) => {
  // Responder inmediatamente HTTP 200 para que Mercado Pago no reintente en bucle
  res.status(200).send('OK');

  try {
    const paymentId = req.query['data.id'] || req.query.id || req.body?.data?.id || req.body?.id;
    const type = req.query.type || req.query.topic || req.body?.type;

    if (!paymentId) {
      return;
    }

    if (type && type !== 'payment') {
      return;
    }

    console.log(`🔔 Webhook recibido para Payment ID: ${paymentId}`);

    if (mpPayment) {
      const paymentInfo = await mpPayment.get({ id: paymentId });

      if (paymentInfo && paymentInfo.status === 'approved') {
        const anuncioId = paymentInfo.external_reference;
        if (anuncioId) {
          const activado = db.activarAnuncio(anuncioId, paymentId);
          if (activado) {
            console.log(`🎉 Anuncio #${anuncioId} activado exitosamente tras confirmación de Mercado Pago.`);
          } else {
            console.log(`ℹ️ Anuncio #${anuncioId} ya se encontraba activo (idempotencia confirmada).`);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error al procesar webhook de Mercado Pago:', err);
  }
});

/**
 * POST /api/simular-aprobacion
 * Endpoint de apoyo para pruebas locales y demostración cuando no hay token de MP activo
 */
app.post('/api/simular-aprobacion', (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'ID de anuncio requerido.' });
    }

    const anuncio = db.getAnuncioPorId(id);
    if (!anuncio) {
      return res.status(404).json({ success: false, error: 'Anuncio no encontrado.' });
    }

    const fakePaymentId = 'SIM-' + Date.now();
    db.activarAnuncio(id, fakePaymentId);

    console.log(`🧪 Pago simulado exitosamente para el anuncio #${id}`);
    res.json({ success: true, mensaje: 'Anuncio activado mediante simulación.' });
  } catch (err) {
    console.error('Error en simulación:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Manejo de rutas del SPA / fallback a index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicialización del servidor
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Rey del Puesto corriendo en:`);
  console.log(`   URL Local:   http://localhost:${PORT}`);
  console.log(`   BASE_URL:    ${BASE_URL}`);
  console.log(`   Puerto:      ${PORT} (Aislado de mkcore)`);
  console.log(`=======================================================`);
});
