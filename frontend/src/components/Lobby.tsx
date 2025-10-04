'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { socketService } from '@/lib/socket';
import { apiService } from '@/lib/api';
import { GameRoom } from '@/types';
import GameScreen from './GameScreen';

export default function Lobby() {
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);
  const [addCpuPlayers, setAddCpuPlayers] = useState(false);

  useEffect(() => {
    // 初期ルーム一覧取得
    loadRooms();
    
    socketService.joinLobby();

    const handleRoomUpdate = (data: { room: GameRoom }) => {
      setRooms(prev => {
        const index = prev.findIndex(room => room.id === data.room.id);
        if (index >= 0) {
          const newRooms = [...prev];
          newRooms[index] = data.room;
          return newRooms;
        } else {
          return [...prev, data.room];
        }
      });
    };

    socketService.on('room_state_updated', handleRoomUpdate);

    return () => {
      socketService.off('room_state_updated', handleRoomUpdate);
      socketService.leaveLobby();
    };
  }, []);

  const loadRooms = async () => {
    try {
      const response = await apiService.getRooms();
      setRooms(response.rooms || []);
    } catch (error) {
      console.error('ルーム一覧取得エラー:', error);
    }
  };

  const createRoom = async () => {
    if (!roomName.trim()) return;

    setIsLoading(true);
    try {
      console.log('Creating room:', { roomName, maxPlayers, addCpuPlayers });
      const gameSettings = addCpuPlayers ? { addCpuPlayers: true } : {};
      const response = await apiService.createRoom(roomName, maxPlayers, gameSettings);
      console.log('Room created:', response);
      console.log('Room ID:', response.room.id);
      console.log('Room details:', JSON.stringify(response.room));
      
      // ルーム一覧を再読み込み
      await loadRooms();
      
      // ホストは作成したルームに直接参加
      setCurrentRoomId(response.room.id);
    } catch (error: any) {
      console.error('ルーム作成エラー:', error);
      const errorMessage = error.message || 'ルームの作成に失敗しました';
      alert(`エラー: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setShowCreateRoom(false);
      setRoomName('');
      setAddCpuPlayers(false);
    }
  };

  const joinRoom = async (roomId: number) => {
    try {
      console.log('Joining room:', roomId);
      await apiService.joinRoom(roomId);
      socketService.joinRoom(roomId);
      
      // ルーム一覧を再読み込み
      await loadRooms();
      
      // ゲーム画面に遷移
      setCurrentRoomId(roomId);
      console.log('Successfully joined room:', roomId);
    } catch (error: any) {
      console.error('ルーム参加エラー:', error);
      const errorMessage = error.message || 'ルームへの参加に失敗しました';
      alert(`エラー: ${errorMessage}`);
    }
  };

  const backToLobby = () => {
    setCurrentRoomId(null);
  };

  // ゲーム画面を表示
  if (currentRoomId) {
    return <GameScreen roomId={currentRoomId} onBackToLobby={backToLobby} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">大富豪ゲーム</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">ようこそ、{user?.username}さん</span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* ルーム作成ボタン */}
          <div className="mb-6">
            <button
              onClick={() => setShowCreateRoom(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md text-lg font-medium"
            >
              新しいルームを作成
            </button>
          </div>

          {/* ルーム一覧 */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                利用可能なルーム
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                参加したいルームを選択してください
              </p>
            </div>
            <ul className="divide-y divide-gray-200">
              {rooms.length === 0 ? (
                <li className="px-4 py-4 text-center text-gray-500">
                  現在利用可能なルームがありません
                </li>
              ) : (
                rooms.map((room) => (
                  <li key={room.id}>
                    <div className="px-4 py-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                            <span className="text-white font-medium">
                              {room.current_players}/{room.max_players}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {room.room_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ホスト: {room.host_username} | 状態: {room.status === 'waiting' ? '待機中' : room.status === 'playing' ? 'プレイ中' : '終了'}
                          </div>
                        </div>
                      </div>
                      <div>
                        {room.host_id === user?.id ? (
                          // ホストの場合
                          room.status === 'waiting' ? (
                            <button
                              onClick={() => setCurrentRoomId(room.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                              ゲーム開始
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">ゲーム中</span>
                          )
                        ) : room.status === 'waiting' && room.current_players < room.max_players ? (
                          // 他のプレイヤーの場合
                          <button
                            onClick={() => joinRoom(room.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                          >
                            参加
                          </button>
                        ) : room.status === 'waiting' ? (
                          <span className="text-gray-400 text-sm">満員</span>
                        ) : (
                          <span className="text-gray-400 text-sm">ゲーム中</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </main>

      {/* ルーム作成モーダル */}
      {showCreateRoom && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 text-center">
                新しいルームを作成
              </h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ルーム名
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="ルーム名を入力"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    最大プレイヤー数
                  </label>
                  <select
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value={2}>2人</option>
                    <option value={3}>3人</option>
                    <option value={4}>4人</option>
                    <option value={5}>5人</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={addCpuPlayers}
                      onChange={(e) => setAddCpuPlayers(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      CPUプレイヤーを追加する
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateRoom(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  キャンセル
                </button>
                <button
                  onClick={createRoom}
                  disabled={isLoading || !roomName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '作成中...' : '作成'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}