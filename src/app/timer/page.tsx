"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { getTimeEntriesByDate, createCheckInEntry, updateCheckOutEntry, updateTimeEntry, deleteTimeEntry } from '../../lib/timeEntries';

// Supabase 테이블 스키마에 맞게 타입 정의 수정
interface TimeEntry {
  id: string;
  date: string;
  check_in: string;
  check_out: string | null;
  working_hours: number | null;
}

export default function AttendancePage() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);
  const [workingHours, setWorkingHours] = useState<string | null>(null);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editCheckInTime, setEditCheckInTime] = useState<string>('');
  const [editCheckOutTime, setEditCheckOutTime] = useState<string>('');
  const [todayTotalWorkingHours, setTodayTotalWorkingHours] = useState<number>(0);
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);
  
  // 로딩 및 에러 상태 추가
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Supabase에서 오늘의 기록을 불러옵니다
  useEffect(() => {
    loadTodayRecords();
  }, []);
  
  // 현재 시간을 1초마다 업데이트
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    // 클라이언트 사이드에서만 시간 설정
    setIsClient(true);
    setCurrentTime(new Date());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const loadTodayRecords = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 환경 변수 확인
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('Supabase 환경 변수가 설정되지 않았습니다');
        setError('Supabase 설정이 올바르지 않습니다. 관리자에게 문의하세요.');
        setIsLoading(false);
        return;
      }
      
      console.log('기록 불러오기 시작...');
      const today = format(new Date(), 'yyyy-MM-dd');
      console.log('오늘 날짜:', today);
      
      const entries = await getTimeEntriesByDate(today);
      console.log('불러온 기록:', entries);
      
      setTodayEntries(entries);
      
      // 오늘의 총 근무 시간 계산
      let totalHours = 0;
      if (entries && entries.length > 0) {
        totalHours = entries.reduce((total, entry) => {
          // 완료된 기록만 계산에 포함
          if (entry.working_hours !== null) {
            return total + entry.working_hours;
          }
          // 현재 진행 중인 기록은 현재 시간까지 계산
          else if (entry.check_in && !entry.check_out) {
            const checkInTime = new Date(entry.check_in);
            const now = new Date();
            const diffHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
            return total + diffHours;
          }
          return total;
        }, 0);
      }
      setTodayTotalWorkingHours(totalHours);
      
      // 마지막 출근 기록 확인
      if (entries && entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        console.log('마지막 기록:', lastEntry);
        
        if (lastEntry && lastEntry.check_in && !lastEntry.check_out) {
          // 출근만 했고 퇴근은 안 한 상태
          console.log('출근 상태 감지됨');
          setIsCheckedIn(true);
          setCheckInTime(new Date(lastEntry.check_in));
        } else {
          // 출퇴근 모두 완료한 상태
          console.log('출근 상태 아님');
          setIsCheckedIn(false);
        }
      } else {
        // 기록 없음
        console.log('오늘 기록 없음');
        setIsCheckedIn(false);
      }
    } catch (err) {
      console.error('Error loading today\'s records:', err);
      setError(`기록을 불러오는 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      console.log('기록 불러오기 완료');
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 환경 변수 확인
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('Supabase 환경 변수가 설정되지 않았습니다');
        setError('Supabase 설정이 올바르지 않습니다. 관리자에게 문의하세요.');
        setIsLoading(false);
        return;
      }
      
      console.log('출근 처리 시작...');
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      console.log('출근 시간:', now.toISOString());
      
      // Supabase에 새 출근 기록 저장
      const newEntry = await createCheckInEntry(today, now.toISOString());
      console.log('생성된 출근 기록:', newEntry);
      
      if (newEntry) {
        setIsCheckedIn(true);
        setCheckInTime(now);
        setCheckOutTime(null);
        setWorkingHours(null);
        
        // 오늘의 기록 다시 불러오기
        console.log('출근 처리 성공, 기록 다시 불러오기');
        await loadTodayRecords();
      } else {
        setError('출근 기록 생성에 실패했습니다.');
      }
    } catch (err) {
      console.error('Error checking in:', err);
      setError(`출근 처리 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      console.log('출근 처리 완료');
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!checkInTime) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const now = new Date();
      
      // 근무 시간 계산 (시간 단위)
      const diffMs = now.getTime() - checkInTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const hours = Math.floor(diffHours);
      const minutes = Math.round((diffHours - hours) * 60);
      const workingHoursText = `${hours}시간 ${minutes}분`;
      
      // 마지막 출근 기록 찾기
      if (todayEntries.length > 0) {
        const lastEntry = todayEntries[todayEntries.length - 1];
        
        // Supabase에 퇴근 시간 업데이트
        const updatedEntry = await updateCheckOutEntry(
          lastEntry.id,
          now.toISOString(),
          diffHours
        );
        
        if (updatedEntry) {
          setIsCheckedIn(false);
          setCheckOutTime(now);
          setWorkingHours(workingHoursText);
          
          // 오늘의 기록 다시 불러오기
          loadTodayRecords();
        }
      }
    } catch (err) {
      console.error('Error checking out:', err);
      setError('퇴근 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 기록 수정 시작
  const startEditing = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditDate(entry.date);
    setEditCheckInTime(entry.check_in ? format(parseISO(entry.check_in), 'HH:mm') : '');
    setEditCheckOutTime(entry.check_out ? format(parseISO(entry.check_out), 'HH:mm') : '');
  };
  
  // 기록 수정 취소
  const cancelEditing = () => {
    setEditingEntry(null);
  };
  
  // 기록 수정 저장
  const saveEditedEntry = async () => {
    if (!editingEntry) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // 날짜와 시간 문자열을 Date 객체로 변환
      const [year, month, day] = editDate.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      
      const [checkInHours, checkInMinutes] = editCheckInTime.split(':').map(Number);
      const checkInDate = new Date(dateObj);
      checkInDate.setHours(checkInHours, checkInMinutes, 0);
      
      let checkOutDate: Date | null = null;
      if (editCheckOutTime) {
        const [checkOutHours, checkOutMinutes] = editCheckOutTime.split(':').map(Number);
        checkOutDate = new Date(dateObj);
        checkOutDate.setHours(checkOutHours, checkOutMinutes, 0);
      }
      
      // 근무 시간 계산
      let workingHoursValue = null;
      if (checkInDate && checkOutDate) {
        let diffMs = checkOutDate.getTime() - checkInDate.getTime();
        
        // 만약 차이가 음수이면 날짜가 바뀌었다고 간주
        if (diffMs < 0) {
          // 퇴근 시간에 24시간(86400000ms) 추가
          const oneDayMs = 24 * 60 * 60 * 1000;
          diffMs += oneDayMs;
        }
        
        workingHoursValue = diffMs / (1000 * 60 * 60);
      }
      
      // Supabase에 수정된 기록 업데이트 (날짜 포함)
      const updatedEntry = await updateTimeEntry(
        editingEntry.id,
        checkInDate.toISOString(),
        checkOutDate ? checkOutDate.toISOString() : null,
        workingHoursValue,
        editDate // 수정된 날짜 전달
      );
      
      if (updatedEntry) {
        setEditingEntry(null);
        // 오늘의 기록 다시 불러오기
        loadTodayRecords();
      }
    } catch (err) {
      console.error('Error updating entry:', err);
      setError('기록 수정 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 기록 삭제
  const deleteEntryHandler = async (entryId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Supabase에서 기록 삭제
      const success = await deleteTimeEntry(entryId);
      
      if (success) {
        // 오늘의 기록 다시 불러오기
        loadTodayRecords();
      }
    } catch (err) {
      console.error('Error deleting entry:', err);
      setError('기록 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 근무 시간 포맷팅
  const formatWorkingHours = (hours: number | null) => {
    if (hours === null) return '-';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}시간 ${minutes}분`;
  };
  
  // 스와이프 기능을 위한 변수
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // 터치 시작 이벤트 처리
  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(null); // 초기화
  };
  
  // 터치 이동 이벤트 처리
  const handleTouchMove = (e: React.TouchEvent, id: string) => {
    setTouchEnd(e.targetTouches[0].clientX);
    
    // 왼쪽으로 스와이프하면 삭제 버튼 표시
    if (touchStart && touchEnd && touchStart - touchEnd > 50) {
      setActiveSwipeId(id);
    } else if (touchStart && touchEnd && touchEnd - touchStart > 50) {
      // 오른쪽으로 스와이프하면 삭제 버튼 숨김
      setActiveSwipeId(null);
    }
  };
  
  // 터치 종료 이벤트 처리
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    // 터치 상태 초기화
    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">출퇴근 기록</h1>
        <Link href="/dashboard" className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700">
          대시보드로 이동
        </Link>
      </div>
      
      {/* 로딩 및 에러 상태 표시 */}
      {isLoading && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6 text-center">
          <p className="text-blue-700">기록을 불러오는 중...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 p-4 rounded-lg mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <div className="flex flex-col items-center justify-center bg-white shadow rounded-lg p-8 mb-6">
        <div className="text-xl mb-6">
          {isClient ? format(currentTime || new Date(), 'yyyy년 MM월 dd일') : ''}
        </div>
        
        <div className="text-4xl font-mono mb-6">
          {isClient ? format(currentTime || new Date(), 'HH:mm:ss') : ''}
        </div>
        
        <div className="flex space-x-4">
          {!isCheckedIn ? (
            <button
              className="bg-green-500 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-600"
              onClick={handleCheckIn}
              disabled={isLoading}
            >
              출근하기
            </button>
          ) : (
            <button
              className="bg-red-500 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-red-600"
              onClick={handleCheckOut}
              disabled={isLoading}
            >
              퇴근하기
            </button>
          )}
        </div>
      </div>
      
      {/* 오늘의 근무 시간 요약 - 삭제 */}
      
      {/* 오늘의 출퇴근 기록 목록 */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">오늘의 출퇴근 기록</h2>
        <p className="text-sm text-gray-500 mb-4">총 근무시간: {formatWorkingHours(todayTotalWorkingHours)}</p>
        
        {isLoading ? (
          <p className="text-center py-4">기록을 불러오는 중...</p>
        ) : todayEntries.length > 0 ? (
          <div className="overflow-hidden">
            {/* 모바일용 스와이프 삭제 기능이 있는 리스트 */}
            <div className="divide-y divide-gray-200">
              {todayEntries.map((entry) => (
                <div key={entry.id} className="relative">
                  {editingEntry?.id === entry.id ? (
                    // 수정 모드
                    <div className="p-4 bg-blue-50">
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-500 mb-1">날짜</label>
                        <input 
                          type="date" 
                          value={editDate} 
                          onChange={(e) => setEditDate(e.target.value)}
                          className="border rounded px-2 py-1 w-full"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">출근 시간</label>
                          <input 
                            type="time" 
                            value={editCheckInTime} 
                            onChange={(e) => setEditCheckInTime(e.target.value)}
                            className="border rounded px-2 py-1 w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">퇴근 시간</label>
                          <input 
                            type="time" 
                            value={editCheckOutTime} 
                            onChange={(e) => setEditCheckOutTime(e.target.value)}
                            className="border rounded px-2 py-1 w-full"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={saveEditedEntry}
                          className="bg-green-500 text-white px-4 py-1 rounded text-sm"
                        >
                          저장
                        </button>
                        <button 
                          onClick={cancelEditing}
                          className="bg-gray-500 text-white px-4 py-1 rounded text-sm"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 읽기 모드 - 스와이프 기능 추가 (터치 시 스와이프 없이 수정 모드로 전환되도록 수정)
                    <div className="relative overflow-hidden">
                      {/* 삭제 버튼 (스와이프로만 노출) */}
                      <div className="absolute right-0 top-0 bottom-0 bg-red-500 text-white flex items-center justify-center w-16">
                        <button 
                          onClick={() => deleteEntryHandler(entry.id)}
                          className="w-full h-full flex items-center justify-center"
                        >
                          삭제
                        </button>
                      </div>
                      
                      {/* 기록 내용 (클릭하면 수정 모드로 전환) */}
                      <div 
                        className={`p-4 bg-white flex justify-between items-center cursor-pointer transform transition-transform duration-200 ${activeSwipeId === entry.id ? '-translate-x-16' : 'translate-x-0'}`}
                        onClick={() => startEditing(entry)}
                        onTouchStart={(e) => handleTouchStart(e, entry.id)}
                        onTouchMove={(e) => handleTouchMove(e, entry.id)}
                        onTouchEnd={() => handleTouchEnd()}
                      >
                        <div>
                          <div className="font-medium">
                            {entry.check_in ? format(new Date(entry.check_in), 'HH:mm') : '-'} ~ {entry.check_out ? format(new Date(entry.check_out), 'HH:mm') : '진행중'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {entry.working_hours ? formatWorkingHours(entry.working_hours) : '-'}
                          </div>
                        </div>
                        <div className="text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">오늘의 출퇴근 기록이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
