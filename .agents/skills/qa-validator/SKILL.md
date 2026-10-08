---
name: qa-validator
description: >-
  Especialista en QA, pruebas funcionales, seguridad de transacciones, validación de endpoints y despliegue en VPS para Rey del Puesto (RobameElPuesto). Activar para certificar funcionalidad y checklist de producción.
---

# Agente QA, Validación Funcional y Verificación (QA Specialist)

Este agente se encarga de corroborar que todos los componentes, flujos y medidas de seguridad funcionen a la perfección antes de la puesta en producción.

## Misión Principal
Auditar la aplicación de punta a punta, verificar la coherencia entre frontend y backend, comprobar la invulnerabilidad de las pujas y certificar el aislamiento para el despliegue en DonWeb.

## Batería de Pruebas y Validaciones

### 1. Pruebas de Seguridad y Anti-Tampering
- **Validación del Monto en Backend:** Simular peticiones `POST /api/crear-puja` con montos menores al mínimo para confirmar que el backend bloquea con `400 Bad Request` sin importar lo que envíe el cliente.
- **Tipos de Datos:** Asegurar que `monto_usd` se compare siempre como flotante numérico y no como string (`Number(monto_usd)`).
- **Sanitización de URLs e Inputs:** Comprobar que los links ingresados comiencen con `http://` o `https://` y no permitan inyecciones.

### 2. Pruebas de Flujo y Pasarela de Pago
- **Consulta de DolarApi:** Validar el comportamiento con API online y verificar que el fallback local de cotización actúe si la red se corta.
- **Ciclo de Vida de Anuncios:**
  - Creación con estado `pendiente`.
  - No aparición en la cartelera mientras esté en `pendiente`.
  - Transición a `activo` tras confirmación del webhook.
- **Prueba de Idempotencia de Webhook:** Enviar 2 o más veces el mismo payload de notificación simulado y verificar que no se dupliquen registros ni se altere el estado de forma errónea.

### 3. Pruebas de Experiencia e Interfaz (UI/UX)
- Renderizado correcto del Rey (#1) con todos sus datos y badges dorados.
- Ordenamiento descendente estricto por `monto_usd` en la lista #2 al #100.
- Límite exacto de 100 anuncios en la visualización principal.
- Comportamiento del modal de puja: cálculo dinámico a ARS en tiempo real según el dólar blue.
- Responsividad en dispositivos móviles y de escritorio.

### 4. Checklist de Despliegue en VPS (DonWeb)
- [ ] Puerto configurado mediante `PORT` en `.env` (sin conflicto con `mkcore`).
- [ ] Directorio del proyecto `/var/www/reydelpuesto` independiente.
- [ ] Configuración Nginx (`proxy_pass http://127.0.0.1:PORT`) con certificado SSL Let's Encrypt.
- [ ] Proceso gestionado por PM2 (`pm2 start server.js --name reydelpuesto`).
- [ ] Permisos de lectura/escritura correctos para el archivo SQLite `database.sqlite`.
