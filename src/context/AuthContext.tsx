"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// AuthContext에서 제공할 값들의 타입 정의
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

// Context 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider 컴포넌트
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 로그아웃 함수
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  // 사용자 세션 변경 감지
  useEffect(() => {
    // 현재 세션 가져오기
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // 세션 변경 구독
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Google 로그인
  const signInWithGoogle = async () => {
    try {
      // 모바일 환경 감지
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      // 리디렉션 URL 로그 출력
      const redirectUrl = window.location.origin + '/auth/callback';
      console.log('사용되는 리디렉션 URL:', redirectUrl);
      console.log('현재 웹사이트 주소:', window.location.origin);
      console.log('모바일 환경:', isMobile ? '예' : '아니오');
      console.log('iOS 환경:', isIOS ? '예' : '아니오');
      
      // Google OAuth 로그인 시도
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          // 모바일 환경에서는 추가 옵션 설정
          ...(isMobile && {
            skipBrowserRedirect: false,
            queryParams: {
              prompt: 'select_account',
              access_type: 'offline'
            }
          })
        }
      });
      
      if (error) {
        console.error('Google 로그인 오류:', error);
        throw error;
      }
    } catch (error) {
      console.error('Google 로그인 오류:', error);
    }
  };

  // Context Provider 반환
  return (
    <AuthContext.Provider value={{ user, isLoading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// 커스텀 훅
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다');
  }
  return context;
}
