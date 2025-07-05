import { supabase } from './supabase';

// 특정 월의 근무 계획 가져오기
export async function getWorkSchedulesByMonth(year, month) {
  // 현재 로그인한 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('사용자가 로그인되어 있지 않습니다.');
    return [];
  }
  
  // 해당 월의 시작일과 종료일 계산
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
  
  const { data, error } = await supabase
    .from('work_schedules')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lt('date', endDate)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });
  
  if (error) {
    console.error('Error fetching work schedules:', error);
    return [];
  }
  
  return data;
}

// 특정 날짜의 근무 계획 가져오기
export async function getWorkSchedulesByDate(date) {
  // 현재 로그인한 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('사용자가 로그인되어 있지 않습니다.');
    return [];
  }
  
  const { data, error } = await supabase
    .from('work_schedules')
    .select('*')
    .eq('date', date)
    .eq('user_id', user.id)
    .order('start_time', { ascending: true });
  
  if (error) {
    console.error('Error fetching work schedules:', error);
    return [];
  }
  
  return data;
}

// 새로운 근무 계획 생성
export async function createWorkSchedule(date, startTime, endTime, plannedHours, description = '') {
  // 현재 로그인한 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('사용자가 로그인되어 있지 않습니다.');
    return null;
  }
  
  const { data, error } = await supabase
    .from('work_schedules')
    .insert([
      { 
        date,
        start_time: startTime,
        end_time: endTime,
        planned_hours: plannedHours,
        description,
        user_id: user.id
      }
    ])
    .select();
  
  if (error) {
    console.error('Error creating work schedule:', error);
    return null;
  }
  
  return data[0];
}

// 근무 계획 수정
export async function updateWorkSchedule(id, startTime, endTime, plannedHours, description = '') {
  // 현재 로그인한 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('사용자가 로그인되어 있지 않습니다.');
    return null;
  }
  
  const { data, error } = await supabase
    .from('work_schedules')
    .update({
      start_time: startTime,
      end_time: endTime,
      planned_hours: plannedHours,
      description,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', user.id) // 현재 사용자의 데이터만 업데이트
    .select();
  
  if (error) {
    console.error('Error updating work schedule:', error);
    return null;
  }
  
  return data[0];
}

// 근무 계획 삭제
export async function deleteWorkSchedule(id) {
  // 현재 로그인한 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('사용자가 로그인되어 있지 않습니다.');
    return false;
  }
  
  const { error } = await supabase
    .from('work_schedules')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id); // 현재 사용자의 데이터만 삭제
  
  if (error) {
    console.error('Error deleting work schedule:', error);
    return false;
  }
  
  return true;
}

// 시간 문자열을 시간과 분으로 분리하는 유틸리티 함수
export function parseTimeString(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
}

// 두 시간 사이의 시간 차이 계산 (시간 단위, 소수점 두 자리)
export function calculateHoursBetween(startTime, endTime) {
  const start = parseTimeString(startTime);
  const end = parseTimeString(endTime);
  
  // 시작 시간과 종료 시간을 분 단위로 변환
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  
  // 종료 시간이 시작 시간보다 이전인 경우 (다음 날로 넘어가는 경우)
  let diffMinutes = endMinutes - startMinutes;
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60; // 24시간(1440분) 추가
  }
  
  // 분 단위를 시간 단위로 변환 (소수점 두 자리까지)
  return parseFloat((diffMinutes / 60).toFixed(2));
}
