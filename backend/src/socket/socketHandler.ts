import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../container/DIContainer';
import { SocketAuth, SocketUser } from '../types';
import { GameEngine } from '../game/GameEngine';

// 接続中のユーザーを管理
const connectedUsers = new Map<string, SocketUser>();

// ゲームエンジンのインスタンスを管理
const activeGames = new Map<string, GameEngine>();

// CPU自動プレイ実行関数
function executeCPUTurns(gameId: string, gameInstance: GameEngine, io: SocketIOServer) {
  // activeGamesから最新のゲームインスタンスを取得
  const game = activeGames.get(gameId) || gameInstance;
  
  if (!game) {
    console.error(`executeCPUTurns: ゲームが見つかりません (gameId: ${gameId})`);
    console.log(`activeGames:`, Array.from(activeGames.keys()));
    return;
  }
  
  const currentPlayer = game.getCurrentPlayer();
  
  if (!currentPlayer || !game.isCPUPlayer(currentPlayer.id)) {
    // CPUプレイヤーではない場合は何もしない
    console.log(`現在のプレイヤー ${currentPlayer?.username || '不明'} はCPUではありません`);
    return;
  }

  console.log(`CPUプレイヤー ${currentPlayer.username} のターンを実行します (gameId: ${gameId})`);
  
  const result = game.executeCPUTurn();
  
  if (result.success) {
    const gameState = game.getGameState();
    console.log(`CPU実行後のゲーム状態を送信: gameId=${gameId}`);
    
    // 各プレイヤーに個別にカード情報を含めて送信
    io.in(gameId).fetchSockets().then(socketsInRoom => {
      for (const socketInRoom of socketsInRoom) {
        const socketUser = socketInRoom.data.user as SocketUser;
        if (socketUser) {
          const playerCards = game.getPlayerCards(socketUser.userId);
          socketInRoom.emit('game_state_updated', {
            gameId: gameId,
            gameState: {
              ...gameState,
              players: gameState.players.map(p => 
                p.id === socketUser.userId ? { ...p, cards: playerCards } : p
              )
            }
          });
        }
      }
      
      // ゲーム終了チェック
      if (gameState.gameState === 'finished') {
        console.log('CPUターン後にゲームが終了しました。結果を送信します:', gameState.rankings);
        io.in(gameId).emit('game_ended', {
          gameId,
          rankings: gameState.rankings
        });
        // ゲームをactiveGamesから削除
        activeGames.delete(gameId);
      } else if (gameState.gameState === 'card_exchange') {
        // カード交換フェーズに入った場合
        console.log('CPUターン後にラウンド終了。カード交換を自動実行中...');
        setTimeout(() => monitorRoundTransition(gameId, game, io), 2500);
      }
    });

    if (result.action === 'play') {
      console.log(`CPU ${currentPlayer.username} がカードをプレイしました:`, result.cards);
    } else {
      console.log(`CPU ${currentPlayer.username} がパスしました`);
    }

    // ゲームが終了していない場合のみ次のプレイヤーを実行
    const updatedGameState = game.getGameState();
    if (updatedGameState.gameState !== 'finished') {
      // 次のプレイヤーもCPUの場合は連続実行
      setTimeout(() => executeCPUTurns(gameId, game, io), 1500);
    }
  } else {
    console.log(`CPU ${currentPlayer.username} のターン実行に失敗しました`);
  }
}

// ラウンド終了後の自動処理を監視
function monitorRoundTransition(gameId: string, gameInstance: GameEngine, io: SocketIOServer) {
  const game = activeGames.get(gameId) || gameInstance;
  
  if (!game) {
    return;
  }

  const gameState = game.getGameState();
  
  // カード交換フェーズからplayingに移行したかチェック
  if (gameState.gameState === 'playing') {
    console.log('カード交換完了。次のラウンドが開始されました');
    
    // ゲーム状態を全員に送信
    io.in(gameId).fetchSockets().then(socketsInRoom => {
      for (const socketInRoom of socketsInRoom) {
        const socketUser = socketInRoom.data.user as SocketUser;
        if (socketUser) {
          const playerCards = game.getPlayerCards(socketUser.userId);
          socketInRoom.emit('game_state_updated', {
            gameId: gameId,
            gameState: {
              ...gameState,
              players: gameState.players.map(p => 
                p.id === socketUser.userId ? { ...p, cards: playerCards } : p
              )
            }
          });
        }
      }
    });
    
    // CPUのターンを実行
    setTimeout(() => executeCPUTurns(gameId, game, io), 1500);
  }
}

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
        
        // ルーム情報を取得してゲーム設定を取得
        const roomInfo = await db.query(
          'SELECT game_settings FROM game_rooms WHERE id = ?',
          [roomId]
        );
        
        let gameSettings = {};
        if (roomInfo.length > 0 && roomInfo[0].game_settings) {
          try {
            gameSettings = JSON.parse(roomInfo[0].game_settings);
          } catch (e) {
            console.error('ゲーム設定のパースエラー:', e);
          }
        }
        
        // プレイヤーデータを準備
        const players = roomPlayers.map(player => ({
          id: player.id,
          username: player.username,
          rating: player.rating
        }));
        
        // ゲームを初期化（カード配布も含む）
        game.initializeGame(players, gameSettings);
        activeGames.set(gameId, game);
        
        console.log(`ゲーム ${gameId} を開始しました。プレイヤー数: ${roomPlayers.length}`);
        console.log(`ゲーム設定:`, gameSettings);
      }

      // プレイヤーをゲームルームに参加させる（gameIdには既にgame_プレフィックスが含まれている）
      socket.join(gameId);
      
      // ゲーム状態を送信
      const gameState = game.getGameState();
      const playerCards = game.getPlayerCards(user.userId);
      
      console.log(`ゲーム状態を送信: プレイヤー数=${gameState.players.length}, カード数=${playerCards.length}`);
      console.log(`activeGamesに保存されているgameId: ${gameId}`);
      console.log(`ゲーム状態:`, JSON.stringify(gameState, null, 2));
      
      socket.emit('game_joined', {
        gameId,
        gameState,
        playerCards
      });

      console.log(`game_joinedイベントを送信しました`);

      // 他のプレイヤーにも通知
      socket.to(gameId).emit('user_joined_game', {
        userId: user.userId,
        username: user.username,
        gameId
      });

      console.log(`${user.username} がゲーム ${gameId} に参加しました`);
      
      // ゲーム開始時、最初のプレイヤーがCPUの場合は自動実行
      setTimeout(() => executeCPUTurns(gameId, game, io), 2000);
    } catch (error) {
      console.error('ゲーム参加エラー:', error);
      socket.emit('error', { error: 'ゲームへの参加に失敗しました' });
    }
  });

  // カードプレイ
  socket.on('play_cards', async (data: { gameId: string; cards: any[] }) => {
    const { gameId, cards } = data;
    const user = socket.data.user as SocketUser;

    console.log(`play_cardsイベント受信: gameId=${gameId}, user=${user?.username}`);
    console.log(`現在のactiveGames:`, Array.from(activeGames.keys()));

    if (!user) {
      socket.emit('error', { error: '認証が必要です' });
      return;
    }

    try {
      const game = activeGames.get(gameId);
      if (!game) {
        console.error(`ゲームが見つかりません: ${gameId}`);
        console.log(`利用可能なゲームID:`, Array.from(activeGames.keys()));
        socket.emit('play_error', { message: 'ゲームが見つかりません' });
        return;
      }

      // カードをプレイ
      const result = game.playCards(user.userId, cards);
      
      if (result.success) {
        // ゲーム状態を全員に送信（gameIdには既にgame_プレフィックスが含まれている）
        const gameState = game.getGameState();
        
        // 各プレイヤーに個別にカード情報を含めて送信
        const socketsInRoom = await io.in(gameId).fetchSockets();
        for (const socketInRoom of socketsInRoom) {
          const socketUser = socketInRoom.data.user as SocketUser;
          if (socketUser) {
            const playerCards = game.getPlayerCards(socketUser.userId);
            socketInRoom.emit('game_state_updated', {
              gameId,
              gameState: {
                ...gameState,
                players: gameState.players.map(p => 
                  p.id === socketUser.userId ? { ...p, cards: playerCards } : p
                )
              }
            });
          }
        }

        console.log(`${user.username} がカードをプレイしました:`, cards);
        
        // ゲーム終了チェック
        if (gameState.gameState === 'finished') {
          console.log('ゲームが終了しました。結果を送信します:', gameState.rankings);
          io.in(gameId).emit('game_ended', {
            gameId,
            rankings: gameState.rankings
          });
          // ゲームをactiveGamesから削除
          activeGames.delete(gameId);
        } else if (gameState.gameState === 'card_exchange') {
          // カード交換フェーズに入った場合、自動的に次のラウンドが開始されるまで待機
          console.log('ラウンド終了。カード交換を自動実行中...');
          setTimeout(() => monitorRoundTransition(gameId, game, io), 2500);
        } else {
          // CPUのターンを自動実行
          setTimeout(() => executeCPUTurns(gameId, game, io), 1500);
        }
      } else {
        socket.emit('play_error', { message: result.error });
      }
    } catch (error) {
      console.error('カードプレイエラー:', error);
      socket.emit('play_error', { message: 'カードのプレイに失敗しました' });
    }
  });

  // パス
  socket.on('pass', async (data: { gameId: string }) => {
    const { gameId } = data;
    const user = socket.data.user as SocketUser;

    console.log(`passイベント受信: gameId=${gameId}, user=${user?.username}`);
    console.log(`現在のactiveGames:`, Array.from(activeGames.keys()));

    if (!user) {
      socket.emit('error', { error: '認証が必要です' });
      return;
    }

    try {
      const game = activeGames.get(gameId);
      if (!game) {
        console.error(`ゲームが見つかりません: ${gameId}`);
        console.log(`利用可能なゲームID:`, Array.from(activeGames.keys()));
        socket.emit('pass_error', { message: 'ゲームが見つかりません' });
        return;
      }

      // パス処理
      const result = game.pass(user.userId);
      
      if (result.success) {
        // ゲーム状態を全員に送信（gameIdには既にgame_プレフィックスが含まれている）
        const gameState = game.getGameState();
        
        // 各プレイヤーに個別にカード情報を含めて送信
        const socketsInRoom = await io.in(gameId).fetchSockets();
        for (const socketInRoom of socketsInRoom) {
          const socketUser = socketInRoom.data.user as SocketUser;
          if (socketUser) {
            const playerCards = game.getPlayerCards(socketUser.userId);
            socketInRoom.emit('game_state_updated', {
              gameId,
              gameState: {
                ...gameState,
                players: gameState.players.map(p => 
                  p.id === socketUser.userId ? { ...p, cards: playerCards } : p
                )
              }
            });
          }
        }

        console.log(`${user.username} がパスしました`);
        
        // ゲーム終了チェック
        if (gameState.gameState === 'finished') {
          console.log('ゲームが終了しました。結果を送信します:', gameState.rankings);
          io.in(gameId).emit('game_ended', {
            gameId,
            rankings: gameState.rankings
          });
          // ゲームをactiveGamesから削除
          activeGames.delete(gameId);
        } else if (gameState.gameState === 'card_exchange') {
          // カード交換フェーズに入った場合、自動的に次のラウンドが開始されるまで待機
          console.log('ラウンド終了。カード交換を自動実行中...');
          setTimeout(() => monitorRoundTransition(gameId, game, io), 2500);
        } else {
          // CPUのターンを自動実行
          setTimeout(() => executeCPUTurns(gameId, game, io), 1500);
        }
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
