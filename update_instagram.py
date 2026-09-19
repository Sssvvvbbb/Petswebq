#!/usr/bin/env python3
"""
update_instagram.py
Obtiene las últimas publicaciones de @_petsalcielo via Graph API,
descarga las imágenes a /Assets/instagram/ y actualiza instagram.json.

Ejecutar manualmente:
    python update_instagram.py

En GitHub Actions se ejecuta automáticamente cada 24h.
"""

import os
import json
import difflib
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone

# ── Configuración ──────────────────────────────────────────────────────────────
IG_USER_ID        = "17841429339022812"
ACCESS_TOKEN      = os.environ.get("IG_TOKEN", "")   # siempre desde variable de entorno
POSTS_LIMIT       = 10                                 # cuántas publicaciones mostrar
OUTPUT_JSON       = "instagram.json"
ASSETS_DIR        = os.path.join("Assets", "instagram")
API_VERSION       = "v25.0"
DUP_SIMILARITY    = 0.90   # 0–1: qué tan parecido debe ser el caption para considerarlo repetido
DUP_MAX_MINUTES   = 30     # solo se compara contra publicaciones subidas dentro de esta ventana
# ──────────────────────────────────────────────────────────────────────────────

def parse_timestamp(ts):
    try:
        return datetime.strptime(ts, "%Y-%m-%dT%H:%M:%S%z")
    except Exception:
        return None

def is_near_duplicate(caption, dt, kept_posts):
    """Compara contra publicaciones ya guardadas: mismo texto (aprox.) y poca diferencia de tiempo."""
    if not caption or dt is None:
        return False
    for other_caption, other_dt in kept_posts:
        if not other_caption or other_dt is None:
            continue
        minutes_apart = abs((dt - other_dt).total_seconds()) / 60
        if minutes_apart > DUP_MAX_MINUTES:
            continue
        similarity = difflib.SequenceMatcher(None, caption, other_caption).ratio()
        if similarity >= DUP_SIMILARITY:
            return True
    return False

def fetch(url):
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"❌  HTTP {e.code} — respuesta de Graph API:\n{body}")
        raise SystemExit(1)

def download_image(url, path):
    """Descarga una imagen solo si no existe ya."""
    if os.path.exists(path):
        return True
    try:
        urllib.request.urlretrieve(url, path)
        return True
    except Exception as e:
        print(f"  ✗ Error descargando imagen: {e}")
        return False

def main():
    if not ACCESS_TOKEN:
        raise SystemExit("❌  Variable de entorno IG_TOKEN no definida.")

    # Si existe como archivo (no directorio), eliminarlo primero
    if os.path.isfile(ASSETS_DIR):
        os.remove(ASSETS_DIR)
    os.makedirs(ASSETS_DIR, exist_ok=True)

    # 1. Obtener lista de publicaciones (imágenes, carruseles y Reels)
    fields = "id,caption,media_type,media_url,thumbnail_url,timestamp,permalink"
    params = urllib.parse.urlencode({
        "fields":       fields,
        "limit":        POSTS_LIMIT * 2,   # pedimos el doble por si hay Reels
        "access_token": ACCESS_TOKEN,
    })
    url = f"https://graph.facebook.com/{API_VERSION}/{IG_USER_ID}/media?{params}"

    print("📡  Consultando Graph API...")
    data = fetch(url)

    if "error" in data:
        raise SystemExit(f"❌  Error API: {data['error']['message']}")

    raw_posts = data.get("data", [])
    print(f"    → {len(raw_posts)} publicaciones encontradas")

    # 2. Filtrar: IMAGE, CAROUSEL_ALBUM y VIDEO (Reels se muestran con su portada)
    posts = []
    seen_ids = set()     # evita publicaciones duplicadas si la Graph API repite un ID
    kept_meta = []       # (caption_full, datetime) de las publicaciones ya guardadas, para detectar cuasi-duplicados
    for p in raw_posts:
        media_type = p.get("media_type")
        if media_type not in ("IMAGE", "CAROUSEL_ALBUM", "VIDEO"):
            continue

        post_id = p["id"]
        if post_id in seen_ids:
            print(f"  ⚠️  ID duplicado detectado y omitido: {post_id}")
            continue
        seen_ids.add(post_id)

        caption_full = p.get("caption", "").strip()
        timestamp    = p.get("timestamp", "")
        post_dt      = parse_timestamp(timestamp)

        if is_near_duplicate(caption_full, post_dt, kept_meta):
            print(f"  ⚠️  Publicación repetida (caption muy similar, subida minutos después) detectada y omitida: {post_id}")
            continue
        kept_meta.append((caption_full, post_dt))

        # Para VIDEO (incluye Reels), media_url apunta al archivo .mp4 —
        # siempre usamos thumbnail_url para mostrar la portada como imagen.
        if media_type == "VIDEO":
            image_url = p.get("thumbnail_url", "")
        else:
            image_url = p.get("media_url") or p.get("thumbnail_url", "")

        caption   = caption_full[:200]   # máx 200 chars para el alt
        permalink = p.get("permalink", "https://www.instagram.com/_petsalcielo/")

        # Descargar imagen localmente
        ext       = "jpg"
        filename  = f"{post_id}.{ext}"
        local_path = os.path.join(ASSETS_DIR, filename)
        web_path   = f"/Assets/instagram/{filename}"

        print(f"  ↓  Descargando {filename}...")
        ok = download_image(image_url, local_path)

        posts.append({
            "id":        post_id,
            "src":       web_path if ok else image_url,
            "alt":       caption.replace("\n", " ").strip() or "Publicación de PetsAlCielo",
            "timestamp": timestamp,
            "permalink": permalink,
        })

        if len(posts) >= POSTS_LIMIT:
            break

    # 3. Guardar JSON
    output = {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "posts":   posts,
    }
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✅  {len(posts)} publicaciones guardadas en {OUTPUT_JSON}")

if __name__ == "__main__":
    main()
