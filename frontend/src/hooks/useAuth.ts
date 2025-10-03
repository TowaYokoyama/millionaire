'use client';

import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/auth';
import { socketService } from '@/lib/socket';
import { User } from '@/types';

export function useAuth() {
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
      const response = await AuthService.login(username, password);
      AuthService.setToken(response.token);
      setUser(response.user);
      setIsAuthenticated(true);
      socketService.connect(response.token);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await AuthService.register(username, email, password);
      AuthService.setToken(response.token);
      setUser(response.user);
      setIsAuthenticated(true);
      socketService.connect(response.token);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const guestLogin = async (username: string) => {
    try {
      const response = await AuthService.guestLogin(username);
      AuthService.setToken(response.token);
      setUser(response.user);
      setIsAuthenticated(true);
      socketService.connect(response.token);
      return response;
    } catch (error) {
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

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    guestLogin,
    logout,
    checkAuthStatus
  };
}