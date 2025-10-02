import express from 'express';
import { getDatabase } from '../container/DIContainer';
import { authenticateToken } from '../middleware/auth';
import { CreateRoomRequest } from '../types';

const router = express.Router();

// 全てのルートで認証が必要
router.use(authenticateToken);

// ルーム一覧取得
router.get('/rooms', async (req: express.Request, res: express.Response) => {
  try {
    const db = getDatabase();
    
    const result = await db.query(`
      SELECT r.*, u.username as host_username,
             COUNT(rp.player_id) as current_players
      FROM game_rooms r
      LEFT JOIN users u ON r.host_id = u.id
      LEFT JOIN room_players rp ON r.id = rp.room_id
      WHERE r.status = 'waiting'
      GROUP BY r.id, u.username
      ORDER BY r.created_at DESC
    `);

    res.json({
      message: 'ルーム一覧を取得しました',
      rooms: result.rows
    });
  } catch (error) {
    console.error('ルーム一覧取得エラー:', error);
    res.status(500).json({ error: 'ルーム一覧の取得に失敗しました' });
  }
});

// ルーム作成
router.post('/rooms', async (req: express.Request, res: express.Response) => {
  try {
    const { room_name, max_players = 4, game_settings = {} }: CreateRoomRequest = req.body;
    const hostId = req.user!.id;

    if (!room_name) {
      return res.status(400).json({ error: 'ルーム名が必要です' });
    }

    const db = getDatabase();

    // ルーム作成
    const roomResult = await db.query(`
      INSERT INTO game_rooms (room_name, host_id, max_players, current_players, status, game_settings)
      VALUES ($1, $2, $3, 1, 'waiting', $4)
      RETURNING *
    `, [room_name, hostId, max_players, JSON.stringify(game_settings)]);

    const room = roomResult.rows[0];

    // ホストをプレイヤーとして追加
    await db.query(`
      INSERT INTO room_players (room_id, player_id, player_order)
      VALUES ($1, $2, 0)
    `, [room.id, hostId]);

    res.status(201).json({
      message: 'ルームを作成しました',
      room
    });
  } catch (error) {
    console.error('ルーム作成エラー:', error);
    res.status(500).json({ error: 'ルームの作成に失敗しました' });
  }
});

// ルーム参加
router.post('/rooms/:roomId/join', async (req: express.Request, res: express.Response) => {
  try {
    const { roomId } = req.params;
    const playerId = req.user!.id;

    const db = getDatabase();

    // ルーム存在確認
    const roomResult = await db.query(
      'SELECT * FROM game_rooms WHERE id = $1 AND status = $2',
      [roomId, 'waiting']
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'ルームが見つからないか、既に開始されています' });
    }

    const room = roomResult.rows[0];

    // 既に参加しているかチェック
    const existingPlayer = await db.query(
      'SELECT id FROM room_players WHERE room_id = $1 AND player_id = $2',
      [roomId, playerId]
    );

    if (existingPlayer.rows.length > 0) {
      return res.status(409).json({ error: '既にこのルームに参加しています' });
    }

    // 定員チェック
    if (room.current_players >= room.max_players) {
      return res.status(409).json({ error: 'ルームが満員です' });
    }

    // プレイヤー追加
    await db.query(`
      INSERT INTO room_players (room_id, player_id, player_order)
      VALUES ($1, $2, $3)
    `, [roomId, playerId, room.current_players]);

    // ルームの現在のプレイヤー数を更新
    await db.query(
      'UPDATE game_rooms SET current_players = current_players + 1 WHERE id = $1',
      [roomId]
    );

    res.json({
      message: 'ルームに参加しました',
      roomId
    });
  } catch (error) {
    console.error('ルーム参加エラー:', error);
    res.status(500).json({ error: 'ルームへの参加に失敗しました' });
  }
});

// ルーム退出
router.post('/rooms/:roomId/leave', async (req: express.Request, res: express.Response) => {
  try {
    const { roomId } = req.params;
    const playerId = req.user!.id;

    const db = getDatabase();

    // プレイヤー削除
    const deleteResult = await db.query(
      'DELETE FROM room_players WHERE room_id = $1 AND player_id = $2',
      [roomId, playerId]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: 'このルームに参加していません' });
    }

    // ルームの現在のプレイヤー数を更新
    await db.query(
      'UPDATE game_rooms SET current_players = current_players - 1 WHERE id = $1',
      [roomId]
    );

    // ルームが空になった場合は削除
    const roomCheck = await db.query(
      'SELECT current_players FROM game_rooms WHERE id = $1',
      [roomId]
    );

    if (roomCheck.rows[0]?.current_players === 0) {
      await db.query('DELETE FROM game_rooms WHERE id = $1', [roomId]);
    }

    res.json({
      message: 'ルームから退出しました',
      roomId
    });
  } catch (error) {
    console.error('ルーム退出エラー:', error);
    res.status(500).json({ error: 'ルームからの退出に失敗しました' });
  }
});

export default router;
