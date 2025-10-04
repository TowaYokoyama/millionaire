// ユーザー関連の型定義
export interface User {
  id: number;
  username: string;
  email?: string;
  password_hash?: string;
  avatar_url?: string;
  rating: number;
  games_played: number;
  games_won: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: number;
  userId: number;
  username: string;
  email?: string;
  rating: number;
  games_played: number;
  games_won: number;
  created_at: string;
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
  user: UserProfile;
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
  rating: number;
  playerOrder: number;
  cards: Card[];
  isActive: boolean;
  rank?: number | undefined;
}

export interface GameState {
  gameId: string;
  gameState: 'waiting' | 'playing' | 'finished';
  players: GamePlayerInfo[];
  currentPlayer?: number | undefined;
  fieldCards: Card[];
  fieldStrength: number;
  fieldCount: number;
  revolution: boolean;
  passCount: number;
  rankings: PlayerRanking[];
  gameHistory: GameAction[];
  playerCards?: Card[];
}

export interface GamePlayerInfo {
  id: number;
  username: string;
  cardsCount: number;
  isActive: boolean;
  rank?: number | undefined;
  playerOrder: number;
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
  currentPlayer?: number | undefined;
}

// ルーム関連の型定義
export interface GameRoom {
  id: number;
  room_name: string;
  description?: string;
  host_id: number;
  max_players: number;
  current_players: number;
  is_private: number;
  password?: string;
  status: 'waiting' | 'playing' | 'finished';
  game_settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  host_username?: string;
  players?: RoomPlayer[];
}

export interface RoomPlayer {
  id: number;
  username: string;
  rating: number;
  player_order: number;
}

// ゲームルール設定
export interface GameRuleSettings {
  addCpuPlayers?: boolean;         // CPUプレイヤー追加
  enable8Cut?: boolean;           // 8切り
  enableRevolution?: boolean;      // 革命（4枚）
  enableSequence?: boolean;        // 階段
  enableSuit?: boolean;            // スートしばり
  enableJBack?: boolean;           // Jバック（11バック）
  enableKickback?: boolean;        // 5飛び/10捨て
  jokerKiller?: boolean;           // ジョーカー殺し（スペードの3）＝スぺ3返し
  enableShibari?: boolean;         // しばり
}

export interface CreateRoomRequest {
  room_name: string;
  description?: string;
  max_players?: number;
  is_private?: boolean;
  password?: string;
  game_settings?: GameRuleSettings;
}

export interface UpdateRoomRequest {
  room_name?: string;
  description?: string;
  max_players?: number;
  is_private?: boolean;
  password?: string;
}

export interface JoinRoomRequest {
  password?: string;
}

// Socket.IO関連の型定義
export interface SocketAuth {
  token: string;
}

export interface SocketUser {
  userId: number;
  username: string;
  userRating: number;
}

// API レスポンスの型定義
export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// ランキング関連の型定義
export interface RankingPlayer {
  id: number;
  username: string;
  rating: number;
  games_played: number;
  games_won: number;
  win_rate: number;
  rank_position: number;
}

// ゲーム履歴の型定義
export interface GameHistory {
  id: number;
  game_id: number;
  player_id: number;
  action_type: string;
  action_data: Record<string, any>;
  timestamp: string;
  username?: string;
}

// エラーの型定義
export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}
