# 필터맞춤

가전 모델명으로 맞는 필터·소모품을 찾아주는 정적 사이트. 호환 정보는 제조사 공식 자료만 옮기고 출처·확인일을 남긴다.

- 빌드: `node scripts/build.mjs` → `dist/` (의존성 없음)
- 데이터: `data/filters/*.json`, `data/guides/*.json`
- 설정: `site.config.json` (도메인, 쿠팡 파트너스 사용 여부)
- 배포: `main`에 푸시하면 GitHub Actions가 GitHub Pages로 배포
- 매일 작업 규칙: `DAILY.md`

쿠팡 파트너스 가입 후 `coupangPartnersEnabled`를 `true`로 바꾸고, 각 필터 JSON에 `"coupangLinks": [{"label": "...", "url": "https://link.coupang.com/..."}]`를 넣으면 제휴 링크와 대가성 문구가 표시된다.
