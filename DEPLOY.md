# 🚀 デプロイガイド

このガイドでは、大富豪オンラインゲームを本番環境にデプロイする手順を説明します。

## 📋 デプロイ前のチェックリスト

### 必須項目
- [ ] PWA用アイコン画像を `frontend/public/` に配置
- [ ] 環境変数を設定
- [ ] Redisサーバーを用意（本番環境）
- [ ] データベースの初期化
- [ ] ビルドエラーがないことを確認

### 推奨項目
- [ ] カスタムドメインの準備
- [ ] SSL証明書の設定
- [ ] 監視ツールの設定
- [ ] バックアップ体制の構築

## 🎨 Step 1: PWAアイコンの準備

### オプション A: オンラインツールで自動生成（推奨）

1. https://www.pwabuilder.com/imageGenerator にアクセス
2. 提供されたロゴ画像（大富豪キャラクター）をアップロード
3. すべてのサイズを生成してダウンロード
4. `frontend/public/` ディレクトリに配置

### オプション B: 手動で作成

必要なファイル：
```
frontend/public/
├── icon-72x72.png
├── icon-96x96.png
├── icon-128x128.png
├── icon-144x144.png
├── icon-152x152.png
├── icon-192x192.png
├── icon-384x384.png
└── icon-512x512.png
```

## 🔧 Step 2: 環境変数の設定

### バックエンド環境変数

`.env` ファイルを作成（本番環境用）：

```env
# サーバー設定
NODE_ENV=production
PORT=3001

# JWT認証
JWT_SECRET=your-super-secure-production-jwt-secret-change-this

# データベース
DATABASE_PATH=./database/millonaire_game.db

# Redis設定（本番環境）
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# CORS設定
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### フロントエンド環境変数

`.env.production` ファイルを作成：

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
NEXT_PUBLIC_WS_URL=wss://your-backend-domain.com
```

## 🌐 Step 3-A: Vercel + Railway でデプロイ（推奨）

### フロントエンド（Vercel）

1. **Vercelにログイン**
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **フロントエンドをデプロイ**
   ```bash
   cd frontend
   vercel
   ```

3. **環境変数を設定**
   - Vercel Dashboard → Settings → Environment Variables
   - `NEXT_PUBLIC_API_URL` と `NEXT_PUBLIC_WS_URL` を追加

4. **再デプロイ**
   ```bash
   vercel --prod
   ```

### バックエンド（Railway）

1. **Railway アカウント作成**
   - https://railway.app/ にアクセス
   - GitHubでサインアップ

2. **新しいプロジェクトを作成**
   - "New Project" → "Deploy from GitHub repo"
   - リポジトリを選択

3. **サービスを設定**
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

4. **Redisを追加**
   - "New" → "Database" → "Add Redis"
   - 自動的に `REDIS_URL` が設定される

5. **環境変数を追加**
   - Variables タブで上記の環境変数を設定
   - `FRONTEND_URL` に Vercel の URL を設定

6. **カスタムドメイン設定**（オプション）
   - Settings → Domain → Generate Domain

## 🌐 Step 3-B: Render でオールインワンデプロイ

### バックエンド（Render）

1. **Render アカウント作成**
   - https://render.com/ にアクセス

2. **Web Service を作成**
   - "New" → "Web Service"
   - リポジトリを接続
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

3. **Redis を追加**
   - Dashboard → "New" → "Redis"
   - 接続情報をバックエンドの環境変数に追加

4. **環境変数を設定**
   - Environment タブで設定

### フロントエンド（Render または Vercel）

同様の手順でフロントエンドもデプロイ

## 🐳 Step 3-C: Docker + AWS/GCP（上級者向け）

### Dockerイメージのビルド

```bash
# バックエンド
cd backend
docker build -t millonaire-backend .

# フロントエンド
cd ../frontend
docker build -t millonaire-frontend .
```

### docker-compose でローカルテスト

```bash
docker-compose up
```

### クラウドへデプロイ

- AWS ECS / Fargate
- Google Cloud Run
- Azure Container Instances

## 📊 Step 4: データベースとRedisの初期化

### バックエンドにSSH接続後

```bash
# データベース初期化
npm run db:migrate

# データベース最適化
npm run db:optimize

# Redis接続確認
npm run redis:cli
> ping
PONG
```

## ✅ Step 5: デプロイ後の確認

### 動作確認チェックリスト

1. **フロントエンド**
   - [ ] サイトが表示される
   - [ ] ログイン機能が動作する
   - [ ] PWAインストールボタンが表示される
   - [ ] Service Worker が登録される

2. **バックエンド**
   - [ ] API エンドポイントが応答する
   - [ ] WebSocket接続が確立される
   - [ ] Redis接続が正常
   - [ ] データベース操作が正常

3. **ゲーム機能**
   - [ ] ルーム作成ができる
   - [ ] ゲーム開始ができる
   - [ ] リアルタイム通信が動作する
   - [ ] CPU対戦が動作する
   - [ ] 特殊ルールが動作する

### デバッグコマンド

```bash
# バックエンドログ確認
# Railway: Dashboard → Logs
# Render: Dashboard → Logs
# Vercel: Dashboard → Logs

# Redisデータ確認
npm run redis:cli
> KEYS *
> GET game:*
```

## 🔒 セキュリティ設定

### 本番環境で必ず実施

1. **JWT_SECRET を強力なものに変更**
   ```bash
   # ランダムな文字列生成
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **CORS設定を厳密に**
   ```typescript
   // backend/src/server.ts
   cors({
     origin: process.env.FRONTEND_URL,
     credentials: true
   })
   ```

3. **Rate Limiting が有効か確認**
   - Redis接続が正常
   - レート制限が機能している

4. **HTTPS を強制**
   - Vercel/Railway は自動でHTTPS

## 📈 監視とメンテナンス

### 推奨ツール

- **エラー監視**: Sentry
- **パフォーマンス**: Vercel Analytics, Railway Metrics
- **ログ**: Railway Logs, CloudWatch
- **アップタイム監視**: UptimeRobot, Pingdom

### 定期メンテナンス

```bash
# データベースクリーンアップ（週1回推奨）
npm run db:cleanup

# Redisキャッシュクリア（必要に応じて）
npm run redis:flush
```

## 🆘 トラブルシューティング

### WebSocket接続エラー

```typescript
// バックエンドでCORS設定を確認
// Socket.IOのtransport設定を確認
```

### ビルドエラー

```bash
# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install
```

### Redis接続エラー

```bash
# 環境変数を確認
echo $REDIS_HOST
echo $REDIS_PORT

# Redisサービスが起動しているか確認
```

## 📚 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app/)
- [Render Documentation](https://render.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Socket.IO Production](https://socket.io/docs/v4/server-deployment/)

## 🎉 デプロイ完了後

おめでとうございます！🎊

アプリが正常にデプロイされたら：

1. URLを友達と共有
2. PWAとしてインストール
3. フィードバックを収集
4. 継続的な改善

楽しい大富豪ゲームライフを！🃏✨

