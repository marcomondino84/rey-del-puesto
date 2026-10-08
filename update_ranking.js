const db = require('./database');

// Limpiar tabla de anuncios
db.raw.exec("DELETE FROM anuncios;");

// 1. Mk Core: Puesto #2 original (monto $1 USD)
db.raw.prepare(`
  INSERT INTO anuncios (id, titulo, descripcion, link_url, imagen_url, redes_json, monto_usd, monto_ars, mp_preference_id, mp_payment_id, estado, created_at)
  VALUES (1, 'Mk Core | Sistema de Gestión', 'Sistema de gestión Adaptable a tu Empresa. Accede y solicita tu demo.', 'https://www.mkcore.com.ar', '/uploads/banner-1791427225680-l0f89.webp', '{"whatsapp":"3462698956"}', 1.0, 1555.0, 'ADMIN_DIRECTO', 'ADMIN_DIRECTO', 'activo', '2026-10-08 00:00:00')
`).run();

// 2. Smash Burger King: Nuevo Rey Puesto #1 (monto $3 USD)
db.raw.prepare(`
  INSERT INTO anuncios (id, titulo, descripcion, link_url, imagen_url, redes_json, monto_usd, monto_ars, mp_preference_id, mp_payment_id, estado, created_at)
  VALUES (2, 'Smash Burger King 🍔', 'Las mejores hamburguesas smash artesanales con doble cheddar. ¡20% OFF por WhatsApp!', 'https://smashburgerking.com.ar', '/uploads/burger-rey.jpg', '{"whatsapp":"+5491138294021","instagram":"@smashburgerking"}', 3.0, 4665.0, 'ADMIN_DIRECTO', 'ADMIN_DIRECTO', 'activo', '2026-10-08 00:15:00')
`).run();

console.log('✅ Base de datos actualizada con éxito!');
console.log('👑 Puesto #1:', db.getTopAnuncioActivo().titulo, `($${db.getTopAnuncioActivo().monto_usd} USD)`);
const activos = db.getAnunciosActivos();
console.log('📋 Ranking activo:');
activos.forEach((a, idx) => console.log(`  #${idx + 1}: ${a.titulo} - $${a.monto_usd} USD`));
