# TimeTracker 웹 애플리케이션

시간 추적 및 관리를 위한 웹 애플리케이션입니다. 이 프로젝트는 Next.js, TypeScript, Tailwind CSS를 사용하여 구축되었으며, Supabase를 데이터베이스로 사용하고 Netlify에 배포됩니다.

## 주요 기능

- **타이머**: 작업 시간을 실시간으로 추적
- **대시보드**: 시간 추적 데이터 시각화 및 분석
- **프로필 관리**: 사용자 설정 및 기본 설정 관리

## 기술 스택

- **프론트엔드**: Next.js, React, TypeScript, Tailwind CSS
- **백엔드**: Supabase (PostgreSQL 기반 백엔드)
- **배포**: Netlify

## 시작하기

### 필수 조건

- Node.js 18.x 이상
- npm 또는 yarn
- Supabase 계정

### 설치

1. 저장소 클론:
   ```bash
   git clone <repository-url>
   cd time-tracker-web
   ```

2. 의존성 설치:
   ```bash
   npm install
   ```

3. 환경 변수 설정:
   `.env.local.example` 파일을 `.env.local`로 복사하고 Supabase 프로젝트의 URL과 익명 키를 입력합니다.
   ```bash
   cp .env.local.example .env.local
   ```

4. 개발 서버 실행:
   ```bash
   npm run dev
   ```

5. 브라우저에서 `http://localhost:3000`으로 접속하여 애플리케이션을 확인합니다.

## Supabase 설정

1. Supabase 프로젝트 생성
2. 다음 테이블 생성:
   - `users`: 사용자 정보 저장
   - `time_entries`: 시간 추적 데이터 저장

## 배포

이 프로젝트는 Netlify에 배포하도록 구성되어 있습니다.

1. Netlify 계정 생성
2. 저장소 연결
3. 환경 변수 설정 (Supabase URL 및 키)
4. 배포 트리거

## 라이선스

MIT
