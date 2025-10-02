import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Title, Card, HelperText } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { AuthService } from '../services/AuthService';

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;
type RegisterScreenRouteProp = RouteProp<RootStackParamList, 'Register'>;

interface RegisterScreenProps {
  navigation: RegisterScreenNavigationProp;
  route: RegisterScreenRouteProp;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    if (!username.trim()) {
      Alert.alert('エラー', 'ユーザー名を入力してください');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('エラー', 'メールアドレスを入力してください');
      return false;
    }
    if (!password) {
      Alert.alert('エラー', 'パスワードを入力してください');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('エラー', 'パスワードが一致しません');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('エラー', 'パスワードは6文字以上で入力してください');
      return false;
    }
    return true;
  };

  const handleRegister = async (): Promise<void> => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await AuthService.register({
        username: username.trim(),
        email: email.trim(),
        password
      });

      Alert.alert('成功', '登録が完了しました', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error: any) {
      Alert.alert('エラー', error.message || '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const isEmailValid = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>新規登録</Title>
          
          <TextInput
            label="ユーザー名"
            value={username}
            onChangeText={setUsername}
            mode="outlined"
            style={styles.input}
            disabled={loading}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <TextInput
            label="メールアドレス"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            disabled={loading}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <HelperText type="error" visible={email.length > 0 && !isEmailValid(email)}>
            有効なメールアドレスを入力してください
          </HelperText>
          
          <TextInput
            label="パスワード"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            style={styles.input}
            disabled={loading}
            secureTextEntry
            autoCapitalize="none"
          />
          <HelperText type="info" visible={password.length > 0 && password.length < 6}>
            パスワードは6文字以上で入力してください
          </HelperText>
          
          <TextInput
            label="パスワード確認"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            style={styles.input}
            disabled={loading}
            secureTextEntry
            autoCapitalize="none"
          />
          <HelperText type="error" visible={confirmPassword.length > 0 && password !== confirmPassword}>
            パスワードが一致しません
          </HelperText>
          
          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            登録
          </Button>
          
          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
            style={styles.linkButton}
          >
            既にアカウントをお持ちの方はこちら
          </Button>
        </Card.Content>
      </Card>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  card: {
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
    fontSize: 24,
  },
  input: {
    marginBottom: 10,
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
  },
  linkButton: {
    marginTop: 10,
  },
});

export default RegisterScreen;
