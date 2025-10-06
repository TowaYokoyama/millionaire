# Redis セットアップガイド

このガイドでは、大富豪ゲームにRedisを統合する手順を説明します。

## 📋 前提条件

- Node.js 16以上
- npm または yarn
- Redis 6.0以上

## 🚀 クイックスタート

### 1. Redisのインストール

#### Windows
1. [Redis for Windows](https://github.com/microsoftarchive/redis/releases)からダウンロード
2. インストーラーを実行
3. サービスとして自動起動

#### Mac (Homebrew)
```bash
brew install redis
brew services start redis
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### Docker
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

### 2. 接続確認

```bash
# Redisに接続できるか確認
redis-cli ping
# 期待される出力: PONG
```

### 3. 環境変数の設定

`.env`ファイルに以下を追加：

```env
# Redis設定
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 4. パッケージのインストール（既に完了）

```bash
cd backend
npm install
```

必要なパッケージ：
- `ioredis` - Redisクライアント
- `@socket.io/redis-adapter` - Socket.IO用Redisアダプター
- `rate-limit-redis` - レート制限用Redisストア
- `express-rate-limit` - APIレート制限

### 5. サーバーの起動

```bash
cd backend
npm run dev
```

起動時に以下のログが表示されればOK：
```
✅ Redis Connected
✅ Redis Ready
✅ Socket.IO Redis Adapter initialized
```

## 🔍 Redis統合の確認

### ゲーム状態の確認

```bash
# アクティブなゲームIDを確認
redis-cli SMEMBERS active_games

# ゲーム状態を確認
redis-cli KEYS "game:*"

# 特定のゲーム状態を表示
redis-cli GET "game:game_123:state"
```

### セッション情報の確認

```bash
# セッション一覧
redis-cli KEYS "session:*"

# 特定のセッション
redis-cli GET "session:1"
```

### レート制限の確認

```bash
# レート制限キー
redis-cli KEYS "rl:*"
```

## 🎯 使用方法

### GameStateManagerの使用

```typescript
import { gameStateManager } from './game/GameStateManager';

// ゲーム状態を保存
await gameStateManager.saveGameState(gameId, gameEngine);

// ゲーム状態を読み込み
const gameState = await gameStateManager.loadGameState(gameId);

// ゲームを削除
await gameStateManager.deleteGame(gameId);

// アクティブなゲーム数を取得
const activeGameIds = await gameStateManager.getActiveGameIds();
```

### RedisClientの直接使用

```typescript
import { redisClient } from './cache/RedisClient';

// 基本操作
await redisClient.set('key', 'value', 60); // 60秒のTTL
const value = await redisClient.get('key');

// JSONオブジェクト
await redisClient.setJSON('user:1', { name: 'Towa', rating: 1500 });
const user = await redisClient.getJSON('user:1');

// ハッシュ
await redisClient.hset('game:cards:123', '1', JSON.stringify(cards));
const cards = await redisClient.hget('game:cards:123', '1');

// セット
await redisClient.sadd('active_games', 'game_123');
const games = await redisClient.smembers('active_games');
```

## 📊 監視とデバッグ

### Redisサーバーの状態確認

```bash
# サーバー情報
redis-cli INFO

# メモリ使用量
redis-cli INFO memory

# クライアント接続数
redis-cli INFO clients

# 統計情報
redis-cli INFO stats
```

### リアルタイム監視

```bash
# すべてのコマンドを監視
redis-cli MONITOR

# 特定のキーパターンを監視
redis-cli --scan --pattern 'game:*'
```

### パフォーマンス分析

```bash
# 遅いクエリのログ
redis-cli SLOWLOG GET 10

# メモリ使用量の内訳
redis-cli --bigkeys
```

## 🔧 トラブルシューティング

### 問題1: "Connection refused" エラー

**原因**: Redisサーバーが起動していない

**解決方法**:
```bash
# Redisを起動
redis-server

# または（Mac）
brew services start redis

# または（Linux）
sudo systemctl start redis-server
```

### 問題2: "NOAUTH Authentication required"

**原因**: Redisにパスワードが設定されている

**解決方法**: `.env`ファイルに以下を追加
```env
REDIS_PASSWORD=your_password_here
```

### 問題3: Socket.IO Redis Adapterが初期化されない

**原因**: Redisへの接続が遅い、またはエラー

**解決方法**:
1. Redisが起動しているか確認
2. ログでエラーメッセージを確認
3. 単一インスタンスモードでも動作可能（警告のみ）

### 問題4: メモリ使用量が増加し続ける

**原因**: TTLが設定されていない、または長すぎる

**解決方法**:
```bash
# 期限切れキーを手動削除
redis-cli --scan --pattern 'game:*' | xargs redis-cli DEL

# すべてのデータをクリア（注意！）
redis-cli FLUSHALL
```

## 🎓 ベストプラクティス

### 1. キーの命名規則

```
game:{gameId}:state          # ゲーム状態
game:cards:{gameId}          # プレイヤーカード
session:{userId}             # セッション
user:{userId}:active_game    # ユーザーのアクティブゲーム
rl:api:{ip}                  # レート制限
```

### 2. TTLの設定

```typescript
// 短期間のデータ（1分）
await redisClient.set('temp:data', value, 60);

// 中期間のデータ（1時間）
await redisClient.set('game:state', value, 3600);

// 長期間のデータ（24時間）
await redisClient.set('session:data', value, 86400);
```

### 3. エラーハンドリング

```typescript
try {
  const value = await redisClient.get('key');
  if (!value) {
    // キーが存在しない場合の処理
  }
} catch (error) {
  console.error('Redis error:', error);
  // フォールバック処理
}
```

### 4. パフォーマンス最適化

```typescript
// 複数のキーを同時に取得（パイプライン）
const pipeline = redisClient.getClient().pipeline();
pipeline.get('key1');
pipeline.get('key2');
pipeline.get('key3');
const results = await pipeline.exec();

// 一括削除
await redisClient.delPattern('game:finished:*');
```

## 📈 パフォーマンス指標

### 期待されるレスポンス時間

- `GET`/`SET`: < 1ms
- `HGET`/`HSET`: < 1ms
- `SMEMBERS`: < 5ms（小規模セット）
- `KEYS`: 非推奨（本番環境では`SCAN`を使用）

### メモリ使用量の目安

- ゲーム状態（1個）: 〜10KB
- セッション（1個）: 〜1KB
- アクティブゲーム100個: 〜1MB

## 🔐 セキュリティ

### 本番環境での推奨設定

```bash
# redis.conf

# パスワード設定
requirepass your_strong_password_here

# 外部からのアクセス制限
bind 127.0.0.1 ::1

# 危険なコマンドを無効化
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""

# メモリ制限
maxmemory 256mb
maxmemory-policy allkeys-lru
```

## 🚀 本番デプロイ

### Docker Composeでのデプロイ

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

  backend:
    build: ./backend
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis

volumes:
  redis-data:
```

### Redis Clusterの構築（高可用性）

大規模な本番環境では、Redis Clusterまたは Redis Sentinel を推奨します。

## 📚 参考リソース

- [Redis公式ドキュメント](https://redis.io/docs/)
- [ioredis GitHub](https://github.com/luin/ioredis)
- [Socket.IO Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
- [Redis University（無料）](https://university.redis.com/)

## 💡 よくある質問

### Q: Redisなしで動作しますか？

A: はい。Redisへの接続に失敗した場合、自動的に単一インスタンスモードで動作します。ただし、以下の機能が制限されます：
- 複数サーバーでのSocket.IO通信
- 分散レート制限
- サーバー再起動時のゲーム状態保持

### Q: Redisのメモリ不足になったら？

A: `maxmemory-policy`を設定して、古いデータを自動削除します。または、定期的に`npm run redis:flush`でクリーンアップします。

### Q: 開発中にRedisデータをリセットしたい

A: `npm run redis:flush`を実行するか、`redis-cli FLUSHALL`を実行します。

---

**作成者**: Towa Yokoyama  
**最終更新**: 2025年10月

