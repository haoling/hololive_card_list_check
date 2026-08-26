/**
 * カードスキャン（絵柄特徴一致検索）
 *
 * カメラ映像からカードの絵柄をハッシュ化し、json_file/card_phash.json
 * （scripts/tools/generate_card_phash.py が GitHub Actions 上で生成）と照合してカードを特定する。
 *
 * ハッシュアルゴリズムは dHash（差分ハッシュ）。Python 側は imagehash.dhash(image, hash_size=16) を
 * 使用しており、このファイルはその手順（grayscale化→(hash_size+1, hash_size)へ縮小→列方向の差分→
 * ビット列→hex文字列）をJSで再現している。
 * grayscale変換の係数はPILの Image.convert('L') と同じ ITU-R 601-2（固定小数点近似）を用いる。
 * 縮小方法は、canvasのdrawImage()による一発の大幅縮小ではなく、出力画素ごとに対応する矩形領域の
 * 単純平均（box/areaフィルタ相当）を手動で行う。これは実験的に検証済みで、drawImage()一発縮小
 * （PIL LANCZOSとの同一画像比較で約21/256bitずれ）よりも box平均の方がズレが小さい
 * （同条件で約14/256bit）ため採用している。いずれにせよ数bit〜十数bit程度のズレは残るため、
 * 候補を複数表示して人間が選べるUIで吸収する設計にしている。
 *
 * 回転について: dHashは列の左右比較という走査順に依存するため任意角度の回転に頑健ではない。
 * 90度刻みの回転（スマホを横向きに構えた場合等）は、キャプチャした画像を0/90/180/270度回転させた
 * 4パターンそれぞれでハッシュ計算し、DB全体と照合して最良の候補を採用することで吸収する。
 * それ以外の任意角度の傾きは、画面上のガイド枠にユーザーがカードの縁を合わせる前提とし、
 * エッジ検出や射影変換による完全なデスキュー補正はスコープ外としている。
 */
(function () {
  'use strict';

  // ===== 調整可能な定数 =====
  // 実機（スマホ＋実カード）でのテスト結果に応じて調整する想定。
  const HASH_SIZE = 16; // json_file/card_phash.json 生成時（generate_card_phash.py の HASH_SIZE）と必ず一致させる
  const SCAN_INTERVAL_MS = 500;
  const CARD_ASPECT = 63 / 88; // TCG標準カードサイズ（幅mm / 高さmm）
  const CAPTURE_SCALE = 3; // ガイド矩形を切り出す中間バッファの解像度倍率（63*3 x 88*3 px）
  const TOP_N = 5;
  const AUTO_CONFIRM_MAX_DISTANCE = 40; // 256bit中。この値以下なら「ほぼ確実に一致」とみなす候補とする
  const AUTO_CONFIRM_MARGIN = 20; // 1位と2位のハミング距離差がこれ以上あれば自動確定候補とする
  const CANDIDATE_MAX_DISTANCE = 90; // これより遠い候補は一覧にも出さない（無関係なノイズを除外）
  const STABILIZE_COUNT = 3; // 自動確定に必要な連続一致回数（フリッカー防止）

  const CARD_DATA_CACHE_KEY = 'cardData';
  const CARD_DATA_TIMESTAMP_KEY = 'dataTimestamp';
  const CARD_DATA_MAX_AGE = 24 * 60 * 60 * 1000;

  let cardDataMap = null; // id -> card
  let phashDB = null; // id -> hex文字列
  let phashEntries = null; // [[id, Uint32Array(8)], ...]
  let videoStream = null;
  let scanTimer = null;
  let lastTopId = null;
  let stableCount = 0;

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    if (typeof window.initializeDarkMode === 'function') window.initializeDarkMode();
    renderVersion();

    const shutterBtn = document.getElementById('shutterBtn');
    const toggleScanBtn = document.getElementById('toggleScanBtn');
    if (shutterBtn) shutterBtn.addEventListener('click', () => scanOnce(true));
    if (toggleScanBtn) toggleScanBtn.addEventListener('click', toggleAutoScan);

    const detailCloseBtn = document.getElementById('detailCloseBtn');
    if (detailCloseBtn) detailCloseBtn.addEventListener('click', closeDetail);

    window.addEventListener('beforeunload', stopCamera);

    try {
      await Promise.all([loadCardData(), loadPhashDB()]);
    } catch (e) {
      showStatus('カードデータの読み込みに失敗しました: ' + (e && e.message ? e.message : e), 'error');
      return;
    }

    if (!phashEntries || phashEntries.length === 0) {
      showStatus(
        '特徴量データベース（card_phash.json）が未生成です。GitHub Actions の「カード画像ハッシュDB生成」ワークフローを実行してください。',
        'error'
      );
      return;
    }

    await startCamera();
  }

  function renderVersion() {
    const el = document.getElementById('versionDisplay');
    if (el) el.textContent = '[v' + (self.APP_VERSION || '') + ']';
  }

  function showStatus(message, type) {
    const el = document.getElementById('statusMessage');
    if (!el) return;
    el.textContent = message;
    el.className = 'status-message status-' + (type || 'info');
    el.style.display = 'block';
  }

  function hideStatus() {
    const el = document.getElementById('statusMessage');
    if (el) el.style.display = 'none';
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---- データ読み込み ----

  async function loadCardData() {
    const cached = localStorage.getItem(CARD_DATA_CACHE_KEY);
    const ts = parseInt(localStorage.getItem(CARD_DATA_TIMESTAMP_KEY) || '0', 10);
    const age = Date.now() - ts;
    if (cached && (age < CARD_DATA_MAX_AGE || !navigator.onLine)) {
      cardDataMap = JSON.parse(cached);
      return;
    }
    const res = await fetch('json_file/card_data.json');
    if (!res.ok) throw new Error('card_data.json の取得に失敗しました');
    cardDataMap = await res.json();
    localStorage.setItem(CARD_DATA_CACHE_KEY, JSON.stringify(cardDataMap));
    localStorage.setItem(CARD_DATA_TIMESTAMP_KEY, Date.now().toString());
  }

  async function loadPhashDB() {
    try {
      const res = await fetch('json_file/card_phash.json');
      phashDB = res.ok ? await res.json() : {};
    } catch (e) {
      phashDB = {};
    }
    preparePhashEntries();
  }

  function preparePhashEntries() {
    const expectedHexLen = (HASH_SIZE * HASH_SIZE) / 4;
    phashEntries = [];
    for (const id in phashDB) {
      const hex = phashDB[id];
      if (typeof hex !== 'string' || hex.length !== expectedHexLen) continue;
      if (!cardDataMap || !cardDataMap[id]) continue;
      phashEntries.push([id, hexToUint32Array(hex)]);
    }
  }

  // ---- dHashユーティリティ ----

  function popcount32(x) {
    x = x - ((x >> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
    x = (x + (x >> 4)) & 0x0f0f0f0f;
    return (x * 0x01010101) >> 24;
  }

  function hexToUint32Array(hex) {
    const groups = [];
    for (let i = 0; i < hex.length; i += 8) {
      groups.push(parseInt(hex.substr(i, 8), 16) >>> 0);
    }
    return groups;
  }

  function hammingDistance(a, b) {
    let dist = 0;
    for (let i = 0; i < a.length; i++) {
      dist += popcount32((a[i] ^ b[i]) >>> 0);
    }
    return dist;
  }

  function boxAverageGray(canvas, outW, outH) {
    const sw = canvas.width;
    const sh = canvas.height;
    const ctx = canvas.getContext('2d');
    const src = ctx.getImageData(0, 0, sw, sh).data;
    const gray = new Array(outH);
    for (let y = 0; y < outH; y++) {
      const row = new Array(outW);
      const sy0 = Math.floor((y * sh) / outH);
      const sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) * sh) / outH));
      for (let x = 0; x < outW; x++) {
        const sx0 = Math.floor((x * sw) / outW);
        const sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) * sw) / outW));
        let sum = 0;
        let count = 0;
        for (let sy = sy0; sy < sy1; sy++) {
          for (let sx = sx0; sx < sx1; sx++) {
            const i = (sy * sw + sx) * 4;
            // PILの Image.convert('L') と同じ ITU-R 601-2 の固定小数点近似式
            sum += (src[i] * 19595 + src[i + 1] * 38470 + src[i + 2] * 7471 + 0x8000) >> 16;
            count++;
          }
        }
        row[x] = count ? Math.round(sum / count) : 0;
      }
      gray[y] = row;
    }
    return gray;
  }

  function dHashHexFromGray(gray, hashSize) {
    let bits = '';
    for (let y = 0; y < hashSize; y++) {
      for (let x = 0; x < hashSize; x++) {
        bits += gray[y][x + 1] > gray[y][x] ? '1' : '0';
      }
    }
    let hex = '';
    for (let i = 0; i < bits.length; i += 4) {
      hex += parseInt(bits.substr(i, 4), 2).toString(16);
    }
    return hex;
  }

  function rotateCanvas(sourceCanvas, angleDeg) {
    if (angleDeg === 0) return sourceCanvas;
    const sw = sourceCanvas.width;
    const sh = sourceCanvas.height;
    const swapped = angleDeg === 90 || angleDeg === 270;
    const out = document.createElement('canvas');
    out.width = swapped ? sh : sw;
    out.height = swapped ? sw : sh;
    const ctx = out.getContext('2d');
    ctx.translate(out.width / 2, out.height / 2);
    ctx.rotate((angleDeg * Math.PI) / 180);
    ctx.drawImage(sourceCanvas, -sw / 2, -sh / 2);
    return out;
  }

  function computeHashesForRotations(sourceCanvas) {
    const hashes = [];
    [0, 90, 180, 270].forEach(function (angle) {
      const rotated = rotateCanvas(sourceCanvas, angle);
      const gray = boxAverageGray(rotated, HASH_SIZE + 1, HASH_SIZE);
      const hex = dHashHexFromGray(gray, HASH_SIZE);
      hashes.push(hexToUint32Array(hex));
    });
    return hashes;
  }

  // ---- カメラ ----

  async function startCamera() {
    const video = document.getElementById('video');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showStatus('このブラウザはカメラ機能に対応していません。', 'error');
      return;
    }
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
    } catch (e) {
      showStatus(cameraErrorMessage(e), 'error');
      return;
    }
    hideStatus();
    video.muted = true;
    video.playsInline = true;
    video.srcObject = videoStream;
    try {
      await video.play();
    } catch (e) {
      // 一部ブラウザでは自動再生がブロックされる場合がある（ユーザー操作で再試行させる）
      showStatus('カメラ映像の再生に失敗しました。画面をタップしてください。', 'error');
    }
    resumeAutoScan();
  }

  function cameraErrorMessage(e) {
    if (e && e.name === 'NotAllowedError') {
      return 'カメラへのアクセスが許可されませんでした。ブラウザの設定でカメラ権限を許可してください。';
    }
    if (e && e.name === 'NotFoundError') {
      return '利用可能なカメラが見つかりませんでした。';
    }
    return 'カメラの起動に失敗しました: ' + (e && e.message ? e.message : e);
  }

  function stopCamera() {
    pauseAutoScan();
    if (videoStream) {
      videoStream.getTracks().forEach(function (t) {
        t.stop();
      });
      videoStream = null;
    }
  }

  function toggleAutoScan() {
    const btn = document.getElementById('toggleScanBtn');
    if (scanTimer) {
      pauseAutoScan();
      if (btn) btn.textContent = '▶ 自動スキャン再開';
    } else {
      resumeAutoScan();
      if (btn) btn.textContent = '⏸ 自動スキャン停止';
    }
  }

  function pauseAutoScan() {
    if (scanTimer) {
      clearInterval(scanTimer);
      scanTimer = null;
    }
  }

  function resumeAutoScan() {
    if (!scanTimer && videoStream) {
      scanTimer = setInterval(function () {
        scanOnce(false);
      }, SCAN_INTERVAL_MS);
    }
  }

  // ---- ガイド矩形 → 映像ソース座標への変換 ----
  // video要素は object-fit: cover で表示している前提。

  function getSourceRectFromGuide() {
    const video = document.getElementById('video');
    const guide = document.getElementById('guideBox');
    if (!video || !guide) return null;

    const videoRect = video.getBoundingClientRect();
    const guideRect = guide.getBoundingClientRect();
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh || videoRect.width === 0 || videoRect.height === 0) return null;

    const displayAspect = videoRect.width / videoRect.height;
    const videoAspect = vw / vh;
    let scale;
    let offsetX = 0;
    let offsetY = 0;
    if (videoAspect > displayAspect) {
      // 映像の方が横長 → 高さに合わせてスケールし、左右がクロップされる
      scale = videoRect.height / vh;
      offsetX = (vw * scale - videoRect.width) / 2;
    } else {
      // 映像の方が縦長 → 幅に合わせてスケールし、上下がクロップされる
      scale = videoRect.width / vw;
      offsetY = (vh * scale - videoRect.height) / 2;
    }

    const sx = (guideRect.left - videoRect.left + offsetX) / scale;
    const sy = (guideRect.top - videoRect.top + offsetY) / scale;
    const sw = guideRect.width / scale;
    const sh = guideRect.height / scale;
    return { sx: sx, sy: sy, sw: sw, sh: sh };
  }

  function captureGuideToCanvas(sourceRect) {
    const video = document.getElementById('video');
    const w = Math.round(63 * CAPTURE_SCALE);
    const h = Math.round(88 * CAPTURE_SCALE);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, sourceRect.sx, sourceRect.sy, sourceRect.sw, sourceRect.sh, 0, 0, w, h);
    return canvas;
  }

  // ---- 照合 ----

  function findCandidates(hashesForRotations) {
    const bestById = new Map();
    hashesForRotations.forEach(function (groups) {
      phashEntries.forEach(function (entry) {
        const id = entry[0];
        const refGroups = entry[1];
        const dist = hammingDistance(groups, refGroups);
        const prev = bestById.get(id);
        if (prev === undefined || dist < prev) bestById.set(id, dist);
      });
    });
    const sorted = Array.from(bestById.entries()).sort(function (a, b) {
      return a[1] - b[1];
    });
    return sorted.filter(function (entry) {
      return entry[1] <= CANDIDATE_MAX_DISTANCE;
    }).slice(0, TOP_N);
  }

  function scanOnce(manual) {
    if (!phashEntries || phashEntries.length === 0) return;
    if (document.getElementById('detailPanel').style.display === 'block') return;

    const sourceRect = getSourceRectFromGuide();
    if (!sourceRect || sourceRect.sw <= 0 || sourceRect.sh <= 0) return;

    const captureCanvas = captureGuideToCanvas(sourceRect);
    const hashesForRotations = computeHashesForRotations(captureCanvas);
    const candidates = findCandidates(hashesForRotations);

    renderCandidates(candidates);

    if (candidates.length === 0) {
      lastTopId = null;
      stableCount = 0;
      return;
    }

    const topId = candidates[0][0];
    const topDist = candidates[0][1];
    const secondDist = candidates.length > 1 ? candidates[1][1] : Infinity;
    const isConfident = topDist <= AUTO_CONFIRM_MAX_DISTANCE && secondDist - topDist >= AUTO_CONFIRM_MARGIN;

    if (manual) {
      if (isConfident) openDetail(topId);
      return;
    }

    if (isConfident) {
      if (lastTopId === topId) {
        stableCount++;
      } else {
        lastTopId = topId;
        stableCount = 1;
      }
      if (stableCount >= STABILIZE_COUNT) {
        stableCount = 0;
        openDetail(topId);
      }
    } else {
      lastTopId = null;
      stableCount = 0;
    }
  }

  // ---- 候補一覧 UI ----

  function renderCandidates(candidates) {
    const container = document.getElementById('candidateList');
    if (!container) return;
    if (!candidates.length) {
      container.innerHTML = '<div class="candidate-empty">カードをガイド枠に合わせてください</div>';
      return;
    }
    container.innerHTML = candidates
      .map(function (entry) {
        const id = entry[0];
        const card = cardDataMap[id];
        if (!card) return '';
        return (
          '<div class="candidate-card" data-id="' + escapeHtml(id) + '">' +
          '<img src="' + escapeHtml(card.image_url) + '" alt="' + escapeHtml(card.name || '') + '" loading="lazy" />' +
          '<div class="candidate-info">' +
          '<div class="candidate-name">' + escapeHtml(card.name || '') + '</div>' +
          '<div class="candidate-meta">' + escapeHtml(card.number || '') + ' ' + escapeHtml(card.rarity || '') + '</div>' +
          '</div></div>'
        );
      })
      .join('');
    container.querySelectorAll('.candidate-card').forEach(function (el) {
      el.addEventListener('click', function () {
        openDetail(el.dataset.id);
      });
    });
  }

  // ---- 詳細パネル ----

  function openDetail(id) {
    const card = cardDataMap[id];
    if (!card) return;
    renderDetailPanel(id, card);
    document.getElementById('detailPanel').style.display = 'block';
    document.getElementById('scannerArea').style.display = 'none';
  }

  function closeDetail() {
    document.getElementById('detailPanel').style.display = 'none';
    document.getElementById('scannerArea').style.display = '';
    lastTopId = null;
    stableCount = 0;
  }

  function renderSkillsSimple(skills) {
    if (!skills || !skills.length) return '<div class="skill-none">スキルなし</div>';
    return skills
      .map(function (skill) {
        const type = escapeHtml(skill.type || '');
        if (skill.text) {
          return '<div class="skill-item"><strong>【' + type + '】</strong><br><span>' + escapeHtml(skill.text) + '</span></div>';
        }
        const namePart = skill.name ? '[' + escapeHtml(skill.name) + ']' : '';
        const dmg = skill.dmg ? '（' + escapeHtml(String(skill.dmg)) + '）' : '';
        const desc = skill.description ? '<br><span>' + escapeHtml(skill.description) + '</span>' : '';
        return '<div class="skill-item"><strong>【' + type + '】</strong><strong>' + namePart + dmg + '</strong>' + desc + '</div>';
      })
      .join('');
  }

  function renderDetailPanel(id, card) {
    const panel = document.getElementById('detailPanel');
    const bloomText = card.bloom_level || (card.card_type === 'Buzzホロメン' ? '1stBuzz' : '不明');
    const hp = card.card_type === 'ホロメン' ? card.hp : card.life;
    const productText = card.product ? String(card.product).replace(/,\s*/g, ' / ') : '不明';
    const tagsHtml = card.tags && card.tags.length
      ? '<div class="detail-tags">' + card.tags.map(function (t) { return '<span class="tag-chip">' + escapeHtml(t) + '</span>'; }).join('') + '</div>'
      : '';
    const skillsHtml = renderSkillsSimple(card.skills);

    panel.innerHTML =
      '<div class="detail-header"><button class="detail-close" id="detailCloseBtn">← スキャンに戻る</button></div>' +
      '<div class="detail-body">' +
      '<img class="detail-image" src="' + escapeHtml(card.image_url) + '" alt="' + escapeHtml(card.name || '') + '" />' +
      '<div class="detail-info">' +
      '<h2>' + escapeHtml(card.name || '') + '</h2>' +
      '<div class="detail-row"><strong>🆔 カード番号:</strong> ' + escapeHtml(id) + '</div>' +
      '<div class="detail-row"><strong>🃏 カードタイプ:</strong> ' + escapeHtml(card.card_type || '不明') + '</div>' +
      '<div class="detail-grid">' +
      '<div><strong>✨ レアリティ</strong><br>' + escapeHtml(card.rarity || '-') + '</div>' +
      '<div><strong>🎨 色</strong><br>' + escapeHtml(card.color || '不明') + '</div>' +
      '<div><strong>🌸 Bloom</strong><br>' + escapeHtml(bloomText) + '</div>' +
      '</div>' +
      (hp ? '<div class="detail-row"><strong>❤️ HP/LIFE:</strong> ' + escapeHtml(String(hp)) + '</div>' : '') +
      '<div class="detail-row"><strong>📦 収録商品:</strong> ' + escapeHtml(productText) + '</div>' +
      tagsHtml +
      '<div class="detail-skills"><strong>⚡ スキル</strong>' + skillsHtml + '</div>' +
      '<div class="detail-link"><a href="https://hololive-official-cardgame.com/cardlist/?id=' + encodeURIComponent(id) + '" target="_blank" rel="noopener">公式サイトで見る ↗</a></div>' +
      '</div></div>';

    document.getElementById('detailCloseBtn').addEventListener('click', closeDetail);
  }
})();
