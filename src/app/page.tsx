"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaGoogle, FaClock, FaChartBar, FaUserAlt } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { 
  getTimeEntriesByDate, 
  createCheckInEntry, 
  updateCheckOutEntry, 
  updateTimeEntry, 
  deleteTimeEntry 
} from '@/lib/timeEntries';

// TimeEntry 타입 정의
type TimeEntry = {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  working_hours: number | null;
  user_id?: string;
};

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [todayEntries, setTodayEntries] = useState<any[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);
  const [workingHours, setWorkingHours] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [editCheckInTime, setEditCheckInTime] = useState('');
  const [editCheckOutTime, setEditCheckOutTime] = useState('');
  
  useEffect(() => {
    setCurrentTime(new Date());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Supabase에서 오늘의 기록을 불러옵니다
  useEffect(() => {
    loadTodayRecords();
  }, []);
  
  const loadTodayRecords = async () => {
    try {
      setIsLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      const entries = await getTimeEntriesByDate(today);
      
      setTodayEntries(entries);
      
      // 마지막 출근 기록 확인
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        if (lastEntry && lastEntry.check_in && !lastEntry.check_out) {
          // 출근만 했고 퇴근은 안 한 상태
          setIsCheckedIn(true);
          setCheckInTime(new Date(lastEntry.check_in));
        } else {
          // 출퇴근 모두 완료한 상태
          setIsCheckedIn(false);
        }
      } else {
        // 기록 없음
        setIsCheckedIn(false);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error loading records:', err);
      setError('기록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      
      // Supabase에 새 출근 기록 저장
      const newEntry = await createCheckInEntry(today, now.toISOString());
      
      if (newEntry) {
        setIsCheckedIn(true);
        setCheckInTime(now);
        setCheckOutTime(null);
        setWorkingHours(null);
        
        // 기록 다시 불러오기
        loadTodayRecords();
      }
    } catch (err) {
      console.error('Error checking in:', err);
      setError('출근 기록 저장 중 오류가 발생했습니다.');
    }
  };

  const handleCheckOut = async () => {
    if (!checkInTime) return;
    
    try {
      const now = new Date();
      
      // 근무 시간 계산 (시간 단위)
      const diffMs = now.getTime() - checkInTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      // 마지막 출근 기록 찾기
      const lastEntry = todayEntries[todayEntries.length - 1];
      
      if (lastEntry) {
        // Supabase에 퇴근 시간 업데이트
        const updatedEntry = await updateCheckOutEntry(
          lastEntry.id,
          now.toISOString(),
          diffHours
        );
        
        if (updatedEntry) {
          setIsCheckedIn(false);
          setCheckOutTime(now);
          
          const hours = Math.floor(diffHours);
          const minutes = Math.round((diffHours - hours) * 60);
          setWorkingHours(`${hours}시간 ${minutes}분`);
          
          // 기록 다시 불러오기
          loadTodayRecords();
        }
      }
    } catch (err) {
      console.error('Error checking out:', err);
      setError('퇴근 기록 저장 중 오류가 발생했습니다.');
    }
  };

  // 기록 수정 시작
  const startEditing = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditCheckInTime(entry.check_in ? format(new Date(entry.check_in), 'HH:mm') : '');
    setEditCheckOutTime(entry.check_out ? format(new Date(entry.check_out), 'HH:mm') : '');
  };
  
  // 기록 수정 취소
  const cancelEditing = () => {
    setEditingEntry(null);
  };
  
  // 기록 수정 저장
  const saveEditedEntry = async () => {
    if (!editingEntry) return;
    
    try {
      // 시간 문자열을 Date 객체로 변환
      const todayDate = new Date();
      const today = format(todayDate, 'yyyy-MM-dd');
      
      const [checkInHours, checkInMinutes] = editCheckInTime.split(':').map(Number);
      const checkInDate = new Date(todayDate);
      checkInDate.setHours(checkInHours, checkInMinutes, 0);
      
      let checkOutDate: Date | null = null;
      if (editCheckOutTime) {
        const [checkOutHours, checkOutMinutes] = editCheckOutTime.split(':').map(Number);
        checkOutDate = new Date(todayDate);
        checkOutDate.setHours(checkOutHours, checkOutMinutes, 0);
      }
      
      // 근무 시간 계산
      let workingHoursValue = null;
      if (checkInDate && checkOutDate) {
        const diffMs = checkOutDate.getTime() - checkInDate.getTime();
        workingHoursValue = diffMs / (1000 * 60 * 60);
      }
      
      // Supabase에 수정된 기록 저장
      const updatedEntry = await updateTimeEntry(
        editingEntry.id,
        checkInDate.toISOString(),
        checkOutDate ? checkOutDate.toISOString() : null,
        workingHoursValue
      );
      
      if (updatedEntry) {
        // 기록 다시 불러오기
        loadTodayRecords();
        setEditingEntry(null);
      }
    } catch (err) {
      console.error('Error updating entry:', err);
      setError('기록 수정 중 오류가 발생했습니다.');
    }
  };
  
  // 기록 삭제
  const deleteEntryHandler = async (entryId: string) => {
    try {
      // Supabase에서 기록 삭제
      const success = await deleteTimeEntry(entryId);
      
      if (success) {
        // 기록 다시 불러오기
        loadTodayRecords();
      }
    } catch (err) {
      console.error('Error deleting entry:', err);
      setError('기록 삭제 중 오류가 발생했습니다.');
    }
  };
  
  // 로그인 페이지로 이동
  const goToLogin = () => {
    router.push('/login');
  };

  // 대시보드로 이동
  const goToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">TimeTracker</h1>
          <p className="text-xl text-gray-600 mb-8">효율적인 근무 시간 관리를 위한 최적의 솔루션</p>
          
          {!isLoading && (
            user ? (
              <div className="mt-8">
                <button 
                  onClick={goToDashboard}
                  className="bg-primary text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
                >
                  대시보드로 이동
                </button>
              </div>
            ) : (
              <div className="mt-8">
                <button 
                  onClick={goToLogin}
                  className="flex items-center justify-center mx-auto bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-md font-medium hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <FaGoogle className="mr-2 text-blue-500" />
                  Google로 시작하기
                </button>
                <p className="text-sm text-gray-500 mt-2">별도의 회원가입 없이 Google 계정으로 바로 이용할 수 있습니다.</p>
              </div>
            )
          )}
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4 mx-auto">
              <FaClock className="text-primary text-xl" />
            </div>
            <h3 className="text-xl font-semibold text-center mb-2">간편한 출퇴근 기록</h3>
            <p className="text-gray-600 text-center">버튼 클릭 한 번으로 출퇴근 시간을 기록하고 관리할 수 있습니다.</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4 mx-auto">
              <FaChartBar className="text-primary text-xl" />
            </div>
            <h3 className="text-xl font-semibold text-center mb-2">직관적인 대시보드</h3>
            <p className="text-gray-600 text-center">달력 형태의 대시보드로 월별 근무 시간을 한눈에 확인할 수 있습니다.</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4 mx-auto">
              <FaUserAlt className="text-primary text-xl" />
            </div>
            <h3 className="text-xl font-semibold text-center mb-2">개인화된 설정</h3>
            <p className="text-gray-600 text-center">사용자별 프로필 설정으로 자신만의 근무 시간 목표를 관리할 수 있습니다.</p>
          </div>
        </div>
        
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-xl font-semibold mb-4 text-center">현재 시간</h3>
          <p className="text-2xl font-bold text-center text-primary">
            {currentTime ? currentTime.toLocaleTimeString('ko-KR') : ''}
          </p>
        </div>
      </div>
    </div>
  );
}