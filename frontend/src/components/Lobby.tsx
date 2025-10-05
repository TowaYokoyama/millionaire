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
  const [filteredRooms, setFilteredRooms] = useState<GameRoom[]>([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<GameRoom | null>(null);
  const [password, setPassword] = useState('');
  
  // ルーム作成フォーム
  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const [addCpuPlayers, setAddCpuPlayers] = useState(false);
  const [rounds, setRounds] = useState(1);
  
  // 特殊ルール設定
  const [enable8Cut, setEnable8Cut] = useState(true);
  const [enableRevolution, setEnableRevolution] = useState(true);
  const [enableSequence, setEnableSequence] = useState(true);
  const [enableSuit, setEnableSuit] = useState(false);
  const [enableJBack, setEnableJBack] = useState(false);
  const [enableKickback, setEnableKickback] = useState(false);
  const [jokerKiller, setJokerKiller] = useState(false);
  const [enableShibari, setEnableShibari] = useState(false);
  
  // フィルターと検索
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'full'>('all');
  const [filterPrivate, setFilterPrivate] = useState<'all' | 'public' | 'private'>('public');
  
  const [isLoading, setIsLoading] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);

  useEffect(() => {
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

  // フィルタリング処理
  useEffect(() => {
    let filtered = rooms;

    // 検索フィルター
    if (searchTerm) {
      filtered = filtered.filter(room =>
        room.room_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.host_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // ステータスフィルター
    if (filterStatus === 'available') {
      filtered = filtered.filter(room => room.current_players < room.max_players);
    } else if (filterStatus === 'full') {
      filtered = filtered.filter(room => room.current_players >= room.max_players);
    }

    // プライベートフィルター
    if (filterPrivate === 'public') {
      filtered = filtered.filter(room => !room.is_private);
    } else if (filterPrivate === 'private') {
      filtered = filtered.filter(room => room.is_private);
    }

    setFilteredRooms(filtered);
  }, [rooms, searchTerm, filterStatus, filterPrivate]);

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
      const gameSettings = {
        addCpuPlayers,
        rounds,
        enable8Cut,
        enableRevolution,
        enableSequence,
        enableSuit,
        enableJBack,
        enableKickback,
        jokerKiller,
        enableShibari
      };
      
      const response = await apiService.createRoom(
        roomName,
        maxPlayers,
        gameSettings,
        description,
        isPrivate,
        isPrivate ? roomPassword : undefined
      );
      
      await loadRooms();
      setCurrentRoomId(response.room.id);
      
      // フォームをリセット
      setRoomName('');
      setDescription('');
      setIsPrivate(false);
      setRoomPassword('');
      setAddCpuPlayers(false);
      setRounds(1);
      setEnable8Cut(true);
      setEnableRevolution(true);
      setEnableSequence(true);
      setEnableSuit(false);
      setEnableJBack(false);
      setEnableKickback(false);
      setJokerKiller(false);
      setEnableShibari(false);
    } catch (error: any) {
      console.error('ルーム作成エラー:', error);
      alert(`エラー: ${error.message}`);
    } finally {
      setIsLoading(false);
      setShowCreateRoom(false);
    }
  };

  const handleJoinRoom = (room: GameRoom) => {
    if (room.is_private) {
      setSelectedRoom(room);
      setShowPasswordModal(true);
    } else {
      joinRoom(room.id);
    }
  };

  const joinRoom = async (roomId: number, pwd?: string) => {
    try {
      await apiService.joinRoom(roomId, pwd);
      socketService.joinRoom(roomId);
      await loadRooms();
      setCurrentRoomId(roomId);
      setShowPasswordModal(false);
      setPassword('');
    } catch (error: any) {
      console.error('ルーム参加エラー:', error);
      alert(`エラー: ${error.message}`);
    }
  };

  const deleteRoom = async (roomId: number) => {
    if (!confirm('このルームを削除してもよろしいですか？')) return;
    
    try {
      await apiService.deleteRoom(roomId);
      await loadRooms();
    } catch (error: any) {
      console.error('ルーム削除エラー:', error);
      alert(`エラー: ${error.message}`);
    }
  };

  const backToLobby = () => {
    setCurrentRoomId(null);
  };

  if (currentRoomId) {
    return <GameScreen roomId={currentRoomId} onBackToLobby={backToLobby} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-md border-b-4 border-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="text-5xl animate-bounce">🎴</div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  大富豪ロビー
                </h1>
                <p className="text-sm text-gray-500">最高のカードゲーム体験</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">ようこそ</p>
                <p className="text-lg font-bold text-indigo-600">{user?.username}</p>
              </div>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all transform hover:scale-105 shadow-lg"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* アクションバー */}
        <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <button
            onClick={() => setShowCreateRoom(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 flex items-center gap-2"
          >
            <span className="text-2xl">➕</span>
            新しいルームを作成
          </button>

          {/* 検索バー */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="ルーム名、ホスト名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
            />
          </div>
        </div>

        {/* フィルター */}
        <div className="mb-6 bg-white rounded-xl shadow-md p-4 flex flex-wrap gap-4 items-center">
          <span className="font-semibold text-gray-700">フィルター:</span>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-indigo-500 outline-none"
          >
            <option value="all">すべて</option>
            <option value="available">参加可能</option>
            <option value="full">満員</option>
          </select>

          <select
            value={filterPrivate}
            onChange={(e) => setFilterPrivate(e.target.value as any)}
            className="px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-indigo-500 outline-none"
          >
            <option value="public">パブリック</option>
            <option value="private">プライベート</option>
            <option value="all">すべて</option>
          </select>

          <span className="ml-auto text-sm text-gray-500">
            {filteredRooms.length} 件のルーム
          </span>
        </div>

        {/* ルームカードグリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <div className="text-6xl mb-4">🎴</div>
              <p className="text-xl text-gray-500">該当するルームが見つかりません</p>
              <p className="text-sm text-gray-400 mt-2">新しいルームを作成してゲームを始めましょう！</p>
            </div>
          ) : (
            filteredRooms.map((room) => {
              const isHost = room.host_id === user?.id;
              const isFull = room.current_players >= room.max_players;
              const isPrivate = room.is_private === 1;

              return (
                <div
                  key={room.id}
                  className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 overflow-hidden border-2 border-gray-100"
                >
                  {/* カードヘッダー */}
                  <div className={`p-4 ${isHost ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-indigo-500 to-purple-600'} text-white`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold truncate">{room.room_name}</h3>
                      <div className="flex items-center gap-2">
                        {isPrivate && (
                          <span className="text-yellow-300" title="プライベートルーム">
                            🔒
                          </span>
                        )}
                        {isHost && (
                          <span className="bg-yellow-400 text-gray-900 px-2 py-1 rounded-full text-xs font-bold">
                            HOST
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm opacity-90 mt-1">
                      ホスト: {room.host_username}
                    </p>
                  </div>

                  {/* カードボディ */}
                  <div className="p-4 space-y-3">
                    {room.description && (
                      <p className="text-sm text-gray-600 italic">
                        "{room.description}"
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">プレイヤー:</span>
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full font-bold ${
                          isFull ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {room.current_players} / {room.max_players}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">状態:</span>
                      <span className={`px-3 py-1 rounded-full font-bold ${
                        room.status === 'waiting' ? 'bg-blue-100 text-blue-700' :
                        room.status === 'playing' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {room.status === 'waiting' ? '待機中' :
                         room.status === 'playing' ? 'プレイ中' : '終了'}
                      </span>
                    </div>

                    <div className="text-xs text-gray-400 pt-2 border-t">
                      作成: {new Date(room.created_at).toLocaleString('ja-JP')}
                    </div>
                  </div>

                  {/* カードフッター */}
                  <div className="p-4 bg-gray-50 border-t">
                    {isHost ? (
                      <div className="flex gap-2">
                        {room.status === 'waiting' ? (
                          <>
                            <button
                              onClick={() => setCurrentRoomId(room.id)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
                            >
                              ゲーム開始
                            </button>
                            <button
                              onClick={() => deleteRoom(room.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all"
                            >
                              削除
                            </button>
                          </>
                        ) : (
                          <span className="text-center text-gray-500 w-full py-2">
                            ゲーム中
                          </span>
                        )}
                      </div>
                    ) : room.status === 'waiting' && !isFull ? (
                      <button
                        onClick={() => handleJoinRoom(room)}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all transform hover:scale-105"
                      >
                        参加する
                      </button>
                    ) : isFull ? (
                      <span className="block text-center text-red-500 font-medium py-2">
                        満員
                      </span>
                    ) : (
                      <span className="block text-center text-gray-500 font-medium py-2">
                        ゲーム中
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* ルーム作成モーダル */}
      {showCreateRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 transform transition-all max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              新しいルームを作成
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ルーム名 *
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  placeholder="例: 初心者歓迎ルーム"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  説明
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none"
                  placeholder="ルームの説明（任意）"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  最大プレイヤー数
                </label>
                <select
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                >
                  <option value={2}>2人</option>
                  <option value={3}>3人</option>
                  <option value={4}>4人</option>
                  <option value={5}>5人</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ラウンド数
                </label>
                <select
                  value={rounds}
                  onChange={(e) => setRounds(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                >
                  <option value={1}>1ラウンド</option>
                  <option value={2}>2ラウンド</option>
                  <option value={3}>3ラウンド</option>
                  <option value={4}>4ラウンド（階級戦）</option>
                </select>
                {rounds > 1 && (
                  <p className="mt-2 text-xs text-gray-600">
                    💡 2ラウンド目以降は順位に応じた階級（大富豪・富豪・貧民・大貧民）が割り当てられ、カード交換が行われます
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isPrivate" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  🔒 プライベートルーム（パスワード保護）
                </label>
              </div>

              {isPrivate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    パスワード *
                  </label>
                  <input
                    type="password"
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    placeholder="パスワードを入力"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <input
                  type="checkbox"
                  id="addCpu"
                  checked={addCpuPlayers}
                  onChange={(e) => setAddCpuPlayers(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="addCpu" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  🤖 CPUプレイヤーを追加
                </label>
              </div>

              {/* 特殊ルール設定 */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span>🎯</span> 特殊ルール設定
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enable8Cut"
                      checked={enable8Cut}
                      onChange={(e) => setEnable8Cut(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                    />
                    <label htmlFor="enable8Cut" className="text-sm text-gray-700">8切り</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableRevolution"
                      checked={enableRevolution}
                      onChange={(e) => setEnableRevolution(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                    />
                    <label htmlFor="enableRevolution" className="text-sm text-gray-700">革命</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableSequence"
                      checked={enableSequence}
                      onChange={(e) => setEnableSequence(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                    />
                    <label htmlFor="enableSequence" className="text-sm text-gray-700">階段</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableSuit"
                      checked={enableSuit}
                      onChange={(e) => setEnableSuit(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                    />
                    <label htmlFor="enableSuit" className="text-sm text-gray-700">スートしばり</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableJBack"
                      checked={enableJBack}
                      onChange={(e) => setEnableJBack(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                    />
                    <label htmlFor="enableJBack" className="text-sm text-gray-700">Jバック</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableKickback"
                      checked={enableKickback}
                      onChange={(e) => setEnableKickback(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                    />
                    <label htmlFor="enableKickback" className="text-sm text-gray-700">5飛び/10捨て</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="jokerKiller"
                      checked={jokerKiller}
                      onChange={(e) => setJokerKiller(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                    />
                    <label htmlFor="jokerKiller" className="text-sm text-gray-700">ジョーカー殺し</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableShibari"
                      checked={enableShibari}
                      onChange={(e) => setEnableShibari(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                    />
                    <label htmlFor="enableShibari" className="text-sm text-gray-700">しばり</label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateRoom(false)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-all"
              >
                キャンセル
              </button>
              <button
                onClick={createRoom}
                disabled={isLoading || !roomName.trim() || (isPrivate && !roomPassword)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                {isLoading ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* パスワード入力モーダル */}
      {showPasswordModal && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🔒</div>
              <h3 className="text-xl font-bold text-gray-900">
                プライベートルーム
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                {selectedRoom.room_name}
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                パスワードを入力
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && joinRoom(selectedRoom.id, password)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                placeholder="パスワード"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                  setSelectedRoom(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-all"
              >
                キャンセル
              </button>
              <button
                onClick={() => joinRoom(selectedRoom.id, password)}
                disabled={!password}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                参加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
