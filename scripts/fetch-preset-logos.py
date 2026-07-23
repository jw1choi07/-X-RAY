"""Downloads real brand favicons for every usable preset service into
public/logos/, and writes data/site-logo-map.json (siteName -> {slug, ext})
that src/lib/presets.ts reads to attach a `logo` path to each Preset.

Domain source: merges every {name, domain} pair found across the repo's
../data/*report*.json crawl reports, plus a small manual map for well-known
services that were never in those reports. Re-run after adding new presets.
"""
import concurrent.futures
import json
import os
import ssl
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
WEB_DIR = Path(__file__).resolve().parents[1]
TEXTS_DIR = WEB_DIR / "data" / "texts"
LOGOS_DIR = WEB_DIR / "public" / "logos"
MANIFEST_PATH = WEB_DIR / "data" / "site-logo-map.json"

MANUAL_DOMAINS = {
    "11번가": "11st.co.kr",
    "ChatGPT": "openai.com",
    "Discord": "discord.com",
    "Notion": "notion.so",
    "Slack": "slack.com",
    "Spotify": "spotify.com",
    "구글드라이브": "drive.google.com",
    "넷플릭스": "netflix.com",
    "당근마켓": "daangn.com",
    "드롭박스": "dropbox.com",
    "뤼튼": "wrtn.ai",
    "리디북스": "ridibooks.com",
    "멜론": "melon.com",
    "배달의민족": "baemin.com",
    "쏘카": "socar.kr",
    "야놀자": "yanolja.com",
    "에이블리": "a-bly.com",
    "오늘의집": "ohou.se",
    "왓챠": "watcha.com",
    "요기요": "yogiyo.co.kr",
    "유튜브": "youtube.com",
    "중고나라": "joonggonara.co.kr",
    "지그재그": "zigzag.kr",
    "지마켓": "gmarket.co.kr",
    "카카오T": "kakaomobility.com",
    "카카오페이": "kakaopay.com",
    "캐시슬라이드": "cashslide.co.kr",
    "캐시워크": "cashwalk.io",
    "케이뱅크": "kbanknow.com",
    "쿠팡이츠": "coupangeats.com",
    "클래스101": "class101.net",
    "토스": "toss.im",
    "티맵": "tmap.co.kr",
    "틱톡": "tiktok.com",
}


def slugify(name: str) -> str:
    out = ""
    for ch in name:
        code = ord(ch)
        out += ch.lower() if code < 128 else f"u{code:x}"
    import re

    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", out, flags=re.I))


def build_domain_map() -> dict[str, str]:
    mapping: dict[str, str] = {}
    for fp in (REPO_ROOT / "data").glob("*report*.json"):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception:
            continue
        items = data if isinstance(data, list) else data.get("results", [])
        if not isinstance(items, list):
            continue
        for item in items:
            if not isinstance(item, dict):
                continue
            name, domain = item.get("name"), item.get("domain")
            if name and domain and name not in mapping:
                mapping[name] = domain
    mapping.update(MANUAL_DOMAINS)
    return mapping


def site_names_from_presets() -> set[str]:
    names = set()
    for f in TEXTS_DIR.glob("*.txt"):
        name_key = f.stem
        for suffix in ("_개인정보처리방침", "_이용약관"):
            if name_key.endswith(suffix):
                name_key = name_key[: -len(suffix)]
                break
        names.add(name_key.split("_")[0])
    return names


def fetch_one(name: str, domain: str | None) -> tuple[str, str | None]:
    if not domain:
        return name, None
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    slug = slugify(name)
    for url, ext in (
        (f"https://{domain}/favicon.ico", "ico"),
        (f"https://www.google.com/s2/favicons?sz=128&domain={domain}", "png"),
    ):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=6, context=ctx) as resp:
                data = resp.read()
            if len(data) > 100:
                (LOGOS_DIR / f"{slug}.{ext}").write_bytes(data)
                return name, ext
        except Exception:
            continue
    return name, None


def main() -> None:
    LOGOS_DIR.mkdir(parents=True, exist_ok=True)
    domain_map = build_domain_map()
    names = site_names_from_presets()

    manifest: dict[str, dict | None] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=24) as ex:
        futures = {ex.submit(fetch_one, name, domain_map.get(name)): name for name in names}
        for fut in concurrent.futures.as_completed(futures):
            name, ext = fut.result()
            manifest[name] = {"slug": slugify(name), "ext": ext} if ext else None

    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8"
    )
    have = sum(1 for v in manifest.values() if v)
    print(f"{have}/{len(manifest)} sites have a downloaded logo -> {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
