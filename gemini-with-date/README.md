# Gemini with Date

Google Gemini( gemini.google.com ) 대화에서 **각 메시지 위에 작성 시각(타임스탬프)**을 표시하는 유저스크립트입니다.  
[ChatGPT with Date](https://greasyfork.org/en/scripts/493949-chatgpt-with-date)의 Gemini 버전 컨셉입니다.

## 요구사항

- **Tampermonkey** (또는 Violentmonkey, Greasemonkey 등) 확장 프로그램이 설치되어 있어야 합니다.
  - Chrome: [Tampermonkey - Chrome 웹 스토어](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)

## 설치 방법

### 방법 1: 로컬 파일로 설치

1. Tampermonkey 대시보드를 엽니다. (확장 아이콘 → Tampermonkey → Dashboard)
2. **「+」** (새 스크립트 추가) 탭을 엽니다.
3. 이 저장소의 `gemini-with-date.user.js` 파일 내용을 **전부 복사**해서 새 스크립트 편집기에 **덮어쓰기** 합니다.
4. **Ctrl+S** (또는 Cmd+S)로 저장합니다.
5. [Gemini](https://gemini.google.com/app) 에 접속해 대화를 열면, 각 턴 위에 날짜·시간이 표시됩니다.

### 방법 2: URL로 설치 (GitHub 배포 후)

1. 이 저장소를 GitHub에 푸시한 뒤, **raw 파일 URL**을 복사합니다.  
   예: `https://raw.githubusercontent.com/사용자명/web-gemini-extension/main/gemini-with-date/gemini-with-date.user.js`
2. Tampermonkey 대시보드 → **유틸리티** 탭 → **URL에서 설치** (또는 새 스크립트에서 파일 → URL에서 가져오기).
3. 위 raw URL을 붙여넣고 설치합니다.  
   이후 저장소를 업데이트하면 Tampermonkey에서 스크립트 업데이트를 제안할 수 있습니다.

### 방법 3: 파일 경로로 불러오기

1. Tampermonkey 대시보드 → **유틸리티** 탭 (또는 새 스크립트).
2. "파일에서 설치" 등으로 `gemini-with-date.user.js` 파일을 선택해 설치합니다.  
   (브라우저/매니저에 따라 "파일에서 가져오기" 메뉴가 있을 수 있습니다.)

## 사용 방법

- **별도 조작 없이** [Gemini 앱](https://gemini.google.com/app) 에서 대화하면 됩니다.
- **새로 주고받는 메시지**에는 그 메시지가 화면에 나타난 시각이 표시됩니다.
- **이미 있던 메시지**: 대화를 불러올 때 쓰는 API 응답에 `create_time`(Unix 초)이 있으면, 스크립트가 **fetch를 가로채서** 그 시각을 사용합니다. 없거나 구조가 다르면 "알 수 없음"으로 표시됩니다.

## 설정 변경

스크립트 상단의 `options` 객체를 수정한 뒤 저장하면 됩니다.

```javascript
const options = {
    format: '24h',       // '12h' (오후 3:42) | '24h' (15:42)
    showDate: true,     // true면 "YYYY-MM-DD HH:mm" 형태
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm',
};
```

## 예전 채팅 시각 (create_time)

- 스크립트는 **fetch를 후킹**해, 대화를 불러오는 API 응답 JSON 안의 **`create_time`**(Unix 초)을 수집합니다. DOM에 메시지가 나타날 때 **순서대로** 그 시각을 매칭해 표시합니다.
- API 응답 구조가 예상과 다르면(예: `create_time`이 다른 키 이름이거나 더 깊은 경로에 있으면) "알 수 없음"만 나올 수 있습니다. 그때는 개발자 도구 → Network에서 해당 요청의 **Response** 일부(create_time이 들어 있는 부분)를 알려주시면, 수집 로직을 맞출 수 있습니다.

## 디버깅

- 스크립트 상단에서 **`window.__gwdDebug = true`** 로 바꾸면, 개발자 도구 **Console** 탭에 `[GWD]` 로그가 찍힙니다.
- **XHR 감지** / **fetch 감지** → batchexecute 요청을 잡았는지
- **타임스탬프 추출됨** → 응답에서 몇 개 추출했는지, 첫 번째 시각
- **main: 채팅 루트 발견, 컨테이너 수, 저장된 타임스탬프 수** → DOM이 먼저 그려졌을 때 0이면 타임스탬프가 나중에 도착하는 경우
- **컨테이너 턴 N → API 시각 사용** / **알 수 없음** → 각 턴에 시각을 썼는지
- 디버깅이 끝나면 스크립트 상단에서 **`window.__gwdDebug = false`** 로 바꾸거나, 콘솔에서 `__gwdDebug = false` 실행하면 로그가 나오지 않습니다.

## 한계 및 참고

- **DOM 구조**: Gemini 웹 UI가 업데이트되면 선택자( `.conversation-container`, `user-query` 등)가 바뀌어 동작하지 않을 수 있습니다. 그때는 스크립트 내 선택자를 최신 페이지에 맞게 수정해야 합니다.
- **과거 메시지 시각**: 페이지가 제공하는 “메시지 생성 시각” 데이터가 없으면, 스크립트는 “해당 메시지 DOM을 처음 본 시각”만 표시할 수 있습니다.
- **비공식**: Google 공식 기능이 아니며, Gemini UI 변경 시 미동작할 수 있습니다.

## 라이선스

MIT
