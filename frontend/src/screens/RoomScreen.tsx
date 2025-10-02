import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { 
  Card, 
  Title, 
  Button, 
  Text, 
  List,
  Chip,
  TextInput,
  IconButton
} from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, User } from '../types';
import { socketService } from '../services/SocketService';

type RoomScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Room'>;
type RoomScreenRouteProp = RouteProp<RootStackParamList, 'Room'>;

interface RoomScreenProps {
  navigation: RoomScreenNavigationProp;
  route: RoomScreenRouteProp;
}

interface ChatMessage {
  id: string;
  userId: number;
  username: string;
  message: string;
  timestamp: string;
}

interface RoomPlayer extends User {
  isReady: boolean;
  isHost: boolean;
}

const RoomScreen: React.FC<RoomScreenProps> = ({ navigation, route }) => {
  const { roomId } = route.params;
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [canStart, setCanStart] = useState(false);

  useEffect(() => {
    // ルームに参加
    socketService.emit('join_room', { roomId: roomId.toString() });

    // Socket.IOイベントリスナー
    socketService.on('user_joined', handleUserJoined);
    socketService.on('user_left', handleUserLeft);
    socketService.on('player_ready', handlePlayerReady);
    socketService.on('chat_message', handleChatMessage);
    socketService.on('game_started', handleGameStarted);

    // 初期データ読み込み
    loadRoomData();

    return () => {
      socketService.emit('leave_room', { roomId: roomId.toString() });
      socketService.off('user_joined', handleUserJoined);
      socketService.off('user_left', handleUserLeft);
      socketService.off('player_ready', handlePlayerReady);
      socketService.off('chat_message', handleChatMessage);
      socketService.off('game_started', handleGameStarted);
    };
  }, [roomId]);

  const loadRoomData = async (): Promise<void> => {
    try {
      // TODO: API呼び出しでルーム情報を取得
      // 仮のデータ
      setPlayers([
        {
          id: 1,
          username: 'プレイヤー1',
          email: 'player1@example.com',
          rating: 1200,
          games_played: 10,
          games_won: 5,
          created_at: new Date().toISOString(),
          isReady: false,
          isHost: true
        },
        {
          id: 2,
          username: 'プレイヤー2',
          email: 'player2@example.com',
          rating: 1100,
          games_played: 8,
          games_won: 3,
          created_at: new Date().toISOString(),
          isReady: true,
          isHost: false
        }
      ]);
    } catch (error) {
      console.error('ルーム情報取得エラー:', error);
    }
  };

  const handleUserJoined = (data: { userId: number; username: string }): void => {
    console.log(`${data.username} が参加しました`);
    // プレイヤーリストを更新
    loadRoomData();
  };

  const handleUserLeft = (data: { userId: number; username: string }): void => {
    console.log(`${data.username} が退出しました`);
    setPlayers(prev => prev.filter(p => p.id !== data.userId));
  };

  const handlePlayerReady = (data: { userId: number; isReady: boolean }): void => {
    setPlayers(prev => prev.map(p => 
      p.id === data.userId ? { ...p, isReady: data.isReady } : p
    ));
    
    // 全員準備完了かチェック
    const updatedPlayers = players.map(p => 
      p.id === data.userId ? { ...p, isReady: data.isReady } : p
    );
    const allReady = updatedPlayers.length >= 2 && updatedPlayers.every(p => p.isReady);
    setCanStart(allReady);
  };

  const handleChatMessage = (message: ChatMessage): void => {
    setChatMessages(prev => [...prev, message]);
  };

  const handleGameStarted = (data: { gameId: string }): void => {
    navigation.navigate('Game', { gameId: data.gameId });
  };

  const handleSendMessage = (): void => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      userId: 1, // TODO: 実際のユーザーID
      username: 'あなた', // TODO: 実際のユーザー名
      message: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    socketService.emit('chat_message', {
      roomId: roomId.toString(),
      message: newMessage.trim()
    });

    setNewMessage('');
  };

  const handleToggleReady = (): void => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    
    socketService.emit('player_ready', {
      roomId: roomId.toString(),
      isReady: newReadyState
    });
  };

  const handleStartGame = (): void => {
    socketService.emit('start_game', {
      roomId: roomId.toString()
    });
  };

  const handleLeaveRoom = (): void => {
    navigation.goBack();
  };

  const renderPlayer = ({ item }: { item: RoomPlayer }) => (
    <List.Item
      title={item.username}
      description={`レーティング: ${item.rating}`}
      left={() => (
        <View style={styles.playerStatus}>
          {item.isHost && <Chip mode="outlined" compact>ホスト</Chip>}
          <Chip 
            mode="outlined" 
            compact 
            style={[
              styles.readyChip,
              { backgroundColor: item.isReady ? '#c8e6c9' : '#ffcdd2' }
            ]}
          >
            {item.isReady ? '準備完了' : '待機中'}
          </Chip>
        </View>
      )}
    />
  );

  const renderChatMessage = ({ item }: { item: ChatMessage }) => (
    <View style={styles.chatMessage}>
      <Text style={styles.chatUsername}>{item.username}</Text>
      <Text style={styles.chatText}>{item.message}</Text>
      <Text style={styles.chatTime}>
        {new Date(item.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.playersSection}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>プレイヤー ({players.length}/4)</Title>
            <FlatList
              data={players}
              renderItem={renderPlayer}
              keyExtractor={(item) => item.id.toString()}
              style={styles.playersList}
            />
          </Card.Content>
        </Card>
      </View>

      <View style={styles.chatSection}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>チャット</Title>
            <FlatList
              data={chatMessages}
              renderItem={renderChatMessage}
              keyExtractor={(item) => item.id}
              style={styles.chatList}
            />
            <View style={styles.chatInput}>
              <TextInput
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="メッセージを入力..."
                mode="outlined"
                style={styles.messageInput}
                onSubmitEditing={handleSendMessage}
              />
              <IconButton
                icon="send"
                mode="contained"
                onPress={handleSendMessage}
                disabled={!newMessage.trim()}
              />
            </View>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.actionsSection}>
        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={handleLeaveRoom}
            style={styles.actionButton}
          >
            退出
          </Button>
          
          <Button
            mode={isReady ? "outlined" : "contained"}
            onPress={handleToggleReady}
            style={styles.actionButton}
          >
            {isReady ? '準備解除' : '準備完了'}
          </Button>
          
          {players.find(p => p.isHost)?.id === 1 && ( // TODO: 実際のユーザーID
            <Button
              mode="contained"
              onPress={handleStartGame}
              disabled={!canStart}
              style={styles.actionButton}
            >
              ゲーム開始
            </Button>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  playersSection: {
    flex: 1,
    marginBottom: 16,
  },
  chatSection: {
    flex: 1,
    marginBottom: 16,
  },
  actionsSection: {
    marginBottom: 16,
  },
  card: {
    flex: 1,
  },
  playersList: {
    maxHeight: 200,
  },
  playerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readyChip: {
    marginLeft: 8,
  },
  chatList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  chatMessage: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  chatUsername: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  chatText: {
    marginBottom: 4,
  },
  chatTime: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  chatInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageInput: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
});

export default RoomScreen;
