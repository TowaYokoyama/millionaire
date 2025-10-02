import { Database } from 'sqlite3';

// データベース接続のインターフェース
export interface IDatabase {
  connect(): Promise<boolean>;
  close(): Promise<void>;
  query(text: string, params?: any[]): Promise<any>;
  run(text: string, params?: any[]): Promise<{ lastID?: number; changes?: number }>;
  transaction<T>(callback: (db: Database) => Promise<T>): Promise<T>;
  getDatabase(): Database;
}

// データベース設定のインターフェース
export interface DatabaseConfig {
  filename: string;
  mode?: number;
}
