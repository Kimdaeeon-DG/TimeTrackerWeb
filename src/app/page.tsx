"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { getTimeEntriesByDate, createCheckInEntry, updateCheckOutEntry, updateTimeEntry, deleteTimeEntry } from '../lib/timeEntries';

interface TimeEntry {
  id: string;
  check_in: string; // Supabase 컬럼명에 맞게 변경
  check_out: string | null;
  working_hours: number | null;
  date: string; // 날짜 필드 추가
}

export default function AttendancePage() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);
  const [workingHours, setWorkingHours] = useState<string | null>(null);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editCheckInTime, setEditCheckInTime] = useState<string>('');
  const [editCheckOutTime, setEditCheckOutTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
  
  // 근무 시간 포맷팅
  const formatWorkingHours = (hours: number | null) => {
    if (hours === null) return '-';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}시간 ${minutes}분`;
  };

  // 나머지 JSX 부분은 기존과 동일하게 유지하되, 필드명만 변경
  // 예: entry.checkIn -> entry.check_in, entry.checkOut -> entry.check_out, entry.workingHours -> entry.working_hours
  // 그리고 deleteEntry -> deleteEntryHandler로 함수명 변경
}