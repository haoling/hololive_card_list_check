#!/usr/bin/env python3
"""カード画像を取得して dHash（差分ハッシュ）を計算し、
json_file/card_phash.json を生成・更新する。

- 入力: json_file/card_data.json の各カードの image_url
- 出力: json_file/card_phash.json （{ "<カードID>": "<64桁hexのdHash>" } の単純な辞書）
- 既に card_phash.json に登録済みの ID は再計算をスキップする
  （image_url は基本的に変わらないため、差分再計算は「新規追加カードのみ」を想定）

ハッシュは imagehash.dhash(image, hash_size=16) を使用する。
アルゴリズムの正本は imagehash ライブラリの実装であり、
js/card_scanner.js 側はこの実装と同じ手順（grayscale変換→(17,16)へのリサイズ→
列方向の差分→ビット列→hex文字列化）をJSで再現している。
両者の対応関係が崩れるとハッシュが比較不能になるため、
本スクリプトのアルゴリズムを変更する場合は js/card_scanner.js 側も必ず追随させること。

GitHub Actions (.github/workflows/generate-card-phash.yml) から実行される想定。
このリポジトリの開発機は外部ネットワークに制限があることがあるため、
ローカルで実行する場合は `pip install Pillow imagehash` が必要。
"""

import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from PIL import Image
import imagehash

ROOT = Path(__file__).resolve().parents[2]
CARD_DATA_PATH = ROOT / "json_file" / "card_data.json"
PHASH_PATH = ROOT / "json_file" / "card_phash.json"

HASH_SIZE = 16
MAX_WORKERS = 8
REQUEST_TIMEOUT = 20
MAX_FAILURE_RATIO = 0.05
USER_AGENT = "Mozilla/5.0 (compatible; hololive-card-list-check-phash-bot/1.0)"


def load_json(path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")


def fetch_image(url):
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=REQUEST_TIMEOUT) as res:
        return Image.open(res).convert("RGB")


def compute_hash(card_id, image_url):
    try:
        img = fetch_image(image_url)
        h = imagehash.dhash(img, hash_size=HASH_SIZE)
        return card_id, str(h), None
    except (URLError, HTTPError, OSError, ValueError) as exc:
        return card_id, None, str(exc)


def main():
    if not CARD_DATA_PATH.exists():
        print(f"ERROR: {CARD_DATA_PATH} が見つかりません", file=sys.stderr)
        sys.exit(1)

    card_data = load_json(CARD_DATA_PATH)
    existing = load_json(PHASH_PATH) if PHASH_PATH.exists() else {}

    targets = [
        (card_id, card.get("image_url"))
        for card_id, card in card_data.items()
        if card.get("image_url") and card_id not in existing
    ]

    print(f"total={len(card_data)} to_process={len(targets)} already_hashed={len(card_data) - len(targets)}")

    result = dict(existing)
    failures = []

    if targets:
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {
                executor.submit(compute_hash, card_id, url): card_id
                for card_id, url in targets
            }
            done = 0
            for future in as_completed(futures):
                card_id, hash_hex, error = future.result()
                done += 1
                if error:
                    failures.append((card_id, error))
                    print(f"[{done}/{len(targets)}] FAIL {card_id}: {error}")
                else:
                    result[card_id] = hash_hex
                    if done % 100 == 0 or done == len(targets):
                        print(f"[{done}/{len(targets)}] ok")

    # card_data.json から削除された（廃止された）カードのハッシュは掃除する
    removed = [cid for cid in result if cid not in card_data]
    for cid in removed:
        del result[cid]

    save_json(PHASH_PATH, result)

    print(f"done: hashed={len(result)} failures={len(failures)} removed_stale={len(removed)}")

    if targets:
        failure_ratio = len(failures) / len(targets)
        if failure_ratio > MAX_FAILURE_RATIO:
            print(
                f"ERROR: failure ratio {failure_ratio:.1%} exceeds threshold {MAX_FAILURE_RATIO:.0%}",
                file=sys.stderr,
            )
            sys.exit(1)


if __name__ == "__main__":
    main()
