# 🃏 大富豪（大貧民）ゲーム

React Native + Node.js で実装された大富豪ゲームです。

## 🚀 機能概要

### 実装済み機能
- ✅ ユーザー認証（JWT）
- ✅ ロビー機能（ルーム作成・参加）
- ✅ リアルタイム通信（WebSocket）
- ✅ 大富豪ゲームロジック
- ✅ カード出し判定
- ✅ 特殊ルール（8切り、革命、階段など）
- ✅ ランキングシステム

### 技術スタック
- **フロントエンド**: React Native + TypeScript
- **バックエンド**: Node.js + Express
- **リアルタイム通信**: Socket.IO
- **データベース**: PostgreSQL
- **認証**: JWT

## 📦 セットアップ

### 1. 依存関係のインストール
```bash
npm run install-all
```

### 2. 環境変数の設定
```bash
cp .env.example .env
```

### 3. データベースの設定
PostgreSQLを起動し、`backend/database/schema.sql`を実行してください。

### 4. サーバーの起動
```bash
npm run dev
```

### 5. フロントエンドの起動
```bash
npm run client
```

## 🎮 ゲームルール

### 基本ルール
- 4人でプレイ
- 52枚のトランプ + ジョーカー2枚
- 手札を早くなくした順に順位決定

### 特殊ルール
- **8切り**: 8を出すと場が流れる
- **革命**: 4枚同じ数字で革命発生
- **階段**: 3枚以上の連番
- **スペード3返し**: スペード3で返し可能

## 📁 プロジェクト構造

```
rn_millonaire/
├── backend/           # Node.js バックエンド
│   ├── server.js      # メインサーバー
│   ├── routes/        # API ルート
│   ├── models/        # データベースモデル
│   ├── game/          # ゲームロジック
│   └── database/      # DB設定
├── frontend/          # React Native フロントエンド
│   ├── src/
│   │   ├── components/ # UIコンポーネント
│   │   ├── screens/   # 画面コンポーネント
│   │   ├── services/  # API通信
│   │   └── utils/     # ユーティリティ
│   └── package.json
└── package.json       # ルートパッケージ
```

## 🔧 開発

### バックエンド開発
```bash
npm run dev
```

### フロントエンド開発
```bash
npm run client
```

## 📝 ライセンス

MIT License


# millionaire
