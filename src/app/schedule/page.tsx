"use client";
import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { getWorkSchedulesByMonth, getWorkSchedulesByDate, createWorkSchedule, updateWorkSchedule, deleteWorkSchedule } from '@/lib/timeEntries';

// 타입 정의
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

export default function SchedulePlanner() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateSchedules, setSelectedDateSchedules] = useState<WorkSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<WorkSchedule | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('18:00');
  const [plannedHours, setPlannedHours] = useState<number | ''>('');
  const [description, setDescription] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

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

  // 선택한 날짜의 근무 일정 가져오기
  const fetchSelectedDateSchedules = useCallback(async (date: Date) => {
    try {
      const schedules = await getWorkSchedulesByDate(format(date, 'yyyy-MM-dd'));
      setSelectedDateSchedules(schedules || []);
      if (schedules && schedules.length > 0) {
        // 일정 목록만 설정하고, 특정 일정은 선택하지 않음
        setSelectedSchedule(null);
        resetScheduleForm();
        setIsAddingNew(false);
      } else {
        resetScheduleForm();
        setSelectedSchedule(null);
        setIsAddingNew(false);
      }
    } catch (error) {
      console.error('Error fetching schedules for selected date:', error);
    }
  }, []);

  // 일정 양식 초기화
  const resetScheduleForm = () => {
    setStartTime('09:00');
    setEndTime('18:00');
    // 직접 계산하여 plannedHours 설정 (빈 문자열로 남지 않게)
    const hours = (18 - 9); // 기본값 09:00~18:00 = 9시간
    setPlannedHours(hours);
    setDescription('');
  };

  // 날짜 선택 시 해당 날짜의 근무 계획 표시
  const handleDateClick = async (dateStr: string) => {
    try {
      const selectedDate = parseISO(dateStr);
      setSelectedDate(selectedDate);
      setIsEditing(false);
      setIsAddingNew(false);
      setSelectedSchedule(null); // 선택된 일정 초기화

      // 선택한 날짜의 근무 계획 가져오기
      await fetchSelectedDateSchedules(selectedDate);
    } catch (error) {
      console.error('Error handling date click:', error);
      setError('날짜를 선택하는 중 오류가 발생했습니다.');
    }
  };

  // 시작 시간과 종료 시간으로부터 계획 시간 계산
  const calculatePlannedHours = useCallback(() => {
    if (!startTime || !endTime) return;

    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);

    // 종료 시간이 시작 시간보다 이전인 경우 (다음날로 넘어가는 경우)
    let diffHours;
    if (end < start) {
      const endNextDay = new Date(end);
      endNextDay.setDate(endNextDay.getDate() + 1);
      diffHours = (endNextDay.getTime() - start.getTime()) / (1000 * 60 * 60);
    } else {
      diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }

    return parseFloat(diffHours.toFixed(2));
  }, [startTime, endTime]);

  // 시작 시간이나 종료 시간이 변경될 때 계획 시간 자동 계산
  useEffect(() => {
    const hours = calculatePlannedHours();
    if (hours !== undefined) {
      setPlannedHours(hours);
    }
  }, [startTime, endTime, calculatePlannedHours]);

  // 근무 계획 수정 시작
  const startEditing = () => {
    setIsEditing(true);
  };

  // 기존 근무 계획 수정
  const handleEditClick = (schedule: WorkSchedule) => {
    setSelectedSchedule(schedule);
    setStartTime(schedule.start_time || '09:00');
    setEndTime(schedule.end_time || '18:00');
    setPlannedHours(schedule.planned_hours);
    setDescription(schedule.description || '');
    setIsEditing(true);
    setIsAddingNew(false);
  };

  // 새 근무 계획 추가 모드 전환
  const handleAddNewClick = () => {
    resetScheduleForm();
    setIsAddingNew(true);
    setIsEditing(false);
    setSelectedSchedule(null);
    console.log('새 일정 추가 모드 시작: isAddingNew=true, isEditing=false');
  };

  // 근무 계획 수정 취소
  const cancelEditing = () => {
    setIsEditing(false);
    setIsAddingNew(false);
    setSelectedSchedule(null);
    resetScheduleForm();
  };

  // 새 근무 계획 저장
  const saveNewScheduleHandler = async () => {
    if (!selectedDate || plannedHours === '') return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('새 근무 계획 저장 시작:', format(selectedDate, 'yyyy-MM-dd'));

      // 새 근무 계획 저장
      const savedSchedule = await createWorkSchedule(
        format(selectedDate, 'yyyy-MM-dd'),
        startTime,
        endTime,
        Number(plannedHours), // 숫자로 변환 확인
        description
      );

      if (savedSchedule) {
        console.log('일정 저장 성공:', savedSchedule);

        // 선택한 날짜의 일정 다시 불러오기
        const updatedSchedules = await getWorkSchedulesByDate(format(selectedDate, 'yyyy-MM-dd'));
        console.log('업데이트된 일정 목록:', updatedSchedules);

        setSelectedDateSchedules(updatedSchedules || []);

        // 전체 근무 계획 다시 불러오기
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const schedules = await getWorkSchedulesByMonth(year, month);
        setWorkSchedules(schedules || []);

        // 폼 초기화 및 추가 모드 비활성화
        setIsAddingNew(false);
        resetScheduleForm();
        toast.success('새 근무 일정이 추가되었습니다.');

        // 새 일정을 바로 추가할 수 있도록 준비
        console.log('일정 추가 완료, 새 일정 추가 가능');
      }
    } catch (err: any) {
      console.error('Error saving new work schedule:', err);
      setError(`근무 계획을 저장하는 중 오류가 발생했습니다: ${err.message || String(err)}`);
      toast.error('일정 추가 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 기존 근무 계획 업데이트
  const updateScheduleHandler = async () => {
    if (!selectedSchedule || plannedHours === '') return;

    try {
      setIsLoading(true);
      setError(null);

      // 근무 계획 업데이트
      const updatedSchedule = await updateWorkSchedule(
        selectedSchedule.id,
        startTime,
        endTime,
        plannedHours,
        description
      );

      if (updatedSchedule) {
        // 선택한 날짜의 일정 다시 불러오기
        const updatedSchedules = await getWorkSchedulesByDate(format(selectedDate!, 'yyyy-MM-dd'));
        setSelectedDateSchedules(updatedSchedules || []);

        // 수정된 일정을 선택하도록 설정
        const found = updatedSchedules.find(s => s.id === updatedSchedule.id);
        if (found) {
          setSelectedSchedule(found);
        }

        // 전체 근무 계획 다시 불러오기
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const schedules = await getWorkSchedulesByMonth(year, month);
        setWorkSchedules(schedules || []);

        setIsEditing(false);
        toast.success('근무 일정이 업데이트되었습니다.');
      }
    } catch (err: any) {
      console.error('Error updating work schedule:', err);
      setError(`근무 계획을 업데이트하는 중 오류가 발생했습니다: ${err.message || String(err)}`);
      toast.error('일정 업데이트 중 오류가 발생했습니다.');
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
        // 현재 선택한 날짜의 모든 일정 다시 불러오기
        if (selectedDate) {
          const updatedSchedules = await getWorkSchedulesByDate(format(selectedDate, 'yyyy-MM-dd'));
          setSelectedDateSchedules(updatedSchedules || []);

          // 다른 일정이 없으면 폼 초기화, 있으면 첫번째 일정 선택
          if (updatedSchedules.length === 0) {
            resetScheduleForm();
            setSelectedSchedule(null);
          } else {
            setSelectedSchedule(updatedSchedules[0]);
            setStartTime(updatedSchedules[0].start_time || '09:00');
            setEndTime(updatedSchedules[0].end_time || '18:00');
            setPlannedHours(updatedSchedules[0].planned_hours);
            setDescription(updatedSchedules[0].description || '');
          }
        }

        // 전체 근무 계획 다시 불러오기
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const schedules = await getWorkSchedulesByMonth(year, month);
        setWorkSchedules(schedules || []);

        // 성공 메시지 표시
        toast.success('일정이 삭제되었습니다.');
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
    // 해당 날짜의 모든 일정을 찾음
    const schedules = workSchedules.filter(s => s.date === dateStr);
    // 총 계획 시간 계산
    return schedules.reduce((total, schedule) => total + schedule.planned_hours, 0);
  };

  // 특정 날짜의 일정 개수 가져오기
  const getScheduleCountForDate = (dateStr: string): number => {
    return workSchedules.filter(s => s.date === dateStr).length;
  };

  // 특정 날짜에 일정이 있는지 확인
  const hasSchedulesForDate = (dateStr: string): boolean => {
    return getScheduleCountForDate(dateStr) > 0;
  };

  // 특정 날짜의 일정 목록 가져오기
  const getSchedulesForDate = (dateStr: string): WorkSchedule[] => {
    return workSchedules.filter(s => s.date === dateStr);
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

              <div className="grid grid-cols-7 gap-1 text-xs sm:text-sm">
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
                  const scheduleCount = getScheduleCountForDate(dateStr);
                  const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === dateStr;

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
                      className={`h-16 md:h-24 p-1 border ${isSelected ? 'ring-2 ring-indigo-500' : ''} ${bgColorClass}`}
                      onClick={() => handleDateClick(dateStr)}
                    >
                      <div className="flex justify-between">
                        <span className={`text-sm font-medium ${getDay(day) === 6 ? 'text-blue-600' : getDay(day) === 0 ? 'text-red-600' : ''}`}>
                          {format(day, 'd')}
                        </span>
                        {scheduleCount > 0 && (
                          <span className="text-xs bg-blue-500 text-white rounded-full h-5 w-5 flex items-center justify-center">
                            {scheduleCount}
                          </span>
                        )}
                      </div>
                      {plannedHours > 0 && (
                        <div className="text-xs text-green-600 font-medium">
                          {plannedHours}시간
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 선택한 날짜의 근무 계획 */}
      <div className="md:col-span-1">
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {selectedDate ? format(selectedDate, 'yyyy년 MM월 dd일', { locale: ko }) : '날짜 미선택'} 근무 계획
            </h2>
            <div className="flex space-x-2">
              {!isEditing && !isAddingNew && (
                <button
                  onClick={handleAddNewClick}
                  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-700"
                  disabled={isLoading}
                >
                  새 일정 추가
                </button>
              )}

              {(isEditing || isAddingNew) && (
                <button
                  onClick={cancelEditing}
                  className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-700"
                  disabled={isLoading}
                >
                  취소
                </button>
              )}
            </div>
          </div>

          {/* 선택된 날짜의 일정 목록 */}
          {selectedDateSchedules.length > 0 && !isAddingNew && !isEditing && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">등록된 일정 목록</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border">
                  <thead>
                    <tr>
                      <th className="py-2 px-3 border-b">시작 시간</th>
                      <th className="py-2 px-3 border-b">종료 시간</th>
                      <th className="py-2 px-3 border-b">계획 시간</th>
                      <th className="py-2 px-3 border-b">설명</th>
                      <th className="py-2 px-3 border-b">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDateSchedules.map((schedule) => (
                      <tr key={schedule.id} className={selectedSchedule?.id === schedule.id ? "bg-blue-50" : ""}>
                        <td className="py-2 px-3 border-b text-center">{schedule.start_time}</td>
                        <td className="py-2 px-3 border-b text-center">{schedule.end_time}</td>
                        <td className="py-2 px-3 border-b text-center">{schedule.planned_hours}시간</td>
                        <td className="py-2 px-3 border-b">{schedule.description || '-'}</td>
                        <td className="py-2 px-3 border-b text-center">
                          <button
                            onClick={() => handleEditClick(schedule)}
                            className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-700 mr-2"
                            disabled={isLoading}
                          >
                            수정
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSchedule(schedule);
                              deleteScheduleHandler();
                            }}
                            className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-700"
                            disabled={isLoading}
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {!selectedDate && (
            <p className="text-gray-500">날짜를 선택하여 근무 계획을 추가하거나 확인하세요.</p>
          )}
          
          {selectedDate && selectedDateSchedules.length === 0 && !isAddingNew && !isEditing && (
            <p className="text-gray-500">선택한 날짜에 등록된 일정이 없습니다. 새 일정을 추가하세요.</p>
          )}
          
          {/* 근무 계획 폼 - 새 일정 추가 또는 기존 일정 수정 */}
          {selectedDate && (isAddingNew || isEditing) && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3">
                {isAddingNew ? '새 일정 추가' : '일정 수정'}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                      시작 시간
                    </label>
                    <input
                      type="time"
                      id="startTime"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                      종료 시간
                    </label>
                    <input
                      type="time"
                      id="endTime"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="plannedHours" className="block text-sm font-medium text-gray-700 mb-1">
                    계획 시간 (자동 계산)
                  </label>
                  <input
                    type="number"
                    id="plannedHours"
                    value={plannedHours}
                    onChange={(e) => setPlannedHours(parseFloat(e.target.value) || '')}
                    className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                    step="0.5"
                    min="0"
                    required
                    readOnly
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={isAddingNew ? saveNewScheduleHandler : updateScheduleHandler}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700"
                    disabled={isLoading}
                  >
                    {isAddingNew ? '저장' : '수정'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
