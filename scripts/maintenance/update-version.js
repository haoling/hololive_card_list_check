#!/usr/bin/env node

/**
 * バージョン更新スクリプト（表示専用の備忘録を更新するだけ。キャッシュ無効化には無関係）
 * 使用方法: node scripts/maintenance/update-version.js 4.29.0 "新機能の説明"
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');

// コマンドライン引数の取得
const [,, newVersion, newDescription] = process.argv;

if (!newVersion || !newDescription) {
  console.error('使用方法: node scripts/maintenance/update-version.js <バージョン> "<説明>"');
  console.error('例: node scripts/maintenance/update-version.js 4.29.0 "新機能追加"');
  process.exit(1);
}

// バージョン形式の検証
if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error('バージョンは x.y.z の形式で入力してください（例: 4.29.0）');
  process.exit(1);
}

console.log(`🚀 表示用バージョンを ${newVersion} に更新します`);
console.log(`📝 説明: ${newDescription}`);

try {
  updateSwVersion(newVersion, newDescription);
  updatePackageJson(newVersion);

  console.log('✅ バージョン更新が完了しました！');
  console.log('📋 更新されたファイル:');
  console.log('  - sw-version.js');
  console.log('  - package.json (存在する場合)');

} catch (error) {
  console.error('❌ バージョン更新中にエラーが発生しました:', error.message);
  process.exit(1);
}

function updateSwVersion(version, description) {
  const versionFilePath = path.join(REPO_ROOT, 'sw-version.js');

  if (!fs.existsSync(versionFilePath)) {
    throw new Error('sw-version.js が見つかりません');
  }

  let content = fs.readFileSync(versionFilePath, 'utf8');

  content = content.replace(
    /const APP_VERSION = "[^"]+";/,
    `const APP_VERSION = "${version}";`
  );

  content = content.replace(
    /const VERSION_DESCRIPTION = "[^"]+";/,
    `const VERSION_DESCRIPTION = "${description}";`
  );

  fs.writeFileSync(versionFilePath, content, 'utf8');
  console.log('✓ sw-version.js を更新しました');
}

function updatePackageJson(version) {
  const packagePath = path.join(REPO_ROOT, 'package.json');

  if (!fs.existsSync(packagePath)) {
    console.log('ℹ️ package.json が見つかりません - スキップします');
    return;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageJson.version = version;

    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
    console.log('✓ package.json を更新しました');
  } catch (error) {
    console.warn('⚠️ package.json の更新に失敗しました:', error.message);
  }
}
