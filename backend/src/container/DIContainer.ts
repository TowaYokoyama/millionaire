import { IDatabase, DatabaseConfig } from '../database/interfaces';
import { SQLiteDatabase } from '../database/SQLiteDatabase';
import sqlite3 from 'sqlite3';

// DIコンテナのシンボル
export const TYPES = {
  Database: Symbol.for('Database'),
  DatabaseConfig: Symbol.for('DatabaseConfig'),
};

// DIコンテナクラス
export class DIContainer {
  private services = new Map<symbol, any>();

  // サービスを登録
  register<T>(token: symbol, implementation: T): void {
    this.services.set(token, implementation);
  }

  // サービスを取得
  get<T>(token: symbol): T {
    const service = this.services.get(token);
    if (!service) {
      throw new Error(`Service not found for token: ${token.toString()}`);
    }
    return service;
  }

  // ファクトリー関数でサービスを登録
  registerFactory<T>(token: symbol, factory: () => T): void {
    this.services.set(token, factory());
  }

  // シングルトンとしてサービスを登録
  registerSingleton<T>(token: symbol, factory: () => T): void {
    let instance: T | null = null;
    this.services.set(token, () => {
      if (!instance) {
        instance = factory();
      }
      return instance;
    });
  }
}

// グローバルコンテナインスタンス
export const container = new DIContainer();

// データベース設定を環境変数から作成
export function createDatabaseConfig(): DatabaseConfig {
  return {
    filename: process.env.DB_FILENAME || './database/millonaire_game.db',
    mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  };
}

// コンテナの初期化
export function initializeContainer(): void {
  // データベース設定を登録
  const dbConfig = createDatabaseConfig();
  container.register(TYPES.DatabaseConfig, dbConfig);

  // データベースインスタンスを登録
  container.register(TYPES.Database, new SQLiteDatabase(dbConfig));
}

// データベースインスタンスを取得するヘルパー関数
export function getDatabase(): IDatabase {
  return container.get<IDatabase>(TYPES.Database);
}
