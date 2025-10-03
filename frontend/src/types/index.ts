// ユーザー関連の型定義
export interface User {
  id: number;
  username: string;
  email?: string;
  rating: number;
  games_played: number;
  games_won: number;
  created_at: string;
  updated_at?: string;
  isGuest?: boolean;
}

// 認証関連の型定義
export interface AuthRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface GuestRequest {
  username: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

// カード関連の型定義
export interface Card {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'joker';
  rank: string;
  strength: number;
  id: string;
}

// ゲーム関連の型定義
export interface GamePlayer {
  id: number;
  username: string;
  cardsCount: number;
  isActive: boolean;
  rank?: number;
  playerOrder: number;
}

export interface GameState {
  gameId: string;
  gameState: 'waiting' | 'playing' | 'finished';
  players: GamePlayer[];
  currentPlayer?: number;
  fieldCards: Card[];
  fieldStrength: number;
  fieldCount: number;
  revolution: boolean;
  passCount: number;
  rankings: PlayerRanking[];
  gameHistory: GameAction[];
  playerCards?: Card[];
}

export interface PlayerRanking {
  playerId: number;
  username: string;
  rank: number;
  cardsLeft: number;
}

export interface GameAction {
  action: string;
  data: any;
  timestamp: string;
  currentPlayer?: number;
}

// ルーム関連の型定義
export interface GameRoom {
  id: number;
  room_name: string;
  host_id: number;
  max_players: number;
  current_players: number;
  status: 'waiting' | 'playing' | 'finished';
  game_settings: Record<string, any>;
  created_at: string;
  updated_at?: string;
  host_username?: string;
  players?: RoomPlayer[];
}

export interface RoomPlayer {
  id: number;
  username: string;
  rating: number;
  player_order: number;
}

export interface CreateRoomRequest {
  room_name: string;
  max_players?: number;
  game_settings?: Record<string, any>;
}

// Socket.IO関連の型定義
export interface SocketEvents {
  // 認証
  authenticate: (data: { token: string }) => void;
  authenticated: (data: { user: User; message: string }) => void;
  auth_error: (data: { message: string }) => void;

  // ロビー
  join_lobby: () => void;
  leave_lobby: () => void;
  lobby_joined: (data: { message: string }) => void;
  user_joined_lobby: (data: { userId: number; username: string }) => void;
  user_left_lobby: (data: { userId: number; username: string }) => void;

  // ルーム
  join_room: (data: { roomId: number }) => void;
  leave_room: (data: { roomId: number }) => void;
  room_joined: (data: { roomId: number; message: string }) => void;
  room_left: (data: { roomId: number; message: string }) => void;
  user_joined_room: (data: { userId: number; username: string; roomId: number }) => void;
  user_left_room: (data: { userId: number; username: string; roomId: number }) => void;
  room_state_updated: (data: { room: GameRoom }) => void;

  // ゲーム
  join_game: (data: { gameId: string }) => void;
  play_cards: (data: { gameId: string; cards: Card[] }) => void;
  pass: (data: { gameId: string }) => void;
  game_joined: (data: { gameId: string; gameState: GameState; playerCards: Card[] }) => void;
  game_state_updated: (data: { gameId: string; gameState: GameState }) => void;
  game_ended: (data: { gameId: string; rankings: PlayerRanking[] }) => void;
  user_left_game: (data: { userId: number; username: string; gameId: string }) => void;

  // エラー
  error: (data: { message: string }) => void;
  play_error: (data: { message: string }) => void;
  pass_error: (data: { message: string }) => void;

  // 接続状態
  connection_status: (data: { connected: boolean }) => void;
}
