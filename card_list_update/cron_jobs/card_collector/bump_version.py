"""カードデータ自動更新用のバージョン更新スクリプト

sw-version.js の APP_VERSION（パッチバージョン）と VERSION_DESCRIPTION
（更新履歴表示用の備忘録）を更新する。キャッシュの無効化自体はデプロイ時に
scripts/deploy/build_site.py が自動で行うため、ここでは sw.js は一切触らない。
GitHub Actions のカードデータ自動更新ワークフローからのみ使用する想定。

リポジトリルートで実行すること: python card_list_update/cron_jobs/card_collector/bump_version.py
"""
import datetime
import os
import re
import sys

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SW_VERSION_PATH = os.path.join(REPO_ROOT, 'sw-version.js')

APP_VERSION_RE = re.compile(r'const APP_VERSION = "(\d+)\.(\d+)\.(\d+)";')
VERSION_DESCRIPTION_RE = re.compile(r'const VERSION_DESCRIPTION = ".*?";')


def bump_patch_version(version_tuple):
    major, minor, patch = version_tuple
    return major, minor, int(patch) + 1


def main():
    with open(SW_VERSION_PATH, 'r', encoding='utf-8') as f:
        sw_version_content = f.read()

    match = APP_VERSION_RE.search(sw_version_content)
    if not match:
        print('APP_VERSION が sw-version.js から見つかりません', file=sys.stderr)
        sys.exit(1)

    current_version = tuple(int(part) for part in match.groups())
    new_major, new_minor, new_patch = bump_patch_version(current_version)
    new_version = f'{new_major}.{new_minor}.{new_patch}'
    today = datetime.date.today().isoformat()
    new_description = f'カードデータ自動更新（{today}）'

    sw_version_content = APP_VERSION_RE.sub(
        f'const APP_VERSION = "{new_version}";', sw_version_content
    )
    sw_version_content = VERSION_DESCRIPTION_RE.sub(
        f'const VERSION_DESCRIPTION = "{new_description}";', sw_version_content
    )
    with open(SW_VERSION_PATH, 'w', encoding='utf-8') as f:
        f.write(sw_version_content)

    print(new_version)

    github_output = os.environ.get('GITHUB_OUTPUT')
    if github_output:
        with open(github_output, 'a', encoding='utf-8') as f:
            f.write(f'version={new_version}\n')


if __name__ == '__main__':
    main()
