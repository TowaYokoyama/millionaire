import { v4 as uuidv4 } from 'uuid';
import { Card, GamePlayer, GameState, PlayerRanking, GameAction } from '../types';

export class GameEngine {
  private gameId: string | null = null;
  private players: GamePlayer[] = [];
  private currentPlayerIndex: number = 0;
  private gameState: 'waiting' | 'playing' | 'finished' = 'waiting';
  private deck: Card[] = [];
  private fieldCards: Card[] = [];
  private fieldStrength: number = 0;
  private fieldCount: number = 0;
  private revolution: boolean = false;
  private passCount: number = 0;
  private gameHistory: GameAction[] = [];
  private winner: GamePlayer | null = null;
  private rankings: PlayerRanking[] = [];
  private lastPlayerId: number | null = null; // 最後にカードを出したプレイヤーのID

  // ゲーム初期化
  initializeGame(players: Omit<GamePlayer, 'cards' | 'isActive' | 'rank' | 'playerOrder'>[]): void {
    this.gameId = uuidv4();
    this.players = players.map((player, index) => ({
      ...player,
      cards: [],
      isActive: true,
      rank: undefined,
      playerOrder: index
    }));
    this.currentPlayerIndex = 0;
    this.gameState = 'playing';
    this.deck = this.createDeck();
    this.fieldCards = [];
    this.fieldStrength = 0;
    this.fieldCount = 0;
    this.revolution = false;
    this.passCount = 0;
    this.gameHistory = [];
    this.winner = null;
    this.rankings = [];
    this.lastPlayerId = null;

    this.dealCards();
    this.logAction('game_started', { players: this.players.length });
  }

  // デッキ作成（52枚 + ジョーカー2枚）
  private createDeck(): Card[] {
    const suits: Array<'spades' | 'hearts' | 'diamonds' | 'clubs'> = ['spades', 'hearts', 'diamonds', 'clubs'];
    const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
    const deck: Card[] = [];

    // 通常のカード
    suits.forEach(suit => {
      ranks.forEach(rank => {
        deck.push({
          suit: suit,
          rank: rank,
          strength: this.getCardStrength(rank),
          id: `${suit}_${rank}`
        });
      });
    });

    // ジョーカー2枚
    deck.push({ suit: 'joker', rank: 'JOKER', strength: 16, id: 'joker_1' });
    deck.push({ suit: 'joker', rank: 'JOKER', strength: 16, id: 'joker_2' });

    return this.shuffleDeck(deck);
  }

  // デッキシャッフル
  private shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      if (shuffled[i] && shuffled[j]) {
        const temp = shuffled[i]!;
        shuffled[i] = shuffled[j]!;
        shuffled[j] = temp;
      }
    }
    return shuffled;
  }

  // カード配布
  private dealCards(): void {
    const cardsPerPlayer = Math.floor(this.deck.length / this.players.length);
    const remainingCards = this.deck.length % this.players.length;

    let cardIndex = 0;
    this.players.forEach((player, index) => {
      const playerCards = cardsPerPlayer + (index < remainingCards ? 1 : 0);
      player.cards = this.deck.slice(cardIndex, cardIndex + playerCards);
      cardIndex += playerCards;
    });

    // カードを強さ順にソート
    this.players.forEach(player => {
      player.cards.sort((a, b) => a.strength - b.strength);
    });
  }

  // カードの強さを取得
  private getCardStrength(rank: string): number {
    const strengthMap: Record<string, number> = {
      '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
      '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13,
      'A': 14, '2': 15, 'JOKER': 16
    };
    return strengthMap[rank] || 0;
  }

  // カード出し判定
  canPlayCards(playerId: number, cards: Card[]): { valid: boolean; reason: string } {
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.isActive) {
      return { valid: false, reason: 'プレイヤーが無効です' };
    }

    if (this.currentPlayerIndex !== player.playerOrder) {
      return { valid: false, reason: 'あなたのターンではありません' };
    }

    // カードの存在確認
    const playerCardIds = player.cards.map(card => card.id);
    const playCardIds = cards.map(card => card.id);
    
    if (!playCardIds.every(cardId => playerCardIds.includes(cardId))) {
      return { valid: false, reason: '手札にないカードが含まれています' };
    }

    // 場にカードがない場合（最初の出し）
    if (this.fieldCards.length === 0) {
      return this.validateFirstPlay(cards);
    }

    // 場にカードがある場合
    return this.validatePlay(cards);
  }

  // 最初の出しの判定
  private validateFirstPlay(cards: Card[]): { valid: boolean; reason: string } {
    if (cards.length === 0) {
      return { valid: false, reason: 'カードを選択してください' };
    }

    // 同じ数字のカードかチェック
    const ranks = cards.map(card => card.rank);
    const uniqueRanks = [...new Set(ranks)];
    
    if (uniqueRanks.length > 1) {
      return { valid: false, reason: '同じ数字のカードを出してください' };
    }

    return { valid: true, reason: '有効な出しです' };
  }

  // 通常の出しの判定
  private validatePlay(cards: Card[]): { valid: boolean; reason: string } {
    if (cards.length === 0) {
      return { valid: false, reason: 'カードを選択してください' };
    }

    // 枚数チェック
    if (cards.length !== this.fieldCount) {
      return { valid: false, reason: `場のカードと同じ枚数（${this.fieldCount}枚）を出してください` };
    }

    // 同じ数字のカードかチェック
    const ranks = cards.map(card => card.rank);
    const uniqueRanks = [...new Set(ranks)];
    
    if (uniqueRanks.length > 1) {
      return { valid: false, reason: '同じ数字のカードを出してください' };
    }

    // 強さチェック
    const playStrength = this.getCardStrength(cards[0]?.rank || '');
    const requiredStrength = this.revolution ? 
      (playStrength < this.fieldStrength) : 
      (playStrength > this.fieldStrength);

    if (!requiredStrength) {
      return { valid: false, reason: '場のカードより強いカードを出してください' };
    }

    return { valid: true, reason: '有効な出しです' };
  }

  // カードを出す
  playCards(playerId: number, cards: Card[]): { success: boolean; error?: string; gameState?: GameState } {
    const validation = this.canPlayCards(playerId, cards);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    const player = this.players.find(p => p.id === playerId)!;
    
    // カードを手札から削除
    const cardIds = cards.map(card => card.id);
    player.cards = player.cards.filter(card => !cardIds.includes(card.id));

    // 場にカードをセット
    this.fieldCards = [...cards];
    this.fieldCount = cards.length;
    this.fieldStrength = this.getCardStrength(cards[0]?.rank || '');

    // 最後にカードを出したプレイヤーを記録
    this.lastPlayerId = playerId;

    // 特殊ルールチェック
    this.checkSpecialRules(cards);

    // パスカウントリセット
    this.passCount = 0;

    // 次のプレイヤー
    this.nextPlayer();

    // ログ記録
    this.logAction('cards_played', {
      playerId: playerId,
      cards: cards,
      fieldStrength: this.fieldStrength,
      fieldCount: this.fieldCount
    });

    // 上がり判定
    if (player.cards.length === 0) {
      this.handlePlayerWin(player);
    }

    return { success: true, gameState: this.getGameState() };
  }

  // パス
  pass(playerId: number): { success: boolean; error?: string; gameState?: GameState } {
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.isActive) {
      return { success: false, error: 'プレイヤーが無効です' };
    }

    if (this.currentPlayerIndex !== player.playerOrder) {
      return { success: false, error: 'あなたのターンではありません' };
    }

    this.passCount++;

    // ログ記録
    this.logAction('pass', { playerId: playerId });

    // 全員パスした場合（最後にカードを出したプレイヤー以外）
    const activePlayersCount = this.players.filter(p => p.isActive).length;
    if (this.passCount >= activePlayersCount - 1 && this.lastPlayerId !== null) {
      // 場をクリアして、最後にカードを出したプレイヤーのターンにする
      this.clearField();
      this.setCurrentPlayerById(this.lastPlayerId);
      this.logAction('turn_reset', { playerId: this.lastPlayerId, reason: 'all_passed' });
      return { success: true, gameState: this.getGameState() };
    }

    this.nextPlayer();
    return { success: true, gameState: this.getGameState() };
  }

  // 特殊ルールチェック
  private checkSpecialRules(cards: Card[]): void {
    const rank = cards[0]?.rank;
    const count = cards.length;
    
    if (!rank) return;

    // 8切り
    if (rank === '8') {
      this.clearField();
      this.logAction('eight_clear', { playerId: this.getCurrentPlayer()?.id });
    }

    // 革命（4枚同じ）
    if (count === 4) {
      this.revolution = !this.revolution;
      this.logAction('revolution', { 
        playerId: this.getCurrentPlayer()?.id, 
        revolution: this.revolution 
      });
    }

    // 階段（3枚以上の連番）
    if (count >= 3 && this.isSequence(cards)) {
      this.logAction('sequence', { 
        playerId: this.getCurrentPlayer()?.id, 
        count: count 
      });
    }
  }

  // 連番チェック
  private isSequence(cards: Card[]): boolean {
    const strengths = cards.map(card => card.strength).sort((a, b) => a - b);
    for (let i = 1; i < strengths.length; i++) {
      const current = strengths[i];
      const previous = strengths[i-1];
      if (current === undefined || previous === undefined || current - previous !== 1) {
        return false;
      }
    }
    return true;
  }

  // 場をクリア
  private clearField(): void {
    this.fieldCards = [];
    this.fieldStrength = 0;
    this.fieldCount = 0;
    this.passCount = 0;
    this.logAction('field_cleared', {});
  }

  // 次のプレイヤー
  private nextPlayer(): void {
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    } while (!this.players[this.currentPlayerIndex]?.isActive);
  }

  // 特定のプレイヤーを現在のプレイヤーに設定
  private setCurrentPlayerById(playerId: number): void {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1 && this.players[playerIndex]?.isActive) {
      this.currentPlayerIndex = playerIndex;
    } else {
      // プレイヤーが見つからないか、非アクティブの場合は次のアクティブなプレイヤーにする
      this.nextPlayer();
    }
  }

  // 現在のプレイヤー取得
  getCurrentPlayer(): GamePlayer | undefined | null {
    return this.players[this.currentPlayerIndex] || null;
  }

  // プレイヤーの勝利処理
  private handlePlayerWin(player: GamePlayer): void {
    player.isActive = false;
    player.rank = this.rankings.length + 1;
    this.rankings.push({
      playerId: player.id,
      username: player.username,
      rank: player.rank,
      cardsLeft: 0
    });

    this.logAction('player_won', {
      playerId: player.id,
      rank: player.rank
    });

    // 上がったプレイヤーが最後にカードを出したプレイヤーの場合、場をクリアして次のプレイヤーのターンにする
    if (this.lastPlayerId === player.id) {
      this.clearField();
      this.lastPlayerId = null;
      // 次のアクティブなプレイヤーを探す
      const activePlayers = this.players.filter(p => p.isActive);
      if (activePlayers.length > 0) {
        // 現在のインデックスから次のアクティブなプレイヤーを見つける
        let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
        while (!this.players[nextIndex]?.isActive) {
          nextIndex = (nextIndex + 1) % this.players.length;
        }
        this.currentPlayerIndex = nextIndex;
      }
    }

    // 全員上がったかチェック
    const activePlayers = this.players.filter(p => p.isActive);
    if (activePlayers.length <= 1) {
      this.endGame();
    }
  }

  // ゲーム終了
  private endGame(): void {
    this.gameState = 'finished';
    
    // 残りのプレイヤーの順位を決定
    const remainingPlayers = this.players.filter(p => p.isActive);
    remainingPlayers.forEach(player => {
      player.rank = this.rankings.length + 1;
      this.rankings.push({
        playerId: player.id,
        username: player.username,
        rank: player.rank,
        cardsLeft: player.cards.length
      });
    });

    this.logAction('game_ended', { rankings: this.rankings });
  }

  // アクションログ記録
  private logAction(action: string, data: any): void {
    const currentPlayer = this.getCurrentPlayer();
    this.gameHistory.push({
      action: action,
      data: data,
      timestamp: new Date().toISOString(),
      currentPlayer: currentPlayer?.id
    });
  }

  // ゲーム状態取得
  getGameState(): GameState {
    const currentPlayer = this.getCurrentPlayer();
    return {
      gameId: this.gameId!,
      gameState: this.gameState,
      players: this.players.map(player => ({
        id: player.id,
        username: player.username,
        cardsCount: player.cards.length,
        isActive: player.isActive,
        rank: player.rank,
        playerOrder: player.playerOrder
      })),
      currentPlayer: currentPlayer?.id,
      fieldCards: this.fieldCards,
      fieldStrength: this.fieldStrength,
      fieldCount: this.fieldCount,
      revolution: this.revolution,
      passCount: this.passCount,
      rankings: this.rankings,
      gameHistory: this.gameHistory.slice(-10) // 最新10件
    };
  }

  // プレイヤーの手札取得（本人のみ）
  getPlayerCards(playerId: number): Card[] {
    const player = this.players.find(p => p.id === playerId);
    return player ? player.cards : [];
  }

  // ゲッター
  getPlayers(): GamePlayer[] {
    return this.players;
  }

  getGameId(): string | null {
    return this.gameId;
  }

  getRankings(): PlayerRanking[] {
    return this.rankings;
  }

  // CPUプレイヤーかどうか判定
  isCPUPlayer(playerId: number): boolean {
    const player = this.players.find(p => p.id === playerId);
    return player ? player.username.startsWith('CPU_') : false;
  }

  // CPUプレイヤーの自動プレイ
  executeCPUTurn(): { success: boolean; action: 'play' | 'pass'; cards?: Card[] } {
    const currentPlayer = this.players[this.currentPlayerIndex];
    
    if (!currentPlayer || !this.isCPUPlayer(currentPlayer.id)) {
      return { success: false, action: 'pass' };
    }

    // 出せるカードを探す
    const playableCards = this.findPlayableCards(currentPlayer);

    if (playableCards.length > 0) {
      // ランダムに選択（簡易AI）
      const selectedCards = playableCards[Math.floor(Math.random() * playableCards.length)];
      if (selectedCards && selectedCards.length > 0) {
        const result = this.playCards(currentPlayer.id, selectedCards);
        
        if (result.success) {
          return { success: true, action: 'play' as const, cards: selectedCards };
        }
      }
    }

    // 出せるカードがない場合はパス
    const passResult = this.pass(currentPlayer.id);
    return { success: passResult.success, action: 'pass' };
  }

  // 出せるカードの組み合わせを探す
  private findPlayableCards(player: GamePlayer): Card[][] {
    const playableCombinations: Card[][] = [];

    // 場にカードがない場合は任意のカードを出せる
    if (this.fieldCards.length === 0) {
      // 単体カードを優先
      for (const card of player.cards) {
        playableCombinations.push([card]);
      }
      return playableCombinations;
    }

    // 場のカードと同じ枚数で強いカードを探す
    const requiredCount = this.fieldCount;
    
    // 同じランクのカードでグループ化
    const rankGroups: { [key: string]: Card[] } = {};
    for (const card of player.cards) {
      const rankKey = card.rank.toString();
      if (!rankGroups[rankKey]) {
        rankGroups[rankKey] = [];
      }
      rankGroups[rankKey].push(card);
    }

    // 各ランクグループから出せるものを探す
    for (const rankKey in rankGroups) {
      const cards = rankGroups[rankKey];
      
      if (cards && cards.length >= requiredCount) {
        // 必要枚数分のカードを選択
        const selectedCards = cards.slice(0, requiredCount);
        if (selectedCards.length > 0 && selectedCards[0]) {
          const cardStrength = this.getCardStrength(selectedCards[0].rank.toString());
          
          // 場のカードより強いか判定
          const isStronger = this.revolution 
            ? cardStrength < this.fieldStrength 
            : cardStrength > this.fieldStrength;
          
          if (isStronger) {
            playableCombinations.push(selectedCards);
          }
        }
      }
    }

    return playableCombinations;
  }

}
