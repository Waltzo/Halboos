# 💰 halboos — 할부 계산기

카드 할부와 고정지출을 등록하면 **월별 결제 예정 금액을 카드별로 묶어** 한눈에 보여주는 웹앱.
백엔드 없이 브라우저 `localStorage`에 저장되는 정적 앱. GitHub Pages 배포.

## 기능
- **카드 관리**: 카드마다 매월 결제일 지정
- **할부 등록**: 무이자 / 유이자, 개월수, 첫 청구월 입력 → 매월 청구액 자동 계산
  - 유이자: 카드사 표준(원금 균등분할 + 잔액기준 월수수료 `연이율/12`)
- **고정지출**: 매월 반복 지출 (시작월~종료월, 종료월 없으면 무기한)
- **월별 요약**: 월별 총액 + 카드별 상세 회차, CSS 막대 그래프
- **백업**: JSON 내보내기 / 가져오기

## 개발
```bash
npm install
npm run dev       # 로컬 개발 서버
npm run build     # 타입체크 + 프로덕션 빌드 (dist/)
npm run preview   # 빌드 결과 미리보기
```

## GitHub Pages 배포
1. 이 프로젝트를 GitHub 레포로 push (기본 브랜치 `main`).
2. 레포 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 설정.
3. `main` push 시 `.github/workflows/deploy.yml` 이 자동 빌드·배포.
   `https://<계정>.github.io/<레포명>/` 에서 접속.

> Vite `base: './'` (상대경로) 설정이라 레포명이 무엇이든 그대로 동작합니다.

## 스택
Vite · React · TypeScript · zustand(localStorage persist). 외부 UI/차트 라이브러리 없음.
