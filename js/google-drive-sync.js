/**
 * Google Drive同期モジュール
 * Googleログイン連携とGoogle Driveへのデータ自動保存を管理
 */

(function() {
  'use strict';

  // Google API設定
  // クライアントIDはセットアップ時に設定する必要があります
  const GOOGLE_CLIENT_ID_KEY = 'googleClientId';
  const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
  const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

  // Google Drive上のファイル名
  const DRIVE_FILE_NAME = 'hololive_card_data.json';

  // 保存対象のlocalStorageキーパターン
  const SYNC_KEY_PATTERNS = [
    /^count_/,           // カード所持数
    /^filterState$/,     // フィルター状態
    /^viewMode$/,        // ビューモード
    /^binderViewMode$/,  // バインダービューモード
    /^darkMode$/,        // ダークモード
    /^deckData$/,        // デッキデータ
    /^binderCollection$/ // バインダーコレクション
  ];

  // 除外するキー（キャッシュデータなど）
  const EXCLUDE_KEYS = [
    'cardData',
    'releaseData',
    'dataTimestamp',
    'googleClientId',
    'driveFileId'
  ];

  // 状態管理
  let isInitialized = false;
  let isSignedIn = false;
  let isSaving = false;
  let isLoadingFromDrive = false; // Driveからの読み込み中フラグ
  let saveQueue = [];
  let saveTimeout = null;
  let tokenClient = null;
  let driveFileId = null;

  // セッションフラグのキー（リロードループ防止用）
  const RELOAD_FLAG_KEY = 'googleDriveDataLoaded';

  // デバウンス設定（ミリ秒）
  const SAVE_DEBOUNCE_MS = 2000;

  /**
   * Google Drive Sync クラス
   */
  class GoogleDriveSync {
    constructor() {
      this.onSignInChange = null;
      this.onSyncStatusChange = null;
      this.onError = null;
    }

    /**
     * Google APIの初期化
     */
    async initialize() {
      const clientId = localStorage.getItem(GOOGLE_CLIENT_ID_KEY);
      if (!clientId) {
        // クライアントIDが設定されていない場合、古いキャッシュもクリア
        sessionStorage.removeItem('gapi_token');
        localStorage.removeItem('driveFileId');
        console.log('[GoogleDriveSync] クライアントIDが設定されていません。設定ボタンから設定してください。');
        return false;
      }

      try {
        // Google Identity Services ライブラリの読み込みを待つ
        await this.waitForGoogleLibraries();

        // gapi clientの初期化
        await new Promise((resolve, reject) => {
          gapi.load('client', { callback: resolve, onerror: reject });
        });

        await gapi.client.init({
          discoveryDocs: [DISCOVERY_DOC],
        });

        // Token Clientの初期化
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: (response) => {
            if (response.error) {
              this.handleError('認証エラー: ' + response.error);
              return;
            }
            this.onTokenReceived();
          },
        });

        // 既存のトークンがあるかチェック
        const savedToken = sessionStorage.getItem('gapi_token');
        if (savedToken) {
          try {
            gapi.client.setToken(JSON.parse(savedToken));
            isSignedIn = true;
            this.notifySignInChange(true);
            await this.loadFromDrive();
          } catch (e) {
            sessionStorage.removeItem('gapi_token');
          }
        }

        isInitialized = true;
        this.setupStorageListener();
        this.setupBeforeUnloadWarning();

        return true;
      } catch (error) {
        this.handleError('初期化エラー: ' + this.extractErrorMessage(error));
        return false;
      }
    }

    /**
     * Googleライブラリの読み込みを待つ
     */
    async waitForGoogleLibraries() {
      const maxWait = 10000;
      const checkInterval = 100;
      let waited = 0;

      while (waited < maxWait) {
        if (typeof gapi !== 'undefined' && typeof google !== 'undefined' && google.accounts) {
          return;
        }
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
      }
      throw new Error('Googleライブラリの読み込みに失敗しました');
    }

    /**
     * トークン受信時の処理
     */
    async onTokenReceived() {
      const token = gapi.client.getToken();
      if (token) {
        sessionStorage.setItem('gapi_token', JSON.stringify(token));
        isSignedIn = true;
        this.notifySignInChange(true);
        await this.loadFromDrive();
      }
    }

    /**
     * Googleにログイン
     */
    signIn() {
      if (!isInitialized) {
        this.handleError('Google APIが初期化されていません');
        return;
      }

      if (gapi.client.getToken() === null) {
        // 新規ログイン
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        // 既存トークンを使用
        tokenClient.requestAccessToken({ prompt: '' });
      }
    }

    /**
     * Googleからログアウト
     */
    signOut() {
      const token = gapi.client.getToken();
      if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken(null);
        sessionStorage.removeItem('gapi_token');
      }
      isSignedIn = false;
      driveFileId = null;
      localStorage.removeItem('driveFileId');
      // リロードフラグもクリア（次回ログイン時に再読み込みできるように）
      sessionStorage.removeItem(RELOAD_FLAG_KEY);
      this.notifySignInChange(false);
    }

    /**
     * ログイン状態を取得
     */
    getSignedIn() {
      return isSignedIn;
    }

    /**
     * 保存中かどうかを取得
     */
    getIsSaving() {
      return isSaving;
    }

    /**
     * Google Driveからデータを読み込み
     */
    async loadFromDrive() {
      if (!isSignedIn) return null;

      // リロード後の重複読み込みを防止
      const alreadyLoaded = sessionStorage.getItem(RELOAD_FLAG_KEY);
      if (alreadyLoaded === 'true') {
        console.log('[GoogleDriveSync] 既にデータ読み込み済み。スキップします。');
        this.notifySyncStatus('idle');
        return null;
      }

      try {
        isLoadingFromDrive = true;
        this.notifySyncStatus('loading');

        // ファイルIDをキャッシュから取得、なければ検索
        driveFileId = localStorage.getItem('driveFileId');

        if (!driveFileId) {
          // ファイルを検索
          const response = await gapi.client.drive.files.list({
            spaces: 'appDataFolder',
            q: `name='${DRIVE_FILE_NAME}'`,
            fields: 'files(id, name)',
          });

          const files = response.result.files;
          if (files && files.length > 0) {
            driveFileId = files[0].id;
            localStorage.setItem('driveFileId', driveFileId);
          }
        }

        if (!driveFileId) {
          // ファイルが存在しない場合は現在のlocalStorageから新規作成
          isLoadingFromDrive = false;
          this.notifySyncStatus('idle');
          console.log('[GoogleDriveSync] Driveにデータファイルがありません。ローカルデータを使用します。');
          // 読み込み済みフラグを設定（新規作成後はリロード不要）
          sessionStorage.setItem(RELOAD_FLAG_KEY, 'true');
          await this.saveToDrive();
          return null;
        }

        // ファイルの内容を取得
        const fileResponse = await gapi.client.drive.files.get({
          fileId: driveFileId,
          alt: 'media',
        });

        const driveData = fileResponse.result;

        // localStorageに反映
        if (driveData && typeof driveData === 'object') {
          this.applyDriveDataToLocalStorage(driveData);
          isLoadingFromDrive = false;
          this.notifySyncStatus('idle');
          console.log('[GoogleDriveSync] Google Driveからデータを読み込みました');

          // データがある場合、ユーザーに通知（自動リロードはループの原因になるため削除）
          if (Object.keys(driveData).length > 0) {
            // 読み込み済みフラグを設定
            sessionStorage.setItem(RELOAD_FLAG_KEY, 'true');
            // イベントを発火してUIに通知
            window.dispatchEvent(new CustomEvent('googleDriveDataLoaded', { detail: { data: driveData } }));
            // ユーザーにリロードを促すメッセージを表示
            this.showReloadPrompt();
          }
          return driveData;
        }

        isLoadingFromDrive = false;
        this.notifySyncStatus('idle');
        return null;
      } catch (error) {
        isLoadingFromDrive = false;
        // ファイルIDが無効な場合はキャッシュをクリアして再試行
        if (error && error.status === 404) {
          localStorage.removeItem('driveFileId');
          driveFileId = null;
          this.notifySyncStatus('idle');
          return null;
        }
        this.handleError('読み込みエラー: ' + this.extractErrorMessage(error));
        this.notifySyncStatus('error');
        return null;
      }
    }

    /**
     * Google DriveのデータをlocalStorageに適用
     */
    applyDriveDataToLocalStorage(driveData) {
      // 既存の同期対象キーをクリア
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (this.shouldSyncKey(key)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Driveのデータを適用
      for (const [key, value] of Object.entries(driveData)) {
        if (!EXCLUDE_KEYS.includes(key)) {
          localStorage.setItem(key, value);
        }
      }
    }

    /**
     * Google Driveにデータを保存
     */
    async saveToDrive() {
      if (!isSignedIn) return false;

      try {
        isSaving = true;
        this.notifySyncStatus('saving');

        // localStorageから同期対象のデータを収集
        const dataToSave = this.collectSyncData();
        const content = JSON.stringify(dataToSave, null, 2);
        const blob = new Blob([content], { type: 'application/json' });

        if (driveFileId) {
          // 既存ファイルを更新
          await this.updateFile(driveFileId, blob);
        } else {
          // 新規ファイルを作成
          const newFileId = await this.createFile(blob);
          driveFileId = newFileId;
          localStorage.setItem('driveFileId', driveFileId);
        }

        isSaving = false;
        this.notifySyncStatus('saved');

        // 少し待ってからidleに戻す
        setTimeout(() => {
          this.notifySyncStatus('idle');
        }, 2000);

        console.log('Google Driveに保存しました');
        return true;
      } catch (error) {
        isSaving = false;
        this.handleError('保存エラー: ' + this.extractErrorMessage(error));
        this.notifySyncStatus('error');
        return false;
      }
    }

    /**
     * 新規ファイルを作成
     */
    async createFile(blob) {
      const metadata = {
        name: DRIVE_FILE_NAME,
        parents: ['appDataFolder'],
        mimeType: 'application/json',
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      const token = gapi.client.getToken().access_token;
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      if (!response.ok) {
        throw new Error(`ファイル作成失敗: ${response.status}`);
      }

      const result = await response.json();
      return result.id;
    }

    /**
     * 既存ファイルを更新
     */
    async updateFile(fileId, blob) {
      const token = gapi.client.getToken().access_token;
      const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: blob,
      });

      if (!response.ok) {
        // ファイルが見つからない場合は新規作成
        if (response.status === 404) {
          localStorage.removeItem('driveFileId');
          driveFileId = null;
          return this.createFile(blob);
        }
        throw new Error(`ファイル更新失敗: ${response.status}`);
      }

      return fileId;
    }

    /**
     * 同期対象のデータを収集
     */
    collectSyncData() {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (this.shouldSyncKey(key)) {
          data[key] = localStorage.getItem(key);
        }
      }
      return data;
    }

    /**
     * キーが同期対象かどうかを判定
     */
    shouldSyncKey(key) {
      if (EXCLUDE_KEYS.includes(key)) {
        return false;
      }
      return SYNC_KEY_PATTERNS.some(pattern => pattern.test(key));
    }

    /**
     * localStorageの変更を監視
     */
    setupStorageListener() {
      // storage イベントは他のタブからの変更のみ
      window.addEventListener('storage', (e) => {
        if (isSignedIn && this.shouldSyncKey(e.key)) {
          this.debouncedSave();
        }
      });

      // 同じタブからの変更を監視するためにlocalStorageをプロキシ
      this.wrapLocalStorage();
    }

    /**
     * localStorageの操作をラップして変更を検知
     */
    wrapLocalStorage() {
      const originalSetItem = localStorage.setItem.bind(localStorage);
      const originalRemoveItem = localStorage.removeItem.bind(localStorage);
      const self = this;

      localStorage.setItem = function(key, value) {
        originalSetItem(key, value);
        if (isSignedIn && self.shouldSyncKey(key)) {
          self.debouncedSave();
        }
      };

      localStorage.removeItem = function(key) {
        originalRemoveItem(key);
        if (isSignedIn && self.shouldSyncKey(key)) {
          self.debouncedSave();
        }
      };
    }

    /**
     * デバウンスされた保存
     */
    debouncedSave() {
      // Driveからの読み込み中は保存をスキップ（読み込んだデータを即座に書き戻さない）
      if (isLoadingFromDrive) {
        return;
      }

      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      saveTimeout = setTimeout(() => {
        this.saveToDrive();
        saveTimeout = null;
      }, SAVE_DEBOUNCE_MS);
    }

    /**
     * ページ離脱時の警告設定
     */
    setupBeforeUnloadWarning() {
      window.addEventListener('beforeunload', (e) => {
        if (isSaving || saveTimeout) {
          e.preventDefault();
          e.returnValue = 'データの保存中です。ページを離れると変更が失われる可能性があります。';
          return e.returnValue;
        }
      });
    }

    /**
     * サインイン状態変更の通知
     */
    notifySignInChange(signedIn) {
      if (typeof this.onSignInChange === 'function') {
        this.onSignInChange(signedIn);
      }
      // カスタムイベントも発火
      window.dispatchEvent(new CustomEvent('googleSignInChange', { detail: { signedIn } }));
    }

    /**
     * 同期状態変更の通知
     */
    notifySyncStatus(status) {
      if (typeof this.onSyncStatusChange === 'function') {
        this.onSyncStatusChange(status);
      }
      // カスタムイベントも発火
      window.dispatchEvent(new CustomEvent('googleSyncStatusChange', { detail: { status } }));
    }

    /**
     * リロードを促すプロンプトを表示
     */
    showReloadPrompt() {
      // 既存のプロンプトがあれば削除
      const existing = document.getElementById('google-drive-reload-prompt');
      if (existing) existing.remove();

      const prompt = document.createElement('div');
      prompt.id = 'google-drive-reload-prompt';
      prompt.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10001;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        max-width: 90%;
      `;
      prompt.innerHTML = `
        <span>☁️ Google Driveからデータを読み込みました</span>
        <button id="reload-now-btn" style="
          background: white;
          color: #4CAF50;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        ">リロードして反映</button>
        <button id="reload-later-btn" style="
          background: transparent;
          color: white;
          border: 1px solid white;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
        ">後で</button>
      `;

      document.body.appendChild(prompt);

      document.getElementById('reload-now-btn').addEventListener('click', () => {
        window.location.reload();
      });

      document.getElementById('reload-later-btn').addEventListener('click', () => {
        prompt.remove();
      });

      // 10秒後に自動で消す
      setTimeout(() => {
        if (prompt.parentNode) {
          prompt.remove();
        }
      }, 10000);
    }

    /**
     * エラー処理
     */
    handleError(message) {
      // エラーメッセージを安全に取得
      const errorMessage = message || '不明なエラー';
      console.error('[GoogleDriveSync]', errorMessage);
      if (typeof this.onError === 'function') {
        this.onError(errorMessage);
      }
      // カスタムイベントも発火
      window.dispatchEvent(new CustomEvent('googleSyncError', { detail: { message: errorMessage } }));
    }

    /**
     * エラーオブジェクトからメッセージを抽出
     */
    extractErrorMessage(error) {
      if (!error) return '不明なエラー';
      if (typeof error === 'string') return error;
      if (error.message) return error.message;
      if (error.result && error.result.error && error.result.error.message) {
        return error.result.error.message;
      }
      if (error.status) return `HTTPエラー: ${error.status}`;
      return JSON.stringify(error);
    }

    /**
     * クライアントIDを設定
     */
    setClientId(clientId) {
      localStorage.setItem(GOOGLE_CLIENT_ID_KEY, clientId);
    }

    /**
     * クライアントIDを取得
     */
    getClientId() {
      return localStorage.getItem(GOOGLE_CLIENT_ID_KEY);
    }

    /**
     * クライアントIDが設定されているか
     */
    hasClientId() {
      return !!localStorage.getItem(GOOGLE_CLIENT_ID_KEY);
    }

    /**
     * 手動で同期を実行
     */
    async manualSync() {
      if (!isSignedIn) {
        this.handleError('ログインしていません');
        return false;
      }
      return await this.saveToDrive();
    }

    /**
     * Google Driveからデータを再読み込み（ローカルデータを上書き）
     */
    async reloadFromDrive() {
      if (!isSignedIn) {
        this.handleError('ログインしていません');
        return false;
      }

      // ファイルIDキャッシュをクリアして再取得
      localStorage.removeItem('driveFileId');
      driveFileId = null;

      return await this.loadFromDrive();
    }
  }

  // グローバルインスタンスを作成
  window.googleDriveSync = new GoogleDriveSync();

})();
