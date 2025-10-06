import { redisClient } from '../cache/RedisClient';
import { GameEngine } from './GameEngine';
import { GameState, GamePlayer, Card } from '../types';

/**
 * ゲーム状態をRedisで管理するマネージャークラス
 * ゲームの永続化、復元、削除を担当
 */
export class GameStateManager {
  private static readonly GAME_STATE_PREFIX = 'game:';
  private static readonly GAME_CARDS_PREFIX = 'game:cards:';
  private static readonly GAME_ENGINE_PREFIX = 'game:engine:';
  private static readonly ACTIVE_GAMES_SET = 'active_games';
  private static readonly DEFAULT_TTL = 3600; // 1時間

  /**
   * ゲーム状態をRedisに保存
   */
  async saveGameState(gameId: string, game: GameEngine): Promise<boolean> {
    try {
      const gameState = game.getGameState();
      const players = game.getPlayers();

      // ゲーム状態を保存
      await redisClient.setJSON(
        `${GameStateManager.GAME_STATE_PREFIX}${gameId}`,
        gameState,
        GameStateManager.DEFAULT_TTL
      );

      // プレイヤーごとの手札を保存（ハッシュで管理）
      for (const player of players) {
        await redisClient.hset(
          `${GameStateManager.GAME_CARDS_PREFIX}${gameId}`,
          player.id.toString(),
          JSON.stringify(player.cards)
        );
      }

      // TTLを設定
      await redisClient.expire(
        `${GameStateManager.GAME_CARDS_PREFIX}${gameId}`,
        GameStateManager.DEFAULT_TTL
      );

      // アクティブなゲームのセットに追加
      await redisClient.sadd(GameStateManager.ACTIVE_GAMES_SET, gameId);

      console.log(`✅ Game state saved to Redis: ${gameId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to save game state for ${gameId}:`, error);
      return false;
    }
  }

  /**
   * ゲーム状態をRedisから取得
   */
  async loadGameState(gameId: string): Promise<GameState | null> {
    try {
      const gameState = await redisClient.getJSON<GameState>(
        `${GameStateManager.GAME_STATE_PREFIX}${gameId}`
      );

      if (!gameState) {
        console.log(`Game state not found in Redis: ${gameId}`);
        return null;
      }

      console.log(`✅ Game state loaded from Redis: ${gameId}`);
      return gameState;
    } catch (error) {
      console.error(`❌ Failed to load game state for ${gameId}:`, error);
      return null;
    }
  }

  /**
   * プレイヤーの手札を取得
   */
  async loadPlayerCards(gameId: string, playerId: number): Promise<Card[]> {
    try {
      const cardsStr = await redisClient.hget(
        `${GameStateManager.GAME_CARDS_PREFIX}${gameId}`,
        playerId.toString()
      );

      if (!cardsStr) {
        return [];
      }

      return JSON.parse(cardsStr) as Card[];
    } catch (error) {
      console.error(`❌ Failed to load player cards for ${gameId}/${playerId}:`, error);
      return [];
    }
  }

  /**
   * 全プレイヤーの手札を取得
   */
  async loadAllPlayerCards(gameId: string): Promise<Map<number, Card[]>> {
    try {
      const cardsMap = new Map<number, Card[]>();
      const allCards = await redisClient.hgetall(
        `${GameStateManager.GAME_CARDS_PREFIX}${gameId}`
      );

      for (const [playerId, cardsStr] of Object.entries(allCards)) {
        const cards = JSON.parse(cardsStr) as Card[];
        cardsMap.set(Number(playerId), cards);
      }

      return cardsMap;
    } catch (error) {
      console.error(`❌ Failed to load all player cards for ${gameId}:`, error);
      return new Map();
    }
  }

  /**
   * ゲームをRedisから削除
   */
  async deleteGame(gameId: string): Promise<boolean> {
    try {
      // ゲーム状態を削除
      await redisClient.del(`${GameStateManager.GAME_STATE_PREFIX}${gameId}`);
      
      // プレイヤーカードを削除
      await redisClient.del(`${GameStateManager.GAME_CARDS_PREFIX}${gameId}`);
      
      // ゲームエンジンデータを削除
      await redisClient.del(`${GameStateManager.GAME_ENGINE_PREFIX}${gameId}`);
      
      // アクティブゲームセットから削除
      await redisClient.srem(GameStateManager.ACTIVE_GAMES_SET, gameId);

      console.log(`✅ Game deleted from Redis: ${gameId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete game ${gameId}:`, error);
      return false;
    }
  }

  /**
   * 全アクティブゲームのIDを取得
   */
  async getActiveGameIds(): Promise<string[]> {
    try {
      return await redisClient.smembers(GameStateManager.ACTIVE_GAMES_SET);
    } catch (error) {
      console.error('❌ Failed to get active game IDs:', error);
      return [];
    }
  }

  /**
   * ゲームが存在するかチェック
   */
  async gameExists(gameId: string): Promise<boolean> {
    try {
      return await redisClient.exists(
        `${GameStateManager.GAME_STATE_PREFIX}${gameId}`
      );
    } catch (error) {
      console.error(`❌ Failed to check game existence for ${gameId}:`, error);
      return false;
    }
  }

  /**
   * ゲームのTTLを延長
   */
  async extendGameTTL(gameId: string, additionalSeconds: number = 3600): Promise<boolean> {
    try {
      await redisClient.expire(
        `${GameStateManager.GAME_STATE_PREFIX}${gameId}`,
        additionalSeconds
      );
      await redisClient.expire(
        `${GameStateManager.GAME_CARDS_PREFIX}${gameId}`,
        additionalSeconds
      );
      
      console.log(`✅ Game TTL extended for ${gameId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to extend TTL for ${gameId}:`, error);
      return false;
    }
  }

  /**
   * セッション情報を保存
   */
  async saveSessionData(
    userId: number,
    sessionData: any,
    ttl: number = 86400
  ): Promise<boolean> {
    try {
      await redisClient.setJSON(`session:${userId}`, sessionData, ttl);
      console.log(`✅ Session saved for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to save session for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * セッション情報を取得
   */
  async getSessionData(userId: number): Promise<any | null> {
    try {
      return await redisClient.getJSON(`session:${userId}`);
    } catch (error) {
      console.error(`❌ Failed to get session for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * セッション情報を削除
   */
  async deleteSessionData(userId: number): Promise<boolean> {
    try {
      await redisClient.del(`session:${userId}`);
      console.log(`✅ Session deleted for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete session for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * ユーザーのアクティブゲームを記録
   */
  async setUserActiveGame(userId: number, gameId: string): Promise<boolean> {
    try {
      await redisClient.set(`user:${userId}:active_game`, gameId, 3600);
      return true;
    } catch (error) {
      console.error(`❌ Failed to set active game for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * ユーザーのアクティブゲームを取得
   */
  async getUserActiveGame(userId: number): Promise<string | null> {
    try {
      return await redisClient.get(`user:${userId}:active_game`);
    } catch (error) {
      console.error(`❌ Failed to get active game for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * ユーザーのアクティブゲームをクリア
   */
  async clearUserActiveGame(userId: number): Promise<boolean> {
    try {
      await redisClient.del(`user:${userId}:active_game`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to clear active game for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * 古いゲームをクリーンアップ
   */
  async cleanupExpiredGames(): Promise<number> {
    try {
      const activeGameIds = await this.getActiveGameIds();
      let cleanedCount = 0;

      for (const gameId of activeGameIds) {
        const exists = await this.gameExists(gameId);
        if (!exists) {
          await this.deleteGame(gameId);
          cleanedCount++;
        }
      }

      console.log(`✅ Cleaned up ${cleanedCount} expired games`);
      return cleanedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup expired games:', error);
      return 0;
    }
  }

  /**
   * 統計情報を取得
   */
  async getStatistics(): Promise<{
    activeGames: number;
    totalKeys: number;
    memoryUsage: string;
  }> {
    try {
      const activeGames = await redisClient.scard(GameStateManager.ACTIVE_GAMES_SET);
      const info = await redisClient.info();
      
      // メモリ使用量を抽出
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch?.[1]?.trim() ?? 'Unknown';

      return {
        activeGames,
        totalKeys: 0, // Redis KEYSコマンドは本番では使わない
        memoryUsage,
      };
    } catch (error) {
      console.error('❌ Failed to get statistics:', error);
      return {
        activeGames: 0,
        totalKeys: 0,
        memoryUsage: 'Unknown',
      };
    }
  }
}

// シングルトンインスタンスをエクスポート
export const gameStateManager = new GameStateManager();

