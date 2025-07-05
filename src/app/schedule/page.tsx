"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  getWorkSchedulesByMonth, 
  createOrUpdateWorkSchedule, 
  deleteWorkSchedule, 
  getWorkScheduleByDate 
} from '../../lib/timeEntries';

interface WorkSchedule {
  id: string;
  date: string;
  planned_hours: number;
  description: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export default function SchedulePlanner() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<WorkSchedule | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // 근무 계획 수정을 위한 상태
  const [plannedHours, setPlannedHours] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  // 현재 월의 근무 계획 불러오기
  useEffect(() => {
    async function loadWorkSchedules() {
      try {
        setIsLoading(true);
        setError(null);
        
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1; // JavaScript의 월은 0부터 시작
        
        const schedules = await getWorkSchedulesByMonth(year, month);
        setWorkSchedules(schedules || []);
        
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error loading work schedules:', err);
        setError(`근무 계획을 불러오는 중 오류가 발생했습니다: ${err.message || String(err)}`);
        setIsLoading(false);
      }
    }
    
    loadWorkSchedules();
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
  
  // 날짜 선택 시 해당 날짜의 근무 계획 표시
  const handleDateClick = async (date: string) => {
    setSelectedDate(date);
    
    try {
      setIsLoading(true);
      const schedule = await getWorkScheduleByDate(date);
      
      setSelectedSchedule(schedule);
      
      if (schedule) {
        setPlannedHours(schedule.planned_hours.toString());
        setDescription(schedule.description || '');
      } else {
        setPlannedHours('');
        setDescription('');
      }
      
      setIsEditing(false);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error fetching schedule for date:', err);
      setError(`근무 계획을 불러오는 중 오류가 발생했습니다: ${err.message || String(err)}`);
      setIsLoading(false);
    }
  };
  
  // 근무 계획 수정 시작
  const startEditing = () => {
    setIsEditing(true);
  };
  
  // 근무 계획 수정 취소
  const cancelEditing = () => {
    if (selectedSchedule) {
      setPlannedHours(selectedSchedule.planned_hours.toString());
      setDescription(selectedSchedule.description || '');
    } else {
      setPlannedHours('');
      setDescription('');
    }
    setIsEditing(false);
  };
  
  // 근무 계획 저장
  const saveSchedule = async () => {
    if (!selectedDate) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // 입력값 검증
      const hours = parseFloat(plannedHours);
      if (isNaN(hours) || hours < 0 || hours > 24) {
        setError('근무 시간은 0에서 24 사이의 숫자여야 합니다.');
        setIsLoading(false);
        return;
      }
      
      // 근무 계획 저장
      const savedSchedule = await createOrUpdateWorkSchedule(
        selectedDate,
        hours,
        description
      );
      
      if (savedSchedule) {
        setSelectedSchedule(savedSchedule);
        
        // 전체 근무 계획 다시 불러오기
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const schedules = await getWorkSchedulesByMonth(year, month);
        setWorkSchedules(schedules || []);
        
        setIsEditing(false);
      }
    } catch (err: any) {
      console.error('Error saving work schedule:', err);
      setError(`근무 계획을 저장하는 중 오류가 발생했습니다: ${err.message || String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 근무 계획 삭제
  const deleteScheduleHandler = async () => {
    if (!selectedSchedule) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // 근무 계획 삭제
      const success = await deleteWorkSchedule(selectedSchedule.id);
      
      if (success) {
        setSelectedSchedule(null);
        setPlannedHours('');
        setDescription('');
        
        // 전체 근무 계획 다시 불러오기
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const schedules = await getWorkSchedulesByMonth(year, month);
        setWorkSchedules(schedules || []);
      }
    } catch (err: any) {
      console.error('Error deleting work schedule:', err);
      setError(`근무 계획을 삭제하는 중 오류가 발생했습니다: ${err.message || String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 특정 날짜의 근무 계획 시간 가져오기
  const getPlannedHoursForDate = (dateStr: string): number => {
    const schedule = workSchedules.find(s => s.date === dateStr);
    return schedule ? schedule.planned_hours : 0;
  };
  
  // 이번 달 총 계획 근무 시간 계산
  const totalPlannedHours = workSchedules.reduce((total, schedule) => {
    return total + schedule.planned_hours;
  }, 0);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">근무 계획 관리</h1>
        <div className="flex space-x-2">
          <Link 
            href="/dashboard" 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            대시보드
          </Link>
          <Link 
            href="/timer" 
            className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            출퇴근 기록
          </Link>
        </div>
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
        </div>
      )}
      
      {/* 총 계획 근무 시간 요약 */}
      {!isLoading && !error && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">근무 계획 요약</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-600">이번 달 총 계획 근무 시간</p>
              <p className="text-2xl font-bold">{totalPlannedHours.toFixed(1)}시간</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-gray-600">계획된 근무 일수</p>
              <p className="text-2xl font-bold">{workSchedules.length}일</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-gray-600">일 평균 계획 근무 시간</p>
              <p className="text-2xl font-bold">
                {workSchedules.length > 0 
                  ? (totalPlannedHours / workSchedules.length).toFixed(1)
                  : '0'}시간
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* 달력 */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="bg-white shadow rounded-lg p-6">
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
                  const plannedHours = getPlannedHoursForDate(dateStr);
                  const isSelected = selectedDate === dateStr;
                  
                  // 계획된 근무 시간에 따른 배경색 계산
                  let bgColorClass = '';
                  if (plannedHours > 0) {
                    if (plannedHours >= 8) {
                      bgColorClass = 'bg-green-100';
                    } else if (plannedHours >= 4) {
                      bgColorClass = 'bg-yellow-100';
                    } else {
                      bgColorClass = 'bg-red-100';
                    }
                  }
                  
                  return (
                    <div 
                      key={dateStr} 
                      className={`p-2 min-h-[80px] border ${isSelected ? 'border-blue-500' : 'border-gray-200'} ${bgColorClass} cursor-pointer hover:bg-gray-50`}
                      onClick={() => handleDateClick(dateStr)}
                    >
                      <div className={`font-medium ${getDay(day) === 6 ? 'text-blue-600' : getDay(day) === 0 ? 'text-red-600' : ''}`}>
                        {format(day, 'd')}
                      </div>
                      {plannedHours > 0 && (
                        <div className="mt-1 text-sm">
                          <span className="font-medium">{plannedHours}시간</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* 선택한 날짜의 근무 계획 */}
          <div className="md:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                {selectedDate ? format(parseISO(selectedDate), 'yyyy년 MM월 dd일', { locale: ko }) : '날짜를 선택하세요'}
              </h2>
              
              {selectedDate && !isEditing && (
                <div>
                  <div className="mb-4">
                    <p className="text-gray-600">계획된 근무 시간</p>
                    <p className="text-2xl font-bold">
                      {selectedSchedule ? `${selectedSchedule.planned_hours}시간` : '계획 없음'}
                    </p>
                  </div>
                  
                  {selectedSchedule && selectedSchedule.description && (
                    <div className="mb-4">
                      <p className="text-gray-600">메모</p>
                      <p className="text-lg">{selectedSchedule.description}</p>
                    </div>
                  )}
                  
                  <div className="flex space-x-2 mt-6">
                    <button 
                      onClick={startEditing}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      {selectedSchedule ? '수정' : '계획 추가'}
                    </button>
                    
                    {selectedSchedule && (
                      <button 
                        onClick={deleteScheduleHandler}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {selectedDate && isEditing && (
                <div>
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">계획된 근무 시간 (시간)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="24" 
                      step="0.5"
                      value={plannedHours} 
                      onChange={(e) => setPlannedHours(e.target.value)}
                      className="w-full p-2 border rounded"
                      placeholder="예: 8"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">메모 (선택사항)</label>
                    <textarea 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-2 border rounded"
                      rows={3}
                      placeholder="예: 오전에 회의, 오후에 개발"
                    />
                  </div>
                  
                  <div className="flex space-x-2 mt-6">
                    <button 
                      onClick={saveSchedule}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      저장
                    </button>
                    <button 
                      onClick={cancelEditing}
                      className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-700"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
              
              {!selectedDate && (
                <p className="text-gray-500">날짜를 선택하여 근무 계획을 추가하거나 확인하세요.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
