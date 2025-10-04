'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthService } from '@/lib/auth';
import { socketService } from '@/lib/socket';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<any>;
  register: (username: string, email: string, password: string) => Promise<any>;
  guestLogin: (username: string) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = AuthService.getToken();
      if (token) {
        const userData = await AuthService.verifyToken(token);
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
          socketService.connect(token);
        }
      }
    } catch (error) {
      console.error('認証状態確認エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      console.log('ログイン処理開始');
      const response = await AuthService.login(username, password);
      console.log('ログインAPI成功:', response);
      AuthService.setToken(response.token);
      setUser(response.user);
      setIsAuthenticated(true);
      console.log('認証状態を更新しました: isAuthenticated=true');
      socketService.connect(response.token);
      return response;
    } catch (error) {
      console.error('ログインエラー:', error);
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      console.log('登録処理開始');
      const response = await AuthService.register(username, email, password);
      console.log('登録API成功:', response);
      AuthService.setToken(response.token);
      setUser(response.user);
      setIsAuthenticated(true);
      console.log('認証状態を更新しました: isAuthenticated=true');
      socketService.connect(response.token);
      return response;
    } catch (error) {
      console.error('登録エラー:', error);
      throw error;
    }
  };

  const guestLogin = async (username: string) => {
    try {
      console.log('ゲストログイン処理開始:', username);
      const response = await AuthService.guestLogin(username);
      console.log('ゲストログインAPI成功:', response);
      AuthService.setToken(response.token);
      setUser(response.user);
      setIsAuthenticated(true);
      console.log('認証状態を更新しました: isAuthenticated=true, user=', response.user);
      socketService.connect(response.token);
      return response;
    } catch (error) {
      console.error('ゲストログインエラー:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
      socketService.disconnect();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('ログアウトエラー:', error);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        register,
        guestLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

