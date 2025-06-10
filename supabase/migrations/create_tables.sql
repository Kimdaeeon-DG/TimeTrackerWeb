-- profiles 테이블 생성 (사용자 프로필 정보)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  time_zone TEXT DEFAULT 'Asia/Seoul',
  working_hours_per_day INTEGER DEFAULT 8,
  working_days TEXT[] DEFAULT ARRAY['월', '화', '수', '목', '금'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- time_entries 테이블 생성 (출퇴근 기록)
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL,
  check_in TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out TIMESTAMP WITH TIME ZONE,
  working_hours NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS(Row Level Security) 정책 설정
-- profiles 테이블에 대한 RLS 정책
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 자신의 프로필만 볼 수 있음" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 프로필만 생성할 수 있음" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 프로필만 수정할 수 있음" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- time_entries 테이블에 대한 RLS 정책
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 자신의 출퇴근 기록만 볼 수 있음" ON time_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 출퇴근 기록만 생성할 수 있음" ON time_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 출퇴근 기록만 수정할 수 있음" ON time_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 출퇴근 기록만 삭제할 수 있음" ON time_entries
  FOR DELETE USING (auth.uid() = user_id);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- 함수 생성: 사용자 생성 시 자동으로 프로필 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
