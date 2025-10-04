-- データベースマイグレーション: game_roomsテーブルに新しいカラムを追加

-- descriptionカラムを追加（既に存在する場合はエラーにならない）
ALTER TABLE game_rooms ADD COLUMN description TEXT;

-- is_privateカラムを追加
ALTER TABLE game_rooms ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0;

-- passwordカラムを追加
ALTER TABLE game_rooms ADD COLUMN password TEXT;

