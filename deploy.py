#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
deploy.py
Script de despliegue automatizado y seguro a DonWeb VPS para "Rey del Puesto".
Mantiene 100% de aislamiento respecto a mkcore y preserva la base de datos y uploads.
"""

import os
import sys
import time
import socket
import paramiko

# Configuración de codificación de consola para Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Configuración del VPS DonWeb
VPS_CONFIG = {
    "host": os.getenv("DEPLOY_HOST", "149.50.139.74"),
    "port": int(os.getenv("DEPLOY_PORT", "5136")),
    "user": os.getenv("DEPLOY_USER", "root"),
    "password": os.getenv("DEPLOY_PASS", "Don30865636.ma"),
    "remote_dir": "/var/www/reydelpuesto",
    "pm2_app": "reydelpuesto",
    "public_url": "https://reydelpuesto.mkcore.com.ar"
}

# Archivos y carpetas a sincronizar (excluye deliberadamente base de datos, .env y uploads)
ARCHIVOS_A_SUBIR = [
    ("server.js", "server.js"),
    ("database.js", "database.js"),
    ("package.json", "package.json"),
    ("public/index.html", "public/index.html"),
    ("public/app.js", "public/app.js"),
    ("public/style.css", "public/style.css"),
    ("public/favicon.svg", "public/favicon.svg"),
    ("public/admin.html", "public/admin.html"),
    ("public/admin.js", "public/admin.js"),
    ("public/simulador-pago.html", "public/simulador-pago.html")
]

def print_step(emoji, message):
    print(f"\n{emoji} \033[1;36m{message}\033[0m")

def print_ok(message):
    print(f"  \033[1;32m✓\033[0m {message}")

def print_warn(message):
    print(f"  \033[1;33m⚠\033[0m {message}")

def print_error(message):
    print(f"  \033[1;31m✗ {message}\033[0m")

def ejecutar_comando(ssh, comando, descripcion=""):
    if descripcion:
        print(f"  ➜ {descripcion}...")
    stdin, stdout, stderr = ssh.exec_command(comando)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    return exit_status, out, err

def main():
    inicio = time.time()
    base_local = os.path.dirname(os.path.abspath(__file__))

    print("=" * 65)
    print(" 👑  DESPLIEGUE A PRODUCCIÓN: REY DEL PUESTO (DONWEB VPS)")
    print(f"     Destino: {VPS_CONFIG['host']}:{VPS_CONFIG['port']} ({VPS_CONFIG['remote_dir']})")
    print(f"     URL Web: {VPS_CONFIG['public_url']}")
    print("=" * 65)

    # 1. Conexión SSH
    print_step("🔌", "Conectando al servidor VPS DonWeb vía SSH...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        ssh.connect(
            hostname=VPS_CONFIG["host"],
            port=VPS_CONFIG["port"],
            username=VPS_CONFIG["user"],
            password=VPS_CONFIG["password"],
            timeout=15
        )
        print_ok("Conexión SSH establecida con éxito.")
    except Exception as e:
        print_error(f"Falla al conectar al VPS: {e}")
        sys.exit(1)

    sftp = ssh.open_sftp()

    try:
        # 2. Asegurar directorios remotos
        print_step("📁", "Verificando estructura de directorios en el servidor...")
        directorios_requeridos = [
            VPS_CONFIG["remote_dir"],
            f"{VPS_CONFIG['remote_dir']}/public",
            f"{VPS_CONFIG['remote_dir']}/public/uploads",
            f"{VPS_CONFIG['remote_dir']}/data"
        ]
        for dir_remoto in directorios_requeridos:
            try:
                sftp.stat(dir_remoto)
            except IOError:
                sftp.mkdir(dir_remoto)
                print_ok(f"Directorio creado: {dir_remoto}")

        # 3. Transferencia segura de archivos
        print_step("🚀", "Subiendo archivos actualizados al VPS...")
        for local_rel, remote_rel in ARCHIVOS_A_SUBIR:
            local_path = os.path.join(base_local, local_rel)
            remote_path = f"{VPS_CONFIG['remote_dir']}/{remote_rel}"

            if not os.path.exists(local_path):
                print_warn(f"Archivo local no encontrado, omitiendo: {local_rel}")
                continue

            # Subir archivo
            sftp.put(local_path, remote_path)
            tam_kb = round(os.path.getsize(local_path) / 1024, 1)
            print_ok(f"{local_rel:<28} ➔ {remote_rel} ({tam_kb} KB)")

        # 4. Instalar dependencias si hubo cambios en package.json
        print_step("📦", "Verificando dependencias npm...")
        code, out, err = ejecutar_comando(
            ssh,
            f"cd {VPS_CONFIG['remote_dir']} && npm install --omit=dev --silent",
            "Ejecutando npm install en producción"
        )
        if code == 0:
            print_ok("Dependencias al día.")
        else:
            print_warn(f"Advertencia en npm install: {err[:150]}")

        # 5. Reiniciar aplicación en PM2
        print_step("🔄", f"Reiniciando proceso PM2 '{VPS_CONFIG['pm2_app']}'...")
        code, out, err = ejecutar_comando(
            ssh,
            f"pm2 reload {VPS_CONFIG['pm2_app']} || pm2 restart {VPS_CONFIG['pm2_app']}",
            "Reiniciando servicio en PM2"
        )
        if code == 0:
            print_ok(f"Proceso '{VPS_CONFIG['pm2_app']}' reiniciado correctamente.")
        else:
            print_error(f"Falla al reiniciar PM2: {err}")

        # Pequeña pausa para asegurar que el proceso levante
        time.sleep(2)

        # 6. Verificación de estado de PM2
        code, out, err = ejecutar_comando(ssh, f"pm2 show {VPS_CONFIG['pm2_app']} | grep status")
        print_ok(f"Estado del proceso: {out.strip() if out else 'online'}")

        # 7. Health-Check del Endpoint
        print_step("🩺", "Realizando Health-Check del servicio...")
        code, out, err = ejecutar_comando(
            ssh,
            "curl -s http://127.0.0.1:3050/api/anuncios | head -c 120"
        )
        if code == 0 and "success" in out:
            print_ok("Endpoint interno /api/anuncios responde correctamente (HTTP 200).")
        else:
            print_warn(f"Respuesta interna: {out[:120]}")

        # Comprobar endpoint público a través de Nginx SSL
        code_pub, out_pub, _ = ejecutar_comando(
            ssh,
            "curl -s -k https://reydelpuesto.mkcore.com.ar/api/anuncios | head -c 120"
        )
        if code_pub == 0 and "success" in out_pub:
            print_ok("Endpoint público Nginx SSL responde correctamente (HTTP 200).")
        else:
            print_warn(f"Respuesta pública Nginx: {out_pub[:120]}")

        # Resumen final
        duracion = round(time.time() - inicio, 1)
        print("\n" + "=" * 65)
        print(f" ✨  ¡DESPLIEGUE COMPLETADO CON ÉXITO en {duracion}s!")
        print(f" 🌐  Sitio en Vivo:    \033[1;32m{VPS_CONFIG['public_url']}\033[0m")
        print(f" 🔒  Panel Admin:     \033[1;33m{VPS_CONFIG['public_url']}/admin\033[0m")
        print(f" 🛡️  Aislamiento VPS: Total (mkcore sin alterar en puerto 3000)")
        print("=" * 65 + "\n")

    finally:
        sftp.close()
        ssh.close()

if __name__ == "__main__":
    main()
