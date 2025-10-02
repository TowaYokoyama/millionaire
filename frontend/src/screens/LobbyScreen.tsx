import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { 
  Card, 
  Title, 
  Button, 
  FAB, 
  Text, 
  Chip,
  Portal,
  Dialog,
  TextInput
} from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, GameRoom } from '../types';
import { socketService } from '../services/SocketService';

type LobbyScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Lobby'>;
type LobbyScreenRouteProp = RouteProp<RootStackParamList, 'Lobby'>;

interface LobbyScreenProps {
  navigation: LobbyScreenNavigationProp;
  route: LobbyScreenRouteProp;
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({ navigation }) => {
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('4');

  useEffect(() => {
    loadRooms();
    
    // Socket.IOイベントリスナー
    socketService.on('room_created', handleRoomCreated);
    socketService.on('room_updated', handleRoomUpdated);
    socketService.on('room_deleted', handleRoomDeleted);

    return () => {
      socketService.off('room_created', handleRoomCreated);
      socketService.off('room_updated', handleRoomUpdated);
      socketService.off('room_deleted', handleRoomDeleted);
    };
  }, []);

  const loadRooms = async (): Promise<void> => {
    try {
      setLoading(true);
      // TODO: API呼び出しでルーム一覧を取得
      // const response = await fetch('/api/lobby/rooms');
      // const data = await response.json();
      // setRooms(data.rooms);
      
      // 仮のデータ
      setRooms([
        {
          id: 1,
          room_name: 'テストルーム1',
          host_id: 1,
          max_players: 4,
          current_players: 2,
          status: 'waiting',
          game_settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          host_username: 'プレイヤー1'
        }
      ]);
    } catch (error) {
      console.error('ルーム一覧取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  };

  const handleRoomCreated = (room: GameRoom): void => {
    setRooms(prev => [room, ...prev]);
  };

  const handleRoomUpdated = (room: GameRoom): void => {
    setRooms(prev => prev.map(r => r.id === room.id ? room : r));
  };

  const handleRoomDeleted = (roomId: number): void => {
    setRooms(prev => prev.filter(r => r.id !== roomId));
  };

  const handleCreateRoom = async (): Promise<void> => {
    if (!roomName.trim()) return;

    try {
      // TODO: API呼び出しでルーム作成
      // const response = await fetch('/api/lobby/rooms', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     room_name: roomName.trim(),
      //     max_players: parseInt(maxPlayers)
      //   })
      // });
      
      setShowCreateDialog(false);
      setRoomName('');
      setMaxPlayers('4');
      
      // 仮の処理
      const newRoom: GameRoom = {
        id: Date.now(),
        room_name: roomName.trim(),
        host_id: 1,
        max_players: parseInt(maxPlayers),
        current_players: 1,
        status: 'waiting',
        game_settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        host_username: 'あなた'
      };
      
      handleRoomCreated(newRoom);
      navigation.navigate('Room', { roomId: newRoom.id });
    } catch (error) {
      console.error('ルーム作成エラー:', error);
    }
  };

  const handleJoinRoom = (room: GameRoom): void => {
    if (room.current_players >= room.max_players) {
      return; // 満員
    }
    
    navigation.navigate('Room', { roomId: room.id });
  };

  const renderRoom = ({ item }: { item: GameRoom }) => (
    <Card style={styles.roomCard} onPress={() => handleJoinRoom(item)}>
      <Card.Content>
        <View style={styles.roomHeader}>
          <Title style={styles.roomTitle}>{item.room_name}</Title>
          <Chip 
            mode="outlined" 
            compact
            style={[
              styles.statusChip,
              { backgroundColor: item.current_players >= item.max_players ? '#ffcdd2' : '#c8e6c9' }
            ]}
          >
            {item.current_players}/{item.max_players}
          </Chip>
        </View>
        <Text style={styles.hostText}>ホスト: {item.host_username}</Text>
        <View style={styles.roomFooter}>
          <Text style={styles.timeText}>
            作成: {new Date(item.created_at).toLocaleTimeString()}
          </Text>
          <Button 
            mode="contained" 
            compact
            disabled={item.current_players >= item.max_players}
            onPress={() => handleJoinRoom(item)}
          >
            {item.current_players >= item.max_players ? '満員' : '参加'}
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={rooms}
        renderItem={renderRoom}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>ルームがありません</Text>
            <Text style={styles.emptySubText}>新しいルームを作成してゲームを始めましょう</Text>
          </View>
        }
      />
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setShowCreateDialog(true)}
        label="ルーム作成"
      />

      <Portal>
        <Dialog visible={showCreateDialog} onDismiss={() => setShowCreateDialog(false)}>
          <Dialog.Title>新しいルームを作成</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="ルーム名"
              value={roomName}
              onChangeText={setRoomName}
              mode="outlined"
              style={styles.dialogInput}
            />
            <TextInput
              label="最大プレイヤー数"
              value={maxPlayers}
              onChangeText={setMaxPlayers}
              mode="outlined"
              keyboardType="numeric"
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCreateDialog(false)}>キャンセル</Button>
            <Button mode="contained" onPress={handleCreateRoom}>作成</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  roomCard: {
    marginBottom: 12,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomTitle: {
    fontSize: 18,
    flex: 1,
  },
  statusChip: {
    marginLeft: 8,
  },
  hostText: {
    color: '#666',
    marginBottom: 12,
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    color: '#999',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubText: {
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  dialogInput: {
    marginBottom: 16,
  },
});

export default LobbyScreen;
