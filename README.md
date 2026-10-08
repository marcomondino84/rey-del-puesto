# Rey del Puesto 👑

Plataforma publicitaria dinámica basada en el concepto **"King of the Hill"** (Rey de la Colina). Los anunciantes compiten en una subasta en tiempo real en USD cobrada en pesos argentinos (ARS) mediante **Mercado Pago** y cotizada con **DolarApi**.

---

## 🏛️ Dinámica y Reglas del Juego

1. **El Puesto #1 (El Rey):**
   - Tarjeta destacada Hero en la parte superior con borde dorado radiante y corona.
   - Máxima visibilidad, detalles completos, banner e iconos directos a sus redes.
2. **Top 2 al 100 (Cartelera en Disputa):**
   - Formato de fila rectangular compacto y ordenado descendentemente por el monto pagado.
   - Si un nuevo anunciante supera al Rey actual, el Rey anterior baja automáticamente al Puesto #2 y empuja a todos un lugar hacia abajo.
3. **Subasta Dinámica en USD:**
   - Monto inicial de la cartelera: **$1 USD**.
   - Para robar el trono: **Mínimo $1 USD más** que la puja ganadora del Rey actual.
   - Cobro en ARS calculado al momento mediante la cotización del **Dólar Blue** de DolarApi (con fallback local seguro).

---

## 🛠️ Stack Tecnológico

- **Backend:** Node.js, Express, SQLite con driver nativo de alta velocidad, Mercado Pago SDK v2 (`mercadopago`).
- **Frontend:** HTML5 semántico, Tailwind CSS, JavaScript Vanilla modular, tipografías Google Fonts (Plus Jakarta Sans & Outfit).
- **Control de Versiones y Despliegue:** Git, GitHub, PM2 y Nginx Reverse Proxy.

---

## 📂 Estructura del Proyecto

```text
├── .agents/
│   └── skills/
│       ├── frontend-designer/     # Agente de UI, UX y Tailwind CSS
│       ├── backend-architect/     # Agente de APIs, SQLite y Mercado Pago
│       └── qa-validator/          # Agente de pruebas y checklist DonWeb
├── data/
│   └── database.sqlite            # Base de datos SQLite local
├── public/
│   ├── index.html                 # Vista principal con Hero y Top 2-100
│   ├── style.css                  # Estilos complementarios y animaciones
│   ├── app.js                     # Lógica en tiempo real, cotizador y modal
│   └── simulador-pago.html        # Simulador de pasarela para desarrollo
├── .env.example                   # Plantilla de variables de entorno
├── AGENTS.md                      # Manifiesto y reglas de los 3 agentes
├── database.js                    # Modelo de datos y consultas SQLite
├── server.js                      # API Express y Webhook Mercado Pago
└── package.json                   # Dependencias y scripts
```

---

## 🚀 Despliegue en VPS DonWeb (Aislamiento de `mkcore`)

Este proyecto está diseñado para convivir en el mismo servidor VPS donde ya corre `mkcore`, manteniendo un **aislamiento absoluto**:

### 1. Variables de Entorno (`.env`)
En el servidor, crear el archivo `.env` con un puerto exclusivo (por ejemplo, `3050`):
```env
PORT=3050
BASE_URL=https://reydelpuesto.tudominio.com
MP_ACCESS_TOKEN=APP_USR-tu-access-token-de-mercadopago
DOLAR_BLUE_FALLBACK=1350
```

### 2. Gestión del Proceso con PM2
```bash
# Instalar dependencias en el VPS
npm install --production

# Iniciar proceso aislado con PM2
pm2 start server.js --name "reydelpuesto"
pm2 save
```

### 3. Configuración de Nginx (Server Block independiente)
Crear un archivo en `/etc/nginx/sites-available/reydelpuesto`:
```nginx
server {
    server_name reydelpuesto.tudominio.com;

    location / {
        proxy_pass http://127.0.0.1:3050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Habilitar el sitio y emitir certificado SSL:
```bash
sudo ln -s /etc/nginx/sites-available/reydelpuesto /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d reydelpuesto.tudominio.com
```
