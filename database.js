/**
 * database.js
 * Módulo de persistencia SQLite para "Rey del Puesto".
 * Diseñado con compatibilidad universal: utiliza el motor nativo de Node.js (node:sqlite)
 * y soporta better-sqlite3 como fallback si estuviera instalado.
 */

const fs = require('fs');
const path = require('path');

// Asegurar que exista el directorio de datos
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');

let dbDriver;
let isNative = false;

try {
  // Intentar primero con el motor nativo de Node.js 22+ (DatabaseSync)
  const { DatabaseSync } = require('node:sqlite');
  dbDriver = new DatabaseSync(dbPath);
  isNative = true;
  console.log('✅ Base de datos SQLite conectada vía motor nativo (node:sqlite)');
} catch (nativeErr) {
  try {
    const BetterSqlite3 = require('better-sqlite3');
    dbDriver = new BetterSqlite3(dbPath);
    console.log('✅ Base de datos SQLite conectada vía better-sqlite3');
  } catch (betterErr) {
    console.error('❌ Error crítico al inicializar SQLite:', nativeErr.message, betterErr.message);
    throw new Error('No se pudo inicializar ningún controlador de SQLite compatible.');
  }
}

// Inicializar esquema de la tabla de anuncios
const initSchema = () => {
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS anuncios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      link_url TEXT NOT NULL,
      imagen_url TEXT,
      redes_json TEXT,
      monto_usd REAL NOT NULL,
      monto_ars REAL NOT NULL,
      mp_preference_id TEXT,
      mp_payment_id TEXT,
      estado TEXT DEFAULT 'pendiente',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_anuncios_ranking 
    ON anuncios(estado, monto_usd DESC, created_at ASC);
  `;

  dbDriver.exec(schemaSql);
};

initSchema();

// Helper unificado para consultas (wrapper compatible con ambos drivers)
const db = {
  raw: dbDriver,

  /**
   * Obtiene el anuncio que actualmente es el Rey (#1)
   */
  getTopAnuncioActivo() {
    const stmt = dbDriver.prepare(`
      SELECT * FROM anuncios 
      WHERE estado = 'activo' 
      ORDER BY monto_usd DESC, created_at ASC 
      LIMIT 1
    `);
    const row = stmt.get();
    return row || null;
  },

  /**
   * Calcula el monto mínimo en USD requerido para pujar por el Puesto #1
   */
  getMinimoUsdRequerido() {
    const top = this.getTopAnuncioActivo();
    if (!top || typeof top.monto_usd !== 'number') {
      return 1.0;
    }
    // Mínimo $1 USD más que el rey actual
    return Number((Number(top.monto_usd) + 1.0).toFixed(2));
  },

  /**
   * Obtiene los primeros 100 anuncios activos para la cartelera
   */
  getAnunciosActivos(limit = 100) {
    const stmt = dbDriver.prepare(`
      SELECT * FROM anuncios 
      WHERE estado = 'activo' 
      ORDER BY monto_usd DESC, created_at ASC 
      LIMIT ?
    `);
    const rows = stmt.all(limit);
    return rows || [];
  },

  /**
   * Busca un anuncio por su ID numérico
   */
  getAnuncioPorId(id) {
    const stmt = dbDriver.prepare('SELECT * FROM anuncios WHERE id = ?');
    return stmt.get(Number(id)) || null;
  },

  /**
   * Crea un nuevo anuncio en estado 'pendiente'
   */
  crearAnuncioPendiente({ titulo, descripcion, link_url, imagen_url, redes_json, monto_usd, monto_ars, mp_preference_id = null }) {
    const stmt = dbDriver.prepare(`
      INSERT INTO anuncios (
        titulo, descripcion, link_url, imagen_url, 
        redes_json, monto_usd, monto_ars, mp_preference_id, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')
    `);

    const result = stmt.run(
      titulo,
      descripcion || '',
      link_url,
      imagen_url || '',
      redes_json || '{}',
      Number(monto_usd),
      Number(monto_ars),
      mp_preference_id
    );

    return Number(result.lastInsertRowid);
  },

  /**
   * Actualiza el preference_id de Mercado Pago de un anuncio
   */
  actualizarPreferenceId(id, preferenceId) {
    const stmt = dbDriver.prepare('UPDATE anuncios SET mp_preference_id = ? WHERE id = ?');
    return stmt.run(preferenceId, Number(id));
  },

  /**
   * Activa un anuncio tras comprobar el pago (Operación Idempotente)
   */
  activarAnuncio(id, mp_payment_id) {
    const stmt = dbDriver.prepare(`
      UPDATE anuncios 
      SET estado = 'activo', mp_payment_id = ? 
      WHERE id = ? AND estado != 'activo'
    `);
    const result = stmt.run(String(mp_payment_id || ''), Number(id));
    return result.changes > 0;
  },

  /**
   * Cuenta total de anuncios activos
   */
  contarAnunciosActivos() {
    const stmt = dbDriver.prepare("SELECT COUNT(*) as total FROM anuncios WHERE estado = 'activo'");
    const res = stmt.get();
    return res ? Number(res.total) : 0;
  }
};

module.exports = db;
