'use client';

import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  getWorkSchedulesByMonth, 
  getWorkSchedulesByDate, 
  createWorkSchedule, 
  updateWorkSchedule, 
  deleteWorkSchedule,
  calculateHoursBetween
} from '@/lib/workSchedules';
import { toast } from 'react-hot-toast';

// 근무 계획 타입 정의
interface WorkSchedule {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  planned_hours: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// 날짜별 근무 계획 요약 정보 타입
interface DateScheduleSummary {
  date: string;
  count: number;
  totalHours: number;
}

export default function SchedulePage() {
  // 상태 관리
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [dateScheduleSummaries, setDateScheduleSummaries] = useState<DateScheduleSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateSchedules, setSelectedDateSchedules] = useState<WorkSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<WorkSchedule | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('18:00');
  const [plannedHours, setPlannedHours] = useState<number | ''>('');
  const [description, setDescription] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

  // 월별 근무 계획 로드
  const loadWorkSchedules = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1; // JavaScript의 월은 0부터 시작
      const data = await getWorkSchedulesByMonth(year, month);
      setWorkSchedules(data);
      
      // 날짜별 요약 정보 계산
      const summaries: { [key: string]: DateScheduleSummary } = {};
      
      data.forEach((schedule: WorkSchedule) => {
        if (!summaries[schedule.date]) {
          summaries[schedule.date] = {
            date: schedule.date,
            count: 0,
            totalHours: 0
          };
        }
        
        summaries[schedule.date].count += 1;
        summaries[schedule.date].totalHours += Number(schedule.planned_hours);
      });
      
      setDateScheduleSummaries(Object.values(summaries));
    } catch (err) {
      console.error('근무 계획 로드 중 오류 발생:', err);
      setError('근무 계획을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 선택한 날짜의 근무 계획 로드
  const fetchSelectedDateSchedules = async (date: Date) => {
    if (!date) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const data = await getWorkSchedulesByDate(formattedDate);
      setSelectedDateSchedules(data);
    } catch (err) {
      console.error('선택한 날짜의 근무 계획 로드 중 오류 발생:', err);
      setError('근무 계획을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 날짜 선택 핸들러
  const handleDateClick = (day: Date) => {
    setSelectedDate(day);
    setSelectedSchedule(null);
    resetScheduleForm();
    setIsEditing(false);
    setIsAddingNew(false);
  };

  // 새 일정 추가 모드 활성화
  const handleAddNewClick = () => {
    setSelectedSchedule(null);
    resetScheduleForm();
    setIsEditing(false);
    setIsAddingNew(true);
  };

  // 일정 수정 모드 활성화
  const handleEditClick = (schedule: WorkSchedule) => {
    setSelectedSchedule(schedule);
    setStartTime(schedule.start_time);
    setEndTime(schedule.end_time);
    setPlannedHours(schedule.planned_hours);
    setDescription(schedule.description || '');
    setIsEditing(true);
    setIsAddingNew(false);
  };

  // 시간 변경 시 계획 시간 자동 계산
  const calculatePlannedHours = () => {
    if (startTime && endTime) {
      const hours = calculateHoursBetween(startTime, endTime);
      setPlannedHours(hours);
    }
  };

  // 폼 초기화
  const resetScheduleForm = () => {
    setStartTime('09:00');
    setEndTime('18:00');
    setPlannedHours(9);
    setDescription('');
  };

  // 새 일정 저장
  const saveNewScheduleHandler = async () => {
    if (!selectedDate) {
      toast.error('날짜를 선택해주세요.');
      return;
    }

    if (!startTime || !endTime) {
      toast.error('시작 시간과 종료 시간을 입력해주세요.');
      return;
    }

    if (!plannedHours) {
      toast.error('계획 시간을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const result = await createWorkSchedule(
        formattedDate,
        startTime,
        endTime,
        Number(plannedHours),
        description
      );

      if (result) {
        toast.success('근무 계획이 추가되었습니다.');
        // 폼 초기화 (추가 모드 유지)
        resetScheduleForm();
        // 선택한 날짜의 일정 다시 로드
        await fetchSelectedDateSchedules(selectedDate);
        // 월별 일정 다시 로드
        await loadWorkSchedules();
      } else {
        toast.error('근무 계획 추가에 실패했습니다.');
      }
    } catch (err) {
      console.error('근무 계획 추가 중 오류 발생:', err);
      setError('근무 계획을 추가하는 중 오류가 발생했습니다.');
      toast.error('근무 계획 추가에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 일정 수정
  const updateScheduleHandler = async () => {
    if (!selectedSchedule) {
      toast.error('수정할 일정을 선택해주세요.');
      return;
    }

    if (!startTime || !endTime) {
      toast.error('시작 시간과 종료 시간을 입력해주세요.');
      return;
    }

    if (!plannedHours) {
      toast.error('계획 시간을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await updateWorkSchedule(
        selectedSchedule.id,
        startTime,
        endTime,
        Number(plannedHours),
        description
      );

      if (result) {
        toast.success('근무 계획이 수정되었습니다.');
        setIsEditing(false);
        setSelectedSchedule(null);
        // 선택한 날짜의 일정 다시 로드
        await fetchSelectedDateSchedules(selectedDate!);
        // 월별 일정 다시 로드
        await loadWorkSchedules();
      } else {
        toast.error('근무 계획 수정에 실패했습니다.');
      }
    } catch (err) {
      console.error('근무 계획 수정 중 오류 발생:', err);
      setError('근무 계획을 수정하는 중 오류가 발생했습니다.');
      toast.error('근무 계획 수정에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 일정 삭제
  const deleteScheduleHandler = async (id: string) => {
    if (!window.confirm('정말로 이 근무 계획을 삭제하시겠습니까?')) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await deleteWorkSchedule(id);

      if (result) {
        toast.success('근무 계획이 삭제되었습니다.');
        if (selectedSchedule?.id === id) {
          setSelectedSchedule(null);
          setIsEditing(false);
        }
        // 선택한 날짜의 일정 다시 로드
        await fetchSelectedDateSchedules(selectedDate!);
        // 월별 일정 다시 로드
        await loadWorkSchedules();
      } else {
        toast.error('근무 계획 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('근무 계획 삭제 중 오류 발생:', err);
      setError('근무 계획을 삭제하는 중 오류가 발생했습니다.');
      toast.error('근무 계획 삭제에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 이전 달로 이동
  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  // 다음 달로 이동
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // 현재 달로 이동
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // 시작 시간이나 종료 시간이 변경될 때 계획 시간 자동 계산
  useEffect(() => {
    calculatePlannedHours();
  }, [startTime, endTime]);

  // 현재 월이 변경될 때 해당 월의 근무 계획 로드
  useEffect(() => {
    loadWorkSchedules();
  }, [currentMonth]);

  // 선택한 날짜가 변경될 때 해당 날짜의 근무 계획 로드
  useEffect(() => {
    if (selectedDate) {
      fetchSelectedDateSchedules(selectedDate);
    }
  }, [selectedDate]);

  // 컴포넌트 마운트 시 오늘 날짜 선택
  useEffect(() => {
    setSelectedDate(new Date());
  }, []);

  // 달력 렌더링을 위한 날짜 배열 생성
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = monthStart;
  const endDate = monthEnd;
  
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

  // 날짜별 일정 요약 정보 조회
  const getDateSummary = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return dateScheduleSummaries.find(summary => summary.date === formattedDate);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">근무 계획 관리</h1>
      
      {/* 달력 헤더 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {format(currentMonth, 'yyyy년 MM월', { locale: ko })}
        </h2>
        <div className="flex space-x-2">
          <button 
            onClick={prevMonth}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            이전 달
          </button>
          <button 
            onClick={goToToday}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            오늘
          </button>
          <button 
            onClick={nextMonth}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            다음 달
          </button>
        </div>
      </div>
      
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div 
            key={day} 
            className="text-center font-semibold p-2"
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* 달력 날짜 */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {dateRange.map((day) => {
          const dateSummary = getDateSummary(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div
              key={day.toString()}
              onClick={() => handleDateClick(day)}
              className={`
                min-h-[80px] p-2 border rounded cursor-pointer
                ${!isSameMonth(day, currentMonth) ? 'bg-gray-100 text-gray-400' : ''}
                ${isSelected ? 'bg-blue-100 border-blue-500' : ''}
                ${isToday ? 'border-red-500' : ''}
              `}
            >
              <div className="flex justify-between items-start">
                <span className={`
                  font-semibold
                  ${format(day, 'E', { locale: ko }) === '일' ? 'text-red-500' : ''}
                  ${format(day, 'E', { locale: ko }) === '토' ? 'text-blue-500' : ''}
                `}>
                  {format(day, 'd')}
                </span>
                
                {dateSummary && (
                  <span className="text-xs bg-blue-500 text-white rounded-full px-1">
                    {dateSummary.count}
                  </span>
                )}
              </div>
              
              {dateSummary && (
                <div className="mt-1 text-xs">
                  <span className="block text-gray-600">
                    총 {dateSummary.totalHours.toFixed(1)}시간
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* 선택한 날짜 정보 */}
      {selectedDate && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">
            {format(selectedDate, 'yyyy년 MM월 dd일 (E)', { locale: ko })}
          </h3>
          
          {/* 일정 추가 버튼 */}
          <button
            onClick={handleAddNewClick}
            className="mb-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            새 일정 추가
          </button>
          
          {/* 일정 입력/수정 폼 */}
          {(isAddingNew || isEditing) && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 border">
              <h4 className="font-semibold mb-2">
                {isEditing ? '일정 수정' : '새 일정 추가'}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    시작 시간
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    종료 시간
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    계획 시간 (자동 계산)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={plannedHours}
                    onChange={(e) => setPlannedHours(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명 (선택사항)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="일정에 대한 설명을 입력하세요"
                  />
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={isEditing ? updateScheduleHandler : saveNewScheduleHandler}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {isLoading ? '처리 중...' : (isEditing ? '수정하기' : '저장하기')}
                </button>
                
                <button
                  onClick={() => {
                    setIsAddingNew(false);
                    setIsEditing(false);
                    setSelectedSchedule(null);
                  }}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  취소
                </button>
              </div>
            </div>
          )}
          
          {/* 일정 목록 */}
          <div>
            <h4 className="font-semibold mb-2">일정 목록</h4>
            
            {isLoading && <p className="text-gray-500">로딩 중...</p>}
            
            {error && (
              <div className="bg-red-100 text-red-700 p-2 rounded mb-2">
                {error}
              </div>
            )}
            
            {!isLoading && selectedDateSchedules.length === 0 ? (
              <p className="text-gray-500">등록된 일정이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b">시작 시간</th>
                      <th className="py-2 px-4 border-b">종료 시간</th>
                      <th className="py-2 px-4 border-b">계획 시간</th>
                      <th className="py-2 px-4 border-b">설명</th>
                      <th className="py-2 px-4 border-b">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDateSchedules.map((schedule) => (
                      <tr key={schedule.id} className="hover:bg-gray-50">
                        <td className="py-2 px-4 border-b">{schedule.start_time}</td>
                        <td className="py-2 px-4 border-b">{schedule.end_time}</td>
                        <td className="py-2 px-4 border-b">{schedule.planned_hours}시간</td>
                        <td className="py-2 px-4 border-b">{schedule.description || '-'}</td>
                        <td className="py-2 px-4 border-b">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditClick(schedule)}
                              className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => deleteScheduleHandler(schedule.id)}
                              className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
