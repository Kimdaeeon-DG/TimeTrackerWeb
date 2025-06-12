-- time_entries 테이블에 대한 기존 RLS 정책 삭제
DROP POLICY IF EXISTS "사용자는 자신의 출퇴근 기록만 볼 수 있음" ON time_entries;
DROP POLICY IF EXISTS "사용자는 자신의 출퇴근 기록만 생성할 수 있음" ON time_entries;
DROP POLICY IF EXISTS "사용자는 자신의 출퇴근 기록만 수정할 수 있음" ON time_entries;
DROP POLICY IF EXISTS "사용자는 자신의 출퇴근 기록만 삭제할 수 있음" ON time_entries;

-- 성능 개선된 RLS 정책 생성 (JWT claim 사용)
-- time_entries 테이블에 대한 RLS 정책
CREATE POLICY "사용자는 자신의 출퇴근 기록만 볼 수 있음" ON time_entries
  FOR SELECT USING (user_id = (current_setting('request.jwt.claim.sub', true)::UUID));

CREATE POLICY "사용자는 자신의 출퇴근 기록만 생성할 수 있음" ON time_entries
  FOR INSERT WITH CHECK (user_id = (current_setting('request.jwt.claim.sub', true)::UUID));

CREATE POLICY "사용자는 자신의 출퇴근 기록만 수정할 수 있음" ON time_entries
  FOR UPDATE USING (user_id = (current_setting('request.jwt.claim.sub', true)::UUID));

CREATE POLICY "사용자는 자신의 출퇴근 기록만 삭제할 수 있음" ON time_entries
  FOR DELETE USING (user_id = (current_setting('request.jwt.claim.sub', true)::UUID));
