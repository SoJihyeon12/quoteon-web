# QuoteOn Web

QuoteOn의 프론트엔드 저장소입니다.  
영업사원 상담 화면과 관리자 화면을 React로 구현합니다.

백엔드·DB·기획 문서·시연 SQL은 `quoteon` 저장소에서 관리합니다. 로컬에서 API를 쓰려면 백엔드를 먼저 실행해야 합니다.

---

## 1. 프로젝트 소개

QuoteOn Web은 Vite 기반 SPA입니다. 브라우저에서 로그인·제품 탐색·견적 작성·내 견적·관리자 기능을 제공하고, `/api`와 `/images` 요청을 백엔드(`http://localhost:8080`)로 프록시합니다.

---

## 2. 프로젝트 기획 배경 및 목적

영업 상담 중 제품 선택과 견적 작성을 화면에서 바로 처리할 수 있도록 UI를 구성했습니다. 기획·요구사항의 원문은 백엔드 저장소의 문서를 따릅니다.

- 기획서: `quoteon/docs/01_planning/01_proposal.md`
- 요구사항: `quoteon/docs/01_planning/02_prd.md`
- UI 와이어프레임: `quoteon/docs/02_design/03_ui_wireframe.md`

---

## 3. 주요 기능

- 회원가입·로그인·로그아웃, 승인 대기·이용 제한 안내
- 상담 작업대: 카테고리·검색·페이징·즐겨찾기, 제품 상세·이미지, 고객 선택, 견적 작성
- 고객 목록·등록·수정·비활성화
- 내 견적 목록·상세, PDF/JPEG/PNG 다운로드, 이메일 발송·이력·재전송
- 관리자: 대시보드, 회원·카테고리·제품·견적 관리, PDF·PNG 다운로드

로그인 사용자 정보는 우측 상단에 **이름만** 표시합니다.

---

## 4. 기술 스택

- React 19, TypeScript, Vite 8
- Oxlint
- Node.js 내장 test runner (`node --test`)

백엔드 연동: Spring Boot REST API, 세션 쿠키 + CSRF

---

## 5. 시스템 아키텍처

```text
Browser (Vite :5173)
   │  proxy /api, /images
   ▼
QuoteOn Backend (:8080) → MySQL
```

상세 구조는 `quoteon/docs/02_design/01_architecture.md`를 참고하세요.

---

## 6. 주요 구현 내용

- 경로 기반 화면 분기(상담, 내 견적, 관리자 등)
- 견적 금액(공급가액·부가세·합계) 클라이언트 계산과 저장 API 연동
- 즐겨찾기 API 연동 및 `?filter=favorites` 필터
- 관리자 제품 판매 중지·삭제 확인 팝업(견적 사용 여부 반영)
- 관리자 견적 상세의 공급자 예시 표시(와이어프레임 기준)

---

## 7. 데이터베이스 구조

프론트엔드는 DB에 직접 접근하지 않습니다. 스키마·시연 데이터는 백엔드 저장소를 따릅니다.

- 스키마: `quoteon/src/main/resources/schema.sql`
- ERD: `quoteon/docs/02_design/02_erd.md`
- 시연 SQL: `quoteon/scripts/demo/a1-furniture-demo.sql`

---

## 8. 실행 방법

### 백엔드(필수)

`quoteon` 저장소에서 DB·환경 변수·`bootRun`을 준비합니다. 자세한 절차는 백엔드 README를 따릅니다.

### 프론트엔드

```text
npm install
npm run dev
```

- 접속: `http://localhost:5173`
- 백엔드 CORS는 5173 / 127.0.0.1:5173만 허용하므로, 다른 포트로 기동되면 API가 실패할 수 있습니다.

### 검사

```text
npx tsc --noEmit
npm run lint
node --test "src/**/*.test.ts"
```

프론트엔드 전용 `.env`는 기본 구성에 필요하지 않습니다. API 주소는 Vite 프록시를 사용합니다.

---

## 9. 주요 API

프론트가 호출하는 대표 경로는 다음과 같습니다. 전체 목록과 권한은 백엔드 README를 참고하세요.

- `/api/signup`, `/api/login`, `/api/logout`, `/api/me`
- `/api/categories`, `/api/products`, `/api/products/{id}/favorite`
- `/api/customers`, `/api/quotes` 및 문서·메일 하위 경로
- `/api/admin/**` (관리자)

---

## 10. 시연 데이터 및 계정 안내

계정·비밀번호·데이터 건수는 백엔드 README·시연 SQL·현재 DB 상태를 기준으로 합니다.

| 이메일 | 이름 | 역할 |
| --- | --- | --- |
| `admin1@aonef.com` | 김관리 | 관리자 |
| `sales1@aonef.com` | 김영업 | 영업사원 |
| `sales2@aonef.com` | 박서연 | 영업사원 |
| `sales3@aonef.com` | 이준호 | 영업사원 |
| `sales4@aonef.com` | 최민아 | 영업사원 |

로컬 시연용 임시 비밀번호는 `1234`입니다. 운영 환경에서 사용하지 마세요.

---

## 11. 프로젝트 문서

문서 원본은 백엔드 저장소에 있습니다.

- `quoteon/docs/01_planning/`
- `quoteon/docs/02_design/`
- `quoteon/docs/03_reports/`

---

## 12. 개발자 정보

- 이름: 소지현
- 과정: BackEnd BootCamp 25기 3차 심화 프로젝트(개인)
- 역할: QuoteOn 프론트엔드 구현
