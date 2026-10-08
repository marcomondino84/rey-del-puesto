---
name: deploy-donweb
description: >-
  Despliega automáticamente Rey del Puesto al VPS de DonWeb (149.50.139.74:5136). Sincroniza archivos vía SFTP, actualiza dependencias, reinicia PM2 y ejecuta health-check manteniendo aislamiento total de mkcore y preservando la base de datos y uploads.
---

# Despliegue Automatizado a DonWeb VPS

Este skill se activa cuando el usuario solicita desplegar la aplicación a producción (por ejemplo escribiendo `/deploy-donweb` o *"hacé deploy"*).

## Flujo de Despliegue

1. **Ejecución del Script:**
   Ejecutar en la terminal el comando:
   ```powershell
   python deploy.py
   ```
   (O alternativamente `npm run deploy` o `.\deploy.ps1`).

2. **Acciones que realiza automáticamente el script:**
   - Conexión SSH segura al puerto `5136` de DonWeb.
   - Sincronización de los archivos modificados (`server.js`, `database.js`, `package.json` y la carpeta `public/` completa con `index.html`, `app.js`, `style.css`, `favicon.svg`, `admin.html`, `admin.js`, etc.).
   - **Preservación estricta:** NO sobrescribe la base de datos de producción (`data/database.sqlite`), el archivo `.env` de producción ni las fotos de usuarios en `public/uploads/`.
   - Ejecuta `npm install --omit=dev` en el servidor si cambiaron paquetes.
   - Ejecuta `pm2 reload reydelpuesto || pm2 restart reydelpuesto`.
   - Realiza un health-check llamando al endpoint interno `/api/anuncios`.

3. **Verificación:**
   Comprobar que el script termine con código 0 y que la URL `https://reydelpuesto.mkcore.com.ar` responda con éxito.
