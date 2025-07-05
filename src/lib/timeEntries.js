import { supabase } from './supabase';

// 특정 날짜의 출퇴근 기록 가져오기
export async function getTimeEntriesByDate(date) {
  // 현재 로그인한 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('사용자가 로그인되어 있지 않습니다.');
    return [];
  }
  
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('date', date)
    .eq('user_id', user.id) // 현재 사용자의 데이터만 가져오기
    .order('check_in', { ascending: true });
  
  if (error) {
    console.error('Error fetching time entries:', error);
    return [];
  }
  
  return data;
}

// 새로운 출근 기록 생성
export async function createCheckInEntry(date, checkIn) {
  // 현재 로그인한 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('사용자가 로그인되어 있지 않습니다.');
    return null;
  }
  
  console.log('출근 기록 생성 - 사용자 ID:', user.id);
  
  const { data, error } = await supabase
    .from('time_entries')
    .insert([
      { 
        date, 
        check_in: checkIn,
        check_out: null,
        working_hours: null,
        user_id: user.id // 사용자 ID 추가
      }
    ])
    .select();
  
  if (error) {
    console.error('Error creating check-in entry:', error);
    return null;
  }
  
  return data[0];
}

// 퇴근 시간 및 근무 시간 업데이트
export async function updateCheckOutEntry(id, checkOut, workingHours) {
  // 현재 로그인한 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('사용자가 로그인되어 있지 않습니다.');
    return null;
  }
  
  const { data, error } = await supabase
    .from('time_entries')
    .update({ 
      check_out: checkOut,
      working_hours: workingHours 
    })
    .eq('id', id)
    .eq('user_id', user.id) // 현재 사용자의 데이터만 업데이트
    .select();
  
  if (error) {
    console.error('Error updating check-out entry:', error);
    return null;
  }
  
  return data[0];
}

// 출퇴근 기록 수정
export async function updateTimeEntry(id, checkIn, checkOut, workingHours, date) {
  // 현재 로그인한 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('사용자가 로그인되어 있지 않습니다.');
    return null;
  }
  
  const updateData = { 
    check_in: checkIn,
    check_out: checkOut,
    working_hours: workingHours
  };
  
  // 날짜가 제공된 경우 업데이트 데이터에 추가
  if (date) {
    updateData.date = date;
  }
  
  const { data, error } = await supabase
    .from('time_entries')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id) // 현재 사용자의 데이터만 업데이트
    .select();
  
  if (error) {
    console.error('Error updating time entry:', error);
    return null;
  }
  
  return data[0];
}

// 출퇴근 기록 삭제
export async function deleteTimeEntry(id) {
  // 현재 로그인한 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('사용자가 로그인되어 있지 않습니다.');
    return false;
  }
  
  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id); // 현재 사용자의 데이터만 삭제
  
  if (error) {
    console.error('Error deleting time entry:', error);
    return false;
  }
  
  return true;
}

// 모든 출퇴근 기록 가져오기 (대시보드용)
export async function getAllTimeEntries() {
  console.log('getAllTimeEntries 함수 호출됨');
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Supabase Key 설정 여부:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  try {
    // 현재 로그인한 사용자 정보 가져오기
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('사용자가 로그인되어 있지 않습니다.');
      return [];
    }
    
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id) // 현재 사용자의 데이터만 가져오기
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching all time entries:', error);
      return [];
    }
    
    console.log('가져온 데이터 수:', data ? data.length : 0);
    return data || [];
  } catch (err) {
    console.error('Exception in getAllTimeEntries:', err);
    return [];
  }
}

// ===== 근무 계획 관련 함수 =====

// 특정 날짜의 근무 계획 가져오기
export async function getWorkScheduleByDate(date) {
  // 현재 로그인한 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('사용자가 로그인되어 있지 않습니다.');
    return null;
  }
  
  const { data, error } = await supabase
    .from('work_schedules')
    .select('*')
    .eq('date', date)
    .eq('user_id', user.id)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116는 결과가 없는 경우
    console.error('Error fetching work schedule:', error);
    return null;
  }
  
  return data || null;
}

// 특정 기간의 근무 계획 가져오기
export async function getWorkSchedulesByDateRange(startDate, endDate) {
  // 현재 로그인한 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('사용자가 로그인되어 있지 않습니다.');
    return [];
  }
  
  const { data, error } = await supabase
    .from('work_schedules')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });
  
  if (error) {
    console.error('Error fetching work schedules:', error);
    return [];
  }
  
  return data || [];
}

// 모든 근무 계획 가져오기
export async function getAllWorkSchedules() {
  // 현재 로그인한 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('사용자가 로그인되어 있지 않습니다.');
    return [];
  }
  
  const { data, error } = await supabase
    .from('work_schedules')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false });
  
  if (error) {
    console.error('Error fetching all work schedules:', error);
    return [];
  }
  
  return data || [];
}

// 근무 계획 생성 또는 업데이트
export async function createOrUpdateWorkSchedule(date, plannedHours, description = '') {
  // 현재 로그인한 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('사용자가 로그인되어 있지 않습니다.');
    return null;
  }
  
  // 먼저 해당 날짜에 기존 계획이 있는지 확인
  const existingSchedule = await getWorkScheduleByDate(date);
  
  if (existingSchedule) {
    // 기존 계획 업데이트
    const { data, error } = await supabase
      .from('work_schedules')
      .update({ 
        planned_hours: plannedHours,
        description: description,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingSchedule.id)
      .eq('user_id', user.id)
      .select();
    
    if (error) {
      console.error('Error updating work schedule:', error);
      return null;
    }
    
    return data[0];
  } else {
    // 새 계획 생성
    const { data, error } = await supabase
      .from('work_schedules')
      .insert([
        { 
          date,
          planned_hours: plannedHours,
          description: description,
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

// 특정 월의 근무 계획 가져오기
export async function getWorkSchedulesByMonth(year, month) {
  // 현재 로그인한 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('사용자가 로그인되어 있지 않습니다.');
    return [];
  }
  
  // 해당 월의 시작일과 종료일 계산
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate(); // 해당 월의 마지막 날짜
  const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
  
  const { data, error } = await supabase
    .from('work_schedules')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });
  
  if (error) {
    console.error('Error fetching work schedules for month:', error);
    return [];
  }
  
  return data || [];
}
