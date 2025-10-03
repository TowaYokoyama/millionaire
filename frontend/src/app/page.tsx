'use client';

import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/LoginForm';
import Lobby from '@/components/Lobby';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Lobby /> : <LoginForm />;
}