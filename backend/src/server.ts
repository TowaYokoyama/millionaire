import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// 環境変数の読み込み
dotenv.config();

// DIコンテナの初期化
import { initializeContainer, getDatabase } from './container/DIContainer';
import { initializeDatabase } from './database/initDatabase';
initializeContainer();

// ルートの読み込み
import authRoutes from './routes/auth';
import gameRoutes from './routes/game';
import lobbyRoutes from './routes/lobby';
import userRoutes from './routes/user';

// データベース接続
const db = getDatabase();

// Socket.IO イベントハンドラー
import socketHandler from './socket/socketHandler';

const app = express();
const server = http.createServer(app);

// CORS設定
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true
};
app.use(cors(corsOptions));

// Socket.IO設定
const io = new SocketIOServer(server, {
  cors: corsOptions
});

// ミドルウェア
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, '../frontend/build')));

// API ルート
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/lobby', lobbyRoutes);
app.use('/api/user', userRoutes);

// Socket.IO接続処理
io.on('connection', (socket) => {
  console.log('新しいクライアントが接続しました:', socket.id);
  socketHandler(io, socket);
});

// エラーハンドリング
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'サーバーエラーが発生しました',
    message: process.env.NODE_ENV === 'development' ? err.message : '内部サーバーエラー'
  });
});

// 404ハンドリング
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'エンドポイントが見つかりません' });
});

const PORT = process.env.PORT || 3000;

// データベース接続確認とスキーマ初期化
initializeDatabase()
  .then(() => {
    console.log('データベースの初期化が完了しました');
    server.listen(PORT, () => {
      console.log(`サーバーがポート ${PORT} で起動しました`);
      console.log(`環境: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error('データベース初期化エラー:', err);
    process.exit(1);
  });

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('SIGTERMシグナルを受信しました');
  server.close(() => {
    console.log('HTTPサーバーを終了しました');
    db.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINTシグナルを受信しました');
  server.close(() => {
    console.log('HTTPサーバーを終了しました');
    db.close();
    process.exit(0);
  });
});

export { app, server, io };
