-- SQLite用スキーマ定義

-- =========================
-- ユーザーテーブル
-- =========================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    rating INTEGER NOT NULL DEFAULT 1000,
    games_played INTEGER NOT NULL DEFAULT 0,
    games_won INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- ゲームルームテーブル
-- =========================
CREATE TABLE IF NOT EXISTS game_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_name TEXT NOT NULL,
    host_id INTEGER NOT NULL,
    max_players INTEGER NOT NULL DEFAULT 4,
    current_players INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'waiting' 
        CHECK (status IN ('waiting', 'playing', 'finished')),
    game_settings TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================
-- ルームプレイヤーテーブル
-- =========================
CREATE TABLE IF NOT EXISTS room_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    player_order INTEGER NOT NULL,
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES game_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(room_id, player_id),
    UNIQUE(room_id, player_order)
);

-- =========================
-- ゲーム履歴テーブル
-- =========================
CREATE TABLE IF NOT EXISTS game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    player_id INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    action_data TEXT NOT NULL DEFAULT '{}',
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================
-- ゲーム結果テーブル
-- =========================
CREATE TABLE IF NOT EXISTS game_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    player_id INTEGER NOT NULL,
    final_rank INTEGER NOT NULL,
    rating_change INTEGER NOT NULL DEFAULT 0,
    cards_left INTEGER NOT NULL DEFAULT 0,
    finished_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================
-- インデックス作成
-- =========================
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating DESC);

CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);
CREATE INDEX IF NOT EXISTS idx_game_rooms_host ON game_rooms(host_id);

CREATE INDEX IF NOT EXISTS idx_room_players_room ON room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_room_players_player ON room_players(player_id);

CREATE INDEX IF NOT EXISTS idx_game_history_game ON game_history(game_id);
CREATE INDEX IF NOT EXISTS idx_game_history_player ON game_history(player_id);

CREATE INDEX IF NOT EXISTS idx_game_results_game ON game_results(game_id);
CREATE INDEX IF NOT EXISTS idx_game_results_player ON game_results(player_id);

-- =========================
-- トリガー: updated_at 自動更新
-- =========================
CREATE TRIGGER IF NOT EXISTS update_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_game_rooms_updated_at
AFTER UPDATE ON game_rooms
FOR EACH ROW
BEGIN
    UPDATE game_rooms SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;


