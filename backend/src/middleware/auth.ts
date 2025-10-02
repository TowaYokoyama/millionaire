import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../container/DIContainer';
import { UserProfile } from '../types';

// Request型を拡張
declare global {
  namespace Express {
    interface Request {
      user?: UserProfile | undefined;
    }
  }
}

// JWT認証ミドルウェア
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'アクセストークンが必要です' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number; username: string };
    
    // ユーザー情報をデータベースから取得
    const db = getDatabase();
    const result = await db.query(
      'SELECT id, username, email, rating, games_played, games_won FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'ユーザーが見つかりません' });
      return;
    }

    req.user = result.rows[0] as UserProfile;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'トークンの有効期限が切れています' });
    } else if (err.name === 'JsonWebTokenError') {
      res.status(401).json({ error: '無効なトークンです' });
    } else {
      console.error('認証エラー:', err);
      res.status(500).json({ error: '認証処理でエラーが発生しました' });
    }
  }
};

// オプショナル認証（ログインしていなくてもアクセス可能）
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = undefined;
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number; username: string };
    const db = getDatabase();
    const result = await db.query(
      'SELECT id, username, email, rating, games_played, games_won FROM users WHERE id = $1',
      [decoded.userId]
    );

    req.user = result.rows.length > 0 ? result.rows[0] as UserProfile : undefined;
  } catch (err) {
    req.user = undefined;
  }

  next();
};

// 管理者権限チェック（将来の拡張用）
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || (req.user as any).role !== 'admin') {
    res.status(403).json({ error: '管理者権限が必要です' });
    return;
  }
  next();
};
