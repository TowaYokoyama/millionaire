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
      rooms: result
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
    const roomResult = await db.run(`
      INSERT INTO game_rooms (room_name, host_id, max_players, current_players, status, game_settings)
      VALUES (?, ?, ?, 1, 'waiting', ?)
    `, [room_name, hostId, max_players, JSON.stringify(game_settings)]);

    const roomId = roomResult.lastID!;

    // 作成されたルーム情報を取得
    const room = await db.query(`
      SELECT r.*, u.username as host_username, 1 as current_players
      FROM game_rooms r
      LEFT JOIN users u ON r.host_id = u.id
      WHERE r.id = ?
    `, [roomId]);

    // ホストをプレイヤーとして追加
    await db.run(`
      INSERT INTO room_players (room_id, player_id, player_order)
      VALUES (?, ?, 0)
    `, [roomId, hostId]);

    // CPUプレイヤーを追加（設定されている場合）
    if (game_settings.addCpuPlayers) {
      try {
        const cpuCount = Math.min(max_players - 1, 3); // 最大3体のCPU
        const timestamp = Date.now();
        
        for (let i = 1; i <= cpuCount; i++) {
          // 一意のCPUユーザー名を生成
          const cpuName = `CPU_${timestamp}_${i}`;
          
          // CPUユーザーを作成
          const cpuResult = await db.run(`
            INSERT INTO users (username, password_hash, rating, games_played, games_won)
            VALUES (?, 'cpu_dummy_hash', 1000, 0, 0)
          `, [cpuName]);

          console.log(`CPU ${cpuName} を作成しました (ID: ${cpuResult.lastID})`);

          // CPUをルームに追加
          await db.run(`
            INSERT INTO room_players (room_id, player_id, player_order)
            VALUES (?, ?, ?)
          `, [roomId, cpuResult.lastID, i]);

          // ルームの現在のプレイヤー数を更新
          await db.run(
            'UPDATE game_rooms SET current_players = current_players + 1 WHERE id = ?',
            [roomId]
          );
        }
        
        console.log(`${cpuCount}体のCPUプレイヤーをルーム ${roomId} に追加しました`);
      } catch (cpuError) {
        console.error('CPUプレイヤー追加エラー:', cpuError);
        // CPU追加に失敗してもルーム作成は続行
      }
    }

    res.status(201).json({
      message: 'ルームを作成しました',
      room: room[0]
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
      'SELECT * FROM game_rooms WHERE id = ? AND status = ?',
      [roomId, 'waiting']
    );

    if (roomResult.length === 0) {
      return res.status(404).json({ error: 'ルームが見つからないか、既に開始されています' });
    }

    const room = roomResult[0];

    // 既に参加しているかチェック
    const existingPlayer = await db.query(
      'SELECT id FROM room_players WHERE room_id = ? AND player_id = ?',
      [roomId, playerId]
    );

    if (existingPlayer.length > 0) {
      return res.status(409).json({ error: '既にこのルームに参加しています' });
    }

    // 定員チェック
    if (room.current_players >= room.max_players) {
      return res.status(409).json({ error: 'ルームが満員です' });
    }

    // プレイヤー追加
    await db.run(`
      INSERT INTO room_players (room_id, player_id, player_order)
      VALUES (?, ?, ?)
    `, [roomId, playerId, room.current_players]);

    // ルームの現在のプレイヤー数を更新
    await db.run(
      'UPDATE game_rooms SET current_players = current_players + 1 WHERE id = ?',
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
    const deleteResult = await db.run(
      'DELETE FROM room_players WHERE room_id = ? AND player_id = ?',
      [roomId, playerId]
    );

    if (deleteResult.changes === 0) {
      return res.status(404).json({ error: 'このルームに参加していません' });
    }

    // ルームの現在のプレイヤー数を更新
    await db.run(
      'UPDATE game_rooms SET current_players = current_players - 1 WHERE id = ?',
      [roomId]
    );

    // ルームが空になった場合は削除
    const roomCheck = await db.query(
      'SELECT current_players FROM game_rooms WHERE id = ?',
      [roomId]
    );

    if (roomCheck[0]?.current_players === 0) {
      await db.run('DELETE FROM game_rooms WHERE id = ?', [roomId]);
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

// ゲーム開始
router.post('/rooms/:roomId/start', async (req: express.Request, res: express.Response) => {
  try {
    const { roomId } = req.params;
    const hostId = req.user!.id;

    console.log(`ゲーム開始リクエスト - ルームID: ${roomId}, ホストID: ${hostId}`);

    const db = getDatabase();

    // ルーム存在確認とホスト権限チェック
    const roomResult = await db.query(
      'SELECT * FROM game_rooms WHERE id = ? AND host_id = ? AND status = ?',
      [roomId, hostId, 'waiting']
    );

    console.log(`ルーム検索結果: ${roomResult.length}件`);
    if (roomResult.length > 0) {
      console.log(`ルーム情報: ID=${roomResult[0].id}, ホスト=${roomResult[0].host_id}, 状態=${roomResult[0].status}`);
    }

    if (roomResult.length === 0) {
      return res.status(404).json({ error: 'ルームが見つからないか、開始権限がありません' });
    }

    const room = roomResult[0];

    // 最低2人以上必要（CPUプレイヤーがいる場合は1人でも可）
    const cpuPlayersResult = await db.query(
      'SELECT COUNT(*) as count FROM room_players rp JOIN users u ON rp.player_id = u.id WHERE rp.room_id = ? AND u.username LIKE "CPU_%"',
      [roomId]
    );
    
    const cpuCount = cpuPlayersResult[0].count;
    console.log(`ルーム ${roomId} のCPU数: ${cpuCount}, 合計プレイヤー数: ${room.current_players}`);
    
    const minPlayers = cpuCount > 0 ? 1 : 2;
    
    if (room.current_players < minPlayers) {
      return res.status(400).json({ 
        error: cpuCount > 0 
          ? 'CPUプレイヤーがいる場合でも最低1人必要です' 
          : 'ゲーム開始には最低2人必要です' 
      });
    }

    // ルーム状態をゲーム中に変更
    await db.run(
      'UPDATE game_rooms SET status = ? WHERE id = ?',
      ['playing', roomId]
    );

    res.json({
      message: 'ゲームを開始しました',
      roomId: parseInt(roomId as string)
    });
  } catch (error) {
    console.error('ゲーム開始エラー:', error);
    res.status(500).json({ error: 'ゲームの開始に失敗しました' });
  }
});

export default router;
