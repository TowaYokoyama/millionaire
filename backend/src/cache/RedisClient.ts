import Redis from 'ioredis';

/**
 * Redis クライアントのシングルトンクラス
 * ゲーム状態、セッション、キャッシュなどを管理
 */
class RedisClient {
  private static instance: RedisClient;
  private client: Redis;
  private pubClient: Redis;
  private subClient: Redis;

  private constructor() {
    const redisConfig: any = {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    };

    // パスワードがある場合のみ追加
    if (process.env.REDIS_PASSWORD) {
      redisConfig.password = process.env.REDIS_PASSWORD;
    }

    this.client = new Redis(redisConfig);
    this.pubClient = new Redis(redisConfig); // 発行専用
    this.subClient = new Redis(redisConfig); // 購読専用

    // イベントハンドラ
    this.client.on('error', (err) => console.error('Redis Error:', err));
    this.client.on('connect', () => console.log('✅ Redis Connected'));
    this.client.on('ready', () => console.log('✅ Redis Ready'));
    this.client.on('close', () => console.log('❌ Redis Connection Closed'));
    this.client.on('reconnecting', () => console.log('🔄 Redis Reconnecting...'));

    this.pubClient.on('error', (err) => console.error('Redis Pub Error:', err));
    this.subClient.on('error', (err) => console.error('Redis Sub Error:', err));
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  /**
   * 基本的なクライアントを取得
   */
  public getClient(): Redis {
    return this.client;
  }

  /**
   * Pub/Sub用のクライアントを取得
   */
  public getPubSubClients(): { pubClient: Redis; subClient: Redis } {
    return {
      pubClient: this.pubClient,
      subClient: this.subClient,
    };
  }

  // ==================== 基本操作 ====================

  /**
   * 値を取得
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      throw new Error(`Failed to get key ${key}: ${error}`);
    }
  }

  /**
   * 値を設定
   */
  async set(key: string, value: string, ttl?: number): Promise<string | null> {
    try {
      if (ttl) {
        return await this.client.set(key, value, 'EX', ttl);
      }
      return await this.client.set(key, value);
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      throw new Error(`Failed to set key ${key}: ${error}`);
    }
  }

  /**
   * JSONオブジェクトを保存
   */
  async setJSON(key: string, value: any, ttl?: number): Promise<string | null> {
    try {
      const jsonString = JSON.stringify(value);
      return await this.set(key, jsonString, ttl);
    } catch (error) {
      console.error(`Redis SETJSON error for key ${key}:`, error);
      throw new Error(`Failed to set JSON for key ${key}: ${error}`);
    }
  }

  /**
   * JSONオブジェクトを取得
   */
  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Redis GETJSON error for key ${key}:`, error);
      throw new Error(`Failed to get JSON for key ${key}: ${error}`);
    }
  }

  /**
   * キーを削除
   */
  async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      throw new Error(`Redis DEL error for key ${key}: ${error}`);
    }
  }

  /**
   * パターンマッチでキーを削除（SCANベース - 本番環境対応）
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      let cursor = '0';
      let deletedCount = 0;
      const keysToDelete: string[] = [];

      // SCANでキーを取得（本番環境でRedisをブロックしない）
      do {
        const result = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        const keys = result[1];

        if (keys.length > 0) {
          keysToDelete.push(...keys);
        }
      } while (cursor !== '0');

      // バッチでキーを削除
      if (keysToDelete.length > 0) {
        deletedCount = await this.client.del(...keysToDelete);
        console.log(`Deleted ${deletedCount} keys matching pattern: ${pattern}`);
      }

      return deletedCount;
    } catch (error) {
      console.error(`Redis DELPATTERN error for pattern ${pattern}:`, error);
      throw new Error(`Failed to delete pattern ${pattern}: ${error}`);
    }
  }

  /**
   * キーの存在確認
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      throw new Error(`Failed to check existence of key ${key}: ${error}`);
    }
  }

  /**
   * TTL設定　---自動削除生存時間----
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error);
      throw new Error(`Failed to set TTL for key ${key}: ${error}`);
    }
  }

  // ==================== ハッシュ操作 ====================

  /**
   * ハッシュフィールドを設定
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    try {
      return await this.client.hset(key, field, value);
    } catch (error) {
      console.error(`Redis HSET error for key ${key}:`, error);
      throw new Error(`Failed to set hash field ${field} for key ${key}: ${error}`);
    }
  }

  /**
   * ハッシュフィールドを取得
   */
  async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hget(key, field);
    } catch (error) {
      console.error(`Redis HGET error for key ${key}:`, error);
      throw new Error(`Failed to get hash field ${field} for key ${key}: ${error}`);
    }
  }

  /**
   * ハッシュ全体を取得
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hgetall(key);
    } catch (error) {
      console.error(`Redis HGETALL error for key ${key}:`, error);
      throw new Error(`Failed to get all hash fields for key ${key}: ${error}`);
    }
  }

  /**
   * ハッシュフィールドを削除
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    try {
      return await this.client.hdel(key, ...fields);
    } catch (error) {
      console.error(`Redis HDEL error for key ${key}:`, error);
      throw new Error(`Failed to delete hash fields for key ${key}: ${error}`);
    }
  }

  /**
   * ハッシュのすべてのフィールド名を取得
   */
  async hkeys(key: string): Promise<string[]> {
    try {
      return await this.client.hkeys(key);
    } catch (error) {
      console.error(`Redis HKEYS error for key ${key}:`, error);
      throw new Error(`Failed to get hash keys for key ${key}: ${error}`);
    }
  }

  /**
   * ハッシュフィールドにJSONオブジェクトを保存
   */
  async hsetJSON<T>(key: string, field: string, value: T): Promise<number> {
    try {
      const jsonString = JSON.stringify(value);
      return await this.hset(key, field, jsonString);
    } catch (error) {
      console.error(`Redis HSETJSON error for key ${key}, field ${field}:`, error);
      throw new Error(`Failed to set JSON to hash field ${field} for key ${key}: ${error}`);
    }
  }

  /**
   * ハッシュフィールドからJSONオブジェクトを取得
   */
  async hgetJSON<T>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.hget(key, field);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Redis HGETJSON error for key ${key}, field ${field}:`, error);
      throw new Error(`Failed to get JSON from hash field ${field} for key ${key}: ${error}`);
    }
  }

  /**
   * ハッシュ全体をJSONオブジェクトのマップとして取得
   */
  async hgetallJSON<T>(key: string): Promise<Record<string, T>> {
    try {
      const allFields = await this.hgetall(key);
      const result: Record<string, T> = {};
      
      for (const [field, value] of Object.entries(allFields)) {
        try {
          result[field] = JSON.parse(value) as T;
        } catch (parseError) {
          console.warn(`Failed to parse JSON for field ${field}:`, parseError);
        }
      }
      
      return result;
    } catch (error) {
      console.error(`Redis HGETALLJSON error for key ${key}:`, error);
      throw new Error(`Failed to get all JSON fields for key ${key}: ${error}`);
    }
  }

  // ==================== リスト操作 ====================

  /**
   * リストの先頭に追加
   */
  async lpush(key: string, ...values: string[]): Promise<number> {
    try {
      return await this.client.lpush(key, ...values);
    } catch (error) {
      console.error(`Redis LPUSH error for key ${key}:`, error);
      throw new Error(`Failed to lpush to key ${key}: ${error}`);
    }
  }

  /**
   * リストの末尾に追加
   */
  async rpush(key: string, ...values: string[]): Promise<number> {
    try {
      return await this.client.rpush(key, ...values);
    } catch (error) {
      console.error(`Redis RPUSH error for key ${key}:`, error);
      throw new Error(`Failed to rpush to key ${key}: ${error}`);
    }
  }

  /**
   * リストの範囲を取得
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.client.lrange(key, start, stop);
    } catch (error) {
      console.error(`Redis LRANGE error for key ${key}:`, error);
      throw new Error(`Failed to lrange for key ${key}: ${error}`);
    }
  }

  /**
   * リストの長さを取得
   */
  async llen(key: string): Promise<number> {
    try {
      return await this.client.llen(key);
    } catch (error) {
      console.error(`Redis LLEN error for key ${key}:`, error);
      throw new Error(`Failed to get list length for key ${key}: ${error}`);
    }
  }

  /**
   * リストの先頭にJSONオブジェクトを追加
   */
  async lpushJSON<T>(key: string, ...values: T[]): Promise<number> {
    try {
      const jsonStrings = values.map(v => JSON.stringify(v));
      return await this.lpush(key, ...jsonStrings);
    } catch (error) {
      console.error(`Redis LPUSHJSON error for key ${key}:`, error);
      throw new Error(`Failed to lpush JSON to key ${key}: ${error}`);
    }
  }

  /**
   * リストの末尾にJSONオブジェクトを追加
   */
  async rpushJSON<T>(key: string, ...values: T[]): Promise<number> {
    try {
      const jsonStrings = values.map(v => JSON.stringify(v));
      return await this.rpush(key, ...jsonStrings);
    } catch (error) {
      console.error(`Redis RPUSHJSON error for key ${key}:`, error);
      throw new Error(`Failed to rpush JSON to key ${key}: ${error}`);
    }
  }

  /**
   * リストの範囲をJSONオブジェクトとして取得
   */
  async lrangeJSON<T>(key: string, start: number, stop: number): Promise<T[]> {
    try {
      const values = await this.lrange(key, start, stop);
      return values.map(v => JSON.parse(v) as T);
    } catch (error) {
      console.error(`Redis LRANGEJSON error for key ${key}:`, error);
      throw new Error(`Failed to lrange JSON for key ${key}: ${error}`);
    }
  }

  // ==================== セット操作 ====================

  /**
   * セットに追加
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.sadd(key, ...members);
    } catch (error) {
      console.error(`Redis SADD error for key ${key}:`, error);
      throw new Error(`Failed to add to set ${key}: ${error}`);
    }
  }

  /**
   * セットのメンバーを取得
   */
  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      console.error(`Redis SMEMBERS error for key ${key}:`, error);
      throw new Error(`Failed to get members from set ${key}: ${error}`);
    }
  }

  /**
   * セットからメンバーを削除
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.srem(key, ...members);
    } catch (error) {
      console.error(`Redis SREM error for key ${key}:`, error);
      throw new Error(`Failed to remove from set ${key}: ${error}`);
    }
  }

  /**
   * セットのメンバー数を取得
   */
  async scard(key: string): Promise<number> {
    try {
      return await this.client.scard(key);
    } catch (error) {
      console.error(`Redis SCARD error for key ${key}:`, error);
      throw new Error(`Failed to get set cardinality for ${key}: ${error}`);
    }
  }

  /**
   * セットにJSONオブジェクトを追加
   */
  async saddJSON<T>(key: string, ...members: T[]): Promise<number> {
    try {
      const jsonStrings = members.map(m => JSON.stringify(m));
      return await this.sadd(key, ...jsonStrings);
    } catch (error) {
      console.error(`Redis SADDJSON error for key ${key}:`, error);
      throw new Error(`Failed to add JSON to set ${key}: ${error}`);
    }
  }

  /**
   * セットのメンバーをJSONオブジェクトとして取得
   */
  async smembersJSON<T>(key: string): Promise<T[]> {
    try {
      const members = await this.smembers(key);
      return members.map(m => JSON.parse(m) as T);
    } catch (error) {
      console.error(`Redis SMEMBERSJSON error for key ${key}:`, error);
      throw new Error(`Failed to get JSON members from set ${key}: ${error}`);
    }
  }

  // ==================== ソート済みセット操作 ====================

  /**
   * ソート済みセットに追加
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    try {
      return await this.client.zadd(key, score, member);
    } catch (error) {
      console.error(`Redis ZADD error for key ${key}:`, error);
      throw new Error(`Failed to add to sorted set ${key}: ${error}`);
    }
  }

  /**
   * ソート済みセットの範囲を取得
   */
  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.client.zrange(key, start, stop);
    } catch (error) {
      console.error(`Redis ZRANGE error for key ${key}:`, error);
      throw new Error(`Failed to get range from sorted set ${key}: ${error}`);
    }
  }

  /**
   * ソート済みセットの範囲を逆順で取得
   */
  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.client.zrevrange(key, start, stop);
    } catch (error) {
      console.error(`Redis ZREVRANGE error for key ${key}:`, error);
      throw new Error(`Failed to get reverse range from sorted set ${key}: ${error}`);
    }
  }

  /**
   * ソート済みセットにJSONオブジェクトを追加
   */
  async zaddJSON<T>(key: string, score: number, member: T): Promise<number> {
    try {
      const jsonString = JSON.stringify(member);
      return await this.zadd(key, score, jsonString);
    } catch (error) {
      console.error(`Redis ZADDJSON error for key ${key}:`, error);
      throw new Error(`Failed to add JSON to sorted set ${key}: ${error}`);
    }
  }

  /**
   * ソート済みセットの範囲をJSONオブジェクトとして取得
   */
  async zrangeJSON<T>(key: string, start: number, stop: number): Promise<T[]> {
    try {
      const members = await this.zrange(key, start, stop);
      return members.map(m => JSON.parse(m) as T);
    } catch (error) {
      console.error(`Redis ZRANGEJSON error for key ${key}:`, error);
      throw new Error(`Failed to get JSON range from sorted set ${key}: ${error}`);
    }
  }

  /**
   * ソート済みセットの範囲を逆順でJSONオブジェクトとして取得
   */
  async zrevrangeJSON<T>(key: string, start: number, stop: number): Promise<T[]> {
    try {
      const members = await this.zrevrange(key, start, stop);
      return members.map(m => JSON.parse(m) as T);
    } catch (error) {
      console.error(`Redis ZREVRANGEJSON error for key ${key}:`, error);
      throw new Error(`Failed to get JSON reverse range from sorted set ${key}: ${error}`);
    }
  }

  // ==================== 接続管理 ====================

  /**
   * 接続をクローズ
   */
  async close(): Promise<void> {
    try {
      await this.client.quit();
      await this.pubClient.quit();
      await this.subClient.quit();
      console.log('✅ Redis connections closed');
    } catch (error) {
      console.error('Redis close error:', error);
      throw new Error(`Failed to close Redis connections: ${error}`);
    }
  }

  /**
   * Redis接続状態を確認
   */
  isConnected(): boolean {
    try {
      return this.client.status === 'ready';
    } catch (error) {
      console.error('Redis isConnected error:', error);
      return false;
    }
  }

  /**
   * Redisサーバー情報を取得
   */
  async info(): Promise<string> {
    try {
      return await this.client.info();
    } catch (error) {
      console.error('Redis INFO error:', error);
      throw new Error(`Failed to get Redis info: ${error}`);
    }
  }

  /**
   * Redisサーバーにpingを送信（接続テスト）
   */
  async ping(): Promise<string> {
    try {
      return await this.client.ping();
    } catch (error) {
      console.error('Redis PING error:', error);
      throw new Error(`Failed to ping Redis: ${error}`);
    }
  }

  /**
   * 全てのキーをフラッシュ（開発環境のみ推奨）
   */
  async flushall(): Promise<string> {
    try {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('FLUSHALL is not allowed in production environment');
      }
      console.warn('⚠️  Flushing all Redis keys...');
      return await this.client.flushall();
    } catch (error) {
      console.error('Redis FLUSHALL error:', error);
      throw new Error(`Failed to flush all Redis keys: ${error}`);
    }
  }

  /**
   * 現在のデータベースをフラッシュ（開発環境のみ推奨）
   */
  async flushdb(): Promise<string> {
    try {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('FLUSHDB is not allowed in production environment');
      }
      console.warn('⚠️  Flushing current Redis database...');
      return await this.client.flushdb();
    } catch (error) {
      console.error('Redis FLUSHDB error:', error);
      throw new Error(`Failed to flush current Redis database: ${error}`);
    }
  }
}

// シングルトンインスタンスをエクスポート
export const redisClient = RedisClient.getInstance();
export default RedisClient;

