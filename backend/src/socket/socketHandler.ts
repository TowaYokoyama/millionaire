import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../container/DIContainer';
import { SocketAuth, SocketUser } from '../types';
import { GameEngine } from '../game/GameEngine';

// 接続中のユーザーを管理
const connectedUsers = new Map<string, SocketUser>();

// ゲームエンジンのインスタンスを管理
const activeGames = new Map<string, GameEngine>();

export default function socketHandler(io: SocketIOServer, socket: Socket): void {
  console.log('新しいSocket接続:', socket.id);

  // Socket接続時に自動認証
  const authenticateSocket = async () => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        console.log('Socket認証トークンなし:', socket.id);
        return;
      }

      // JWT検証
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number; username: string };
      
      // ユーザー情報取得
      const db = getDatabase();
      const result = await db.query(
        'SELECT id, username, rating FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (result.length === 0) {
        console.log('Socket認証: ユーザーが見つかりません');
        return;
      }

      const user = result[0];
      const socketUser: SocketUser = {
        userId: user.id,
        username: user.username,
        userRating: user.rating
      };

      // ユーザーをソケットに関連付け
      socket.data.user = socketUser;
      connectedUsers.set(socket.id, socketUser);

      console.log(`Socket自動認証成功: ${user.username} (${socket.id})`);
      socket.emit('authenticated', { user: socketUser });
    } catch (error) {
      console.error('Socket自動認証エラー:', error);
    }
  };

  // 接続時に自動認証を実行
  authenticateSocket();

  // 認証（手動認証用に残す）
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
        'SELECT id, username, rating FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (result.length === 0) {
        socket.emit('auth_error', { error: 'ユーザーが見つかりません' });
        return;
      }

      const user = result[0];
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

  // ゲーム参加
  socket.on('join_game', async (data: { gameId: string }) => {
    const { gameId } = data;
    const user = socket.data.user as SocketUser;

    if (!user) {
      socket.emit('error', { error: '認証が必要です' });
      return;
    }

    try {
      const db = getDatabase();
      
      // gameIdからroomIdを抽出（"game_7" -> "7"）
      const roomId = gameId.replace('game_', '');
      
      console.log(`${user.username} がゲーム ${gameId} に参加しようとしています`);
      
      // ルーム情報とプレイヤーを取得
      const roomPlayers = await db.query(`
        SELECT u.id, u.username, u.rating, rp.player_order
        FROM room_players rp
        JOIN users u ON rp.player_id = u.id
        WHERE rp.room_id = ?
        ORDER BY rp.player_order
      `, [roomId]);

      if (roomPlayers.length < 2) {
        socket.emit('error', { error: 'ゲーム開始には最低2人必要です' });
        return;
      }

      // ゲームエンジンがまだ存在しない場合は作成
      let game = activeGames.get(gameId);
      if (!game) {
        console.log(`新しいゲーム ${gameId} を作成します`);
        game = new GameEngine();
        
        // プレイヤーデータを準備
        const players = roomPlayers.map(player => ({
          id: player.id,
          username: player.username,
          rating: player.rating
        }));
        
        // ゲームを初期化（カード配布も含む）
        game.initializeGame(players);
        activeGames.set(gameId, game);
        
        console.log(`ゲーム ${gameId} を開始しました。プレイヤー数: ${roomPlayers.length}`);
      }

      // プレイヤーをゲームルームに参加させる
      socket.join(`game_${gameId}`);
      
      // ゲーム状態を送信
      const gameState = game.getGameState();
      const playerCards = game.getPlayerCards(user.userId);
      
      console.log(`ゲーム状態を送信: プレイヤー数=${gameState.players.length}, カード数=${playerCards.length}`);
      console.log(`ゲーム状態:`, JSON.stringify(gameState, null, 2));
      
      socket.emit('game_joined', {
        gameId,
        gameState,
        playerCards
      });

      console.log(`game_joinedイベントを送信しました`);

      // 他のプレイヤーにも通知
      socket.to(`game_${gameId}`).emit('user_joined_game', {
        userId: user.userId,
        username: user.username,
        gameId
      });

      console.log(`${user.username} がゲーム ${gameId} に参加しました`);
    } catch (error) {
      console.error('ゲーム参加エラー:', error);
      socket.emit('error', { error: 'ゲームへの参加に失敗しました' });
    }
  });

  // カードプレイ
  socket.on('play_cards', (data: { gameId: string; cards: any[] }) => {
    const { gameId, cards } = data;
    const user = socket.data.user as SocketUser;

    if (!user) {
      socket.emit('error', { error: '認証が必要です' });
      return;
    }

    try {
      const game = activeGames.get(gameId);
      if (!game) {
        socket.emit('play_error', { message: 'ゲームが見つかりません' });
        return;
      }

      // カードをプレイ
      const result = game.playCards(user.userId, cards);
      
      if (result.success) {
        // ゲーム状態を全員に送信
        const gameState = game.getGameState();
        io.to(`game_${gameId}`).emit('game_state_updated', {
          gameId,
          gameState
        });

        console.log(`${user.username} がカードをプレイしました:`, cards);
      } else {
        socket.emit('play_error', { message: result.error });
      }
    } catch (error) {
      console.error('カードプレイエラー:', error);
      socket.emit('play_error', { message: 'カードのプレイに失敗しました' });
    }
  });

  // パス
  socket.on('pass', (data: { gameId: string }) => {
    const { gameId } = data;
    const user = socket.data.user as SocketUser;

    if (!user) {
      socket.emit('error', { error: '認証が必要です' });
      return;
    }

    try {
      const game = activeGames.get(gameId);
      if (!game) {
        socket.emit('pass_error', { message: 'ゲームが見つかりません' });
        return;
      }

      // パス処理
      const result = game.pass(user.userId);
      
      if (result.success) {
        // ゲーム状態を全員に送信
        const gameState = game.getGameState();
        io.to(`game_${gameId}`).emit('game_state_updated', {
          gameId,
          gameState
        });

        console.log(`${user.username} がパスしました`);
      } else {
        socket.emit('pass_error', { message: result.error });
      }
    } catch (error) {
      console.error('パスエラー:', error);
      socket.emit('pass_error', { message: 'パスに失敗しました' });
    }
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
