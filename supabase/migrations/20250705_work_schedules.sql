-- work_schedules 테이블 생성 (근무 계획)
CREATE TABLE IF NOT EXISTS work_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  planned_hours NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- work_schedules 테이블에 대한 RLS 정책
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 자신의 근무 계획만 볼 수 있음" ON work_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 근무 계획만 생성할 수 있음" ON work_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 근무 계획만 수정할 수 있음" ON work_schedules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 근무 계획만 삭제할 수 있음" ON work_schedules
  FOR DELETE USING (auth.uid() = user_id);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_work_schedules_user_id ON work_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_date ON work_schedules(date);
