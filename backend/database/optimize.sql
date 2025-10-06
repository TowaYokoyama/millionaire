-- データベースパフォーマンス最適化スクリプト
-- インデックスの追加と最適化

-- ==================== インデックス追加 ====================

-- game_rooms テーブル
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);
CREATE INDEX IF NOT EXISTS idx_game_rooms_host_id ON game_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_game_rooms_is_private ON game_rooms(is_private);
CREATE INDEX IF NOT EXISTS idx_game_rooms_created_at ON game_rooms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_rooms_status_private ON game_rooms(status, is_private);

-- room_players テーブル
CREATE INDEX IF NOT EXISTS idx_room_players_room_id ON room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_room_players_player_id ON room_players(player_id);
CREATE INDEX IF NOT EXISTS idx_room_players_player_order ON room_players(player_order);

-- game_history テーブル
CREATE INDEX IF NOT EXISTS idx_game_history_game_id ON game_history(game_id);
CREATE INDEX IF NOT EXISTS idx_game_history_player_id ON game_history(player_id);
CREATE INDEX IF NOT EXISTS idx_game_history_timestamp ON game_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_action_type ON game_history(action_type);

-- game_results テーブル
CREATE INDEX IF NOT EXISTS idx_game_results_game_id ON game_results(game_id);
CREATE INDEX IF NOT EXISTS idx_game_results_player_id ON game_results(player_id);
CREATE INDEX IF NOT EXISTS idx_game_results_final_rank ON game_results(final_rank);

-- users テーブル
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating DESC);
CREATE INDEX IF NOT EXISTS idx_users_games_played ON users(games_played DESC);

-- ==================== 統計ビュー ====================

-- アクティブゲーム統計ビュー
CREATE VIEW IF NOT EXISTS v_active_games_stats AS
SELECT 
    COUNT(*) as total_active_games,
    AVG(current_players) as avg_players,
    MAX(current_players) as max_players,
    COUNT(CASE WHEN is_private = 1 THEN 1 END) as private_games,
    COUNT(CASE WHEN is_private = 0 THEN 1 END) as public_games
FROM game_rooms
WHERE status = 'playing';

-- プレイヤー統計ビュー
CREATE VIEW IF NOT EXISTS v_player_stats AS
SELECT 
    u.id,
    u.username,
    u.rating,
    u.games_played,
    u.games_won,
    CASE 
        WHEN u.games_played > 0 
        THEN CAST(u.games_won AS FLOAT) / u.games_played * 100 
        ELSE 0 
    END as win_rate,
    COUNT(gr.id) as total_results,
    AVG(gr.final_rank) as avg_rank
FROM users u
LEFT JOIN game_results gr ON u.id = gr.player_id
GROUP BY u.id;

-- トップランキングビュー
CREATE VIEW IF NOT EXISTS v_top_rankings AS
SELECT 
    id,
    username,
    rating,
    games_played,
    games_won,
    CASE 
        WHEN games_played > 0 
        THEN CAST(games_won AS FLOAT) / games_played * 100 
        ELSE 0 
    END as win_rate,
    ROW_NUMBER() OVER (ORDER BY rating DESC) as rank_position
FROM users
WHERE games_played >= 5  -- 最低5ゲームプレイしたユーザー
ORDER BY rating DESC
LIMIT 100;

-- ==================== パフォーマンス設定 ====================

-- WALモード有効化（並行読み書きパフォーマンス向上）
PRAGMA journal_mode = WAL;

-- キャッシュサイズ増加（10MB）
PRAGMA cache_size = -10000;

-- 同期モード（バランス型）
PRAGMA synchronous = NORMAL;

-- 一時ストアメモリ使用
PRAGMA temp_store = MEMORY;

-- 自動VACUUM有効化
PRAGMA auto_vacuum = INCREMENTAL;

-- ==================== 統計情報更新 ====================

-- SQLiteの統計情報を更新（クエリオプティマイザーの改善）
ANALYZE;

-- ==================== クリーンアップ ====================

-- 不要なスペース削減
VACUUM;

