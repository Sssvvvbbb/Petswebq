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
import urllib.request
import urllib.parse
from datetime import datetime, timezone

# ── Configuración ──────────────────────────────────────────────────────────────
IG_USER_ID   = "17841429339022812"
ACCESS_TOKEN = os.environ.get("IG_TOKEN", "")   # siempre desde variable de entorno
POSTS_LIMIT  = 10                                 # cuántas publicaciones mostrar
OUTPUT_JSON  = "instagram.json"
ASSETS_DIR   = os.path.join("Assets", "instagram")
API_VERSION  = "v25.0"
# ──────────────────────────────────────────────────────────────────────────────

def fetch(url):
    with urllib.request.urlopen(url, timeout=15) as r:
        return json.loads(r.read().decode())

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

    # 1. Obtener lista de publicaciones (solo imágenes y carruseles, sin Reels)
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

    # 2. Filtrar: solo IMAGE y CAROUSEL_ALBUM (no VIDEO ni REELS)
    posts = []
    for p in raw_posts:
        if p.get("media_type") not in ("IMAGE", "CAROUSEL_ALBUM"):
            continue

        post_id   = p["id"]
        image_url = p.get("media_url") or p.get("thumbnail_url", "")
        caption   = p.get("caption", "")[:200]   # máx 200 chars para el alt
        timestamp = p.get("timestamp", "")
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
