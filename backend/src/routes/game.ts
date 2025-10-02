import express from 'express';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 全てのルートで認証が必要
router.use(authenticateToken);

// ゲーム状態取得
router.get('/state/:gameId', async (req: express.Request, res: express.Response) => {
  try {
    const { gameId } = req.params;
    
    // TODO: GameEngineからゲーム状態を取得
    res.json({
      message: 'ゲーム状態を取得しました',
      gameId,
      // gameState: gameEngine.getGameState()
    });
  } catch (error) {
    console.error('ゲーム状態取得エラー:', error);
    res.status(500).json({ error: 'ゲーム状態の取得に失敗しました' });
  }
});

// カードをプレイ
router.post('/play/:gameId', async (req: express.Request, res: express.Response) => {
  try {
    const { gameId } = req.params;
    const { cards } = req.body;
    const userId = req.user!.id;

    // TODO: GameEngineでカードをプレイ
    res.json({
      message: 'カードをプレイしました',
      gameId,
      userId,
      cards
    });
  } catch (error) {
    console.error('カードプレイエラー:', error);
    res.status(500).json({ error: 'カードのプレイに失敗しました' });
  }
});

// パス
router.post('/pass/:gameId', async (req: express.Request, res: express.Response) => {
  try {
    const { gameId } = req.params;
    const userId = req.user!.id;

    // TODO: GameEngineでパス処理
    res.json({
      message: 'パスしました',
      gameId,
      userId
    });
  } catch (error) {
    console.error('パスエラー:', error);
    res.status(500).json({ error: 'パスに失敗しました' });
  }
});

export default router;
