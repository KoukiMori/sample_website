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