import express from 'express';
import { getDatabase } from '../container/DIContainer';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = express.Router();

// プロフィール取得（認証必要）
router.get('/profile', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    res.json({
      message: 'プロフィールを取得しました',
      user: req.user
    });
  } catch (error) {
    console.error('プロフィール取得エラー:', error);
    res.status(500).json({ error: 'プロフィールの取得に失敗しました' });
  }
});

// ランキング取得（認証オプショナル）
router.get('/ranking', optionalAuth, async (req: express.Request, res: express.Response) => {
  try {
    const db = getDatabase();
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await db.query(`
      SELECT 
        id, username, rating, games_played, games_won,
        CASE 
          WHEN games_played > 0 THEN ROUND((games_won::float / games_played::float) * 100, 1)
          ELSE 0 
        END as win_rate,
        ROW_NUMBER() OVER (ORDER BY rating DESC) as rank_position
      FROM users 
      WHERE games_played > 0
      ORDER BY rating DESC, games_won DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const totalResult = await db.query(
      'SELECT COUNT(*) as total FROM users WHERE games_played > 0'
    );

    res.json({
      message: 'ランキングを取得しました',
      data: result.rows,
      total: parseInt(totalResult.rows[0].total),
      limit,
      offset
    });
  } catch (error) {
    console.error('ランキング取得エラー:', error);
    res.status(500).json({ error: 'ランキングの取得に失敗しました' });
  }
});

// ユーザー統計取得
router.get('/stats/:userId', optionalAuth, async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    const db = getDatabase();

    const result = await db.query(`
      SELECT 
        id, username, rating, games_played, games_won,
        CASE 
          WHEN games_played > 0 THEN ROUND((games_won::float / games_played::float) * 100, 1)
          ELSE 0 
        END as win_rate,
        created_at
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    // ランキング順位を取得
    const rankResult = await db.query(`
      SELECT COUNT(*) + 1 as rank_position
      FROM users 
      WHERE rating > (SELECT rating FROM users WHERE id = $1)
      AND games_played > 0
    `, [userId]);

    const userStats = {
      ...result.rows[0],
      rank_position: parseInt(rankResult.rows[0].rank_position)
    };

    res.json({
      message: 'ユーザー統計を取得しました',
      user: userStats
    });
  } catch (error) {
    console.error('ユーザー統計取得エラー:', error);
    res.status(500).json({ error: 'ユーザー統計の取得に失敗しました' });
  }
});

export default router;
