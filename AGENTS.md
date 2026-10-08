# Rey del Puesto - Guía y Orquestación de Agentes

Bienvenido al espacio de trabajo de **"Rey del Puesto"**.
Este documento rige la arquitectura general, el aislamiento en el servidor VPS de DonWeb y la orquestación del flujo de trabajo entre los tres agentes especializados.

---

## 1. Principio Fundamental de Aislamiento (VPS DonWeb)
- **Cero interferencia con `mkcore`:** Este proyecto corre en el mismo VPS que `mkcore`, pero debe mantenerse **100% aislado**.
- **Puertos de Red:** Utilizar un puerto exclusivo configurado por variable de entorno `PORT` (por defecto `3050` o el que se designe, jamás colisionar con los puertos de mkcore).
- **Directorio de Despliegue:** Ubicado en su propio directorio (ej. `/var/www/reydelpuesto`).
- **Base de Datos:** SQLite local independiente (`data/database.sqlite`), autocontenida sin dependencias externas.
- **Nginx Reverse Proxy:** Bloque de servidor (*Server Block*) propio con su propio dominio/subdominio y certificados SSL independientes.
- **Variables de Entorno:** Archivo `.env` propio, nunca comiteado al repositorio.

---

## 2. Tríada de Agentes Especializados

Para garantizar la máxima calidad y fiabilidad, el proyecto se desarrolla y mantiene bajo tres roles/skills especializados:

1. **Agente Frontend, Diseño e Ideas (`frontend-designer`):**
   - Responsable de la interfaz visual, Tailwind CSS, experiencia de usuario (UX), modales interactivos, microinteracciones, responsividad mobile-first y la presentación jerárquica del Puesto #1 y Puestos #2-#100.
   - Skill: `.agents/skills/frontend-designer/SKILL.md`

2. **Agente Backend y Lógica de Negocio (`backend-architect`):**
   - Responsable del servidor Node.js + Express, persistencia SQLite (`better-sqlite3`), integración con la API de DolarApi (con fallback), Checkout Pro de Mercado Pago v2 y Webhooks con idempotencia.
   - Skill: `.agents/skills/backend-architect/SKILL.md`

3. **Agente QA, Verificación y Despliegue (`qa-validator`):**
   - Responsable de auditar la seguridad (validación estricta de pujas en backend contra DB), verificar la integridad de los endpoints, simular pagos y webhooks, y certificar el checklist para el despliegue en el VPS DonWeb.
   - Skill: `.agents/skills/qa-validator/SKILL.md`

---

## 3. Flujo de Trabajo
1. **Fase Frontend:** Diseño de componentes, maquetación del Hero #1, lista horizontal #2-#100, modal de puja y cálculo de cotización en tiempo real.
2. **Fase Backend:** Creación de base de datos SQLite, endpoints `/api/anuncios`, `/api/crear-puja`, `/api/webhook-mp`, cotizador blue y Mercado Pago.
3. **Fase QA & Validación:** Pruebas de integración, verificación de idempotencia, seguridad anti-tampering y scripts de despliegue listos para producción.
