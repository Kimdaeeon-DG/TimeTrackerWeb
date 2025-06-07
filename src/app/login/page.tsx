"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { FaGithub } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const { user, isLoading, signInWithGithub } = useAuth();
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<string>('');

  // 이미 로그인한 사용자는 대시보드로 리디렉션
  useEffect(() => {
    if (user && !isLoading) {
      router.push('/dashboard');
    }
    
    // 사용자 기기 정보 확인
    const userAgent = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);
    
    setDeviceInfo(`기기: ${isIOS ? 'iOS' : '기타'}, 브라우저: ${isSafari ? 'Safari' : '기타'}, UA: ${userAgent}`);
  }, [user, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary">TimeTracker</h1>
          <p className="mt-2 text-gray-600">효율적인 시간 관리를 시작하세요</p>
        </div>
        
        <div className="mt-8 space-y-6">
          <button
            onClick={async () => {
              try {
                setErrorMsg(null);
                // iOS 사파리에서 직접 인증 시도
                const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
                
                if (isIOS && isSafari) {
                  const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'github',
                    options: {
                      redirectTo: window.location.origin,
                    }
                  });
                  
                  if (error) {
                    setErrorMsg(`로그인 오류: ${error.message}`);
                  }
                } else {
                  // 다른 기기는 기존 함수 사용
                  await signInWithGithub();
                }
              } catch (err: any) {
                setErrorMsg(`오류 발생: ${err?.message || '알 수 없는 오류'}`);
              }
            }}
            className="flex items-center justify-center w-full px-4 py-3 space-x-3 text-white bg-gray-800 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <FaGithub className="w-5 h-5" />
            <span>GitHub로 로그인</span>
          </button>
          
          <div className="text-sm text-center text-gray-500">
            <p>GitHub 계정으로 로그인하면 별도의 회원가입 없이 바로 서비스를 이용할 수 있습니다.</p>
          </div>
          
          {/* 디버깅 정보 표시 */}
          {errorMsg && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {errorMsg}
            </div>
          )}
          
          <div className="mt-4 p-3 bg-gray-100 text-gray-700 rounded-md text-xs">
            <p className="font-bold">기기 정보:</p>
            <p className="break-all">{deviceInfo}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
