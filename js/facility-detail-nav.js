/**
 * セクション内ナビ：sticky で固定されたとき .is-stuck を付与
 */
(function() {
    const sectionNav = document.querySelector('.section-nav');
    if (!sectionNav) return;

    const stickyTop = 100;

    function checkStuck() {
        sectionNav.classList.toggle('is-stuck', sectionNav.getBoundingClientRect().top <= stickyTop);
    }
    window.addEventListener('scroll', checkStuck, { passive: true });
    checkStuck();
})();

/**
 * その他施設ナビ：閉じる時もスライドアニメーションしてから閉じる
 */
(function() {
    const nav = document.querySelector('.other-facility-nav');
    if (!nav) return;

    const summary = nav.querySelector('summary');
    const list = nav.querySelector('.other-facility-nav-list');
    if (!summary || !list) return;

    let isClosing = false;

    summary.addEventListener('click', function(e) {
        if (!nav.hasAttribute('open')) return;

        // 閉じる場合：三角をすぐ戻し、リストはスライドアニメ後に閉じる
        e.preventDefault();
        if (isClosing) return;
        isClosing = true;
        nav.classList.add('is-closing-summary');
        list.classList.add('is-closing');

        function doClose() {
            nav.removeAttribute('open');
            nav.classList.remove('is-closing-summary');
            list.classList.remove('is-closing');
            isClosing = false;
        }

        list.addEventListener('transitionend', function onEnd(ev) {
            if (ev.propertyName !== 'transform') return;
            list.removeEventListener('transitionend', onEnd);
            doClose();
        }, { once: true });

        // transitionend が発火しない場合のフォールバック（0.5s＋余裕）
        setTimeout(function() {
            if (nav.hasAttribute('open') && list.classList.contains('is-closing')) {
                doClose();
            }
        }, 600);
    });
})();

/**
 * スクロールでクラスを付与してアニメ開始
 * - #events: 画面上部50%に入ったら .cards-open
 * - #guidance: セクションが約25%見えたら .guidance-visible（施設図・写真のアニメ）
 */
(function() {
    var eventsOptions = { threshold: 0, rootMargin: '0px 0px -50% 0px' };
    var eventsObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('cards-open');
            } else {
                entry.target.classList.remove('cards-open');
            }
        });
    }, eventsOptions);

    var eventsSection = document.querySelector('#events');
    if (eventsSection) eventsObserver.observe(eventsSection);

    /* threshold: 監視要素（#guidance）が root（ビューポート）にどれだけ入ったらコールバックするかの割合。
     * [0, 0.2, 0.4, 0.5, 1] = 0%, 20%, 40%, 50%, 100% 見えたタイミングでコールバック。
     * 0.4 以上で .guidance-visible を付与するため、少し早めに施設図などが表示される。 */
    var guidanceOptions = { threshold: [0, 0.2, 0.4, 0.5, 1] };
    var guidanceObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.intersectionRatio >= 0.4) {
                entry.target.classList.add('guidance-visible');
            } else {
                entry.target.classList.remove('guidance-visible');
            }
        });
    }, guidanceOptions);

    var guidanceSection = document.querySelector('#guidance');
    if (guidanceSection) guidanceObserver.observe(guidanceSection);
})();