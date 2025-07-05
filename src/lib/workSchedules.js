import { supabase } from './supabase';

// 특정 월의 근무 계획 가져오기
export async function getWorkSchedulesByMonth(year, month) {
  // 현재 로그인한 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('사용자가 로그인되어 있지 않습니다.');
    return [];
  }
  
  // 월 포맷팅 (1자리 -> 2자리)
  const formattedMonth = month.toString().padStart(2, '0');
  
  // 해당 월의 시작일과 종료일 계산
  const startDate = `${year}-${formattedMonth}-01`;
  const endDate = month === 12 
    ? `${year + 1}-01-01` 
    : `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
  
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
  
  return data || [];
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
    console.error('Error fetching work schedules for date:', error);
    return [];
  }
  
  return data || [];
}

// 새로운 근무 계획 생성
export async function createWorkSchedule(date, startTime, endTime, plannedHours) {
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
export async function updateWorkSchedule(id, startTime, endTime, plannedHours) {
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
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', user.id)
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
    .eq('user_id', user.id);
  
  if (error) {
    console.error('Error deleting work schedule:', error);
    return false;
  }
  
  return true;
}

// 월별 총 계획 근무 시간 계산
export async function getMonthlyPlannedHours(year, month) {
  const schedules = await getWorkSchedulesByMonth(year, month);
  
  let totalPlannedHours = 0;
  schedules.forEach(schedule => {
    totalPlannedHours += parseFloat(schedule.planned_hours);
  });
  
  return totalPlannedHours;
}
