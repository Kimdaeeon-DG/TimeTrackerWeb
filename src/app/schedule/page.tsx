"use client";
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getWorkSchedulesByMonth, getWorkSchedulesByDate, createWorkSchedule, updateWorkSchedule, deleteWorkSchedule, copyWorkSchedulesToDate } from '../../lib/workSchedules';
import toast, { Toaster } from 'react-hot-toast';

interface WorkSchedule {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  planned_hours: number;
}

export default function SchedulePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateSchedules, setSelectedDateSchedules] = useState<WorkSchedule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPlannedHours, setTotalPlannedHours] = useState<number>(0);
  
  // 근무 계획 추가/수정을 위한 상태
  const [isAddingSchedule, setIsAddingSchedule] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [plannedHours, setPlannedHours] = useState<number>(0);
  
  // 근무 계획 복사 관련 상태
  const [isCopyingSchedule, setIsCopyingSchedule] = useState<boolean>(false);
  const [targetDate, setTargetDate] = useState<string>('');
  
  // 근무 계획 삭제 관련 상태
  const [isDeletingSchedule, setIsDeletingSchedule] = useState<boolean>(false);

  // 환경 변수 확인
  useEffect(() => {
    console.log('Schedule 페이지 로드됨');
    
    // 환경 변수가 없으면 오류 표시
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError('환경 변수가 설정되지 않았습니다. .env.local 파일에 Supabase URL과 Anon Key를 설정해주세요.');
      setIsLoading(false);
      return;
    }
  }, []);

  // Supabase에서 근무 계획 불러오기
  useEffect(() => {
    async function loadWorkSchedules() {
      try {
        setIsLoading(true);
        setError(null);
        
        const schedules = await getWorkSchedulesByMonth(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1
        );
        
        setWorkSchedules(schedules || []);
        
        // 총 계획 근무 시간 계산
        let totalHours = 0;
        schedules.forEach((schedule) => {
          totalHours += parseFloat(schedule.planned_hours.toString());
        });
        setTotalPlannedHours(totalHours);
        
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error loading work schedules:', err);
        setError(`근무 계획을 불러오는 중 오류가 발생했습니다: ${err.message || String(err)}`);
        setIsLoading(false);
      }
    }
    
    // 환경 변수가 있을 때만 데이터 로드
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      loadWorkSchedules();
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
  
  // 날짜 선택 시 해당 날짜의 근무 계획 표시, 복사 또는 삭제 실행
  const handleDateClick = async (date: string) => {
    // 복사 모드인 경우 선택한 날짜를 복사 대상으로 설정
    if (isCopyingSchedule && selectedDate && selectedDate !== date) {
      try {
        setIsLoading(true);
        
        const result = await copyWorkSchedulesToDate(selectedDateSchedules, date);
        
        if (result.success) {
          toast.success(`근무 계획이 ${format(parseISO(date), 'yyyy년 MM월 dd일')}에 복사되었습니다.`, {
            duration: 2000
          });
          
          // 데이터 다시 로드
          const schedules = await getWorkSchedulesByMonth(
            currentMonth.getFullYear(),
            currentMonth.getMonth() + 1
          );
          setWorkSchedules(schedules || []);
          
          // 복사 모드 유지 - 여러 날짜에 연속으로 복사할 수 있도록 계속 유지
          // 복사 완료 후 원본 날짜의 계획을 계속 복사할 수 있도록 선택한 날짜를 변경하지 않음
        } else {
          toast.error(result.message || '근무 계획 복사 중 오류가 발생했습니다.');
        }
      } catch (err: any) {
        console.error('Error copying work schedules:', err);
        toast.error(err.message || '근무 계획 복사 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // 삭제 모드인 경우 해당 날짜의 근무 계획 삭제
    if (isDeletingSchedule && date) {
      try {
        setIsLoading(true);
        
        // 해당 날짜의 근무 계획 가져오기
        const schedulesForDate = await getWorkSchedulesByDate(date);
        
        if (schedulesForDate.length === 0) {
          toast.error(`${format(parseISO(date), 'yyyy년 MM월 dd일')}에는 삭제할 근무 계획이 없습니다.`);
          setIsLoading(false);
          return;
        }
        
        // 모든 근무 계획 삭제
        const deletePromises = schedulesForDate.map(schedule => deleteWorkSchedule(schedule.id));
        await Promise.all(deletePromises);
        
        toast.success(`${format(parseISO(date), 'yyyy년 MM월 dd일')}의 근무 계획 ${schedulesForDate.length}개가 삭제되었습니다.`, {
          duration: 2000
        });
        
        // 데이터 다시 로드
        const schedules = await getWorkSchedulesByMonth(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1
        );
        setWorkSchedules(schedules || []);
        
        // 삭제 모드 유지 - 여러 날짜의 계획을 연속으로 삭제할 수 있도록 계속 유지
      } catch (err: any) {
        console.error('Error deleting work schedules:', err);
        toast.error(err.message || '근무 계획 삭제 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // 일반 모드인 경우 해당 날짜의 근무 계획 표시
    setSelectedDate(date);
    
    try {
      const schedulesForDate = await getWorkSchedulesByDate(date);
      setSelectedDateSchedules(schedulesForDate);
      
      // 근무 계획 추가 모드 초기화
      resetScheduleForm();
    } catch (err) {
      console.error('Error fetching schedules for date:', err);
      toast.error('해당 날짜의 근무 계획을 불러오는데 실패했습니다.');
    }
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
  
  // 근무 계획 추가 모드 시작
  const startAddingSchedule = () => {
    setIsAddingSchedule(true);
    setEditingSchedule(null);
    setStartTime('09:00');
    setEndTime('18:00');
    calculatePlannedHours('09:00', '18:00');
  };
  
  // 근무 계획 수정 모드 시작
  const startEditingSchedule = (schedule: WorkSchedule) => {
    setIsAddingSchedule(false);
    setEditingSchedule(schedule);
    setStartTime(schedule.start_time.substring(0, 5));
    setEndTime(schedule.end_time.substring(0, 5));
    setPlannedHours(schedule.planned_hours);
  };
  
  // 근무 계획 폼 초기화
  const resetScheduleForm = () => {
    setIsAddingSchedule(false);
    setEditingSchedule(null);
    setStartTime('');
    setEndTime('');
    setPlannedHours(0);
    setIsCopyingSchedule(false);
    setTargetDate('');
  };
  
  // 계획 시간 자동 계산
  const calculatePlannedHours = (start: string, end: string) => {
    if (!start || !end) return;
    
    const [startHours, startMinutes] = start.split(':').map(Number);
    const [endHours, endMinutes] = end.split(':').map(Number);
    
    let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
    
    // 음수인 경우 다음 날로 간주 (예: 22:00 ~ 06:00)
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }
    
    // 점심 시간 1시간 제외 (선택적)
    // if (totalMinutes > 5 * 60) { // 5시간 이상 근무하는 경우
    //   totalMinutes -= 60; // 1시간 점심 시간 제외
    // }
    
    const hours = totalMinutes / 60;
    setPlannedHours(parseFloat(hours.toFixed(2)));
  };
  
  // 시작 시간 변경 시 계획 시간 자동 계산
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartTime = e.target.value;
    setStartTime(newStartTime);
    calculatePlannedHours(newStartTime, endTime);
  };
  
  // 종료 시간 변경 시 계획 시간 자동 계산
  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndTime = e.target.value;
    setEndTime(newEndTime);
    calculatePlannedHours(startTime, newEndTime);
  };
  
  // 근무 계획 저장
  const saveSchedule = async () => {
    if (!selectedDate || !startTime || !endTime) {
      toast.error('모든 필드를 입력해주세요.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      if (editingSchedule) {
        // 기존 근무 계획 수정
        const updated = await updateWorkSchedule(
          editingSchedule.id,
          startTime,
          endTime,
          plannedHours
        );
        
        if (updated) {
          toast.success('근무 계획이 수정되었습니다.');
        }
      } else {
        // 새 근무 계획 추가
        const created = await createWorkSchedule(
          selectedDate,
          startTime,
          endTime,
          plannedHours
        );
        
        if (created) {
          toast.success('근무 계획이 추가되었습니다.');
          
          // 추가 모드 유지 (연속 입력 지원)
          setStartTime('09:00');
          setEndTime('18:00');
          calculatePlannedHours('09:00', '18:00');
        }
      }
      
      // 데이터 다시 로드
      const schedules = await getWorkSchedulesByMonth(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1
      );
      setWorkSchedules(schedules || []);
      
      // 선택한 날짜의 근무 계획 다시 로드
      if (selectedDate) {
        const schedulesForDate = await getWorkSchedulesByDate(selectedDate);
        setSelectedDateSchedules(schedulesForDate);
      }
      
      // 수정 모드였다면 폼 초기화
      if (editingSchedule) {
        resetScheduleForm();
      }
    } catch (err) {
      console.error('Error saving work schedule:', err);
      toast.error('근무 계획 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 근무 계획 삭제
  const deleteScheduleHandler = async (scheduleId: string) => {
    try {
      setIsLoading(true);
      
      const success = await deleteWorkSchedule(scheduleId);
      
      if (success) {
        toast.success('근무 계획이 삭제되었습니다.');
        
        // 데이터 다시 로드
        const schedules = await getWorkSchedulesByMonth(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1
        );
        setWorkSchedules(schedules || []);
        
        // 선택한 날짜의 근무 계획 다시 로드
        if (selectedDate) {
          const schedulesForDate = await getWorkSchedulesByDate(selectedDate);
          setSelectedDateSchedules(schedulesForDate);
        }
        
        // 수정 중이던 일정이 삭제된 경우 폼 초기화
        if (editingSchedule && editingSchedule.id === scheduleId) {
          resetScheduleForm();
        }
      }
    } catch (err) {
      console.error('Error deleting work schedule:', err);
      toast.error('근무 계획 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 근무 계획 복사 모드 시작
  const startCopyingSchedule = () => {
    if (selectedDateSchedules.length === 0) {
      toast.error('복사할 근무 계획이 없습니다.');
      return;
    }
    
    setIsCopyingSchedule(true);
    toast.success('복사 모드가 활성화되었습니다. 달력에서 여러 대상 날짜를 선택하세요. 완료 후 복사 취소 버튼을 클릭하세요.', {
      duration: 5000,
      icon: '🔄'
    });
  };
  
  // 근무 계획 복사 모드 취소
  const cancelCopyingSchedule = () => {
    setIsCopyingSchedule(false);
    toast.success('복사 모드가 취소되었습니다.');
  };
  
  // 근무 계획 삭제 모드 시작
  const startDeletingSchedule = () => {
    setIsDeletingSchedule(true);
    toast.success('삭제 모드가 활성화되었습니다. 달력에서 삭제할 날짜를 선택하세요. 완료 후 삭제 모드 종료 버튼을 클릭하세요.', {
      duration: 5000,
      icon: '🗑️'
    });
  };
  
  // 근무 계획 삭제 모드 취소
  const cancelDeletingSchedule = () => {
    setIsDeletingSchedule(false);
    toast.success('삭제 모드가 취소되었습니다.');
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">근무 계획</h1>
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
      
      {/* 총 계획 근무 시간 요약 */}
      {!isLoading && !error && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">근무 계획 요약</h2>
          <div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-gray-600">이번 달 계획 근무 시간</p>
              <p className="text-2xl font-bold text-green-600">{formatWorkingHours(totalPlannedHours)}</p>
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
            {weekDays.map((day, index) => (
              <div 
                key={day} 
                className={`text-center font-semibold p-2 ${index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : ''}`}
              >
                {day}
              </div>
            ))}
            
            {/* 빈 칸 채우기 (월의 첫 날 이전) */}
            {Array.from({ length: startDay }).map((_, index) => (
              <div key={`empty-${index}`} className="p-2 min-h-[60px]"></div>
            ))}
            
            {/* 날짜 */}
            {monthDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              
              // 해당 날짜의 근무 계획 찾기
              const schedulesForDate = workSchedules.filter(schedule => schedule.date === dateStr);
              
              // 총 계획 시간 계산
              let totalPlannedHoursForDate = 0;
              schedulesForDate.forEach(schedule => {
                totalPlannedHoursForDate += parseFloat(schedule.planned_hours.toString());
              });
              
              const hasSchedule = schedulesForDate.length > 0;
              const isSelected = selectedDate === dateStr;
              
              return (
                <div 
                  key={dateStr} 
                  className={`p-2 min-h-[60px] border ${isSelected ? 'border-blue-500' : isCopyingSchedule ? 'border-gray-200 hover:border-green-500' : isDeletingSchedule ? 'border-gray-200 hover:border-red-500' : 'border-gray-200'} cursor-pointer hover:bg-gray-50 ${isCopyingSchedule && selectedDate === dateStr ? 'bg-blue-50' : ''} ${isDeletingSchedule ? 'hover:bg-red-50' : ''}`}
                  onClick={() => handleDateClick(dateStr)}
                >
                  <div className={`font-medium ${getDay(day) === 6 ? 'text-blue-600' : getDay(day) === 0 ? 'text-red-600' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  
                  {hasSchedule && (
                    <div className="mt-1">
                      <span className="text-green-600 text-sm font-medium">
                        {formatWorkingHours(totalPlannedHoursForDate, true)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* 선택한 날짜의 근무 계획 */}
      {selectedDate && !isLoading && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {format(parseISO(selectedDate), 'yyyy년 MM월 dd일')}<br />근무 계획
            </h2>
            <div className="flex space-x-2">
              <button 
                onClick={startCopyingSchedule}
                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
              >
                계획 복사
              </button>
              <button 
                onClick={startDeletingSchedule}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
              >
                계획 삭제
              </button>
              <button 
                onClick={startAddingSchedule}
                className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
              >
                + 계획 추가
              </button>
            </div>
          </div>
          
          {/* 복사 모드 안내 */}
          {isCopyingSchedule && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4 flex justify-between items-center">
              <div>
                <h3 className="font-medium mb-1">
                  근무 계획 복사 모드
                </h3>
                <p className="text-sm text-gray-600">
                  {format(parseISO(selectedDate!), 'yyyy년 MM월 dd일')}의 근무 계획 {selectedDateSchedules.length}개를 여러 날짜에 복사할 수 있습니다. 달력에서 대상 날짜를 선택하세요.
                </p>
              </div>
              <button
                onClick={cancelCopyingSchedule}
                className="px-3 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50"
              >
                복사 모드 종료
              </button>
            </div>
          )}
          
          {/* 삭제 모드 안내 */}
          {isDeletingSchedule && (
            <div className="bg-red-50 p-4 rounded-lg mb-4 flex justify-between items-center">
              <div>
                <h3 className="font-medium mb-1">
                  근무 계획 삭제 모드
                </h3>
                <p className="text-sm text-gray-600">
                  달력에서 삭제할 날짜를 선택하세요. 해당 날짜의 모든 근무 계획이 삭제됩니다.
                </p>
              </div>
              <button
                onClick={cancelDeletingSchedule}
                className="px-3 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50"
              >
                삭제 모드 종료
              </button>
            </div>
          )}
          
          {/* 근무 계획 추가/수정 폼 */}
          {(isAddingSchedule || editingSchedule) && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium mb-3">
                {editingSchedule ? '근무 계획 수정' : '새 근무 계획 추가'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={handleStartTimeChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={handleEndTimeChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">계획 시간</label>
                  <div className="p-2 border rounded bg-gray-100">
                    {formatWorkingHours(plannedHours)}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={resetScheduleForm}
                  className="px-3 py-1 border rounded hover:bg-gray-100"
                >
                  취소
                </button>
                <button
                  onClick={saveSchedule}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  저장
                </button>
              </div>
            </div>
          )}
          
          {/* 근무 계획 목록 */}
          {selectedDateSchedules.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시작 시간</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">종료 시간</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">계획 시간</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedDateSchedules.map((schedule) => (
                    <tr key={schedule.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {schedule.start_time.substring(0, 5)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {schedule.end_time.substring(0, 5)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-green-600">
                        {formatWorkingHours(schedule.planned_hours)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => startEditingSchedule(schedule)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => deleteScheduleHandler(schedule.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              {isAddingSchedule ? 
                '새 근무 계획을 추가해주세요.' : 
                '이 날짜에 등록된 근무 계획이 없습니다. 계획 추가 버튼을 클릭하여 추가해주세요.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
