import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio.v3 as iio

# Rutas base
WORKSPACE = r'e:\Proyectos Antigravity\Rey del Puesto'
ARTIFACTS_DIR = r'C:\Users\MK Estudio\.gemini\antigravity-ide\brain\1b69b39d-9949-4f17-b2ff-33d194e13a2a'
IMG_INITIAL_PATH = os.path.join(ARTIFACTS_DIR, r'.user_uploaded\media_1791428941823.png')
IMG_MODAL_PATH = os.path.join(ARTIFACTS_DIR, r'.user_uploaded\media_1791428961759.png')
IMG_RENDERED_PATH = os.path.join(WORKSPACE, 'test_chrome_rendered.png')
IMG_BURGER_PATH = os.path.join(WORKSPACE, r'public\uploads\burger-rey.jpg')

# Cargar tipografías del sistema
FONT_TITLE = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 36)
FONT_HEADING = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 26)
FONT_BODY = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 20)
FONT_BOLD = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 20)
FONT_SMALL = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 16)
FONT_SMALL_BOLD = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 16)
FONT_BADGE = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 14)

TARGET_W, TARGET_H = 1280, 800

def resize_cover(img, target_w=TARGET_W, target_h=TARGET_H):
    """Redimensiona y recorta/ajusta imagen a resolución objetivo manteniendo aspecto"""
    img_ratio = img.width / img.height
    target_ratio = target_w / target_h
    
    if img_ratio > target_ratio:
        new_w = target_w
        new_h = int(target_w / img_ratio)
    else:
        new_h = target_h
        new_w = int(target_h * img_ratio)
    
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    canvas = Image.new('RGB', (target_w, target_h), (248, 250, 252)) # slate-50
    offset_x = (target_w - new_w) // 2
    offset_y = (target_h - new_h) // 2
    canvas.paste(resized, (offset_x, offset_y))
    return canvas

def draw_hud(draw, scene_num, scene_title, subtext="", progress=0.0):
    """Dibuja barra de estado superior profesional y pie de escena"""
    # Barra superior oscura translúcida
    hud_bg = (15, 23, 42, 230) # slate-900
    hud_rect = [0, 0, TARGET_W, 58]
    # Dibujar rectángulo en overlay
    overlay = Image.new('RGBA', (TARGET_W, TARGET_H), (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay)
    ov_draw.rectangle(hud_rect, fill=(15, 23, 42, 230))
    
    # Barra de progreso dorada
    prog_w = int(TARGET_W * max(0.0, min(1.0, progress)))
    ov_draw.rectangle([0, 55, prog_w, 58], fill=(245, 158, 11, 255)) # amber-500
    
    # Badge de escena
    badge_x, badge_y = 20, 14
    ov_draw.rounded_rectangle([badge_x, badge_y, badge_x + 90, badge_y + 28], radius=6, fill=(245, 158, 11, 255))
    ov_draw.text((badge_x + 12, badge_y + 5), f"PASO {scene_num}", fill=(15, 23, 42, 255), font=FONT_BADGE)
    
    # Título de escena
    ov_draw.text((badge_x + 105, badge_y + 3), scene_title, fill=(255, 255, 255, 255), font=FONT_BOLD)
    
    if subtext:
        ov_draw.text((badge_x + 105, badge_y + 24), subtext, fill=(148, 163, 184, 255), font=FONT_SMALL)
        
    # Pie informativo
    ov_draw.rounded_rectangle([20, TARGET_H - 42, TARGET_W - 20, TARGET_H - 12], radius=8, fill=(15, 23, 42, 210))
    ov_draw.text((35, TARGET_H - 37), "Rey del Puesto • Demostración de Subasta y Destronamiento en Vivo", fill=(203, 213, 225, 255), font=FONT_SMALL_BOLD)
    ov_draw.text((TARGET_W - 240, TARGET_H - 37), "Sistema King-of-the-Hill", fill=(245, 158, 11, 255), font=FONT_SMALL_BOLD)
    
    return overlay

def draw_mouse_cursor(base_img, x, y, clicking=False):
    """Dibuja un cursor virtual con sombra y efecto de click opcional"""
    cursor_img = base_img.copy()
    draw = ImageDraw.Draw(cursor_img)
    
    if clicking:
        # Ondas de click
        draw.ellipse([x - 18, y - 18, x + 18, y + 18], outline=(245, 158, 11, 200), width=3)
        draw.ellipse([x - 10, y - 10, x + 10, y + 10], fill=(245, 158, 11, 150))
    
    # Cursor flecha clásico elegante
    points = [
        (x, y),
        (x, y + 22),
        (x + 6, y + 17),
        (x + 12, y + 26),
        (x + 16, y + 24),
        (x + 10, y + 15),
        (x + 17, y + 15)
    ]
    # Sombra
    shadow_points = [(px + 2, py + 2) for px, py in points]
    draw.polygon(shadow_points, fill=(0, 0, 0, 100))
    # Cuerpo
    draw.polygon(points, fill=(255, 255, 255, 255), outline=(15, 23, 42, 255))
    return cursor_img

print("Cargando imágenes de entrada...")
raw_initial = Image.open(IMG_INITIAL_PATH).convert('RGB')
raw_modal = Image.open(IMG_MODAL_PATH).convert('RGB')
raw_rendered = Image.open(IMG_RENDERED_PATH).convert('RGB')
raw_burger = Image.open(IMG_BURGER_PATH).convert('RGB')

base_scene1 = resize_cover(raw_initial)
base_scene2 = resize_cover(raw_modal)
base_scene4 = resize_cover(raw_rendered)

frames = []
FPS = 24

# =========================================================================
# ESCENA 1: EL REY ACTUAL (0.0s - 3.5s = 84 frames)
# =========================================================================
print("Generando Escena 1: Mk Core reinando en Puesto #1...")
total_f_sc1 = 84
for f in range(total_f_sc1):
    prog = f / total_f_sc1
    # Leve zoom-in hacia la tarjeta de Mk Core
    scale = 1.0 + 0.05 * math.sin(prog * math.pi / 2)
    new_w, new_h = int(TARGET_W * scale), int(TARGET_H * scale)
    z_img = base_scene1.resize((new_w, new_h), Image.Resampling.BILINEAR)
    # Centrar levemente hacia la mitad
    crop_x = (new_w - TARGET_W) // 2
    crop_y = int((new_h - TARGET_H) * 0.4)
    frame = z_img.crop((crop_x, crop_y, crop_x + TARGET_W, crop_y + TARGET_H))
    
    # Cursor animado desplazándose hacia el botón superior
    # Botón "Ser el Rey del Puesto" en la barra superior (aprox x=1020, y=100)
    cur_x = int(500 + (1020 - 500) * (prog ** 1.5))
    cur_y = int(450 + (100 - 450) * (prog ** 1.5))
    is_clicking = f >= total_f_sc1 - 10
    frame = draw_mouse_cursor(frame, cur_x, cur_y, clicking=is_clicking)
    
    # Overlay HUD
    hud = draw_hud(
        None, 
        scene_num="1", 
        scene_title="Estado Inicial: Mk Core reina en el Puesto #1 ($1 USD)", 
        subtext="Top 2 al 100 está vacío • Un retador decide pujar para arrebatarle el trono", 
        progress=f / 300
    )
    frame = Image.alpha_composite(frame.convert('RGBA'), hud).convert('RGB')
    frames.append(np.array(frame))

# =========================================================================
# ESCENA 2: MODAL Y LLENADO DE DATOS NUEVA PUBLI (3.5s - 8.0s = 108 frames)
# =========================================================================
print("Generando Escena 2: Llenado de formulario con la nueva publi...")
# Preparamos la imagen del modal completado
modal_filled = base_scene2.copy()
m_draw = ImageDraw.Draw(modal_filled)

# Datos de la nueva publicación
title_text = "Smash Burger King 🍔"
url_text = "https://smashburgerking.com.ar"
desc_text = "Las mejores hamburguesas smash artesanales con doble cheddar. ¡20% OFF por WhatsApp!"
wa_text = "+54 9 11 3829-4021"
ig_text = "@smashburgerking"

# Coordenadas aproximadas en el modal (1280x800 escalado)
# El modal está centrado. Encontrar inputs correspondientes:
# Título: aprox y=365, x=455
# URL: aprox y=425, x=455
# Miniatura / foto subida: aprox y=490, x=455
# Descripción: aprox y=595, x=455
# Redes: aprox y=660

# Miniatura de burger para el dropzone del modal
burger_thumb = raw_burger.resize((140, 50), Image.Resampling.LANCZOS)

total_f_sc2 = 108
for f in range(total_f_sc2):
    prog = f / total_f_sc2
    cur_frame = base_scene2.copy()
    cur_draw = ImageDraw.Draw(cur_frame)
    
    # 1. Tipeo progresivo de Título (f: 10 - 30)
    chars_title = int(min(len(title_text), max(0, (f - 10) / 20 * len(title_text))))
    if chars_title > 0:
        cur_draw.rectangle([448, 360, 830, 395], fill=(255, 255, 255))
        cur_draw.text((455, 365), title_text[:chars_title], fill=(15, 23, 42), font=FONT_BOLD)
    
    # 2. Tipeo progresivo de URL (f: 30 - 50)
    chars_url = int(min(len(url_text), max(0, (f - 30) / 20 * len(url_text))))
    if chars_url > 0:
        cur_draw.rectangle([448, 420, 830, 455], fill=(255, 255, 255))
        cur_draw.text((455, 425), url_text[:chars_url], fill=(30, 41, 59), font=FONT_BODY)
    
    # 3. Inserción de Foto / Banner (f >= 50)
    if f >= 50:
        # Poner preview en el contenedor de banner
        cur_frame.paste(burger_thumb, (570, 485))
        cur_draw.text((550, 540), "✅ banner_burger.webp cargado", fill=(16, 185, 129), font=FONT_SMALL_BOLD)
    
    # 4. Tipeo progresivo de Descripción (f: 60 - 85)
    chars_desc = int(min(len(desc_text), max(0, (f - 60) / 25 * len(desc_text))))
    if chars_desc > 0:
        cur_draw.rectangle([448, 575, 830, 625], fill=(255, 255, 255))
        # Partir en 2 líneas si es largo
        line1 = desc_text[:min(chars_desc, 44)]
        line2 = desc_text[44:chars_desc] if chars_desc > 44 else ""
        cur_draw.text((455, 578), line1, fill=(51, 65, 85), font=FONT_SMALL)
        if line2:
            cur_draw.text((455, 598), line2, fill=(51, 65, 85), font=FONT_SMALL)
            
    # 5. Redes sociales (f >= 85)
    if f >= 85:
        cur_draw.rectangle([450, 655, 620, 680], fill=(255, 255, 255))
        cur_draw.text((455, 657), wa_text, fill=(51, 65, 85), font=FONT_SMALL)
        cur_draw.rectangle([640, 655, 825, 680], fill=(255, 255, 255))
        cur_draw.text((645, 657), ig_text, fill=(51, 65, 85), font=FONT_SMALL)
    
    # Cursor desplazándose al botón inferior (f >= 85)
    cur_x = 640
    cur_y = int(500 + (700 - 500) * min(1.0, max(0.0, (f - 85) / 18)))
    is_clicking = f >= total_f_sc2 - 6
    cur_frame = draw_mouse_cursor(cur_frame, cur_x, cur_y, clicking=is_clicking)
    
    # HUD
    hud = draw_hud(
        None,
        scene_num="2",
        scene_title="Nueva Puja: Smash Burger King ofrece $3 USD",
        subtext="Supera el mínimo ($2 USD) • Se completan datos, links y banner de alta calidad",
        progress=(total_f_sc1 + f) / 300
    )
    final_f = Image.alpha_composite(cur_frame.convert('RGBA'), hud).convert('RGB')
    frames.append(np.array(final_f))

# =========================================================================
# ESCENA 3: DESTRONAMIENTO Y CORONACIÓN ÉPICA (8.0s - 10.5s = 60 frames)
# =========================================================================
print("Generando Escena 3: Efecto de Destronamiento cinemático...")
total_f_sc3 = 60
for f in range(total_f_sc3):
    prog = f / total_f_sc3
    
    # Fondo con gradiente radial dorado/oscuro
    overlay_scene = Image.new('RGB', (TARGET_W, TARGET_H), (15, 23, 42))
    sc_draw = ImageDraw.Draw(overlay_scene)
    
    # Rayos o resplandor de fondo
    center_x, center_y = TARGET_W // 2, TARGET_H // 2
    num_rays = 16
    for i in range(num_rays):
        angle = (i / num_rays) * 2 * math.pi + (prog * math.pi)
        ray_len = 600
        rx = center_x + ray_len * math.cos(angle)
        ry = center_y + ray_len * math.sin(angle)
        sc_draw.line([(center_x, center_y), (rx, ry)], fill=(30, 41, 59), width=8)
    
    # Tarjeta de coronación central flotante con animación de escala
    card_w, card_h = 760, 420
    scale = 0.85 + 0.15 * math.sin(min(1.0, prog * 2) * math.pi / 2)
    cw, ch = int(card_w * scale), int(card_h * scale)
    cx1, cy1 = (TARGET_W - cw) // 2, (TARGET_H - ch) // 2
    cx2, cy2 = cx1 + cw, cy1 + ch
    
    # Borde dorado brillante
    sc_draw.rounded_rectangle([cx1 - 4, cy1 - 4, cx2 + 4, cy2 + 4], radius=24, fill=(245, 158, 11))
    sc_draw.rounded_rectangle([cx1, cy1, cx2, cy2], radius=20, fill=(24, 24, 27))
    
    # Corona y textos
    pulse = 1.0 + 0.1 * math.sin(f * 0.4)
    sc_draw.text((TARGET_W // 2 - 30, cy1 + 25), "👑", fill=(251, 191, 36), font=ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', int(50 * pulse)))
    
    badge_txt = "¡PAGO CONFIRMADO • NUEVA PUJA RÉCORD!"
    sc_draw.rounded_rectangle([TARGET_W // 2 - 180, cy1 + 100, TARGET_W // 2 + 180, cy1 + 130], radius=8, fill=(16, 185, 129))
    sc_draw.text((TARGET_W // 2 - 165, cy1 + 105), badge_txt, fill=(255, 255, 255), font=FONT_SMALL_BOLD)
    
    sc_draw.text((TARGET_W // 2 - 270, cy1 + 155), "👑 ¡HABEMUS NUEVO REY DEL PUESTO!", fill=(251, 191, 36), font=FONT_TITLE)
    
    sc_draw.text((TARGET_W // 2 - 210, cy1 + 225), "Smash Burger King 🍔", fill=(255, 255, 255), font=FONT_HEADING)
    sc_draw.text((TARGET_W // 2 - 130, cy1 + 265), "Puja Ganadora: $3 USD ($4.665 ARS)", fill=(245, 158, 11), font=FONT_BODY)
    
    # Separador
    sc_draw.line([(cx1 + 40, cy1 + 315), (cx2 - 40, cy1 + 315)], fill=(63, 63, 70), width=1)
    
    # Mención a Mk Core pasando al Puesto 2
    sc_draw.text((TARGET_W // 2 - 280, cy1 + 340), "⬇️ Mk Core desciende con honor a la cartelera Top 2 al 100 (Puesto #2)", fill=(148, 163, 184), font=FONT_BODY)
    
    # HUD
    hud = draw_hud(
        None,
        scene_num="3",
        scene_title="Transición: Se produce el Destronamiento en vivo",
        subtext="La transacción se valida en SQLite • Se actualizan las jerarquías de la cartelera",
        progress=(total_f_sc1 + total_f_sc2 + f) / 300
    )
    final_f = Image.alpha_composite(overlay_scene.convert('RGBA'), hud).convert('RGB')
    frames.append(np.array(final_f))

# =========================================================================
# ESCENA 4: EL NUEVO TABLERO EN VIVO (10.5s - 14.5s = 96 frames)
# =========================================================================
print("Generando Escena 4: Tablero Final con Smash Burger #1 y Mk Core #2...")
total_f_sc4 = 96
for f in range(total_f_sc4):
    prog = f / total_f_sc4
    
    # Suave movimiento hacia abajo para destacar a Mk Core en el Puesto #2
    pan_y = int(prog * 50)
    pan_frame = base_scene4.copy()
    
    # Destacar visualmente el Puesto #2 con un marco sutil animado
    p_draw = ImageDraw.Draw(pan_frame)
    # Coordenadas aproximadas de la tarjeta #2 en la pantalla renderizada
    pulse_alpha = int(180 + 75 * math.sin(f * 0.3))
    
    # Marco sutil sobre el Puesto #2
    p_draw.rounded_rectangle([85, 680 - pan_y, 1195, 785 - pan_y], radius=16, outline=(245, 158, 11), width=2)
    # Badge flotante "NUEVO PUESTO #2"
    p_draw.rounded_rectangle([1000, 688 - pan_y, 1180, 712 - pan_y], radius=6, fill=(245, 158, 11))
    p_draw.text((1012, 692 - pan_y), "★ RECIÉN DESTRONADO", fill=(15, 23, 42), font=FONT_BADGE)
    
    # HUD
    hud = draw_hud(
        None,
        scene_num="4",
        scene_title="Resultado Final: Smash Burger King #1 • Mk Core #2",
        subtext="¡El trono se renueva! Mk Core mantiene visibilidad perpetua en la lista de honor",
        progress=(total_f_sc1 + total_f_sc2 + total_f_sc3 + f) / 300
    )
    final_f = Image.alpha_composite(pan_frame.convert('RGBA'), hud).convert('RGB')
    frames.append(np.array(final_f))

print(f"Total de cuadros generados: {len(frames)} frames ({len(frames)/FPS:.1f} segundos)")

# Exportar MP4
output_mp4_public = os.path.join(WORKSPACE, r'public\video_destronamiento.mp4')
output_mp4_artifact = os.path.join(ARTIFACTS_DIR, 'video_destronamiento.mp4')
output_gif_public = os.path.join(WORKSPACE, r'public\video_destronamiento.gif')
output_gif_artifact = os.path.join(ARTIFACTS_DIR, 'video_destronamiento.gif')

print("Codificando video MP4 (H.264)...")
iio.imwrite(
    output_mp4_public,
    frames,
    fps=FPS,
    codec='libx264',
    ffmpeg_params=['-pix_fmt', 'yuv420p', '-crf', '20']
)
print("MP4 guardado en:", output_mp4_public)

import shutil
shutil.copyfile(output_mp4_public, output_mp4_artifact)
print("MP4 copiado a artifacts:", output_mp4_artifact)

print("Generando GIF optimizado (cada 2 frames para menor peso)...")
gif_frames = [Image.fromarray(frm).resize((640, 400), Image.Resampling.BOX) for frm in frames[::2]]
gif_frames[0].save(
    output_gif_public,
    save_all=True,
    append_images=gif_frames[1:],
    duration=int(1000 / (FPS / 2)),
    loop=0,
    optimize=True
)
print("GIF guardado en:", output_gif_public)
shutil.copyfile(output_gif_public, output_gif_artifact)
print("GIF copiado a artifacts:", output_gif_artifact)
print("✅ Proceso completado exitosamente!")
