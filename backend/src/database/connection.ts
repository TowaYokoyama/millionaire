// 後方互換性のためのレガシーエクスポート
// 新しいコードでは getDatabase() を使用してください
import { getDatabase } from '../container/DIContainer';

const db = getDatabase();

export default db;
