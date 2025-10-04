-- データベースクリーンアップスクリプト

-- 1. 古いCPUプレイヤーを削除（30日以上前のもの）
DELETE FROM users 
WHERE username LIKE 'CPU_%' 
AND created_at < datetime('now', '-30 days');

-- 2. 終了したゲームルームを削除（7日以上前のもの）
DELETE FROM game_rooms 
WHERE status = 'finished' 
AND updated_at < datetime('now', '-7 days');

-- 3. 孤立したルームプレイヤーを削除（対応するルームが存在しないもの）
DELETE FROM room_players 
WHERE room_id NOT IN (SELECT id FROM game_rooms);

-- 4. 空のルームを削除
DELETE FROM game_rooms 
WHERE current_players = 0 
AND status = 'waiting';

-- 5. 古いゲーム履歴を削除（30日以上前のもの）
DELETE FROM game_history 
WHERE timestamp < datetime('now', '-30 days');

-- 6. 古いゲーム結果を削除（90日以上前のもの）
DELETE FROM game_results 
WHERE finished_at < datetime('now', '-90 days');

-- クリーンアップ後のVACUUM（データベースを最適化）
VACUUM;

