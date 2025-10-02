import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../container/DIContainer';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest, RegisterRequest, GuestRequest, AuthResponse } from '../types';

const router = express.Router();

// ユーザー登録
router.post('/register', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { username, email, password }: RegisterRequest = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: '必要な情報が不足しています' });
      return;
    }

    const db = getDatabase();

    // ユーザー名とメールの重複チェック
    const existingUser = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      res.status(409).json({ error: 'ユーザー名またはメールアドレスが既に使用されています' });
      return;
    }

    // パスワードハッシュ化
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ユーザー作成
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, rating, games_played, games_won) 
       VALUES ($1, $2, $3, 1000, 0, 0) 
       RETURNING id, username, email, rating, games_played, games_won, created_at`,
      [username, email, hashedPassword]
    );

    const user = result.rows[0];

    // JWT生成
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    const response: AuthResponse = {
      message: 'ユーザー登録が完了しました',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        rating: user.rating,
        games_played: user.games_played,
        games_won: user.games_won,
        created_at: user.created_at
      },
      token
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('ユーザー登録エラー:', error);
    res.status(500).json({ error: 'ユーザー登録に失敗しました' });
  }
});

// ログイン
router.post('/login', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { username, password }: AuthRequest = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'ユーザー名とパスワードが必要です' });
      return;
    }

    const db = getDatabase();

    // ユーザー検索
    const result = await db.query(
      'SELECT id, username, email, password_hash, rating, games_played, games_won, created_at FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'ユーザー名またはパスワードが間違っています' });
      return;
    }

    const user = result.rows[0];

    // パスワード確認
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'ユーザー名またはパスワードが間違っています' });
      return;
    }

    // JWT生成
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    const response: AuthResponse = {
      message: 'ログインしました',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        rating: user.rating,
        games_played: user.games_played,
        games_won: user.games_won,
        created_at: user.created_at
      },
      token
    };

    res.json(response);
  } catch (error) {
    console.error('ログインエラー:', error);
    res.status(500).json({ error: 'ログインに失敗しました' });
  }
});

// ゲストログイン
router.post('/guest', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { username }: GuestRequest = req.body;

    if (!username) {
      res.status(400).json({ error: 'ユーザー名が必要です' });
      return ;
    }

    const db = getDatabase();

    // ゲストユーザー名の重複チェック
    const existingUser = await db.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      res.status(409).json({ error: 'このユーザー名は既に使用されています' });
      return;
    }

    // ゲストユーザー作成
    const result = await db.query(
      `INSERT INTO users (username, rating, games_played, games_won) 
       VALUES ($1, 1000, 0, 0) 
       RETURNING id, username, rating, games_played, games_won, created_at`,
      [username]
    );

    const user = result.rows[0];

    // JWT生成
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' } // ゲストは24時間
    );

    const response: AuthResponse = {
      message: 'ゲストログインしました',
      user: {
        id: user.id,
        username: user.username,
        rating: user.rating,
        games_played: user.games_played,
        games_won: user.games_won,
        created_at: user.created_at
      },
      token
    };

    res.json(response);
  } catch (error) {
    console.error('ゲストログインエラー:', error);
    res.status(500).json({ error: 'ゲストログインに失敗しました' });
  }
});

// トークン検証
router.get('/verify', authenticateToken, (req: express.Request, res: express.Response) => {
  res.json({
    message: 'トークンは有効です',
    user: req.user
  });
});

export default router;
