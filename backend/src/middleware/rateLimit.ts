import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../cache/RedisClient';

/**
 * API全体のレート制限
 * 15分間に100リクエストまで
 */
export const apiLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - RedisStore type mismatch with ioredis
    sendCommand: (...args: any[]) => redisClient.getClient().call(...args),
    prefix: 'rl:api:',
  }),
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  message: {
    error: 'リクエストが多すぎます。しばらくしてから再試行してください。',
    retryAfter: '15分後',
  },
  standardHeaders: true, // RateLimit-* ヘッダーを返す
  legacyHeaders: false, // X-RateLimit-* ヘッダーを無効化
});

/**
 * 認証エンドポイント用のレート制限
 * より厳しい制限（5分間に5リクエスト）
 */
export const authLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - RedisStore type mismatch with ioredis
    sendCommand: (...args: any[]) => redisClient.getClient().call(...args),
    prefix: 'rl:auth:',
  }),
  windowMs: 5 * 60 * 1000, // 5分
  max: 5, // 最大5リクエスト
  message: {
    error: '認証の試行回数が多すぎます。しばらくしてから再試行してください。',
    retryAfter: '5分後',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 成功したリクエストはカウントしない
});

/**
 * ゲーム作成用のレート制限
 * 1分間に3ルームまで
 */
export const createRoomLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - RedisStore type mismatch with ioredis
    sendCommand: (...args: any[]) => redisClient.getClient().call(...args),
    prefix: 'rl:create_room:',
  }),
  windowMs: 1 * 60 * 1000, // 1分
  max: 3, // 最大3ルーム
  message: {
    error: 'ルーム作成の頻度が高すぎます。しばらくしてから再試行してください。',
    retryAfter: '1分後',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * ゲームアクション用のレート制限
 * カードプレイ、パスなど
 */
export const gameActionLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - RedisStore type mismatch with ioredis
    sendCommand: (...args: any[]) => redisClient.getClient().call(...args),
    prefix: 'rl:game_action:',
  }),
  windowMs: 1 * 1000, // 1秒
  max: 10, // 最大10アクション
  message: {
    error: 'アクションが多すぎます。少しゆっくりプレイしてください。',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true, // 失敗したリクエストはカウントしない
});

/**
 * チャットメッセージ用のレート制限
 * 10秒間に5メッセージまで
 */
export const chatLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - RedisStore type mismatch with ioredis
    sendCommand: (...args: any[]) => redisClient.getClient().call(...args),
    prefix: 'rl:chat:',
  }),
  windowMs: 10 * 1000, // 10秒
  max: 5, // 最大5メッセージ
  message: {
    error: 'メッセージの送信が早すぎます。',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * ロビー閲覧用のレート制限
 * 10秒間に20リクエストまで
 */
export const lobbyLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - RedisStore type mismatch with ioredis
    sendCommand: (...args: any[]) => redisClient.getClient().call(...args),
    prefix: 'rl:lobby:',
  }),
  windowMs: 10 * 1000, // 10秒
  max: 20, // 最大20リクエスト
  message: {
    error: 'ロビーの更新頻度が高すぎます。',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

