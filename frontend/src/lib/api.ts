import axios from 'axios';
import { AuthService } from './auth';

const API_BASE_URL = 'http://localhost:3000/api';

class ApiService {
  private getAuthHeaders() {
    const token = AuthService.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // ルーム一覧取得
  async getRooms() {
    try {
      const response = await axios.get(`${API_BASE_URL}/lobby/rooms`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'ルーム一覧の取得に失敗しました');
    }
  }

  // ルーム作成
  async createRoom(roomName: string, maxPlayers: number = 4, gameSettings: Record<string, any> = {}) {
    try {
      const response = await axios.post(`${API_BASE_URL}/lobby/rooms`, {
        room_name: roomName,
        max_players: maxPlayers,
        game_settings: gameSettings
      }, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'ルームの作成に失敗しました');
    }
  }

  // ルーム参加
  async joinRoom(roomId: number) {
    try {
      const response = await axios.post(`${API_BASE_URL}/lobby/rooms/${roomId}/join`, {}, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'ルームへの参加に失敗しました');
    }
  }

  // ルーム退出
  async leaveRoom(roomId: number) {
    try {
      const response = await axios.post(`${API_BASE_URL}/lobby/rooms/${roomId}/leave`, {}, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'ルームからの退出に失敗しました');
    }
  }

  // ゲーム開始
  async startGame(roomId: number) {
    try {
      const response = await axios.post(`${API_BASE_URL}/lobby/rooms/${roomId}/start`, {}, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'ゲームの開始に失敗しました');
    }
  }
}

export const apiService = new ApiService();
