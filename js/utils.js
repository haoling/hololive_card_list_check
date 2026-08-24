/**
 * 共通ユーティリティ関数
 * 全てのページで使用される汎用的な関数を提供します
 */

// デバッグモードの設定（本番環境では false に設定）
const DEBUG_MODE = true;

/**
 * デバッグログ出力（本番環境では無効化）
 * @param {string} message - ログメッセージ
 * @param {...any} args - 追加の引数
 */
window.debugLog = function(message, ...args) {
  if (DEBUG_MODE) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
};

/**
 * エラーログ出力（常に有効）
 * @param {string} message - エラーメッセージ
 * @param {...any} args - 追加の引数
 */
window.errorLog = function(message, ...args) {
  console.error(`[ERROR] ${message}`, ...args);
};

/**
 * 警告ログ出力（常に有効）
 * @param {string} message - 警告メッセージ
 * @param {...any} args - 追加の引数
 */
window.warnLog = function(message, ...args) {
  console.warn(`[WARN] ${message}`, ...args);
};

/**
 * テキスト正規化関数（ひらがな/カタカナ、大文字/小文字統一）
 * 全ページで共通使用される検索・フィルタリング用の正規化
 * @param {string} text - 正規化するテキスト
 * @returns {string} 正規化されたテキスト
 */
window.normalizeText = function(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .toLowerCase()
    .replace(/[ぁ-ゖ]/g, s => String.fromCharCode(s.charCodeAt(0) + 0x60))  // ひらがな→カタカナ変換
    .replace(/[\u3041-\u3096]/g, s => String.fromCharCode(s.charCodeAt(0) + 0x60)); // 残りのひらがな→カタカナ
};

/**
 * カード番号検索用の正規化関数（normalizeText に加えて記号を除去）
 * 例: "hBP08-085" と "hbp08085" が同一視できるようにする
 * @param {string} text - 正規化するテキスト
 * @returns {string} 正規化されたテキスト（英数字・かな漢字以外の記号を除去）
 */
window.normalizeSearchKey = function(text) {
  return window.normalizeText(text).replace(/[^\p{L}\p{N}]/gu, '');
};

/**
 * ダークモード切り替え関数
 * 複数ページで使用されるダークモード機能
 */
window.toggleDarkMode = function() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", isDark ? "true" : "false");
  return isDark;
};

/**
 * ダークモード初期化関数
 * ページロード時にダークモード状態を復元
 */
window.initializeDarkMode = function() {
  const darkMode = localStorage.getItem("darkMode");
  if (darkMode === "true") {
    document.body.classList.add("dark");
  }
};

/**
 * ホーム画面への遷移関数
 * 全ページで使用される共通ナビゲーション
 */
window.goHome = function() {
  if (typeof window.navigateToPage === 'function') {
    window.navigateToPage('index.html');
  } else {
    window.location.href = 'index.html';
  }
};

/**
 * チップ操作の共通関数群
 * フィルタUIで使用されるチップ操作を統一
 */

/**
 * チップの選択/非選択を切り替え
 * @param {HTMLElement} btn - チップボタン要素
 */
window.toggleChip = function(btn) {
  btn.classList.toggle("selected");
};

/**
 * チップグループの全選択
 * @param {HTMLElement} allBtn - 全選択ボタン要素
 */
window.selectAllChip = function(allBtn) {
  const container = allBtn.closest('.chip-group, .filter-chips');
  if (!container) return;
  
  const chips = container.querySelectorAll('.chip:not(.all-chip)');
  const isAllSelected = allBtn.classList.contains('selected');
  
  if (isAllSelected) {
    // 全選択解除
    chips.forEach(chip => chip.classList.remove('selected'));
    allBtn.classList.remove('selected');
  } else {
    // 全選択
    chips.forEach(chip => chip.classList.add('selected'));
    allBtn.classList.add('selected');
  }
};

/**
 * チップグループから選択されている値を取得
 * @param {string} groupId - チップグループのID
 * @returns {Array<string>} 選択されている値の配列
 */
window.getCheckedFromChips = function(groupId) {
  const container = document.getElementById(groupId);
  if (!container) return [];
  
  return Array.from(container.querySelectorAll('.chip.selected:not(.all-chip)'))
    .map(chip => chip.dataset.value || chip.textContent.trim());
};

/**
 * モバイル画面判定
 * @returns {boolean} モバイル画面かどうか
 */
window.isMobileScreen = function() {
  return window.innerWidth <= 768;
};

/**
 * 配列をシャッフルする（Fisher-Yates法）
 * @param {Array} array - シャッフルする配列
 * @returns {Array} シャッフルされた新しい配列
 */
window.shuffleArray = function(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

/**
 * オブジェクトのディープクローン
 * @param {any} obj - クローンするオブジェクト
 * @returns {any} クローンされたオブジェクト
 */
window.deepClone = function(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => window.deepClone(item));
  }
  
  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = window.deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
};

/**
 * 非同期処理の遅延実行
 * @param {number} ms - 遅延時間（ミリ秒）
 * @returns {Promise} 遅延処理のPromise
 */
window.delay = function(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 安全なJSON解析
 * @param {string} jsonString - JSON文字列
 * @param {any} defaultValue - 解析失敗時のデフォルト値
 * @returns {any} 解析されたオブジェクトまたはデフォルト値
 */
window.safeJsonParse = function(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    window.errorLog('JSON解析に失敗:', error);
    return defaultValue;
  }
};

/**
 * LocalStorageの安全な操作
 */
window.storageUtils = {
  /**
   * 値を保存
   * @param {string} key - キー
   * @param {any} value - 値
   */
  set: function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      window.errorLog('LocalStorage保存エラー:', error);
      return false;
    }
  },
  
  /**
   * 値を取得
   * @param {string} key - キー
   * @param {any} defaultValue - デフォルト値
   * @returns {any} 取得された値またはデフォルト値
   */
  get: function(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      window.errorLog('LocalStorage取得エラー:', error);
      return defaultValue;
    }
  },
  
  /**
   * 値を削除
   * @param {string} key - キー
   */
  remove: function(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      window.errorLog('LocalStorage削除エラー:', error);
      return false;
    }
  }
};

/**
 * バリデーション関数群
 * データの整合性を保つための検証機能
 */
window.validate = {
  /**
   * カードオブジェクトの妥当性を検証
   * @param {Object} card - 検証するカードオブジェクト
   * @returns {Object} 検証結果 {valid: boolean, errors: Array}
   */
  card: function(card) {
    const errors = [];
    
    if (!card) {
      errors.push('カードが存在しません');
      return { valid: false, errors };
    }
    
    if (!card.id) {
      errors.push('カードIDが不正です');
    }
    
    if (!card.name || typeof card.name !== 'string') {
      errors.push('カード名が不正です');
    }
    
    if (!card.card_type) {
      errors.push('カードタイプが不正です');
    }
    
    return { valid: errors.length === 0, errors };
  },
  
  /**
   * プレイヤー状態の妥当性を検証
   * @param {Object} player - 検証するプレイヤーオブジェクト
   * @param {number} playerId - プレイヤーID
   * @returns {Object} 検証結果
   */
  player: function(player, playerId) {
    const errors = [];
    
    if (!player) {
      errors.push(`プレイヤー${playerId}が存在しません`);
      return { valid: false, errors };
    }
    
    if (!player.cards) {
      errors.push(`プレイヤー${playerId}のカードエリアが存在しません`);
    }
    
    if (!Array.isArray(player.hand)) {
      errors.push(`プレイヤー${playerId}の手札が配列ではありません`);
    }
    
    return { valid: errors.length === 0, errors };
  },
  
  /**
   * フェーズの妥当性を検証
   * @param {number} phase - フェーズ番号
   * @returns {Object} 検証結果
   */
  phase: function(phase) {
    const errors = [];
    const validPhases = [-1, 0, 1, 2, 3, 4, 5]; // -1は準備フェーズ
    
    if (!validPhases.includes(phase)) {
      errors.push(`無効なフェーズ: ${phase}`);
    }
    
    return { valid: errors.length === 0, errors };
  }
};

/**
 * エラーハンドリング用のラッパー関数
 * 非同期処理の安全な実行
 */
window.safeAsync = async function(asyncFunction, fallbackValue = null, context = 'unknown') {
  try {
    return await asyncFunction();
  } catch (error) {
    window.errorLog(`非同期処理エラー [${context}]:`, error);
    return fallbackValue;
  }
};

/**
 * DOM操作の安全な実行
 * 要素が存在しない場合のエラー回避
 */
window.safeDomOperation = function(selector, operation, fallbackValue = null) {
  try {
    const element = document.querySelector(selector);
    if (!element) {
      window.warnLog(`DOM要素が見つかりません: ${selector}`);
      return fallbackValue;
    }
    return operation(element);
  } catch (error) {
    window.errorLog(`DOM操作エラー [${selector}]:`, error);
    return fallbackValue;
  }
};

/**
 * Google Drive同期関連のUI生成ヘルパー
 */
window.googleDriveUI = {
  /**
   * Google Drive同期UIを生成してヘッダーに追加
   * @param {HTMLElement} headerElement - ヘッダー要素（挿入先）
   */
  createSyncUI: function(headerElement) {
    if (!headerElement) {
      window.warnLog('Google Drive UI: ヘッダー要素が見つかりません');
      return;
    }

    // 既に追加済みの場合はスキップ
    if (document.getElementById('google-drive-sync-container')) {
      return;
    }

    const container = document.createElement('div');
    container.id = 'google-drive-sync-container';
    container.className = 'google-drive-sync-container';
    container.innerHTML = `
      <div class="sync-status" id="sync-status" title="Google Drive同期状態">
        <span class="sync-icon">☁️</span>
        <span class="sync-text">未接続</span>
      </div>
      <button id="google-signin-btn" class="google-signin-btn" title="Googleでログイン">
        <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span class="signin-text">ログイン</span>
      </button>
      <button id="google-signout-btn" class="google-signout-btn" style="display: none;" title="ログアウト">
        ログアウト
      </button>
    `;

    // ヘッダーの適切な位置に挿入
    const darkModeBtn = headerElement.querySelector('.dark-toggle, #darkModeToggle, [onclick*="toggleDarkMode"]');
    if (darkModeBtn) {
      darkModeBtn.parentNode.insertBefore(container, darkModeBtn);
    } else {
      headerElement.appendChild(container);
    }

    this.setupEventListeners();
    this.setupGoogleDriveEvents();
  },

  /**
   * イベントリスナーを設定
   */
  setupEventListeners: function() {
    const signinBtn = document.getElementById('google-signin-btn');
    const signoutBtn = document.getElementById('google-signout-btn');

    if (signinBtn) {
      signinBtn.addEventListener('click', () => {
        if (window.googleDriveSync) {
          window.googleDriveSync.signIn();
        }
      });
    }

    if (signoutBtn) {
      signoutBtn.addEventListener('click', () => {
        if (window.googleDriveSync) {
          window.googleDriveSync.signOut();
        }
      });
    }
  },

  /**
   * Google Drive同期イベントを設定
   */
  setupGoogleDriveEvents: function() {
    window.addEventListener('googleSignInChange', (e) => {
      this.updateUIState(e.detail.signedIn);
    });

    window.addEventListener('googleSyncStatusChange', (e) => {
      this.updateSyncStatus(e.detail.status);
    });

    window.addEventListener('googleSyncError', (e) => {
      this.showError(e.detail.message);
    });
  },

  /**
   * UI状態を更新
   */
  updateUIState: function(signedIn) {
    const signinBtn = document.getElementById('google-signin-btn');
    const signoutBtn = document.getElementById('google-signout-btn');
    const syncStatus = document.getElementById('sync-status');

    if (signinBtn) signinBtn.style.display = signedIn ? 'none' : 'flex';
    if (signoutBtn) signoutBtn.style.display = signedIn ? 'inline-block' : 'none';

    if (syncStatus) {
      if (signedIn) {
        syncStatus.classList.add('connected');
        syncStatus.querySelector('.sync-text').textContent = '接続中';
      } else {
        syncStatus.classList.remove('connected', 'saving', 'error');
        syncStatus.querySelector('.sync-text').textContent = '未接続';
      }
    }
  },

  /**
   * 同期状態を更新
   */
  updateSyncStatus: function(status) {
    const syncStatus = document.getElementById('sync-status');
    if (!syncStatus) return;

    const syncText = syncStatus.querySelector('.sync-text');
    syncStatus.classList.remove('saving', 'error', 'saved', 'loading');

    switch (status) {
      case 'saving':
        syncStatus.classList.add('saving');
        syncText.textContent = '保存中...';
        break;
      case 'saved':
        syncStatus.classList.add('saved');
        syncText.textContent = '保存完了';
        break;
      case 'loading':
        syncStatus.classList.add('loading');
        syncText.textContent = '読込中...';
        break;
      case 'error':
        syncStatus.classList.add('error');
        syncText.textContent = 'エラー';
        break;
      case 'idle':
      default:
        syncText.textContent = '同期済';
        break;
    }
  },

  /**
   * エラーを表示
   */
  showError: function(message) {
    const errorMsg = message || '不明なエラーが発生しました';
    console.error('[Google Drive]', errorMsg);
    // シンプルなアラート表示（必要に応じてモーダルに変更可能）
    if (errorMsg.includes('認証エラー') || errorMsg.includes('初期化エラー')) {
      alert('Google Drive同期エラー: ' + errorMsg);
    }
  }
};

/**
 * Google APIスクリプトを動的に読み込み
 */
window.loadGoogleAPIs = function() {
  return new Promise((resolve, reject) => {
    // 既に読み込み済みの場合
    if (typeof gapi !== 'undefined' && typeof google !== 'undefined' && google.accounts) {
      resolve();
      return;
    }

    let gapiLoaded = false;
    let gsiLoaded = false;

    const checkBothLoaded = () => {
      if (gapiLoaded && gsiLoaded) {
        resolve();
      }
    };

    // Google API Client Library
    if (typeof gapi === 'undefined') {
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      gapiScript.onload = () => {
        gapiLoaded = true;
        checkBothLoaded();
      };
      gapiScript.onerror = () => reject(new Error('Failed to load Google API'));
      document.head.appendChild(gapiScript);
    } else {
      gapiLoaded = true;
    }

    // Google Identity Services
    if (typeof google === 'undefined' || !google.accounts) {
      const gsiScript = document.createElement('script');
      gsiScript.src = 'https://accounts.google.com/gsi/client';
      gsiScript.async = true;
      gsiScript.defer = true;
      gsiScript.onload = () => {
        gsiLoaded = true;
        checkBothLoaded();
      };
      gsiScript.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(gsiScript);
    } else {
      gsiLoaded = true;
    }

    checkBothLoaded();
  });
};

/**
 * Google Drive同期の初期化（ページ読み込み時に呼び出し）
 */
window.initializeGoogleDriveSync = async function(headerSelector = '.header, header, .site-header') {
  try {
    // Google APIスクリプトを読み込み
    await window.loadGoogleAPIs();

    // UIを生成
    const header = document.querySelector(headerSelector);
    if (header) {
      window.googleDriveUI.createSyncUI(header);
    }

    // Google Drive同期を初期化
    if (window.googleDriveSync) {
      await window.googleDriveSync.initialize();
    }

    window.debugLog('Google Drive同期初期化完了');
  } catch (error) {
    window.errorLog('Google Drive同期初期化エラー:', error);
  }
};

/**
 * トースト通知機能
 * 画面上部に一時的なメッセージを表示
 */
window.showToast = function(message, type = 'info', duration = 3000) {
  // 既存のトーストコンテナを取得または作成
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  // トースト要素を作成
  const toast = document.createElement('div');
  toast.className = 'toast-notification';

  // タイプに応じた色設定
  const colors = {
    info: { bg: '#3498db', icon: 'ℹ️' },
    success: { bg: '#27ae60', icon: '✅' },
    warning: { bg: '#f39c12', icon: '⚠️' },
    error: { bg: '#e74c3c', icon: '❌' },
    readonly: { bg: '#dc3545', icon: '🔒' }
  };
  const colorConfig = colors[type] || colors.info;

  toast.style.cssText = `
    background: ${colorConfig.bg};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
    opacity: 0;
    transform: translateY(-20px);
    transition: all 0.3s ease;
    pointer-events: auto;
    max-width: 90vw;
    text-align: center;
  `;

  toast.innerHTML = `<span style="font-size: 18px;">${colorConfig.icon}</span><span>${message}</span>`;

  container.appendChild(toast);

  // アニメーション開始
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // 自動的に消去
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);

  return toast;
};

/**
 * 読み取り専用モード管理
 * 全画面で編集機能を無効化するためのユーティリティ
 */
window.readOnlyMode = {
  /**
   * 読み取り専用モードの状態を取得
   * @returns {boolean} 読み取り専用モードかどうか
   */
  isEnabled: function() {
    return localStorage.getItem('readOnlyMode') === 'true';
  },

  /**
   * 読み取り専用モードを設定
   * @param {boolean} enabled - 有効にするかどうか
   */
  setEnabled: function(enabled) {
    localStorage.setItem('readOnlyMode', enabled ? 'true' : 'false');
    this.updateBodyClass();
    this.dispatchChangeEvent(enabled);
  },

  /**
   * 読み取り専用モードを切り替え
   * @returns {boolean} 切り替え後の状態
   */
  toggle: function() {
    const newState = !this.isEnabled();
    this.setEnabled(newState);
    return newState;
  },

  /**
   * body要素にクラスを追加/削除
   */
  updateBodyClass: function() {
    if (this.isEnabled()) {
      document.body.classList.add('read-only-mode');
    } else {
      document.body.classList.remove('read-only-mode');
    }
  },

  /**
   * 状態変更イベントを発火
   * @param {boolean} enabled - 新しい状態
   */
  dispatchChangeEvent: function(enabled) {
    window.dispatchEvent(new CustomEvent('readOnlyModeChange', {
      detail: { enabled: enabled }
    }));
  },

  /**
   * 読み取り専用モード時にトースト警告を表示
   * @param {string} action - 実行しようとしたアクション名
   * @returns {boolean} 常にfalse（操作をブロックしたことを示す）
   */
  showWarning: function(action) {
    const actionName = action || 'この操作';
    window.showToast(`読み取り専用モードのため${actionName}はできません`, 'readonly', 3000);
    return false;
  },

  /**
   * 読み取り専用モード時に操作をブロック
   * @param {string} action - 実行しようとしたアクション名
   * @returns {boolean} 操作が許可されたかどうか
   */
  checkAndWarn: function(action) {
    if (this.isEnabled()) {
      this.showWarning(action);
      return false;
    }
    return true;
  },

  /**
   * 初期化（ページ読み込み時に呼び出し）
   */
  initialize: function() {
    this.updateBodyClass();
    window.debugLog('読み取り専用モード初期化:', this.isEnabled() ? '有効' : '無効');
  }
};

/**
 * ストレイジプロバイダー
 * 閲覧モード時はsessionStorage、通常時はlocalStorageからデータを透過的に提供
 * localStorageには一切手を加えない安全な設計
 */
window.storageProvider = {
  // sessionStorageのキー
  _SESSION_KEY: 'viewingStorageData',

  /**
   * 他人のストレイジを閲覧中かどうか
   * @returns {boolean}
   */
  isViewing: function() {
    return sessionStorage.getItem(this._SESSION_KEY) !== null;
  },

  /**
   * 他人のストレイジの閲覧を開始
   * @param {Object} data - 閲覧するデータ
   */
  startViewing: function(data) {
    if (!data || typeof data !== 'object') {
      window.errorLog('閲覧データが無効です');
      return false;
    }

    // 既に閲覧中の場合は終了
    if (this.isViewing()) {
      this.stopViewing();
    }

    // 閲覧データをsessionStorageにJSON形式で保存（localStorageには一切触らない）
    try {
      sessionStorage.setItem(this._SESSION_KEY, JSON.stringify(data));
      window.debugLog('他人のストレイジ閲覧開始 - sessionStorageに保存');
    } catch (e) {
      window.errorLog('sessionStorage保存エラー:', e);
      return false;
    }

    // 読み取り専用モードを強制的に有効化
    window.readOnlyMode.setEnabled(true);

    // イベント発火
    this._dispatchEvent(true);

    window.debugLog('他人のストレイジ閲覧開始');
    return true;
  },

  /**
   * 他人のストレイジの閲覧を終了
   */
  stopViewing: function() {
    if (!this.isViewing()) {
      return false;
    }

    // 閲覧データをクリア（localStorageには一切触らない）
    sessionStorage.removeItem(this._SESSION_KEY);

    // イベント発火
    this._dispatchEvent(false);

    window.debugLog('他人のストレイジ閲覧終了');
    window.showToast('自分のストレイジに戻りました', 'success');

    // ページをリロードして変更を反映
    setTimeout(() => {
      window.location.reload();
    }, 500);

    return true;
  },

  /**
   * 閲覧中のデータを取得
   * @returns {Object|null}
   */
  _getViewingData: function() {
    if (!this.isViewing()) return null;
    try {
      const dataStr = sessionStorage.getItem(this._SESSION_KEY);
      return dataStr ? JSON.parse(dataStr) : null;
    } catch (e) {
      window.errorLog('閲覧データの取得に失敗:', e);
      return null;
    }
  },

  /**
   * イベントを発火
   * @param {boolean} isViewing - 閲覧中かどうか
   */
  _dispatchEvent: function(isViewing) {
    window.dispatchEvent(new CustomEvent('storageProviderChange', {
      detail: { isViewing: isViewing }
    }));
  },

  /**
   * 閲覧中のデータを取得（デバッグ用）
   * @returns {Object|null}
   */
  getViewingData: function() {
    return this._getViewingData();
  },

  /**
   * 初期化（ページ読み込み時に呼び出し）
   * リロード時に閲覧状態を復元
   */
  initialize: function() {
    if (this.isViewing()) {
      window.debugLog('閲覧モード: タブ内で閲覧状態を維持');
      // 読み取り専用モードを強制的に有効化
      window.readOnlyMode.setEnabled(true);
    }
  },

  // ===== データ取得ヘルパー関数 =====

  /**
   * カード所持数を取得（閲覧中はsessionStorage、通常はlocalStorage）
   * @param {string} cardId - カードID
   * @returns {number} カード所持数
   */
  getCardCount: function(cardId) {
    if (this.isViewing()) {
      const data = this._getViewingData();
      if (!data) return 0;

      // エクスポートファイル形式
      if (data.data && data.data.cardCounts) {
        const key = `count_${cardId}`;
        return parseInt(data.data.cardCounts[key] || '0', 10);
      }
      // 旧形式
      const key = `count_${cardId}`;
      return parseInt(data[key] || '0', 10);
    }
    // 通常モード：localStorageから取得
    return parseInt(localStorage.getItem(`count_${cardId}`) || '0', 10);
  },

  /**
   * すべてのカード所持数を取得
   * @returns {Object} カードID -> 所持数のマップ
   */
  getAllCardCounts: function() {
    if (this.isViewing()) {
      const data = this._getViewingData();
      if (!data) return {};

      const counts = {};
      // エクスポートファイル形式
      if (data.data && data.data.cardCounts) {
        for (const [key, value] of Object.entries(data.data.cardCounts)) {
          if (key.startsWith('count_')) {
            const cardId = key.substring(6); // 'count_'を削除
            counts[cardId] = parseInt(value, 10);
          }
        }
      } else {
        // 旧形式
        for (const [key, value] of Object.entries(data)) {
          if (key.startsWith('count_')) {
            const cardId = key.substring(6);
            counts[cardId] = parseInt(value, 10);
          }
        }
      }
      return counts;
    }
    // 通常モード：localStorageから取得
    const counts = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('count_')) {
        const cardId = key.substring(6);
        counts[cardId] = parseInt(localStorage.getItem(key) || '0', 10);
      }
    }
    return counts;
  },

  /**
   * デッキデータを取得
   * @returns {Object|null}
   */
  getDeckData: function() {
    if (this.isViewing()) {
      const data = this._getViewingData();
      if (!data) return null;

      // エクスポートファイル形式
      if (data.data && data.data.deckData) {
        return data.data.deckData;
      }
      // 旧形式
      if (data.deckData) {
        try {
          return typeof data.deckData === 'string' ? JSON.parse(data.deckData) : data.deckData;
        } catch (e) {
          return null;
        }
      }
      return null;
    }
    // 通常モード：localStorageから取得
    const deckDataStr = localStorage.getItem('deckData');
    if (!deckDataStr) return null;
    try {
      return JSON.parse(deckDataStr);
    } catch (e) {
      return null;
    }
  },

  /**
   * バインダーコレクションを取得
   * @returns {Array|null}
   */
  getBinderCollection: function() {
    if (this.isViewing()) {
      const data = this._getViewingData();
      if (!data) return null;

      // エクスポートファイル形式
      if (data.data && data.data.binderCollection) {
        return data.data.binderCollection;
      }
      // 旧形式
      if (data.binderCollection) {
        try {
          return typeof data.binderCollection === 'string' ? JSON.parse(data.binderCollection) : data.binderCollection;
        } catch (e) {
          return null;
        }
      }
      return null;
    }
    // 通常モード：localStorageから取得
    const binderStr = localStorage.getItem('binderCollection');
    if (!binderStr) return null;
    try {
      return JSON.parse(binderStr);
    } catch (e) {
      return null;
    }
  }
};

// 初期化処理
document.addEventListener('DOMContentLoaded', function() {
  // ダークモードの初期化
  window.initializeDarkMode();

  // 読み取り専用モードの初期化
  window.readOnlyMode.initialize();

  // ストレイジプロバイダーの初期化
  window.storageProvider.initialize();

  window.debugLog('共通ユーティリティ初期化完了');
});
