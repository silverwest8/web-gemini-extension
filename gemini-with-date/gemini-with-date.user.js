// ==UserScript==
// @name         Gemini with Date
// @namespace    https://github.com
// @version      1.0.0
// @description  Gemini 대화에서 각 메시지 옆에 작성 시각(타임스탬프)을 표시합니다. (ChatGPT with Date의 Gemini 버전)
// @author       You
// @license      MIT
// @match        https://gemini.google.com/app*
// @run-at       document-end
// @grant        none
// @icon         https://raw.githubusercontent.com/silverwest8/web-gemini-extension/main/gemini-with-date/gemini_with_date_logo.png
// ==/UserScript==

(function () {
    'use strict';

    // ---------- batchexecute XHR/fetch 응답에서 타임스탬프 수집 ----------
    /** true로 두면 콘솔에 [GWD] 로그 출력 */
    window.__gwdDebug = false;
    function log(...args) { if (window.__gwdDebug) console.log('[GWD]', ...args); }

    /** API 응답에서 추출한 타임스탬프(ms) 배열. DOM 턴 순서와 1:1 매칭 */
    window.__gwdTimestamps = [];
    window.__gwdTimestampIndex = 0;

    /** 응답 텍스트에서 [Unix초, 나노초] 쌍을 순서대로 추출 → ms 배열로 반환. Gemini batchexecute 응답 형식용 */
    function extractTimestampsFromBatchResponse(text) {
        const out = [];
        const re = /\[(\d{10,}),\s*(\d+)\]/g;
        let m;
        while ((m = re.exec(text)) !== null) {
            const sec = parseInt(m[1], 10);
            if (sec >= 1e9 && sec <= 2e9) out.push(sec * 1000);
        }
        return out;
    }

    /** URL이 대화 로드용 batchexecute인지 */
    function isBatchExecuteUrl(url) {
        const u = (url || '').toString();
        return u.indexOf('batchexecute') !== -1 || u.indexOf('rpcids=') !== -1;
    }

    /** 현재 페이지 URL에서 대화 ID 추출. 예: /app/3c5fc63322f23ab2 → 3c5fc63322f23ab2. 새 채팅(/app만)이면 null */
    function getCurrentConversationId() {
        const m = window.location.pathname.match(/\/app\/([a-zA-Z0-9_-]+)/);
        return m ? m[1] : null;
    }

    /** 이 요청이 '현재 열린 대화'용인지. 다른 대화/사이드바 응답으로 덮어쓰지 않도록 필터 */
    function isRequestForCurrentConversation(requestUrl) {
        const curId = getCurrentConversationId();
        if (!curId) return true;
        const u = (requestUrl || '').toString();
        return u.indexOf(curId) !== -1;
    }

    /** 추출한 타임스탬프 저장 + 디버그 로그. 현재 대화용 요청일 때만 적용 */
    function applyExtractedTimestampsIfMatching(list, source, requestUrl) {
        if (list.length === 0) return;
        if (!isRequestForCurrentConversation(requestUrl)) {
            log('타임스탬프 무시(다른 대화/목록):', (requestUrl || '').slice(0, 60) + '...');
            return;
        }
        list.reverse();
        window.__gwdTimestamps = list;
        window.__gwdTimestampIndex = 0;
        log('타임스탬프 적용', source, '개수:', list.length, '첫번째:', new Date(list[0]).toLocaleString('ko-KR'));
        if (window.__gwdOnTimestampsApplied) window.__gwdOnTimestampsApplied();
    }

    /** 타임스탬프 적용 (requestUrl 있으면 현재 대화용일 때만 적용) */
    function applyExtractedTimestamps(list, source, requestUrl) {
        applyExtractedTimestampsIfMatching(list, source, requestUrl);
    }

    /** XHR 후킹 */
    const _open = XMLHttpRequest.prototype.open;
    const _send = XMLHttpRequest.prototype.send;
    const _responseTextDesc = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseText');
    XMLHttpRequest.prototype.open = function (method, url) {
        this._gwdUrl = url;
        return _open.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (...args) {
        const xhr = this;
        const url = (xhr._gwdUrl || '').toString();
        if (!isBatchExecuteUrl(url)) {
            return _send.apply(xhr, args);
        }
        log('XHR 감지:', url.slice(0, 80) + '...');
        const origOnReady = xhr.onreadystatechange;
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.responseText) {
                const list = extractTimestampsFromBatchResponse(xhr.responseText);
                applyExtractedTimestamps(list, 'XHR.onreadystatechange', url);
            }
            if (origOnReady) origOnReady.apply(this, arguments);
        };
        return _send.apply(xhr, args);
    };
    if (_responseTextDesc && _responseTextDesc.get) {
        const origGet = _responseTextDesc.get;
        Object.defineProperty(XMLHttpRequest.prototype, 'responseText', {
            get: function () {
                const text = origGet.call(this);
                const url = (this._gwdUrl || '').toString();
                if (text && !this._gwdParsed && isBatchExecuteUrl(url) && this.readyState === 4) {
                    this._gwdParsed = true;
                    const list = extractTimestampsFromBatchResponse(text);
                    applyExtractedTimestamps(list, 'XHR.responseText', url);
                }
                return text;
            },
            configurable: true,
            enumerable: _responseTextDesc.enumerable
        });
    }

    /** fetch 후킹 (batchexecute가 fetch로 호출되는 경우 대비) */
    const _fetch = window.fetch;
    window.fetch = function (input, init) {
        const url = (typeof input === 'string' ? input : (input && input.url)) || '';
        if (!isBatchExecuteUrl(url)) return _fetch.apply(this, arguments);
        log('fetch 감지:', url.slice(0, 80) + '...');
        return _fetch.apply(this, arguments).then((res) => {
            const clone = res.clone();
            clone.text().then((text) => {
                const list = extractTimestampsFromBatchResponse(text);
                applyExtractedTimestamps(list, 'fetch', url);
            }).catch(() => {});
            return res;
        });
    };

    // ---------- DOM 처리 ----------
    // 이미 처리한 컨테이너 표시용 data 속성 이름
    const STAMP_ATTR = 'data-gemini-with-date';
    // 저장한 시각(ms). 있으면 그대로 표시, 없으면 '알 수 없음'
    const STAMP_TIME_ATTR = 'data-gwd-time';
    // 초기 로드 시 발견한 메시지임을 표시 (실제 작성 시각을 알 수 없음)
    const STAMP_INITIAL_ATTR = 'data-gwd-initial';

    // 표시 형식 설정
    const options = {
        format: '24h',       // '12h' | '24h'
        showDate: true,      // 날짜 표시 여부
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm',
        // 초기 로드 메시지(예전 대화)에 표시할 문구. null이면 해당 턴에는 시각을 아예 안 넣음
        unknownLabel: '알 수 없음',
    };

    /** 시각을 "HH:mm" 또는 "h:mm AM/PM" 형태로 포맷 (로컬 타임존 = 한국이면 KST) */
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
            'font-size: 13px;',
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
     * @param {boolean} isInitialLoad - true: 대화 로드 시 있던 메시지(XHR에서 추출한 시각 사용 시도). false: 방금 추가된 메시지(현재 시각)
     */
    function processContainer(container, isInitialLoad) {
        if (!container || container.hasAttribute(STAMP_ATTR)) return;

        let date = null;
        if (isInitialLoad) {
            const idx = window.__gwdTimestampIndex;
            const hasList = window.__gwdTimestamps && window.__gwdTimestamps.length > 0;
            if (hasList && idx < window.__gwdTimestamps.length) {
                date = new Date(window.__gwdTimestamps[idx]);
                window.__gwdTimestampIndex = idx + 1;
                log('컨테이너 턴', idx, '→ API 시각 사용', date.toLocaleString('ko-KR'));
            } else {
                log('컨테이너 턴', idx, '→ 알 수 없음 (타임스탬프 개수:', (window.__gwdTimestamps && window.__gwdTimestamps.length) || 0, ')');
            }
            container.setAttribute(STAMP_INITIAL_ATTR, date ? '0' : '1');
        } else {
            const existing = container.getAttribute(STAMP_TIME_ATTR);
            date = existing ? new Date(parseInt(existing, 10)) : new Date();
        }
        injectTimestamp(container, date);
    }

    /** 루트 안의 모든 .conversation-container에 타임스탬프 처리 (초기 로드용 → isInitialLoad: true) */
    function scanContainers(root, isInitialLoad) {
        root.querySelectorAll('.conversation-container').forEach((el) => processContainer(el, isInitialLoad));
    }

    /** '알 수 없음'으로 표시된 턴에서 스탬프 제거 (타임스탬프가 나중에 도착했을 때 재적용용) */
    function removeStampFromContainer(container) {
        const label = container.querySelector('.gwd-timestamp');
        if (label && label.parentNode) label.parentNode.remove();
        container.removeAttribute(STAMP_ATTR);
        container.removeAttribute(STAMP_TIME_ATTR);
        container.removeAttribute(STAMP_INITIAL_ATTR);
    }

    /** 타임스탬프가 XHR/fetch로 도착한 뒤, 이미 '알 수 없음'으로 그린 턴을 실제 시각으로 다시 그림 */
    function reapplyTimestampsToInitialContainers() {
        const root = document.querySelector('chat-window infinite-scroller');
        if (!root || !window.__gwdTimestamps || window.__gwdTimestamps.length === 0) return;
        const needReapply = root.querySelectorAll('.conversation-container[' + STAMP_INITIAL_ATTR + '="1"]');
        if (needReapply.length === 0) return;
        log('타임스탬프 나중 도착 → 알 수 없음 턴', needReapply.length, '개 재적용');
        needReapply.forEach(removeStampFromContainer);
        window.__gwdTimestampIndex = 0;
        needReapply.forEach((el) => processContainer(el, true));
    }
    window.__gwdOnTimestampsApplied = reapplyTimestampsToInitialContainers;

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

    async function main() {
        const chatRoot = await waitForChatWindow();
        if (!chatRoot || chatRoot === currentRoot) return;
        if (mo) mo.disconnect();
        currentRoot = chatRoot;

        // 처음 화면에 이미 있는 메시지들 = 예전 대화 → API 타임스탬프 있으면 사용
        const containerCount = chatRoot.querySelectorAll('.conversation-container').length;
        log('main: 채팅 루트 발견, 컨테이너 수:', containerCount, '저장된 타임스탬프 수:', (window.__gwdTimestamps && window.__gwdTimestamps.length) || 0);
        scanContainers(chatRoot, true);

        // DOM에 나중에 추가되는 컨테이너: 타임스탬프가 남아 있으면 '대화 로드'(API 시각), 없으면 '방금 보낸 메시지'(현재 시각)
        mo = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.addedNodes.length) {
                    m.addedNodes.forEach((node) => {
                        if (node.nodeType !== Node.ELEMENT_NODE) return;
                        const useInitial = !!(window.__gwdTimestamps && window.__gwdTimestampIndex < window.__gwdTimestamps.length);
                        if (node.classList && node.classList.contains('conversation-container')) {
                            processContainer(node, useInitial);
                        }
                        if (node.querySelector) {
                            node.querySelectorAll('.conversation-container').forEach((el) => {
                                const use = !!(window.__gwdTimestamps && window.__gwdTimestampIndex < window.__gwdTimestamps.length);
                                processContainer(el, use);
                            });
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
