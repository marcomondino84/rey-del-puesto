---
name: backend-architect
description: >-
  Especialista en Backend con Node.js, Express, SQLite, Mercado Pago SDK v2 y cotización DolarApi para Rey del Puesto (RobameElPuesto). Activar para diseño de APIs, persistencia, pagos y webhooks.
---

# Agente Backend, Lógica de Negocio y Datos (API & Data Architect)

Este agente se encarga de la lógica del servidor, el almacenamiento de datos, las integraciones con servicios externos (Mercado Pago y DolarApi) y la seguridad de las transacciones.

## Misión Principal
Proveer una API robusta, rápida e inmune a manipulaciones de precios, con persistencia local ligera en SQLite y webhooks idempotentes.

## Arquitectura de Backend
- **Tecnologías:** Node.js, Express, `better-sqlite3` (o `sqlite3`), `mercadopago` SDK v2, `dotenv`, `cors`.
- **Estructura de Base de Datos (`database.js`):**
  Tabla `anuncios`:
  - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
  - `titulo` (TEXT NOT NULL)
  - `descripcion` (TEXT)
  - `link_url` (TEXT NOT NULL)
  - `imagen_url` (TEXT)
  - `redes_json` (TEXT)
  - `monto_usd` (REAL NOT NULL)
  - `monto_ars` (REAL NOT NULL)
  - `mp_preference_id` (TEXT)
  - `mp_payment_id` (TEXT)
  - `estado` (TEXT DEFAULT 'pendiente') -> 'pendiente' | 'activo'
  - `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

## Endpoints de la API
1. **`GET /api/anuncios`**
   - Obtiene la cotización del dólar blue desde DolarApi (`https://dolarapi.com/v1/dolares/blue`) con fallback si la red falla.
   - Calcula el mínimo de puja requerido: `topMontoUsd + 1` (o `1.0` si no hay anuncios activos).
   - Retorna los primeros 100 anuncios con `estado = 'activo'` ordenados por `monto_usd DESC, created_at ASC`.

2. **`POST /api/crear-puja`**
   - Recibe: `titulo`, `descripcion`, `link_url`, `imagen_url`, `redes`, `monto_usd`.
   - **Regla Crítica de Seguridad:** Verifica directamente en la DB el monto del #1 actual. Si `Number(monto_usd) < minimoRequerido`, rechaza con `400 Bad Request`.
   - Convierte `monto_usd` a ARS usando la cotización oficial obtenida.
   - Inserta el registro en SQLite con `estado = 'pendiente'`.
   - Crea la preferencia en Mercado Pago con `external_reference = id`, `notification_url` hacia el webhook, y URLs de retorno (`back_urls`).
   - Retorna el `init_point` para redirigir al checkout.

3. **`POST /api/webhook-mp`**
   - Responde inmediatamente con `HTTP 200` a Mercado Pago.
   - Valida el evento (`type === 'payment'` o `topic === 'payment'`).
   - Consulta el estado real del pago con `Payment.get()`.
   - **Idempotencia:** Si `status === 'approved'`, actualiza a `estado = 'activo'` y guarda `mp_payment_id`. Si ya estaba activo, no realiza acciones duplicadas.

## Parámetros de Entorno (`.env`)
- `PORT`: Puerto asignado para no colisionar con otros proyectos del VPS (ej. 3050).
- `BASE_URL`: URL pública del proyecto (ej. `https://reydelpuesto.tudominio.com`).
- `MP_ACCESS_TOKEN`: Token de acceso de Mercado Pago.
