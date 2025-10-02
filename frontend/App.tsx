import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 画面コンポーネント
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import LobbyScreen from './src/screens/LobbyScreen';
import RoomScreen from './src/screens/RoomScreen';
import GameScreen from './src/screens/GameScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RankingScreen from './src/screens/RankingScreen';

// サービス
import { AuthService } from './src/services/AuthService';
import { socketService } from './src/services/SocketService';

// テーマ


// 型定義
import { User, RootStackParamList } from './src/types';
import { theme } from './src/styles/theme';

const Stack = createStackNavigator<RootStackParamList>();

export default function App(): JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async (): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        const userData = await AuthService.verifyToken(token);
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
          // Socket接続
          socketService.connect(token);
        }
      }
    } catch (error) {
      console.error('認証状態確認エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (userData: User, token: string): void => {
    setUser(userData);
    setIsAuthenticated(true);
    AsyncStorage.setItem('authToken', token);
    socketService.connect(token);
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem('authToken');
      socketService.disconnect();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  if (isLoading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>読み込み中...</Text>
    </View>;
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.primary,
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          {!isAuthenticated ? (
            // 認証前の画面
            <>
              <Stack.Screen 
                name="Login" 
                options={{ title: 'ログイン' }}
              >
                {(props) => <LoginScreen {...props} route={{ ...props.route, params: { onLogin: handleLogin } }} />}
              </Stack.Screen>
              <Stack.Screen 
                name="Register" 
                component={RegisterScreen}
                options={{ title: '新規登録' }}
              />
            </>
          ) : (
            // 認証後の画面
            <>
              <Stack.Screen 
                name="Lobby" 
                component={LobbyScreen}
                options={{ 
                  title: 'ロビー',
                  headerRight: () => (
                    <HeaderRightButtons 
                      onLogout={handleLogout}
                      user={user}
                    />
                  )
                }}
              />
              <Stack.Screen 
                name="Room" 
                component={RoomScreen}
                options={{ title: 'ルーム' }}
              />
              <Stack.Screen 
                name="Game" 
                component={GameScreen}
                options={{ 
                  title: 'ゲーム中',
                  headerLeft: () => null,
                  gestureEnabled: false
                }}
              />
              <Stack.Screen 
                name="Profile" 
                component={ProfileScreen}
                options={{ title: 'プロフィール' }}
              />
              <Stack.Screen 
                name="Ranking" 
                component={RankingScreen}
                options={{ title: 'ランキング' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

// ヘッダー右側のボタンコンポーネント
interface HeaderRightButtonsProps {
  onLogout: () => void;
  user: User | null;
}

const HeaderRightButtons: React.FC<HeaderRightButtonsProps> = ({ onLogout, user }) => {
  return (
    <View style={{ flexDirection: 'row', marginRight: 10 }}>
      <TouchableOpacity 
        onPress={() => {/* プロフィール画面へ */}}
        style={{ marginRight: 15 }}
      >
        <Text style={{ color: '#fff', fontSize: 16 }}>
          {user?.username}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onLogout}>
        <Text style={{ color: '#fff', fontSize: 16 }}>ログアウト</Text>
      </TouchableOpacity>
    </View>
  );
};
