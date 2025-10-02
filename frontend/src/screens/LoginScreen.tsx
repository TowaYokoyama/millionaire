import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Card, Button, Title, Paragraph } from 'react-native-paper';
import { AuthService } from '../services/AuthService';
import { LoginScreenProps } from '../types';

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, route }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = async (): Promise<void> => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('エラー', 'ユーザー名とパスワードを入力してください');
      return;
    }

    setIsLoading(true);
    try {
      const response = await AuthService.login(username.trim(), password);
      route.params?.onLogin(response.user, response.token);
    } catch (error: any) {
      Alert.alert('ログインエラー', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async (): Promise<void> => {
    if (!username.trim()) {
      Alert.alert('エラー', 'ユーザー名を入力してください');
      return;
    }

    setIsLoading(true);
    try {
      const response = await AuthService.guestLogin(username.trim());
      route.params?.onLogin(response.user, response.token);
    } catch (error: any) {
      Alert.alert('ゲストログインエラー', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>🃏 大富豪</Text>
          <Text style={styles.subtitle}>ログインしてゲームを始めよう</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>ログイン</Title>
            
            <TextInput
              style={styles.input}
              placeholder="ユーザー名"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="パスワード"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.loginButton}
            >
              ログイン
            </Button>

            <Button
              mode="outlined"
              onPress={handleGuestLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.guestButton}
            >
              ゲストで参加
            </Button>
          </Card.Content>
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            アカウントをお持ちでない方は
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.registerLink}
          >
            <Text style={styles.registerLinkText}>新規登録</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    elevation: 4,
    marginBottom: 20,
  },
  cardTitle: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 24,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  loginButton: {
    marginTop: 10,
    marginBottom: 10,
  },
  guestButton: {
    marginBottom: 10,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  registerLink: {
    padding: 10,
  },
  registerLinkText: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: 'bold',
  },
});

export default LoginScreen;
