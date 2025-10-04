import { SQLiteDatabase } from './SQLiteDatabase';
import fs from 'fs';
import path from 'path';

/**
 * スタンドアロンでデータベース接続を作成
 */
function createStandaloneDatabase(): SQLiteDatabase {
  const dbPath = path.join(__dirname, '../../database/millonaire_game.db');
  return new SQLiteDatabase({ filename: dbPath });
}

/**
 * データベースクリーンアップ処理を実行
 */
export async function cleanupDatabase(): Promise<void> {
  const db = createStandaloneDatabase();
  
  try {
    console.log('データベースクリーンアップを開始します...');
    
    await db.connect();
    
    const cleanupScript = fs.readFileSync(
      path.join(__dirname, '../../database/cleanup.sql'),
      'utf-8'
    );

    // スクリプトを行ごとに分割して実行
    const statements = cleanupScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      await db.run(statement);
    }

    console.log('✓ データベースクリーンアップが完了しました');
  } catch (error) {
    console.error('データベースクリーンアップエラー:', error);
    throw error;
  } finally {
    await db.close();
  }
}

/**
 * データベースマイグレーションを実行
 */
export async function migrateDatabase(): Promise<void> {
  const db = createStandaloneDatabase();
  
  try {
    console.log('データベースマイグレーションを開始します...');
    
    await db.connect();
    
    const migrateScript = fs.readFileSync(
      path.join(__dirname, '../../database/migrate.sql'),
      'utf-8'
    );

    // マイグレーションスクリプトを実行（エラーは無視 - カラムが既に存在する場合）
    const statements = migrateScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await db.run(statement);
        console.log('✓ マイグレーション実行:', statement.substring(0, 50) + '...');
      } catch (error: any) {
        // カラムが既に存在する場合はエラーを無視
        if (error.message && error.message.includes('duplicate column name')) {
          console.log('⚠ カラムは既に存在します（スキップ）');
        } else {
          throw error;
        }
      }
    }

    console.log('✓ データベースマイグレーションが完了しました');
  } catch (error) {
    console.error('データベースマイグレーションエラー:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// コマンドラインから直接実行できるようにする
if (require.main === module) {
  (async () => {
    const command = process.argv[2];
    
    if (command === 'migrate') {
      await migrateDatabase();
    } else if (command === 'cleanup') {
      await cleanupDatabase();
    } else {
      console.log('使用方法:');
      console.log('  npm run db:migrate  - マイグレーション実行');
      console.log('  npm run db:cleanup  - クリーンアップ実行');
    }
    
    process.exit(0);
  })();
}

