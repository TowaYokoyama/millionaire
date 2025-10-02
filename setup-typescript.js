const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🃏 大富豪ゲーム TypeScript版 セットアップ開始...\n');

// 1. バックエンドの依存関係をインストール
console.log('📦 バックエンドの依存関係をインストール中...');
try {
  execSync('cd backend && npm install', { stdio: 'inherit' });
  console.log('✅ バックエンドの依存関係インストール完了\n');
} catch (error) {
  console.error('❌ バックエンドの依存関係インストールに失敗しました');
  process.exit(1);
}

// 2. フロントエンドの依存関係をインストール
console.log('📦 フロントエンドの依存関係をインストール中...');
try {
  execSync('cd frontend && npm install', { stdio: 'inherit' });
  console.log('✅ フロントエンドの依存関係インストール完了\n');
} catch (error) {
  console.error('❌ フロントエンドの依存関係インストールに失敗しました');
  process.exit(1);
}

// 3. 環境変数ファイルを作成
console.log('⚙️ 環境変数ファイルを作成中...');
const envContent = `# データベース設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=millonaire_game
DB_USER=postgres
DB_PASSWORD=password

# JWT設定
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# サーバー設定
PORT=3000
NODE_ENV=development

# CORS設定
CORS_ORIGIN=http://localhost:3000
`;

if (!fs.existsSync('.env')) {
  fs.writeFileSync('.env', envContent);
  console.log('✅ 環境変数ファイル (.env) を作成しました\n');
} else {
  console.log('ℹ️ 環境変数ファイル (.env) は既に存在します\n');
}

// 4. TypeScriptビルド
console.log('🔨 TypeScriptビルド中...');
try {
  execSync('cd backend && npm run build', { stdio: 'inherit' });
  console.log('✅ TypeScriptビルド完了\n');
} catch (error) {
  console.error('❌ TypeScriptビルドに失敗しました');
  process.exit(1);
}

// 5. データベースセットアップの指示
console.log('🗄️ データベースセットアップ:');
console.log('1. PostgreSQLを起動してください');
console.log('2. 以下のコマンドでデータベースを作成してください:');
console.log('   createdb millonaire_game');
console.log('3. 以下のコマンドでスキーマを実行してください:');
console.log('   psql -d millonaire_game -f backend/database/schema.sql\n');

// 6. 起動方法の説明
console.log('🚀 起動方法:');
console.log('1. バックエンドサーバーを起動:');
console.log('   cd backend && npm run dev');
console.log('2. 別のターミナルでフロントエンドを起動:');
console.log('   cd frontend && npm start\n');

console.log('🎮 TypeScript版の特徴:');
console.log('• 完全な型安全性');
console.log('• IntelliSense とオートコンプリート');
console.log('• コンパイル時エラー検出');
console.log('• リファクタリング支援');
console.log('• リアルタイムマルチプレイヤー対戦');
console.log('• 大富豪の完全なルール実装');
console.log('• レートシステムとランキング');
console.log('• WebSocketによる即座の状態同期');
console.log('• モバイル対応（React Native）\n');

console.log('📚 TypeScriptで実装された機能:');
console.log('✅ 型安全なユーザー認証（JWT）');
console.log('✅ 型安全なロビー機能');
console.log('✅ 型安全なルーム作成・参加');
console.log('✅ 型安全なリアルタイム通信（WebSocket）');
console.log('✅ 型安全な大富豪ゲームロジック');
console.log('✅ 型安全なカード出し判定');
console.log('✅ 型安全な特殊ルール（8切り、革命、階段）');
console.log('✅ 型安全なランキングシステム');
console.log('✅ 型安全なプロフィール管理\n');

console.log('🎯 TypeScript学習ポイント:');
console.log('• TypeScript の型システム');
console.log('• インターフェースと型定義');
console.log('• ジェネリクスとユーティリティ型');
console.log('• Node.js + Express + TypeScript');
console.log('• React Native + TypeScript');
console.log('• WebSocket + TypeScript');
console.log('• PostgreSQL + TypeScript');
console.log('• JWT認証 + TypeScript');
console.log('• 複雑なゲームロジックの型安全実装');
console.log('• マルチプレイヤーゲームの型安全状態管理\n');

console.log('✨ TypeScript版セットアップ完了！型安全なゲームをお楽しみください！');
