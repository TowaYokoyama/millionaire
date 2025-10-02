import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Card, Title, Text, Avatar, Chip, Searchbar } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';

type RankingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Ranking'>;
type RankingScreenRouteProp = RouteProp<RootStackParamList, 'Ranking'>;

interface RankingScreenProps {
  navigation: RankingScreenNavigationProp;
  route: RankingScreenRouteProp;
}

interface RankingPlayer {
  id: number;
  username: string;
  rating: number;
  games_played: number;
  games_won: number;
  win_rate: number;
  rank_position: number;
}

const RankingScreen: React.FC<RankingScreenProps> = ({ navigation }) => {
  const [players, setPlayers] = useState<RankingPlayer[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<RankingPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadRanking();
  }, []);

  useEffect(() => {
    // 検索フィルタリング
    if (searchQuery.trim() === '') {
      setFilteredPlayers(players);
    } else {
      const filtered = players.filter(player =>
        player.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPlayers(filtered);
    }
  }, [searchQuery, players]);

  const loadRanking = async (): Promise<void> => {
    try {
      setLoading(true);
      // TODO: API呼び出しでランキングを取得
      // 仮のデータ
      const mockRanking: RankingPlayer[] = [
        {
          id: 1,
          username: 'トッププレイヤー',
          rating: 1850,
          games_played: 100,
          games_won: 75,
          win_rate: 75.0,
          rank_position: 1
        },
        {
          id: 2,
          username: 'エキスパート',
          rating: 1720,
          games_played: 80,
          games_won: 55,
          win_rate: 68.8,
          rank_position: 2
        },
        {
          id: 3,
          username: 'マスター',
          rating: 1650,
          games_played: 90,
          games_won: 58,
          win_rate: 64.4,
          rank_position: 3
        },
        {
          id: 4,
          username: 'プロゲーマー',
          rating: 1580,
          games_played: 75,
          games_won: 45,
          win_rate: 60.0,
          rank_position: 4
        },
        {
          id: 5,
          username: 'チャンピオン',
          rating: 1520,
          games_played: 60,
          games_won: 35,
          win_rate: 58.3,
          rank_position: 5
        },
        // ... 他のプレイヤー
      ];

      // 自分のデータも追加（例）
      for (let i = 6; i <= 50; i++) {
        mockRanking.push({
          id: i,
          username: `プレイヤー${i}`,
          rating: 1500 - (i * 10),
          games_played: Math.floor(Math.random() * 50) + 10,
          games_won: Math.floor(Math.random() * 30) + 5,
          win_rate: Math.random() * 40 + 30,
          rank_position: i
        });
      }

      setPlayers(mockRanking);
      setFilteredPlayers(mockRanking);
    } catch (error) {
      console.error('ランキング取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadRanking();
    setRefreshing(false);
  };

  const getRankColor = (position: number): string => {
    switch (position) {
      case 1: return '#ffd700'; // 金
      case 2: return '#c0c0c0'; // 銀
      case 3: return '#cd7f32'; // 銅
      default: return '#e0e0e0';
    }
  };

  const getRankIcon = (position: number): string => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 1700) return '#4caf50'; // 緑
    if (rating >= 1500) return '#ff9800'; // オレンジ
    if (rating >= 1200) return '#2196f3'; // 青
    return '#9e9e9e'; // グレー
  };

  const renderPlayer = ({ item, index }: { item: RankingPlayer; index: number }) => (
    <Card style={[
      styles.playerCard,
      item.rank_position <= 3 && styles.topPlayerCard
    ]}>
      <Card.Content>
        <View style={styles.playerRow}>
          {/* ランク */}
          <View style={styles.rankContainer}>
            <View style={[
              styles.rankBadge,
              { backgroundColor: getRankColor(item.rank_position) }
            ]}>
              <Text style={styles.rankText}>
                {getRankIcon(item.rank_position) || item.rank_position}
              </Text>
            </View>
          </View>

          {/* プレイヤー情報 */}
          <View style={styles.playerInfo}>
            <Avatar.Text 
              size={40} 
              label={item.username.charAt(0).toUpperCase()}
              style={styles.avatar}
            />
            <View style={styles.playerDetails}>
              <Text style={styles.playerName}>{item.username}</Text>
              <View style={styles.playerStats}>
                <Chip 
                  mode="outlined" 
                  compact
                  style={[styles.ratingChip, { backgroundColor: getRatingColor(item.rating) + '20' }]}
                >
                  {item.rating}
                </Chip>
                <Text style={styles.gamesText}>
                  {item.games_played}戦 {item.games_won}勝
                </Text>
              </View>
            </View>
          </View>

          {/* 勝率 */}
          <View style={styles.winRateContainer}>
            <Text style={[
              styles.winRateText,
              { color: item.win_rate >= 60 ? '#4caf50' : item.win_rate >= 50 ? '#ff9800' : '#f44336' }
            ]}>
              {item.win_rate.toFixed(1)}%
            </Text>
            <Text style={styles.winRateLabel}>勝率</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* 検索バー */}
      <Searchbar
        placeholder="プレイヤー名で検索"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {/* ランキングリスト */}
      <FlatList
        data={filteredPlayers}
        renderItem={renderPlayer}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? '該当するプレイヤーが見つかりません' : 'ランキングデータがありません'}
            </Text>
          </View>
        }
        ListHeaderComponent={
          !loading && filteredPlayers.length > 0 ? (
            <View style={styles.headerContainer}>
              <Title style={styles.headerTitle}>プレイヤーランキング</Title>
              <Text style={styles.headerSubtitle}>
                {searchQuery ? `検索結果: ${filteredPlayers.length}件` : `総プレイヤー数: ${players.length}人`}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    margin: 16,
    marginBottom: 8,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  headerContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 4,
  },
  playerCard: {
    marginBottom: 8,
  },
  topPlayerCard: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
  },
  rankBadge: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  avatar: {
    marginRight: 12,
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  playerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingChip: {
    height: 24,
  },
  gamesText: {
    fontSize: 12,
    color: '#666',
  },
  winRateContainer: {
    alignItems: 'center',
    minWidth: 60,
  },
  winRateText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  winRateLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default RankingScreen;
