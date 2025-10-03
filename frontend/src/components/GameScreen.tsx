'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
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

  useEffect(() => {
    console.log('GameScreen useEffect: イベントリスナーを設定');
    console.log('現在のSocket接続状態:', socketService.getConnectionStatus());
    
    // ゲーム状態の監視
    const handleGameStateUpdate = (data: { gameId: string; gameState: GameState }) => {
      console.log('game_state_updatedイベント受信:', data);
      setGameState(data.gameState);
      setMyCards(data.gameState.playerCards || myCards);
      setIsMyTurn(data.gameState.currentPlayer === user?.id);
    };

    const handleGameJoined = (data: { gameId: string; gameState: GameState; playerCards: Card[] }) => {
      console.log('✅ game_joinedイベント受信!', data);
      console.log('プレイヤー数:', data.gameState?.players?.length);
      console.log('カード数:', data.playerCards?.length);
      console.log('自分のID:', user?.id);
      console.log('現在のプレイヤー:', data.gameState.currentPlayer);
      
      setGameState(data.gameState);
      setMyCards(data.playerCards || []);
      setIsMyTurn(data.gameState.currentPlayer === user?.id);
      
      // 確実にゲーム開始状態にする
      setTimeout(() => {
        setGameStarted(true);
        console.log('ゲーム画面に遷移しました');
      }, 100);
    };

    socketService.on('game_state_updated', handleGameStateUpdate);
    socketService.on('game_joined', handleGameJoined);

    return () => {
      console.log('GameScreen useEffect: イベントリスナーを解除');
      socketService.off('game_state_updated', handleGameStateUpdate);
      socketService.off('game_joined', handleGameJoined);
    };
  }, [user, myCards]);

  const getMyPlayerOrder = (): number => {
    if (!gameState || !user) return -1;
    // currentPlayerはプレイヤーのIDを示している
    return user.id;
  };

  const getMyCards = (): Card[] => {
    return myCards;
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
    if (selectedCards.length === 0 || !isMyTurn) return;
    
    // カードを出す処理
    socketService.playCards(gameState?.gameId || '', selectedCards);
    setSelectedCards([]);
  };

  const handlePass = () => {
    if (!isMyTurn) return;
    socketService.pass(gameState?.gameId || '');
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
          <p className="text-gray-600 mb-6">ルーム {roomId} でゲームを開始します</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">大富豪ゲーム</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">ルーム {roomId}</span>
              <button
                onClick={onBackToLobby}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
              >
                ロビーに戻る
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ゲームエリア */}
      <main className="max-w-7xl mx-auto py-6 px-4">
        {/* プレイヤー情報 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {gameState.players.map((player) => (
            <div
              key={player.id}
              className={`p-4 rounded-lg border-2 ${
                player.id === user?.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="text-center">
                <div className="font-medium">{player.username}</div>
                <div className="text-sm text-gray-500">
                  {player.cardsCount}枚
                </div>
                {player.rank && (
                  <div className="text-sm font-bold text-green-600">
                    {player.rank}位
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 場のカード */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-medium mb-4">場のカード</h3>
          <div className="flex flex-wrap gap-2">
            {gameState.fieldCards.map((card, index) => (
              <div
                key={index}
                className="w-12 h-16 bg-white border border-gray-300 rounded flex items-center justify-center text-xs font-bold"
              >
                {card.rank}
              </div>
            ))}
          </div>
          {gameState.fieldCards.length === 0 && (
            <p className="text-gray-500">カードがありません</p>
          )}
        </div>

        {/* 自分のカード */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">あなたのカード</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {getMyCards().map((card) => (
              <button
                key={card.id}
                onClick={() => handleCardSelect(card)}
                className={`w-12 h-16 border-2 rounded flex items-center justify-center text-xs font-bold ${
                  selectedCards.some(c => c.id === card.id)
                    ? 'border-blue-500 bg-blue-100'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                {card.rank}
              </button>
            ))}
          </div>

          {/* アクションボタン */}
          {isMyTurn && (
            <div className="flex space-x-4">
              <button
                onClick={handlePlayCards}
                disabled={selectedCards.length === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md"
              >
                カードを出す ({selectedCards.length}枚)
              </button>
              <button
                onClick={handlePass}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md"
              >
                パス
              </button>
            </div>
          )}

          {!isMyTurn && (
            <p className="text-gray-500">他のプレイヤーのターンです...</p>
          )}
        </div>
      </main>
    </div>
  );
}
