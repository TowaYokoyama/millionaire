import sqlite3, { Database } from 'sqlite3';
import { IDatabase, DatabaseConfig } from './interfaces';

export class SQLiteDatabase implements IDatabase {
  private db: Database | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.config.filename, this.config.mode, (err) => {
        if (err) {
          console.error('SQLiteデータベース接続エラー:', err);
          reject(err);
        } else {
          console.log('SQLiteデータベースに接続しました:', this.config.filename);
          resolve(true);
        }
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('データベース接続終了エラー:', err);
            reject(err);
          } else {
            console.log('データベース接続を終了しました');
            this.db = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  async query(text: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('データベースが接続されていません'));
        return;
      }

      const start = Date.now();
      
      this.db.all(text, params, (err, rows) => {
        const duration = Date.now() - start;
        console.log('クエリ実行時間:', duration, 'ms');
        
        if (err) {
          console.error('クエリ実行エラー:', err);
          reject(err);
        } else {
          // PostgreSQLのresult形式に合わせる
          resolve({ rows: rows || [] });
        }
      });
    });
  }

  async run(text: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('データベースが接続されていません'));
        return;
      }

      const start = Date.now();
      
      this.db.run(text, params, function(err) {
        const duration = Date.now() - start;
        console.log('実行時間:', duration, 'ms');
        
        if (err) {
          console.error('実行エラー:', err);
          reject(err);
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  async transaction<T>(callback: (db: Database) => Promise<T>): Promise<T> {
    if (!this.db) {
      throw new Error('データベースが接続されていません');
    }

    return new Promise((resolve, reject) => {
      this.db!.serialize(async () => {
        try {
          await this.run('BEGIN TRANSACTION');
          const result = await callback(this.db!);
          await this.run('COMMIT');
          resolve(result);
        } catch (error) {
          await this.run('ROLLBACK');
          reject(error);
        }
      });
    });
  }

  getDatabase(): Database {
    if (!this.db) {
      throw new Error('データベースが接続されていません');
    }
    return this.db;
  }
}
