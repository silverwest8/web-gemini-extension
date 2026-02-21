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

### 방법 2: 파일 경로로 불러오기

1. Tampermonkey 대시보드 → **유틸리티** 탭 (또는 새 스크립트).
2. "파일에서 설치" 등으로 `gemini-with-date.user.js` 파일을 선택해 설치합니다.  
   (브라우저/매니저에 따라 "파일에서 가져오기" 메뉴가 있을 수 있습니다.)

## 사용 방법

- **별도 조작 없이** [Gemini 앱](https://gemini.google.com/app) 에서 대화하면 됩니다.
- **새로 주고받는 메시지**에는 그 메시지가 화면에 나타난 시각이 표시됩니다.
- **이미 있던 메시지**(대화를 연 뒤 보이는 것)에는 스크립트가 해당 요소를 처음 본 시각이 표시됩니다.  
  (Gemini 웹이 메시지별 생성 시각을 DOM/API로 공개하지 않으면, “실제 작성 시각”은 알 수 없습니다.)

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

## 예전 채팅은 왜 "알 수 없음"으로 나오나요?

- **새로 하는 대화**: 메시지가 DOM에 추가될 때 그 시각을 기록하므로, **실제에 가까운 시각**이 표시됩니다.
- **스크립트 적용 전에 이미 있던 대화**: 페이지를 열면 예전 메시지들이 **이미 DOM에 한꺼번에** 올라옵니다. 이때는 "그 메시지가 언제 작성됐는지"를 DOM이나 공개 API로 알 수 없어, **현재 시각을 찍으면 오해**가 생깁니다. 그래서 **"알 수 없음"**으로 표시합니다.
- **해결 방향**: Gemini 웹이 대화를 불러올 때 쓰는 내부 API를 가로채서( fetch/XHR 후킹 ) 메시지별 시각을 파싱하면, 이론상 예전 대화에도 실제 시각을 넣을 수 있지만, API 형식 변경에 취약하고 구현이 무겁습니다. 현재 버전은 "새 대화는 정확히, 예전 대화는 오해 없이" 처리하는 방식입니다.

## 한계 및 참고

- **DOM 구조**: Gemini 웹 UI가 업데이트되면 선택자( `.conversation-container`, `user-query` 등)가 바뀌어 동작하지 않을 수 있습니다. 그때는 스크립트 내 선택자를 최신 페이지에 맞게 수정해야 합니다.
- **과거 메시지 시각**: 페이지가 제공하는 “메시지 생성 시각” 데이터가 없으면, 스크립트는 “해당 메시지 DOM을 처음 본 시각”만 표시할 수 있습니다.
- **비공식**: Google 공식 기능이 아니며, Gemini UI 변경 시 미동작할 수 있습니다.

## 라이선스

MIT
