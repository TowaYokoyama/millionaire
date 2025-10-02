import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Text, Button, Avatar, Divider } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, User } from '../types';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;
type ProfileScreenRouteProp = RouteProp<RootStackParamList, 'Profile'>;

interface ProfileScreenProps {
  navigation: ProfileScreenNavigationProp;
  route: ProfileScreenRouteProp;
}

interface UserStats extends User {
  win_rate: number;
  rank_position: number;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async (): Promise<void> => {
    try {
      // TODO: API呼び出しでユーザー統計を取得
      // 仮のデータ
      const mockStats: UserStats = {
        id: 1,
        username: 'プレイヤー1',
        email: 'player1@example.com',
        rating: 1250,
        games_played: 25,
        games_won: 15,
        created_at: '2024-01-15T10:30:00Z',
        win_rate: 60.0,
        rank_position: 42
      };

      setUserStats(mockStats);
    } catch (error) {
      console.error('ユーザー統計取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 1500) return '#4caf50'; // 緑
    if (rating >= 1200) return '#ff9800'; // オレンジ
    if (rating >= 1000) return '#2196f3'; // 青
    return '#9e9e9e'; // グレー
  };

  const getRatingTitle = (rating: number): string => {
    if (rating >= 1500) return 'エキスパート';
    if (rating >= 1200) return '上級者';
    if (rating >= 1000) return '中級者';
    return '初心者';
  };

  if (loading || !userStats) {
    return (
      <View style={styles.loadingContainer}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* プロフィール基本情報 */}
      <Card style={styles.card}>
        <Card.Content style={styles.profileHeader}>
          <Avatar.Text 
            size={80} 
            label={userStats.username.charAt(0).toUpperCase()}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Title style={styles.username}>{userStats.username}</Title>
            <Text style={styles.email}>{userStats.email}</Text>
            <Text style={styles.joinDate}>
              参加日: {new Date(userStats.created_at).toLocaleDateString()}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* レーティング情報 */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>レーティング</Title>
          <View style={styles.ratingContainer}>
            <Text style={[styles.ratingValue, { color: getRatingColor(userStats.rating) }]}>
              {userStats.rating}
            </Text>
            <Text style={styles.ratingTitle}>
              {getRatingTitle(userStats.rating)}
            </Text>
          </View>
          <Text style={styles.rankText}>
            全体ランキング: {userStats.rank_position}位
          </Text>
        </Card.Content>
      </Card>

      {/* 戦績情報 */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>戦績</Title>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats.games_played}</Text>
              <Text style={styles.statLabel}>総ゲーム数</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats.games_won}</Text>
              <Text style={styles.statLabel}>勝利数</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats.games_played - userStats.games_won}</Text>
              <Text style={styles.statLabel}>敗北数</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#4caf50' }]}>
                {userStats.win_rate.toFixed(1)}%
              </Text>
              <Text style={styles.statLabel}>勝率</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* 実績・バッジ */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>実績</Title>
          <View style={styles.achievementsContainer}>
            {userStats.games_won >= 10 && (
              <View style={styles.achievement}>
                <Text style={styles.achievementIcon}>🏆</Text>
                <Text style={styles.achievementText}>10勝達成</Text>
              </View>
            )}
            {userStats.games_played >= 20 && (
              <View style={styles.achievement}>
                <Text style={styles.achievementIcon}>🎮</Text>
                <Text style={styles.achievementText}>20戦経験</Text>
              </View>
            )}
            {userStats.win_rate >= 60 && (
              <View style={styles.achievement}>
                <Text style={styles.achievementIcon}>⭐</Text>
                <Text style={styles.achievementText}>勝率60%以上</Text>
              </View>
            )}
            {userStats.rating >= 1200 && (
              <View style={styles.achievement}>
                <Text style={styles.achievementIcon}>💎</Text>
                <Text style={styles.achievementText}>上級者認定</Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* アクションボタン */}
      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('Ranking')}
          style={styles.actionButton}
        >
          ランキングを見る
        </Button>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Lobby')}
          style={styles.actionButton}
        >
          ゲームに戻る
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  username: {
    fontSize: 24,
    marginBottom: 4,
  },
  email: {
    color: '#666',
    marginBottom: 4,
  },
  joinDate: {
    color: '#999',
    fontSize: 12,
  },
  ratingContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  ratingValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  ratingTitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
  },
  rankText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  statLabel: {
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  achievementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  achievement: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  achievementIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  achievementText: {
    fontSize: 12,
    color: '#1976d2',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
  },
});

export default ProfileScreen;
