import fs from 'fs';
import path from 'path';
import { getDatabase } from '../container/DIContainer';

export async function initializeDatabase(): Promise<void> {
  try {
    const db = getDatabase();
    
    // データベースに接続
    await db.connect();
    
    // スキーマファイルを読み込み
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // SQLを分割して実行
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log('データベーススキーマを初期化しています...');
    
    for (const statement of statements) {
      if (statement.trim()) {
        await db.run(statement);
      }
    }
    
    console.log('データベーススキーマの初期化が完了しました');
    
    // テストデータの挿入（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      await insertTestData();
    }
    
  } catch (error) {
    console.error('データベース初期化エラー:', error);
    throw error;
  }
}

async function insertTestData(): Promise<void> {
  try {
    const db = getDatabase();
    
    // テストユーザーが既に存在するかチェック
    const existingUsers = await db.query('SELECT COUNT(*) as count FROM users');
    if (existingUsers.rows[0].count > 0) {
      console.log('テストデータは既に存在します');
      return;
    }
    
    console.log('テストデータを挿入しています...');
    
    // テストユーザーを作成
    const testUsers = [
      { username: 'testuser1', email: 'test1@example.com', rating: 1200 },
      { username: 'testuser2', email: 'test2@example.com', rating: 1100 },
      { username: 'testuser3', email: 'test3@example.com', rating: 1300 },
      { username: 'guest1', rating: 1000 },
    ];
    
    for (const user of testUsers) {
      await db.run(
        `INSERT INTO users (username, email, rating, games_played, games_won) 
         VALUES (?, ?, ?, ?, ?)`,
        [user.username, user.email || null, user.rating, 0, 0]
      );
    }
    
    console.log('テストデータの挿入が完了しました');
    
  } catch (error) {
    console.error('テストデータ挿入エラー:', error);
  }
}
