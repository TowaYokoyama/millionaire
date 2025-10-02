import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../container/DIContainer';
import { SocketAuth, SocketUser } from '../types';

// 接続中のユーザーを管理
const connectedUsers = new Map<string, SocketUser>();

export default function socketHandler(io: SocketIOServer, socket: Socket): void {
  console.log('新しいSocket接続:', socket.id);

  // 認証
  socket.on('authenticate', async (data: SocketAuth) => {
    try {
      const { token } = data;
      
      if (!token) {
        socket.emit('auth_error', { error: 'トークンが必要です' });
        return;
      }

      // JWT検証
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number; username: string };
      
      // ユーザー情報取得
      const db = getDatabase();
      const result = await db.query(
        'SELECT id, username, rating FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        socket.emit('auth_error', { error: 'ユーザーが見つかりません' });
        return;
      }

      const user = result.rows[0];
      const socketUser: SocketUser = {
        userId: user.id,
        username: user.username,
        userRating: user.rating
      };

      // ユーザーをソケットに関連付け
      socket.data.user = socketUser;
      connectedUsers.set(socket.id, socketUser);

      socket.emit('authenticated', { user: socketUser });
      console.log(`ユーザー認証成功: ${user.username} (${socket.id})`);

    } catch (error) {
      console.error('Socket認証エラー:', error);
      socket.emit('auth_error', { error: '認証に失敗しました' });
    }
  });

  // ルーム参加
  socket.on('join_room', (data: { roomId: string }) => {
    const { roomId } = data;
    const user = socket.data.user as SocketUser;

    if (!user) {
      socket.emit('error', { error: '認証が必要です' });
      return;
    }

    socket.join(`room_${roomId}`);
    socket.to(`room_${roomId}`).emit('user_joined', {
      userId: user.userId,
      username: user.username
    });

    console.log(`${user.username} がルーム ${roomId} に参加しました`);
  });

  // ルーム退出
  socket.on('leave_room', (data: { roomId: string }) => {
    const { roomId } = data;
    const user = socket.data.user as SocketUser;

    if (!user) {
      return;
    }

    socket.leave(`room_${roomId}`);
    socket.to(`room_${roomId}`).emit('user_left', {
      userId: user.userId,
      username: user.username
    });

    console.log(`${user.username} がルーム ${roomId} から退出しました`);
  });

  // ゲーム開始
  socket.on('start_game', (data: { roomId: string }) => {
    const { roomId } = data;
    const user = socket.data.user as SocketUser;

    if (!user) {
      socket.emit('error', { error: '認証が必要です' });
      return;
    }

    // TODO: GameEngineでゲーム開始処理
    io.to(`room_${roomId}`).emit('game_started', {
      gameId: `game_${roomId}_${Date.now()}`,
      startedBy: user.username
    });

    console.log(`${user.username} がルーム ${roomId} でゲームを開始しました`);
  });

  // カードプレイ
  socket.on('play_cards', (data: { gameId: string; cards: any[] }) => {
    const { gameId, cards } = data;
    const user = socket.data.user as SocketUser;

    if (!user) {
      socket.emit('error', { error: '認証が必要です' });
      return;
    }

    // TODO: GameEngineでカードプレイ処理
    socket.to(`game_${gameId}`).emit('cards_played', {
      playerId: user.userId,
      username: user.username,
      cards
    });

    console.log(`${user.username} がカードをプレイしました:`, cards);
  });

  // パス
  socket.on('pass_turn', (data: { gameId: string }) => {
    const { gameId } = data;
    const user = socket.data.user as SocketUser;

    if (!user) {
      socket.emit('error', { error: '認証が必要です' });
      return;
    }

    // TODO: GameEngineでパス処理
    socket.to(`game_${gameId}`).emit('player_passed', {
      playerId: user.userId,
      username: user.username
    });

    console.log(`${user.username} がパスしました`);
  });

  // チャットメッセージ
  socket.on('chat_message', (data: { roomId: string; message: string }) => {
    const { roomId, message } = data;
    const user = socket.data.user as SocketUser;

    if (!user) {
      socket.emit('error', { error: '認証が必要です' });
      return;
    }

    if (!message || message.trim().length === 0) {
      return;
    }

    const chatMessage = {
      userId: user.userId,
      username: user.username,
      message: message.trim(),
      timestamp: new Date().toISOString()
    };

    io.to(`room_${roomId}`).emit('chat_message', chatMessage);
    console.log(`チャット [${roomId}] ${user.username}: ${message}`);
  });

  // 切断処理
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      console.log(`ユーザー切断: ${user.username} (${socket.id})`);
      connectedUsers.delete(socket.id);
    } else {
      console.log(`未認証ユーザー切断: ${socket.id}`);
    }
  });

  // エラーハンドリング
  socket.on('error', (error) => {
    console.error('Socket エラー:', error);
  });
}
