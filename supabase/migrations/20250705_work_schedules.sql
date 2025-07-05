-- work_schedules 테이블 생성 (근무 계획 기록)
CREATE TABLE IF NOT EXISTS work_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL, -- 'YYYY-MM-DD' 형식
  start_time TEXT NOT NULL, -- 'HH:MM' 형식
  end_time TEXT NOT NULL, -- 'HH:MM' 형식
  planned_hours NUMERIC(10, 2) NOT NULL, -- 계획된 근무 시간
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- work_schedules 테이블에 대한 RLS 정책
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;

-- 조회 정책
CREATE POLICY "사용자는 자신의 근무 계획만 볼 수 있음" ON work_schedules
  FOR SELECT USING (auth.uid() = user_id);

-- 생성 정책
CREATE POLICY "사용자는 자신의 근무 계획만 생성할 수 있음" ON work_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 수정 정책
CREATE POLICY "사용자는 자신의 근무 계획만 수정할 수 있음" ON work_schedules
  FOR UPDATE USING (auth.uid() = user_id);

-- 삭제 정책
CREATE POLICY "사용자는 자신의 근무 계획만 삭제할 수 있음" ON work_schedules
  FOR DELETE USING (auth.uid() = user_id);

-- 인덱스 생성 (날짜별 검색 성능 향상)
CREATE INDEX IF NOT EXISTS work_schedules_user_date_idx ON work_schedules (user_id, date);
