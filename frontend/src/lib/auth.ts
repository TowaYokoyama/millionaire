import axios, { AxiosResponse } from 'axios';
import { AuthRequest, RegisterRequest, GuestRequest, AuthResponse, User } from '@/types';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + '/api';

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

  // トークン保存
  static setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  // トークン取得
  static getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  }

  // ログアウト
  static async logout(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
      }
      return true;
    } catch (error) {
      throw new Error('ログアウトに失敗しました');
    }
  }
}

export { AuthService };
