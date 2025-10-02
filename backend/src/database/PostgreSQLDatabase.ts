import { Pool, PoolClient } from 'pg';
import { IDatabase, DatabaseConfig } from './interfaces';

export class PostgreSQLDatabase implements IDatabase {
  private pool: Pool;

  constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
    });
  }

  async connect(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      console.log('PostgreSQLデータベースに接続しました');
      client.release();
      return true;
    } catch (err) {
      console.error('データベース接続エラー:', err);
      throw err;
    }
  }

  async close(): Promise<void> {
    try {
      await this.pool.end();
      console.log('データベース接続を終了しました');
    } catch (err) {
      console.error('データベース接続終了エラー:', err);
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('クエリ実行時間:', duration, 'ms');
      return res;
    } catch (err) {
      console.error('クエリ実行エラー:', err);
      throw err;
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  getPool(): Pool {
    return this.pool;
  }
}
