#!/usr/bin/env python3
"""GitHub Pages デプロイ用のビルドスクリプト

- リポジトリのうち配信に必要なファイル一式を dist/ にコピーする
- js/*.js, css/*.css, config/google-client-id.js を内容ハッシュ付きファイル名に
  実際にリネームし、HTML と sw.js 内の参照を書き換える
- 全リネーム対象ファイル + card_data.json/release_dates.json の内容から集約ハッシュを計算し、
  dist/sw.js の __BUILD_HASH__ プレースホルダーを置換する（= キャッシュの自動無効化）

main ブランチのソースコードには一切書き戻さない。ローカル開発（python -m http.server で
素のリポジトリを配信する）には影響しない。

実行方法: python3 scripts/deploy/build_site.py
"""
import hashlib
import re
import shutil
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DIST = REPO_ROOT / 'dist'

# dist/ にそのままコピーする配信対象（ディレクトリ or ファイル）
COPY_TARGETS = [
    'index.html',
    'card_list.html',
    'collection_binder.html',
    'binder_collection.html',
    'holoca_skill_page.html',
    'deck_builder.html',
    'card_scanner.html',
    'battle_simulator_v2.html',
    'favicon.ico',
    'sw.js',
    'sw-version.js',
    'sw-utils.js',
    'sw-handlers.js',
    'css',
    'js',
    'config',
    'json_file',
    'images',
    'battle_simulator_v2',
]

# ハッシュ付きファイル名にリネームする対象（dist内での相対パス）。
# battle_simulator_v2/ 配下は開発中でSWキャッシュを常時バイパスする方針のためリネームしない。
RENAME_GLOBS = ['js/*.js', 'css/*.css', 'config/google-client-id.js']

# リネーム後の参照を書き換える対象ファイル（dist内での相対パス）
REWRITE_TARGETS = [
    'index.html',
    'card_list.html',
    'collection_binder.html',
    'binder_collection.html',
    'holoca_skill_page.html',
    'deck_builder.html',
    'card_scanner.html',
    'sw.js',
]

# 集約ハッシュ（__BUILD_HASH__）の追加入力（リネーム対象に加えて内容を反映する）
EXTRA_HASH_INPUTS = [
    'json_file/card_data.json',
    'json_file/release_dates.json',
]

HASH_LEN = 8


def short_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()[:HASH_LEN]


def build_dist():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    for target in COPY_TARGETS:
        src = REPO_ROOT / target
        dst = DIST / target
        if src.is_dir():
            shutil.copytree(src, dst)
        else:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)

    (DIST / '.nojekyll').touch()


def rename_hashed_files():
    """dist内のJS/CSS/configファイルを内容ハッシュ付きにリネームする。
    戻り値: {旧相対パス（例: 'js/card_list.js'）: 新相対パス（例: 'js/card_list.a1b2c3d4.js'）}
    """
    rename_map = {}
    for pattern in RENAME_GLOBS:
        for path in sorted(DIST.glob(pattern)):
            old_rel = path.relative_to(DIST).as_posix()
            data = path.read_bytes()
            h = short_hash(data)
            new_name = f'{path.stem}.{h}{path.suffix}'
            new_path = path.with_name(new_name)
            path.rename(new_path)
            new_rel = new_path.relative_to(DIST).as_posix()
            rename_map[old_rel] = new_rel
    return rename_map


def rewrite_references(rename_map):
    for target in REWRITE_TARGETS:
        path = DIST / target
        text = path.read_text(encoding='utf-8')
        original = text
        for old_rel, new_rel in rename_map.items():
            # "js/card_list.js" / './js/card_list.js' のどちらの表記も対象にする
            pattern = re.compile(r'(["\'])(\./)?' + re.escape(old_rel) + r'\1')

            def _replace(m, new_rel=new_rel):
                dot_slash = m.group(2) or ''
                quote = m.group(1)
                return f'{quote}{dot_slash}{new_rel}{quote}'

            text = pattern.sub(_replace, text)
        if text != original:
            path.write_text(text, encoding='utf-8')


def compute_build_hash(rename_map):
    hasher = hashlib.sha256()
    # ファイル名（新パス）と内容ハッシュの両方を安定した順序で混ぜる
    for old_rel in sorted(rename_map):
        new_rel = rename_map[old_rel]
        hasher.update(old_rel.encode('utf-8'))
        hasher.update((DIST / new_rel).read_bytes())
    for rel in EXTRA_HASH_INPUTS:
        hasher.update(rel.encode('utf-8'))
        hasher.update((DIST / rel).read_bytes())
    return hasher.hexdigest()[:HASH_LEN]


def apply_build_hash(build_hash):
    sw_path = DIST / 'sw.js'
    text = sw_path.read_text(encoding='utf-8')
    if '__BUILD_HASH__' not in text:
        raise RuntimeError('sw.js に __BUILD_HASH__ プレースホルダーが見つかりません')
    text = text.replace('__BUILD_HASH__', build_hash)
    sw_path.write_text(text, encoding='utf-8')


def main():
    build_dist()
    rename_map = rename_hashed_files()
    rewrite_references(rename_map)
    build_hash = compute_build_hash(rename_map)
    apply_build_hash(build_hash)

    print(f'✅ ビルド完了: {DIST}')
    print(f'   BUILD_HASH = {build_hash}')
    for old_rel, new_rel in sorted(rename_map.items()):
        print(f'   {old_rel} -> {new_rel}')


if __name__ == '__main__':
    main()
