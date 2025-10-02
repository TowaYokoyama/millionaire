import { io, Socket } from 'socket.io-client';
import { SocketEvents, GameState, Card, GameRoom, PlayerRanking } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private listeners: Map<string, Function[]> = new Map();

  // Socket接続
  connect(token: string): void {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io('http://localhost:3000', {
      auth: {
        token: token
      },
      transports: ['websocket']
    });

    this.setupEventListeners();
  }

  // イベントリスナー設定
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket接続成功');
      this.isConnected = true;
      this.emit('connection_status', { connected: true });
    });

    this.socket.on('disconnect', () => {
      console.log('Socket接続切断');
      this.isConnected = false;
      this.emit('connection_status', { connected: false });
    });

    this.socket.on('authenticated', (data: { user: any; message: string }) => {
      console.log('認証成功:', data);
      this.emit('authenticated', data);
    });

    this.socket.on('auth_error', (data: { message: string }) => {
      console.error('認証エラー:', data);
      this.emit('auth_error', data);
    });

    // ロビー関連イベント
    this.socket.on('lobby_joined', (data: { message: string }) => {
      this.emit('lobby_joined', data);
    });

    this.socket.on('user_joined_lobby', (data: { userId: number; username: string }) => {
      this.emit('user_joined_lobby', data);
    });

    this.socket.on('user_left_lobby', (data: { userId: number; username: string }) => {
      this.emit('user_left_lobby', data);
    });

    // ルーム関連イベント
    this.socket.on('room_joined', (data: { roomId: number; message: string }) => {
      this.emit('room_joined', data);
    });

    this.socket.on('room_left', (data: { roomId: number; message: string }) => {
      this.emit('room_left', data);
    });

    this.socket.on('user_joined_room', (data: { userId: number; username: string; roomId: number }) => {
      this.emit('user_joined_room', data);
    });

    this.socket.on('user_left_room', (data: { userId: number; username: string; roomId: number }) => {
      this.emit('user_left_room', data);
    });

    this.socket.on('room_state_updated', (data: { room: GameRoom }) => {
      this.emit('room_state_updated', data);
    });

    // ゲーム関連イベント
    this.socket.on('game_joined', (data: { gameId: string; gameState: GameState; playerCards: Card[] }) => {
      this.emit('game_joined', data);
    });

    this.socket.on('user_left_game', (data: { userId: number; username: string; gameId: string }) => {
      this.emit('user_left_game', data);
    });

    this.socket.on('game_state_updated', (data: { gameId: string; gameState: GameState }) => {
      this.emit('game_state_updated', data);
    });

    this.socket.on('game_ended', (data: { gameId: string; rankings: PlayerRanking[] }) => {
      this.emit('game_ended', data);
    });

    // エラーイベント
    this.socket.on('error', (data: { message: string }) => {
      this.emit('error', data);
    });

    this.socket.on('play_error', (data: { message: string }) => {
      this.emit('play_error', data);
    });

    this.socket.on('pass_error', (data: { message: string }) => {
      this.emit('pass_error', data);
    });
  }

  // イベントリスナー追加
  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  // イベントリスナー削除
  off<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // イベント発火
  private emit<K extends keyof SocketEvents>(event: K, data: Parameters<SocketEvents[K]>[0]): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        callback(data);
      });
    }
  }

  // ロビー参加
  joinLobby(): void {
    if (this.socket) {
      this.socket.emit('join_lobby');
    }
  }

  // ロビー退出
  leaveLobby(): void {
    if (this.socket) {
      this.socket.emit('leave_lobby');
    }
  }

  // ルーム参加
  joinRoom(roomId: number): void {
    if (this.socket) {
      this.socket.emit('join_room', { roomId });
    }
  }

  // ルーム退出
  leaveRoom(roomId: number): void {
    if (this.socket) {
      this.socket.emit('leave_room', { roomId });
    }
  }

  // ゲーム参加
  joinGame(gameId: string): void {
    if (this.socket) {
      this.socket.emit('join_game', { gameId });
    }
  }

  // カードを出す
  playCards(gameId: string, cards: Card[]): void {
    if (this.socket) {
      this.socket.emit('play_cards', { gameId, cards });
    }
  }

  // パス
  pass(gameId: string): void {
    if (this.socket) {
      this.socket.emit('pass', { gameId });
    }
  }

  // 接続切断
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  // 接続状態取得
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const socketService = new SocketService();
export { SocketService };
