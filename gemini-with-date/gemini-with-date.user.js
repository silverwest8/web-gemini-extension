// ==UserScript==
// @name         Gemini with Date
// @namespace    https://github.com
// @version      0.3.0
// @description  Gemini 대화에서 각 메시지 옆에 작성 시각(타임스탬프)을 표시합니다. (ChatGPT with Date의 Gemini 버전)
// @author       You
// @license      MIT
// @match        https://gemini.google.com/app*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 이미 처리한 컨테이너 표시용 data 속성 이름
    const STAMP_ATTR = 'data-gemini-with-date';
    // 저장한 시각(ms). 있으면 그대로 표시, 없으면 '알 수 없음'
    const STAMP_TIME_ATTR = 'data-gwd-time';
    // 초기 로드 시 발견한 메시지임을 표시 (실제 작성 시각을 알 수 없음)
    const STAMP_INITIAL_ATTR = 'data-gwd-initial';

    /** 페이지/대화 로드 후 이 시간(ms) 안에 나타난 메시지는 '예전 대화'로 간주해 '알 수 없음' 처리. 그 이후에 나타나면 '방금 보낸 메시지'로 현재 시각 표시 */
    const INITIAL_LOAD_GRACE_MS = 6000;

    // 표시 형식 설정
    const options = {
        format: '24h',       // '12h' | '24h'
        showDate: true,      // 날짜 표시 여부
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm',
        // 초기 로드 메시지(예전 대화)에 표시할 문구. null이면 해당 턴에는 시각을 아예 안 넣음
        unknownLabel: '알 수 없음',
    };

    /** 시각을 "HH:mm" 또는 "h:mm AM/PM" 형태로 포맷 */
    function formatTime(date) {
        const pad = (n) => String(n).padStart(2, '0');
        const h = date.getHours();
        const m = date.getMinutes();
        if (options.format === '12h') {
            const ap = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12}:${pad(m)} ${ap}`;
        }
        return `${pad(h)}:${pad(m)}`;
    }

    /** 시각을 "YYYY-MM-DD" 형태로 포맷 */
    function formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /** 날짜 객체로 표시용 문자열 생성 (날짜 + 시간 또는 시간만) */
    function makeLabel(date) {
        const timeStr = formatTime(date);
        if (options.showDate) {
            const dateStr = formatDate(date);
            return `${dateStr} ${timeStr}`;
        }
        return timeStr;
    }

    /**
     * 한 턴(conversation-container) 위에 타임스탬프 라벨을 삽입한다.
     * @param {Element} container - .conversation-container 요소
     * @param {Date|null} date - 표시할 시각. null이면 options.unknownLabel 표시 (예전 대화용)
     */
    function injectTimestamp(container, date) {
        if (container.hasAttribute(STAMP_ATTR)) return;
        container.setAttribute(STAMP_ATTR, '1');
        if (date) container.setAttribute(STAMP_TIME_ATTR, date.getTime());

        const label = document.createElement('span');
        label.className = 'gwd-timestamp';
        // 예전 대화(초기 로드)는 시각을 모르므로 '알 수 없음' 등으로 표시
        label.textContent = date ? makeLabel(date) : (options.unknownLabel || '');
        label.style.cssText = [
            'font-size: 11px;',
            'color: var(--gmpx-color-on-surface-variant, #5f6368);',
            'opacity: 0.85;',
            'margin-left: 6px;',
            'white-space: nowrap;',
        ].join(' ');

        // '알 수 없음'만 넣고 시각은 안 쓰는 경우 라벨 자체를 숨길 수 있음
        if (!label.textContent) return;

        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '2px';
        wrapper.appendChild(label);

        const userQuery = container.querySelector('user-query');
        if (userQuery && userQuery.parentNode) {
            userQuery.parentNode.insertBefore(wrapper, userQuery);
        } else {
            container.insertBefore(wrapper, container.firstChild);
        }
    }

    /**
     * 한 턴(conversation-container)을 처리: 타임스탬프 삽입
     * @param {Element} container - .conversation-container 요소
     * @param {boolean} isWithinGracePeriod - true: 스크립트 시작 후 INITIAL_LOAD_GRACE_MS 안에 나타난 메시지(예전 대화 로드) → '알 수 없음'. false: 그 이후 나타난 메시지(방금 보낸 것) → 현재 시각
     */
    function processContainer(container, isWithinGracePeriod) {
        if (!container || container.hasAttribute(STAMP_ATTR)) return;

        let date = null;
        if (isWithinGracePeriod) {
            // 새로고침/대화 열기 직후 비동기로 불러온 예전 메시지. 작성 시각을 알 수 없음
            container.setAttribute(STAMP_INITIAL_ATTR, '1');
        } else {
            // 스크립트 시작한 지 한참 지난 뒤에 추가된 메시지 = 사용자가 방금 보낸 메시지
            const existing = container.getAttribute(STAMP_TIME_ATTR);
            date = existing ? new Date(parseInt(existing, 10)) : new Date();
        }
        injectTimestamp(container, date);
    }

    /** 루트 안의 모든 .conversation-container에 타임스탬프 처리. grace period 안이면 '알 수 없음' */
    function scanContainers(root, pageLoadTime) {
        const withinGrace = (Date.now() - pageLoadTime) <= INITIAL_LOAD_GRACE_MS;
        root.querySelectorAll('.conversation-container').forEach((el) => processContainer(el, withinGrace));
    }

    /** 채팅 영역(chat-window infinite-scroller)이 나올 때까지 대기 */
    function waitForChatWindow() {
        return new Promise((resolve) => {
            const check = () => {
                const el = document.querySelector('chat-window infinite-scroller');
                if (el) {
                    resolve(el);
                    return;
                }
                setTimeout(check, 300);
            };
            check();
        });
    }

    let currentRoot = null;
    let mo = null;
    /** main()이 시작된 시각. 이 시각 기준으로 grace period 계산 */
    let pageLoadTime = 0;

    async function main() {
        const chatRoot = await waitForChatWindow();
        if (!chatRoot || chatRoot === currentRoot) return;
        if (mo) mo.disconnect();
        currentRoot = chatRoot;
        pageLoadTime = Date.now();

        // 첫 스캔: 이미 DOM에 있는 메시지가 있으면 처리 (대부분 비동기 로드라 나중에 observer가 처리할 수도 있음)
        scanContainers(chatRoot, pageLoadTime);

        // DOM에 새로 추가되는 메시지: 스크립트 시작 후 N초 안이면 '예전 대화 로드', N초 지나면 '방금 보낸 메시지'
        mo = new MutationObserver((mutations) => {
            const withinGrace = (Date.now() - pageLoadTime) <= INITIAL_LOAD_GRACE_MS;
            for (const m of mutations) {
                if (m.addedNodes.length) {
                    m.addedNodes.forEach((node) => {
                        if (node.nodeType !== Node.ELEMENT_NODE) return;
                        if (node.classList && node.classList.contains('conversation-container')) {
                            processContainer(node, withinGrace);
                        }
                        if (node.querySelector) {
                            node.querySelectorAll('.conversation-container').forEach((el) => processContainer(el, withinGrace));
                        }
                    });
                }
            }
        });

        mo.observe(chatRoot, { childList: true, subtree: true });
    }

    function onPageReady() {
        main();
    }

    // 뒤로가기/앞으로가기로 대화 전환 시 다시 주입
    window.addEventListener('popstate', () => { currentRoot = null; onPageReady(); });
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onPageReady);
    } else {
        onPageReady();
    }
})();
