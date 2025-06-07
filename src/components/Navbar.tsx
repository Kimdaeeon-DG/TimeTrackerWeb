"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { FaGithub } from 'react-icons/fa';

export default function Navbar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  
  const isActive = (path: string) => {
    return pathname === path ? 'bg-blue-700' : '';
  };

  return (
    <nav className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 font-bold text-xl">
              TimeTracker
            </Link>
          </div>
          <div className="flex items-center">
            {user ? (
              <>
                <Link 
                  href="/dashboard" 
                  className={`px-3 py-2 rounded-md text-sm font-medium mx-1 hover:bg-blue-700 ${isActive('/dashboard')}`}
                >
                  대시보드
                </Link>
                <Link 
                  href="/timer" 
                  className={`px-3 py-2 rounded-md text-sm font-medium mx-1 hover:bg-blue-700 ${isActive('/timer')}`}
                >
                  출퇴근 기록
                </Link>
                <Link 
                  href="/profile" 
                  className={`px-3 py-2 rounded-md text-sm font-medium mx-1 hover:bg-blue-700 ${isActive('/profile')}`}
                >
                  프로필
                </Link>
                <button 
                  onClick={signOut}
                  className="px-3 py-2 rounded-md text-sm font-medium mx-1 hover:bg-blue-700"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <Link 
                href="/login" 
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium mx-1 hover:bg-blue-700 ${isActive('/login')}`}
              >
                <FaGithub className="mr-2" />
                로그인
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
