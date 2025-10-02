import axios, { AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthRequest, RegisterRequest, GuestRequest, AuthResponse, User } from '../types';

const API_BASE_URL = 'http://localhost:3000/api';

class AuthService {
  // ユーザー登録
  static async register(username: string, email: string, password: string): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await axios.post(`${API_BASE_URL}/auth/register`, {
        username,
        email,
        password
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '登録に失敗しました');
    }
  }

  // ログイン
  static async login(username: string, password: string): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'ログインに失敗しました');
    }
  }

  // ゲストログイン
  static async guestLogin(username: string): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await axios.post(`${API_BASE_URL}/auth/guest`, {
        username
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'ゲストログインに失敗しました');
    }
  }

  // トークン検証
  static async verifyToken(token: string): Promise<User | null> {
    try {
      const response: AxiosResponse<{ valid: boolean; user: User }> = await axios.get(`${API_BASE_URL}/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data.user;
    } catch (error) {
      return null;
    }
  }

  // プロフィール取得
  static async getProfile(token: string): Promise<User> {
    try {
      const response: AxiosResponse<{ user: User }> = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data.user;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'プロフィール取得に失敗しました');
    }
  }

  // プロフィール更新
  static async updateProfile(token: string, username: string, email: string): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await axios.put(`${API_BASE_URL}/auth/profile`, {
        username,
        email
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'プロフィール更新に失敗しました');
    }
  }

  // ログアウト
  static async logout(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem('authToken');
      return true;
    } catch (error) {
      throw new Error('ログアウトに失敗しました');
    }
  }
}

export { AuthService };
