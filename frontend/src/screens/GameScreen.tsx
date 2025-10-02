import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Button, Text, Chip } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Card as GameCard } from '../types';
import { socketService } from '../services/SocketService';

type GameScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Game'>;
type GameScreenRouteProp = RouteProp<RootStackParamList, 'Game'>;

interface GameScreenProps {
  navigation: GameScreenNavigationProp;
  route: GameScreenRouteProp;
}

interface GamePlayer {
  id: number;
  username: string;
  cardsCount: number;
  isActive: boolean;
  rank?: number;
}

interface GameState {
  currentPlayer?: number;
  fieldCards: GameCard[];
  revolution: boolean;
  passCount: number;
  players: GamePlayer[];
}

const GameScreen: React.FC<GameScreenProps> = ({ navigation, route }) => {
  const { gameId } = route.params;
  const [gameState, setGameState] = useState<GameState>({
    fieldCards: [],
    revolution: false,
    passCount: 0,
    players: []
  });
  const [playerCards, setPlayerCards] = useState<GameCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<GameCard[]>([]);
  const [isMyTurn, setIsMyTurn] = useState(false);

  useEffect(() => {
    // Socket.IOイベントリスナー
    socketService.on('game_state_updated', handleGameStateUpdated);
    socketService.on('cards_played', handleCardsPlayed);
    socketService.on('player_passed', handlePlayerPassed);
    socketService.on('game_ended', handleGameEnded);

    // 初期ゲーム状態を取得
    loadGameState();

    return () => {
      socketService.off('game_state_updated', handleGameStateUpdated);
      socketService.off('cards_played', handleCardsPlayed);
      socketService.off('player_passed', handlePlayerPassed);
      socketService.off('game_ended', handleGameEnded);
    };
  }, [gameId]);

  const loadGameState = async (): Promise<void> => {
    try {
      // TODO: API呼び出しでゲーム状態を取得
      // 仮のデータ
      const mockGameState: GameState = {
        currentPlayer: 1,
        fieldCards: [],
        revolution: false,
        passCount: 0,
        players: [
          { id: 1, username: 'あなた', cardsCount: 13, isActive: true },
          { id: 2, username: 'プレイヤー2', cardsCount: 13, isActive: true },
          { id: 3, username: 'プレイヤー3', cardsCount: 13, isActive: true },
          { id: 4, username: 'プレイヤー4', cardsCount: 13, isActive: true },
        ]
      };

      const mockPlayerCards: GameCard[] = [
        { suit: 'spades', rank: '3', strength: 3, id: 'spades_3' },
        { suit: 'hearts', rank: '5', strength: 5, id: 'hearts_5' },
        { suit: 'diamonds', rank: '7', strength: 7, id: 'diamonds_7' },
        { suit: 'clubs', rank: 'J', strength: 11, id: 'clubs_J' },
        { suit: 'spades', rank: 'K', strength: 13, id: 'spades_K' },
      ];

      setGameState(mockGameState);
      setPlayerCards(mockPlayerCards);
      setIsMyTurn(mockGameState.currentPlayer === 1); // TODO: 実際のユーザーID
    } catch (error) {
      console.error('ゲーム状態取得エラー:', error);
    }
  };

  const handleGameStateUpdated = (newGameState: GameState): void => {
    setGameState(newGameState);
    setIsMyTurn(newGameState.currentPlayer === 1); // TODO: 実際のユーザーID
  };

  const handleCardsPlayed = (data: { playerId: number; cards: GameCard[] }): void => {
    console.log(`プレイヤー ${data.playerId} がカードをプレイしました:`, data.cards);
  };

  const handlePlayerPassed = (data: { playerId: number }): void => {
    console.log(`プレイヤー ${data.playerId} がパスしました`);
  };

  const handleGameEnded = (data: { rankings: any[] }): void => {
    console.log('ゲーム終了:', data.rankings);
    // TODO: 結果画面に遷移
  };

  const handleCardSelect = (card: GameCard): void => {
    setSelectedCards(prev => {
      const isSelected = prev.some(c => c.id === card.id);
      if (isSelected) {
        return prev.filter(c => c.id !== card.id);
      } else {
        return [...prev, card];
      }
    });
  };

  const handlePlayCards = (): void => {
    if (selectedCards.length === 0 || !isMyTurn) return;

    socketService.emit('play_cards', {
      gameId,
      cards: selectedCards
    });

    // 手札から選択したカードを削除
    setPlayerCards(prev => prev.filter(card => 
      !selectedCards.some(selected => selected.id === card.id)
    ));
    setSelectedCards([]);
  };

  const handlePass = (): void => {
    if (!isMyTurn) return;

    socketService.emit('pass_turn', { gameId });
    setSelectedCards([]);
  };

  const getCardColor = (suit: string): string => {
    switch (suit) {
      case 'hearts':
      case 'diamonds':
        return '#e53e3e';
      case 'spades':
      case 'clubs':
        return '#2d3748';
      case 'joker':
        return '#805ad5';
      default:
        return '#2d3748';
    }
  };

  const getSuitSymbol = (suit: string): string => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'spades': return '♠';
      case 'clubs': return '♣';
      case 'joker': return '🃏';
      default: return '';
    }
  };

  const renderCard = (card: GameCard, isSelected: boolean = false) => (
    <Card
      key={card.id}
      style={[
        styles.card,
        isSelected && styles.selectedCard
      ]}
      onPress={() => handleCardSelect(card)}
    >
      <Card.Content style={styles.cardContent}>
        <Text style={[styles.cardText, { color: getCardColor(card.suit) }]}>
          {getSuitSymbol(card.suit)}
        </Text>
        <Text style={[styles.cardRank, { color: getCardColor(card.suit) }]}>
          {card.rank}
        </Text>
      </Card.Content>
    </Card>
  );

  const renderPlayer = (player: GamePlayer, position: 'top' | 'left' | 'right' | 'bottom') => (
    <View key={player.id} style={[styles.playerInfo, styles[`player${position.charAt(0).toUpperCase() + position.slice(1)}`]]}>
      <Text style={styles.playerName}>{player.username}</Text>
      <Chip 
        mode="outlined" 
        compact
        style={[
          styles.playerChip,
          gameState.currentPlayer === player.id && styles.currentPlayerChip
        ]}
      >
        {player.cardsCount}枚
      </Chip>
      {player.rank && (
        <Chip mode="outlined" compact style={styles.rankChip}>
          {player.rank}位
        </Chip>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 上のプレイヤー */}
      <View style={styles.topSection}>
        {gameState.players[2] && renderPlayer(gameState.players[2], 'top')}
      </View>

      {/* 中央セクション */}
      <View style={styles.middleSection}>
        {/* 左のプレイヤー */}
        <View style={styles.leftSection}>
          {gameState.players[1] && renderPlayer(gameState.players[1], 'left')}
        </View>

        {/* 場のカード */}
        <View style={styles.fieldSection}>
          <Card style={styles.fieldCard}>
            <Card.Content>
              <Title style={styles.fieldTitle}>場のカード</Title>
              {gameState.revolution && (
                <Chip mode="outlined" style={styles.revolutionChip}>革命中</Chip>
              )}
              <View style={styles.fieldCards}>
                {gameState.fieldCards.length > 0 ? (
                  gameState.fieldCards.map(card => renderCard(card))
                ) : (
                  <Text style={styles.emptyField}>カードがありません</Text>
                )}
              </View>
              <Text style={styles.passCount}>パス: {gameState.passCount}回</Text>
            </Card.Content>
          </Card>
        </View>

        {/* 右のプレイヤー */}
        <View style={styles.rightSection}>
          {gameState.players[3] && renderPlayer(gameState.players[3], 'right')}
        </View>
      </View>

      {/* 下のプレイヤー（自分） */}
      <View style={styles.bottomSection}>
        {gameState.players[0] && renderPlayer(gameState.players[0], 'bottom')}
        
        {/* 手札 */}
        <ScrollView horizontal style={styles.handCards}>
          {playerCards.map(card => 
            renderCard(card, selectedCards.some(c => c.id === card.id))
          )}
        </ScrollView>

        {/* アクションボタン */}
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={handlePass}
            disabled={!isMyTurn}
            style={styles.actionButton}
          >
            パス
          </Button>
          <Button
            mode="contained"
            onPress={handlePlayCards}
            disabled={!isMyTurn || selectedCards.length === 0}
            style={styles.actionButton}
          >
            出す ({selectedCards.length}枚)
          </Button>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2d5016',
    padding: 16,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  middleSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftSection: {
    width: 80,
    alignItems: 'center',
  },
  rightSection: {
    width: 80,
    alignItems: 'center',
  },
  fieldSection: {
    flex: 1,
    marginHorizontal: 16,
  },
  bottomSection: {
    marginTop: 16,
  },
  playerInfo: {
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    minWidth: 80,
  },
  playerTop: {
    marginBottom: 16,
  },
  playerLeft: {
    transform: [{ rotate: '90deg' }],
  },
  playerRight: {
    transform: [{ rotate: '-90deg' }],
  },
  playerBottom: {
    marginBottom: 16,
  },
  playerName: {
    color: 'white',
    fontSize: 12,
    marginBottom: 4,
  },
  playerChip: {
    marginBottom: 4,
  },
  currentPlayerChip: {
    backgroundColor: '#ffd700',
  },
  rankChip: {
    backgroundColor: '#ff6b6b',
  },
  fieldCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  fieldTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  revolutionChip: {
    alignSelf: 'center',
    marginBottom: 8,
    backgroundColor: '#ff6b6b',
  },
  fieldCards: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
    minHeight: 60,
  },
  emptyField: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  passCount: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
  },
  handCards: {
    marginBottom: 16,
  },
  card: {
    width: 50,
    height: 70,
    marginHorizontal: 2,
    backgroundColor: 'white',
  },
  selectedCard: {
    backgroundColor: '#e3f2fd',
    transform: [{ translateY: -10 }],
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    height: '100%',
  },
  cardText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardRank: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  actionButton: {
    flex: 1,
  },
});

export default GameScreen;
