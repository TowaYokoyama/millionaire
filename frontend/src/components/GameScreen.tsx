'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { socketService } from '@/lib/socket';
import { apiService } from '@/lib/api';
import { GameState, Card, GamePlayer } from '@/types';

interface GameScreenProps {
  roomId: number;
  onBackToLobby: () => void;
}

export default function GameScreen({ roomId, onBackToLobby }: GameScreenProps) {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [myCards, setMyCards] = useState<Card[]>([]);
  const [gameFinished, setGameFinished] = useState(false);
  const [finalRankings, setFinalRankings] = useState<any[]>([]);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [specialRuleAnimation, setSpecialRuleAnimation] = useState<string | null>(null);
  const lastCheckedActionRef = useRef<string | null>(null);

  // ルーム情報を取得
  useEffect(() => {
    const loadRoomInfo = async () => {
      try {
        const response = await apiService.getRoom(roomId);
        setRoomInfo(response.room);
      } catch (error) {
        console.error('ルーム情報取得エラー:', error);
      }
    };
    loadRoomInfo();
  }, [roomId]);

  useEffect(() => {
    console.log('GameScreen useEffect: イベントリスナーを設定');
    console.log('現在のSocket接続状態:', socketService.getConnectionStatus());
    
    // ゲーム状態の監視
    const handleGameStateUpdate = (data: { gameId: string; gameState: GameState }) => {
      console.log('game_state_updatedイベント受信:', data);
      console.log('受信したgameId:', data.gameId);
      
      // ゲーム状態にgameIdを確実に設定
      const updatedGameState = {
        ...data.gameState,
        gameId: data.gameId || data.gameState.gameId || gameState?.gameId || `game_${roomId}`
      };
      
      console.log('更新後のgameState.gameId:', updatedGameState.gameId);
      setGameState(updatedGameState);
      
      // プレイヤーの手札を更新
      const myPlayer = data.gameState.players.find(p => p.id === user?.id);
      if (myPlayer && myPlayer.cards) {
        setMyCards(myPlayer.cards);
      }
      
      setIsMyTurn(data.gameState.currentPlayer === user?.id);
      setSelectedCards([]); // カードを出した後、選択をクリア
      
      // 特殊ルール発動チェック
      checkSpecialRuleActivation(data.gameState);
    };

    const handleGameJoined = (data: { gameId: string; gameState: GameState; playerCards: Card[] }) => {
      console.log('✅ game_joinedイベント受信!', data);
      console.log('ゲームID:', data.gameId);
      console.log('プレイヤー数:', data.gameState?.players?.length);
      console.log('カード数:', data.playerCards?.length);
      console.log('自分のID:', user?.id);
      console.log('現在のプレイヤー:', data.gameState.currentPlayer);
      console.log('ゲーム状態のgameId:', data.gameState.gameId);
      
      // ゲーム状態にgameIdがない場合は設定する
      const updatedGameState = {
        ...data.gameState,
        gameId: data.gameId || data.gameState.gameId || `game_${roomId}`
      };
      
      setGameState(updatedGameState);
      setMyCards(data.playerCards || []);
      setIsMyTurn(data.gameState.currentPlayer === user?.id);
      
      // 確実にゲーム開始状態にする
      setTimeout(() => {
        setGameStarted(true);
        console.log('ゲーム画面に遷移しました。gameId:', updatedGameState.gameId);
      }, 100);
    };

    const handlePlayError = (data: { message: string }) => {
      console.error('カードプレイエラー:', data.message);
      alert(`エラー: ${data.message}`);
    };

    const handlePassError = (data: { message: string }) => {
      console.error('パスエラー:', data.message);
      alert(`エラー: ${data.message}`);
    };

    const handleGameEnded = (data: { gameId: string; rankings: any[] }) => {
      console.log('ゲーム終了:', data);
      setGameFinished(true);
      setFinalRankings(data.rankings);
    };

    socketService.on('game_state_updated', handleGameStateUpdate);
    socketService.on('game_joined', handleGameJoined);
    socketService.on('play_error', handlePlayError);
    socketService.on('pass_error', handlePassError);
    socketService.on('game_ended', handleGameEnded);

    return () => {
      console.log('GameScreen useEffect: イベントリスナーを解除');
      socketService.off('game_state_updated', handleGameStateUpdate);
      socketService.off('game_joined', handleGameJoined);
      socketService.off('play_error', handlePlayError);
      socketService.off('pass_error', handlePassError);
      socketService.off('game_ended', handleGameEnded);
    };
  }, [user]);

  // 特殊ルール発動チェック
  const checkSpecialRuleActivation = (state: GameState) => {
    if (!state.gameHistory || state.gameHistory.length === 0) return;
    
    const ruleMessages: { [key: string]: string } = {
      'eight_clear': '🎴 8切り！',
      'revolution': '⚡ 革命発動！',
      'j_back': '🔄 Jバック！',
      'five_skip': '💨 5飛び！',
      'ten_discard': '✨ 10捨て！',
      'sequence': '📈 階段！',
      'shibari_active': '🔒 しばり！',
      'turn_reset': '🔄 場流れ！'
    };
    
    // 最後の3つのアクションをチェック（field_clearedで上書きされる場合があるため）
    const recentActions = state.gameHistory.slice(-3);
    for (let i = recentActions.length - 1; i >= 0; i--) {
      const action = recentActions[i];
      if (action && ruleMessages[action.action]) {
        // 同じアクションを重複して表示しない
        const actionKey = `${action.action}_${action.timestamp}`;
        if (actionKey === lastCheckedActionRef.current) {
          continue;
        }
        
        // field_cleared以外の特殊ルールを優先
        if (action.action !== 'field_cleared' && action.action !== 'cards_played' && action.action !== 'pass') {
          const message = ruleMessages[action.action];
          lastCheckedActionRef.current = actionKey;
          setSpecialRuleAnimation(message);
          setTimeout(() => setSpecialRuleAnimation(null), 3000);
          break;
        }
      }
    }
  };

  const getMyPlayerOrder = (): number => {
    if (!gameState || !user) return -1;
    // currentPlayerはプレイヤーのIDを示している
    return user.id;
  };

  const getMyCards = (): Card[] => {
    return myCards;
  };

  const getSuitSymbol = (suit: string): string => {
    const symbols: { [key: string]: string } = {
      'hearts': '♥',
      'diamonds': '♦',
      'clubs': '♣',
      'spades': '♠'
    };
    return symbols[suit] || suit;
  };

  const getSuitColor = (suit: string): string => {
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-black';
  };

  const getRankDisplay = (rank: string): string => {
    const rankMap: { [key: string]: string } = {
      '11': 'J',
      '12': 'Q',
      '13': 'K',
      '14': 'A',
      '15': '2',
      '16': 'Joker'
    };
    return rankMap[rank] || rank;
  };

  const handleCardSelect = (card: Card) => {
    if (!isMyTurn) return;
    
    setSelectedCards(prev => {
      const isSelected = prev.some(c => c.id === card.id);
      if (isSelected) {
        return prev.filter(c => c.id !== card.id);
      } else {
        return [...prev, card];
      }
    });
  };

  const handlePlayCards = () => {
    if (selectedCards.length === 0 || !isMyTurn) {
      console.log('カードを出せません:', { 
        selectedCardsLength: selectedCards.length, 
        isMyTurn 
      });
      return;
    }
    
    console.log('カードを出します:', selectedCards);
    console.log('ゲームID:', gameState?.gameId || `game_${roomId}`);
    
    // カードを出す処理
    socketService.playCards(gameState?.gameId || `game_${roomId}`, selectedCards);
    console.log('play_cardsイベントを送信しました');
  };

  const handlePass = () => {
    if (!isMyTurn) {
      console.log('パスできません: 自分のターンではありません');
      return;
    }
    
    const gameIdToUse = gameState?.gameId || `game_${roomId}`;
    console.log('パスします');
    console.log('使用するゲームID:', gameIdToUse);
    console.log('gameState:', gameState);
    console.log('roomId:', roomId);
    
    socketService.pass(gameIdToUse);
    console.log('passイベントを送信しました。gameId:', gameIdToUse);
  };

  const startGame = async () => {
    if (isStarting) {
      console.log('Already starting game, ignoring duplicate request');
      return;
    }
    
    setIsStarting(true);
    try {
      console.log('Starting game for room:', roomId);
      console.log('Current user:', user);
      const token = localStorage.getItem('authToken');
      console.log('Auth token exists:', !!token);
      
      await apiService.startGame(roomId);
      console.log('API startGame成功、join_gameイベントを送信します');
      socketService.joinGame(`game_${roomId}`);
      console.log('join_gameイベントを送信しました。game_joinedイベントを待機中...');
    } catch (error: any) {
      console.error('ゲーム開始エラー:', error);
      console.error('Error details:', error);
      const errorMessage = error.message || 'ゲームの開始に失敗しました';
      alert(`エラー: ${errorMessage}`);
      setIsStarting(false);
    }
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-4">ゲーム待機中</h2>
          <p className="text-gray-600 mb-6">ゲームを開始します</p>
          <div className="space-x-4">
            <button
              onClick={startGame}
              disabled={isStarting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md"
            >
              {isStarting ? 'ゲーム開始中...' : 'ゲーム開始'}
            </button>
            <button
              onClick={onBackToLobby}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md"
            >
              ロビーに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">ゲームを読み込み中...</p>
        </div>
      </div>
    );
  }

  // ゲーム終了画面
  if (gameFinished) {
    return (
      <div className="min-h-screen game-table flex items-center justify-center">
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-10 rounded-3xl shadow-2xl border-4 border-yellow-500 max-w-2xl w-full">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-yellow-400 mb-4">🎉 ゲーム終了！ 🎉</h2>
            <p className="text-gray-300 text-lg">最終結果</p>
          </div>
          
          <div className="space-y-3 mb-8">
            {finalRankings.map((ranking, index) => {
              const isMe = ranking.playerId === user?.id;
              const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
              
              return (
                <div
                  key={ranking.playerId}
                  className={`p-4 rounded-xl flex items-center justify-between ${
                    isMe
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 border-2 border-blue-400'
                      : 'bg-gray-700 border-2 border-gray-600'
                  } transition-all transform hover:scale-105`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{rankEmoji}</span>
                    <div>
                      <div className="text-xl font-bold text-white flex items-center gap-2">
                        {ranking.username}
                        {isMe && <span className="text-sm bg-blue-500 px-2 py-1 rounded-full">あなた</span>}
                      </div>
                      <div className="text-sm text-gray-300">
                        {ranking.cardsLeft === 0 ? '全カード使用' : `残り ${ranking.cardsLeft} 枚`}
                      </div>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-yellow-400">
                    {ranking.rank}位
                  </div>
                </div>
              );
            })}
          </div>
          
          <button
            onClick={onBackToLobby}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-4 rounded-xl font-bold text-xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
          >
            ロビーに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen game-table">
      {/* 特殊ルールアニメーション */}
      {specialRuleAnimation && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="special-rule-animation text-8xl text-white drop-shadow-2xl"
               style={{
                 textShadow: '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.6), 0 0 60px rgba(255, 215, 0, 0.4), 4px 4px 0 #000, -4px -4px 0 #000, -4px 4px 0 #000, 4px -4px 0 #000',
                 letterSpacing: '0.1em'
               }}>
            {specialRuleAnimation}
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 shadow-lg border-b-2 border-yellow-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🎴</div>
              <div>
                <h1 className="text-2xl font-bold text-yellow-400">大富豪</h1>
                <p className="text-sm text-gray-400">
                  {roomInfo ? roomInfo.room_name : '読み込み中...'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={onBackToLobby}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ゲームエリア */}
      <main className="max-w-7xl mx-auto py-6 px-4">
        {/* プレイヤー情報 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {gameState.players.map((player) => {
            const isCurrentPlayer = gameState.currentPlayer === player.id;
            const isMe = player.id === user?.id;
            const isCPU = player.username.startsWith('CPU_');
            
            return (
              <div
                key={player.id}
                className={`p-4 rounded-xl backdrop-blur-sm ${
                  isMe
                    ? 'bg-blue-900/80 border-2 border-blue-400'
                    : isCurrentPlayer
                    ? 'bg-green-900/80 border-2 border-green-400 turn-indicator'
                    : 'bg-gray-900/60 border-2 border-gray-600'
                } card-transition`}
              >
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-lg font-medium text-white flex items-center gap-1">
                      {isCPU && <span className="text-purple-400">🤖</span>}
                      {isMe && <span className="text-blue-400">👤</span>}
                      <span className="truncate max-w-[120px]">
                        {player.username.replace('CPU_', '').slice(0, 10)}
                      </span>
                    </div>
                    {isCurrentPlayer && (
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
                    )}
                  </div>
                  <div className="text-sm text-gray-300 mt-2 font-bold">
                    🃏 {player.cardsCount}枚
                  </div>
                  {player.rank && (
                    <div className="mt-2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full text-sm font-bold text-gray-900 shadow-lg">
                      🏆 {player.rank}位
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 場のカード */}
        <div className="relative bg-gradient-to-b from-gray-800/90 to-gray-900/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl border-2 border-gray-700 mb-8">
          <div className="absolute top-4 right-4">
            {isMyTurn && (
              <div className="bg-green-500 text-white px-4 py-2 rounded-full font-bold animate-pulse shadow-lg flex items-center gap-2">
                <span className="text-xl">⏰</span>
                あなたのターン！
              </div>
            )}
          </div>
          <h3 className="text-xl font-bold text-yellow-400 mb-6 flex items-center gap-2">
            <span>🎯</span> 場のカード
          </h3>
          <div className="flex flex-wrap gap-3 min-h-[140px] items-center justify-center bg-green-900/30 rounded-xl p-6 border-2 border-dashed border-green-700/50">
            {gameState.fieldCards.length > 0 ? (
              gameState.fieldCards.map((card, index) => (
                <div
                  key={index}
                  className={`w-20 h-28 bg-white border-3 border-gray-800 rounded-xl flex flex-col items-center justify-center shadow-2xl card-transition hover:scale-105 ${getSuitColor(card.suit)}`}
                  style={{ transform: `rotate(${index * 3 - (gameState.fieldCards.length * 1.5)}deg)` }}
                >
                  <div className="text-3xl font-bold">{getRankDisplay(card.rank.toString())}</div>
                  <div className="text-2xl">{getSuitSymbol(card.suit)}</div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center text-lg">場にカードがありません</p>
            )}
          </div>
        </div>

        {/* 自分のカード */}
        <div className="bg-gradient-to-b from-gray-800/90 to-gray-900/90 backdrop-blur-md p-6 rounded-2xl shadow-2xl border-2 border-gray-700">
          <h3 className="text-xl font-bold text-yellow-400 mb-6 flex items-center gap-2">
            <span>🎴</span> あなたの手札 ({getMyCards().length}枚)
          </h3>
          <div className="flex flex-wrap gap-3 mb-6 justify-center min-h-[120px]">
            {getMyCards().length > 0 ? (
              getMyCards().map((card) => {
                const isSelected = selectedCards.some(c => c.id === card.id);
                return (
                  <button
                    key={card.id}
                    onClick={() => handleCardSelect(card)}
                    disabled={!isMyTurn}
                    className={`w-20 h-28 border-3 rounded-xl flex flex-col items-center justify-center card-transition ${
                      isSelected
                        ? 'border-yellow-400 bg-gradient-to-b from-yellow-100 to-white -translate-y-3 shadow-2xl scale-105'
                        : 'border-gray-700 bg-white hover:border-blue-400 hover:-translate-y-2'
                    } ${!isMyTurn ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl'} ${getSuitColor(card.suit)}`}
                  >
                    <div className="text-2xl font-bold">{getRankDisplay(card.rank.toString())}</div>
                    <div className="text-xl">{getSuitSymbol(card.suit)}</div>
                  </button>
                );
              })
            ) : (
              <p className="text-gray-400 text-center">カードがありません</p>
            )}
          </div>

          {/* アクションボタン */}
          {isMyTurn ? (
            <div className="flex gap-4">
              <button
                onClick={handlePlayCards}
                disabled={selectedCards.length === 0}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl card-transition flex items-center justify-center gap-2"
              >
                <span className="text-2xl">✨</span>
                カードを出す ({selectedCards.length}枚)
              </button>
              <button
                onClick={handlePass}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl card-transition flex items-center justify-center gap-2"
              >
                <span className="text-2xl">🚫</span>
                パス
              </button>
            </div>
          ) : (
            <div className="text-center py-4 bg-gray-800/50 rounded-xl border border-gray-700">
              <p className="text-gray-300 text-lg">⏳ 他のプレイヤーのターンです...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
