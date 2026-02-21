# web-gemini-extension

Gemini 웹 관련 스크립트·문서 모음입니다.

## Gemini with Date

Google Gemini 대화에서 **각 메시지 위에 작성 시각(타임스탬프)**을 표시하는 유저스크립트입니다.

- **경로:** [gemini-with-date/](gemini-with-date/)
- **설치·사용법:** [gemini-with-date/README.md](gemini-with-date/README.md)

## Git 올리고 배포하기

1. **GitHub 저장소 만들기**  
   GitHub에서 새 저장소 생성 (예: `web-gemini-extension`).  
   "Add a README" 등은 선택하지 않고 빈 저장소로 만듭니다.

2. **원격 추가 후 푸시**
   ```bash
   cd /Users/choeeunseo/git/web-gemini-extension
   git remote add origin https://github.com/본인아이디/web-gemini-extension.git
   git branch -M main
   git push -u origin main
   ```
   (이미 `origin`이 있으면 `git remote set-url origin ...` 로 URL만 바꾼 뒤 `git push -u origin main`)

3. **스크립트 배포 URL (Tampermonkey 설치용)**  
   푸시가 끝나면 아래 주소가 **설치 링크**가 됩니다.  
   `본인아이디`와 저장소 이름을 실제 값으로 바꿉니다.
   ```
   https://raw.githubusercontent.com/본인아이디/web-gemini-extension/main/gemini-with-date/gemini-with-date.user.js
   ```
   - Tampermonkey → 유틸리티 → **URL에서 설치**에 위 주소 입력하면 설치됩니다.
   - (선택) [Greasy Fork](https://greasyfork.org)에 등록해 검색·자동 업데이트를 쓰려면, 해당 사이트에서 "새 스크립트 작성" 후 이 저장소 링크나 raw URL을 제출하면 됩니다.

## 문서 (docs/)

- IT 뉴스 요약 서비스 기획, ChatGPT with Date 사용법, Gemini 채팅 작성일 조사 등
