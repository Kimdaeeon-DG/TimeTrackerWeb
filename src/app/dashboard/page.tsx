"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, parseISO, differenceInHours, differenceInMinutes, isAfter, isSameDay, addDays, startOfDay, endOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getAllTimeEntries, updateTimeEntry, deleteTimeEntry } from '../../lib/timeEntries';
import { getWorkSchedulesByMonth } from '../../lib/workSchedules';

interface TimeEntry {
  id: string;
  date: string;
  check_in: string;
  check_out: string | null;
  working_hours: number | null;
}

interface WorkSchedule {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  planned_hours: number;
}

export default function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [totalWorkingHours, setTotalWorkingHours] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateEntries, setSelectedDateEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // 오늘의 근무 시간 관련 상태 추가
  const [actualHoursToday, setActualHoursToday] = useState<number>(0);
  const [plannedHoursToday, setPlannedHoursToday] = useState<number>(0);
  const [remainingHoursToday, setRemainingHoursToday] = useState<number>(0);
  
  // 기록 수정을 위한 상태
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editCheckInTime, setEditCheckInTime] = useState<string>('');
  const [editCheckOutTime, setEditCheckOutTime] = useState<string>('');
  
  // 환경 변수 확인
  useEffect(() => {
    console.log('Dashboard 페이지 로드됨');
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '설정됨' : '설정되지 않음');
    console.log('Supabase Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '설정됨' : '설정되지 않음');
    
    // 환경 변수가 없으면 오류 표시
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError('환경 변수가 설정되지 않았습니다. .env.local 파일에 Supabase URL과 Anon Key를 설정해주세요.');
      setIsLoading(false);
      return;
    }
  }, []);

  // Supabase에서 근무 기록과 근무 계획 불러오기
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        
        // 근무 기록 불러오기
        const entries = await getAllTimeEntries();
        console.log('Loaded entries:', entries);
        setTimeEntries(entries || []);
        
        // 근무 계획 불러오기
        const schedules = await getWorkSchedulesByMonth(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1
        );
        console.log('Loaded work schedules:', schedules);
        setWorkSchedules(schedules || []);
        
        // 현재 월에 해당하는 기록만 필터링
        const currentMonthStr = format(currentMonth, 'yyyy-MM');
        const currentMonthEntries = entries ? entries.filter(entry => entry.date.startsWith(currentMonthStr)) : [];
        
        // 현재 월의 총 근무 시간 계산
        let totalHours = 0;
        if (currentMonthEntries.length > 0) {
          currentMonthEntries.forEach((entry) => {
            if (entry.working_hours) {
              totalHours += entry.working_hours;
            }
          });
        }
        setTotalWorkingHours(totalHours);
        
        // 오늘 날짜 구하기
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');
        
        // 오늘의 계획된 근무 시간 계산
        const todaySchedules = schedules ? schedules.filter(schedule => schedule.date === todayStr) : [];
        let plannedHours = 0;
        todaySchedules.forEach(schedule => {
          plannedHours += parseFloat(schedule.planned_hours.toString());
        });
        setPlannedHoursToday(plannedHours);
        
        // 오늘의 실제 근무 시간 계산
        const todayEntries = entries ? entries.filter(entry => entry.date === todayStr) : [];
        let actualHours = 0;
        todayEntries.forEach(entry => {
          if (entry.working_hours !== null) {
            // 완료된 근무 시간 추가
            actualHours += parseFloat(entry.working_hours.toString());
          } else if (entry.check_in && !entry.check_out) {
            // 현재 진행 중인 근무 시간 계산
            const checkInTime = new Date(entry.check_in);
            const currentTime = new Date(); // 현재 시간 사용
            const diffHours = (currentTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
            actualHours += diffHours;
          }
        });
        setActualHoursToday(actualHours);
        
        // 남은 근무 시간 계산 (계획 시간이 0이면 남은 시간도 0으로 설정)
        const remainingHours = plannedHours > 0 ? Math.max(0, plannedHours - actualHours) : 0;
        setRemainingHoursToday(remainingHours);
        
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error loading data:', err);
        setError(`데이터를 불러오는 중 오류가 발생했습니다: ${err.message || String(err)}`);
        setIsLoading(false);
      }
    }
    
    // 환경 변수가 있을 때만 데이터 로드
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      loadData();
    }
  }, [currentMonth]);
  
  // 이전 달로 이동
  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  // 다음 달로 이동
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  // 달력 헤더 (요일)
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  
  // 현재 달의 모든 날짜 가져오기
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // 달력의 첫 번째 날의 요일 (0: 일요일, 1: 월요일, ...)
  const startDay = getDay(monthStart);
  
  // 날짜 선택 시 해당 날짜의 기록 표시 (시간 순서대로 정렬)
  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    const entriesForDate = timeEntries.filter(entry => entry.date === date)
      .sort((a, b) => {
        // check_in 시간을 기준으로 오름차순 정렬
        const timeA = a.check_in ? new Date(a.check_in).getTime() : 0;
        const timeB = b.check_in ? new Date(b.check_in).getTime() : 0;
        return timeA - timeB;
      });
    setSelectedDateEntries(entriesForDate);
  };
  
  // 근무 시간 포맷팅 함수
  function formatWorkingHours(hours: number, compact: boolean = false): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    
    if (compact) {
      // 간결한 형식 (예: 3.5h)
      return `${h}.${Math.floor(m / 6)}h`;
    } else {
      // 기존 형식 (예: 3시간 30분)
      return `${h}시간 ${m}분`;
    }
  }
  
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
        
        // 날짜가 바뀌는 경우 처리 (자정을 넘어가는 경우)
        // 이 부분은 데이터베이스에 저장되는 총 근무 시간이므로 그대로 유지
        // 실제 날짜별 분할은 달력 표시 시 계산됨
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
        // 전체 기록 다시 불러오기
        const entries = await getAllTimeEntries();
        setTimeEntries(entries || []);
        
        // 선택한 날짜의 기록 다시 불러오기
        if (selectedDate) {
          const entriesForDate = entries.filter(entry => entry.date === selectedDate);
          setSelectedDateEntries(entriesForDate);
        }
        
        // 날짜가 변경되었다면 새 날짜로 선택 변경
        if (editDate !== editingEntry.date) {
          setSelectedDate(editDate);
          const entriesForNewDate = entries.filter(entry => entry.date === editDate)
            .sort((a, b) => {
              // check_in 시간을 기준으로 오름차순 정렬
              const timeA = a.check_in ? new Date(a.check_in).getTime() : 0;
              const timeB = b.check_in ? new Date(b.check_in).getTime() : 0;
              return timeA - timeB;
            });
          setSelectedDateEntries(entriesForNewDate);
        }
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
        // 전체 기록 다시 불러오기
        const entries = await getAllTimeEntries();
        setTimeEntries(entries || []);
        
        // 선택한 날짜의 기록 다시 불러오기
        if (selectedDate) {
          const entriesForDate = entries.filter(entry => entry.date === selectedDate);
          setSelectedDateEntries(entriesForDate);
        }
      }
    } catch (err) {
      console.error('Error deleting entry:', err);
      setError('기록 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">근무 기록 대시보드</h1>
        <Link 
          href="/timer" 
          className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          출퇴근 기록
        </Link>
      </div>
      
      {/* 로딩 상태 표시 */}
      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3">데이터를 불러오는 중...</span>
        </div>
      )}
      
      {/* 오류 상태 표시 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <p>{error}</p>
          <p className="text-sm mt-2">Supabase 연결 및 환경 변수를 확인해주세요.</p>
        </div>
      )}
      
      {/* 총 근무 시간 요약 */}
      {!isLoading && !error && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">근무 시간 요약</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-600">오늘 총 근무 시간</p>
              <p className="text-2xl font-bold">{formatWorkingHours(actualHoursToday)}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-gray-600">오늘 남은 근무 시간</p>
              <p className="text-2xl font-bold">
                {plannedHoursToday > 0 
                  ? formatWorkingHours(remainingHoursToday)
                  : '계획된 근무 없음'}
              </p>
            </div>
          </div>
          
          {/* 오늘 기준 근무 계획 대비 진행률 게이지바 */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <p className="text-gray-600">오늘 계획 진행률</p>
              <p className="text-sm font-medium">
                {plannedHoursToday === 0 ? '0%' : 
                  `${Math.min(Math.round((actualHoursToday / plannedHoursToday) * 100), 100)}% (${formatWorkingHours(actualHoursToday)} / ${formatWorkingHours(plannedHoursToday)})`
                }
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              {plannedHoursToday === 0 ? 
                <div className="w-0 h-2.5 rounded-full bg-blue-600"></div> :
                <div 
                  className="h-2.5 rounded-full bg-blue-600" 
                  style={{ width: `${Math.min(Math.round((actualHoursToday / plannedHoursToday) * 100), 100)}%` }}
                ></div>
              }
            </div>
          </div>
        </div>
      )}
      
      {/* 달력 */}
      {!isLoading && !error && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <button 
              onClick={prevMonth}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              &lt;
            </button>
            <h2 className="text-xl font-semibold">
              {format(currentMonth, 'yyyy년 MM월', { locale: ko })}
            </h2>
            <button 
              onClick={nextMonth}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              &gt;
            </button>
          </div>
        
          <div className="grid grid-cols-7 gap-1">
            {/* 요일 헤더 */}
          {weekDays.map((day) => (
            <div key={day} className="text-center font-semibold p-2">
              {day}
            </div>
          ))}
          
          {/* 빈 칸 채우기 (월의 첫 날 이전) */}
          {Array.from({ length: startDay }).map((_, index) => (
            <div key={`empty-${index}`} className="p-2"></div>
          ))}
          
          {/* 날짜 */}
          {monthDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayStart = startOfDay(day);
            const dayEnd = endOfDay(day);
            
            // 해당 날짜에 속한 근무 시간 계산 (날짜가 넘어가는 경우 분할 계산)
            let totalHours = 0;
            
            // 모든 기록에 대해 확인
            timeEntries.forEach(entry => {
              if (!entry.check_in || !entry.check_out) return;
              
              const checkIn = parseISO(entry.check_in);
              const checkOut = parseISO(entry.check_out);
              
              // 해당 날짜에 속하는 시간 계산
              if (
                (checkIn <= dayEnd && checkOut >= dayStart) || // 근무 시간이 현재 날짜와 겹치는 경우
                (checkIn <= dayEnd && checkOut < dayStart && !isSameDay(checkIn, checkOut)) // 날짜를 넘어가는 경우
              ) {
                // 해당 날짜의 시작과 끝 시간 계산
                const periodStart = checkIn > dayStart ? checkIn : dayStart;
                const periodEnd = checkOut < dayEnd ? checkOut : dayEnd;
                
                // 음수가 되지 않도록 체크
                if (isAfter(periodEnd, periodStart)) {
                  const hoursWorked = differenceInHours(periodEnd, periodStart) + 
                                      (differenceInMinutes(periodEnd, periodStart) % 60) / 60;
                  totalHours += hoursWorked;
                }
              }
            });
            
            // 해당 날짜의 근무 계획 찾기
            const schedulesForDate = workSchedules.filter(schedule => schedule.date === dateStr);
            
            // 총 계획 시간 계산
            let totalPlannedHours = 0;
            schedulesForDate.forEach(schedule => {
              totalPlannedHours += parseFloat(schedule.planned_hours.toString());
            });
            
            const hasRecord = totalHours > 0;
            const hasSchedule = schedulesForDate.length > 0;
            const isSelected = selectedDate === dateStr;
            
            // 근무 시간에 따른 배경색 계산
            let bgColorClass = '';
            if (hasRecord) {
              if (totalHours >= 8) {
                bgColorClass = 'bg-green-100';
              } else if (totalHours >= 4) {
                bgColorClass = 'bg-yellow-100';
              } else if (totalHours > 0) {
                bgColorClass = 'bg-red-100';
              }
            }
            
            return (
              <div 
                key={dateStr} 
                className={`p-2 min-h-[60px] border ${isSelected ? 'border-blue-500' : 'border-gray-200'} ${bgColorClass} cursor-pointer hover:bg-gray-50`}
                onClick={() => handleDateClick(dateStr)}
              >
                <div className={`font-medium ${getDay(day) === 6 ? 'text-blue-600' : getDay(day) === 0 ? 'text-red-600' : ''}`}>
                  {format(day, 'd')}
                </div>
                {/* 실제 근무 시간 표시 */}
                {hasRecord && (
                  <div className="text-xs mt-1 text-gray-600">
                    {formatWorkingHours(totalHours, true)}
                  </div>
                )}
                
                {/* 근무 계획 표시 - 계획: 텍스트 없이 숫자만 */}
                {hasSchedule && (
                  <div className="text-xs mt-1 text-green-600">
                    {formatWorkingHours(totalPlannedHours, true)}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      )}
      
      {/* 선택한 날짜의 출퇴근 기록 */}
      {selectedDateEntries.length > 0 ? (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {selectedDate ? format(parseISO(selectedDate), 'yyyy년 MM월 dd일') : format(new Date(), 'yyyy년 MM월 dd일')} 출퇴근 기록
          </h2>
          <div className="overflow-hidden">
            <div className="divide-y divide-gray-200">
              {selectedDateEntries.map((entry) => (
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
                    // 읽기 모드 - 스와이프 기능 추가
                    <div className="group overflow-hidden touch-pan-x">
                      {/* 삭제 버튼 (스와이프로만 노출) */}
                      <div className="absolute right-0 top-0 bottom-0 bg-red-500 text-white flex items-center justify-center w-16 transform translate-x-full group-[.swiped]:translate-x-0 transition-transform duration-200">
                        <button 
                          onClick={() => deleteEntryHandler(entry.id)}
                          className="w-full h-full flex items-center justify-center"
                        >
                          삭제
                        </button>
                      </div>
                      
                      {/* 기록 내용 (클릭하면 수정 모드로 전환) */}
                      <div 
                        className="p-4 bg-white flex justify-between items-center transform group-[.swiped]:-translate-x-16 transition-transform duration-200 cursor-pointer"
                        onClick={() => startEditing(entry)}
                        onTouchStart={(e) => {
                          // 터치 시작 위치 저장
                          e.currentTarget.dataset.touchStartX = e.touches[0].clientX.toString();
                        }}
                        onTouchMove={(e) => {
                          const touchStartX = parseInt(e.currentTarget.dataset.touchStartX || '0');
                          const currentX = e.touches[0].clientX;
                          const diff = touchStartX - currentX;
                          
                          // 왼쪽으로 스와이프하는 경우 (diff > 0)
                          if (diff > 50) { // 50px 이상 스와이프 시 활성화
                            e.currentTarget.parentElement?.classList.add('swiped');
                          } else if (diff < -50) { // 오른쪽으로 스와이프하면 원래대로
                            e.currentTarget.parentElement?.classList.remove('swiped');
                          }
                        }}
                        onTouchEnd={() => {}}
                      >
                        <div className="flex items-center space-x-2">
                          <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              {entry.check_in ? format(parseISO(entry.check_in), 'HH:mm') : '-'} ~ {entry.check_out ? format(parseISO(entry.check_out), 'HH:mm') : '진행중'}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {entry.working_hours ? formatWorkingHours(entry.working_hours, true) : '-'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        selectedDate && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {selectedDate ? format(parseISO(selectedDate), 'yyyy년 MM월 dd일') : format(new Date(), 'yyyy년 MM월 dd일')} 출퇴근 기록
            </h2>
            <p className="text-gray-500 text-center py-4">선택한 날짜의 출퇴근 기록이 없습니다.</p>
          </div>
        )
      )}
    </div>
  );
}
