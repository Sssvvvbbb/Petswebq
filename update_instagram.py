#!/usr/bin/env python3
"""
update_instagram.py
Obtiene las últimas publicaciones de @_petsalcielo via Graph API,
descarga las imágenes a /Assets/instagram/ y actualiza instagram.json.
"""

import os
import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone

# ── Configuración ──────────────────────────────────────────────────────────────
IG_USER_ID   = "17841429339022812"
ACCESS_TOKEN = os.environ.get("IG_TOKEN", "")
POSTS_LIMIT  = 10
OUTPUT_JSON  = "instagram.json"
ASSETS_DIR   = os.path.join("Assets", "instagram")
API_VERSION  = "v25.0"
# ──────────────────────────────────────────────────────────────────────────────

def fetch(url):
    with urllib.request.urlopen(url, timeout=15) as r:
        return json.loads(r.read().decode())

def download_image(url, path):
    """Descarga una imagen siempre (sobreescribe para mantener frescas)."""
    try:
        urllib.request.urlretrieve(url, path)
        return True
    except Exception as e:
        print(f"  ✗ Error descargando imagen: {e}")
        return False

def main():
    if not ACCESS_TOKEN:
        raise SystemExit("❌  Variable de entorno IG_TOKEN no definida.")

    if os.path.isfile(ASSETS_DIR):
        os.remove(ASSETS_DIR)
    os.makedirs(ASSETS_DIR, exist_ok=True)

    # Pedir 50 para tener suficientes después de filtrar duplicados
    fields = "id,caption,media_type,media_url,thumbnail_url,timestamp,permalink"
    params = urllib.parse.urlencode({
        "fields":       fields,
        "limit":        50,
        "access_token": ACCESS_TOKEN,
    })
    url = f"https://graph.facebook.com/{API_VERSION}/{IG_USER_ID}/media?{params}"

    print("📡  Consultando Graph API...")
    data = fetch(url)

    if "error" in data:
        raise SystemExit(f"❌  Error API: {data['error']['message']}")

    raw_posts = data.get("data", [])
    print(f"    → {len(raw_posts)} publicaciones encontradas en bruto")

    posts = []
    seen_captions = set()  # usar set para comparación exacta

    for p in raw_posts:
        media_type = p.get("media_type", "")
        if media_type not in ("IMAGE", "CAROUSEL_ALBUM", "VIDEO"):
            continue

        post_id   = p["id"]
        if media_type == "VIDEO":
            image_url = p.get("thumbnail_url") or p.get("media_url", "")
        else:
            image_url = p.get("media_url") or p.get("thumbnail_url", "")

        if not image_url:
            continue

        caption   = p.get("caption", "")
        timestamp = p.get("timestamp", "")
        permalink = p.get("permalink", "")

        # Solo Instagram
        if "instagram.com" not in permalink:
            print(f"  ⚠  No es Instagram, omitido: {post_id}")
            continue

        # Deduplicar por caption completo (los duplicados tienen caption idéntico)
        caption_key = caption.strip()
        if caption_key in seen_captions:
            print(f"  ⚠  Duplicado omitido: {post_id}")
            continue
        seen_captions.add(caption_key)

        filename   = f"{post_id}.jpg"
        local_path = os.path.join(ASSETS_DIR, filename)
        web_path   = f"/Assets/instagram/{filename}"

        print(f"  ↓  Descargando {filename}...")
        ok = download_image(image_url, local_path)

        posts.append({
            "id":        post_id,
            "src":       web_path if ok else image_url,
            "alt":       caption.replace("\n", " ").strip()[:200] or "Publicación de PetsAlCielo",
            "timestamp": timestamp,
            "permalink": permalink,
        })

        if len(posts) >= POSTS_LIMIT:
            break

    output = {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "posts":   posts,
    }
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✅  {len(posts)} publicaciones únicas guardadas en {OUTPUT_JSON}")

if __name__ == "__main__":
    main()
