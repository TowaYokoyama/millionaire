# PWAセットアップガイド

## 🎨 アイコン画像の準備

提供された大富豪のキャラクター画像を以下のサイズに変換して、`frontend/public/`ディレクトリに配置してください。

### 必要なアイコンサイズ

以下のサイズのPNG画像を作成してください：

- `icon-72x72.png` (72×72)
- `icon-96x96.png` (96×96)
- `icon-128x128.png` (128×128)
- `icon-144x144.png` (144×144)
- `icon-152x152.png` (152×152)
- `icon-192x192.png` (192×192) ⭐ 推奨
- `icon-384x384.png` (384×384)
- `icon-512x512.png` (512×512) ⭐ 推奨

### オンラインツールで変換

以下のオンラインツールを使って簡単に変換できます：

1. **PWA Asset Generator**
   - https://www.pwabuilder.com/imageGenerator
   - 元画像（512×512推奨）をアップロードするだけで全サイズ生成

2. **Favicon.io**
   - https://favicon.io/
   - PNG、JPG、またはテキストから変換可能

3. **RealFaviconGenerator**
   - https://realfavicongenerator.net/
   - 詳細設定も可能

### コマンドラインで変換（ImageMagick使用）

```bash
# ImageMagickをインストール
# Windows: https://imagemagick.org/script/download.php#windows
# Mac: brew install imagemagick
# Linux: apt-get install imagemagick

# 元画像をリサイズ
convert original.png -resize 72x72 icon-72x72.png
convert original.png -resize 96x96 icon-96x96.png
convert original.png -resize 128x128 icon-128x128.png
convert original.png -resize 144x144 icon-144x144.png
convert original.png -resize 152x152 icon-152x152.png
convert original.png -resize 192x192 icon-192x192.png
convert original.png -resize 384x384 icon-384x384.png
convert original.png -resize 512x512 icon-512x512.png
```

## 📱 PWA機能の確認

### 1. 開発環境で確認

```bash
cd frontend
npm run build
npm start
```

ブラウザで `http://localhost:3000` を開いて：
- Chrome DevTools → Application → Service Workers
- Chrome DevTools → Application → Manifest

### 2. インストール可能性の確認

- Chromeのアドレスバー右側に「インストール」ボタンが表示される
- モバイルでは「ホーム画面に追加」が可能

### 3. オフライン動作の確認

- Service Workerが登録されたら、ネットワークを切断
- ページが読み込まれればOK

## 🚀 本番デプロイ

### Vercelへのデプロイ

```bash
vercel
```

### その他のプラットフォーム

- Netlify
- AWS Amplify
- Azure Static Web Apps
- Google Cloud Run

## 📋 チェックリスト

- [ ] 全サイズのアイコンを`public/`ディレクトリに配置
- [ ] `manifest.json`が正しく配置されている
- [ ] `next.config.ts`にPWA設定が追加されている
- [ ] ビルドが正常に完了する
- [ ] Service Workerが登録される
- [ ] インストールボタンが表示される
- [ ] オフラインで動作する

## 🎯 PWAの利点

1. **ホーム画面にインストール可能**
   - アプリのようにアイコンからアクセス

2. **オフライン動作**
   - ネットワークがなくてもキャッシュから表示

3. **高速な起動**
   - キャッシュにより瞬時に起動

4. **プッシュ通知**（今後実装可能）
   - ゲーム招待や対戦通知

5. **アプリストア不要**
   - WebからそのままインストールID

## 🔧 トラブルシューティング

### Service Workerが登録されない

```bash
# キャッシュをクリア
rm -rf .next
npm run build
```

### manifestエラー

- `manifest.json`の構文を確認
- アイコンファイルが存在するか確認

### ビルドエラー

```bash
# next-pwaを再インストール
npm uninstall next-pwa
npm install next-pwa --save-dev
```

## 📚 参考リンク

- [Next.js PWA](https://github.com/shadowwalker/next-pwa)
- [PWA Builder](https://www.pwabuilder.com/)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)

