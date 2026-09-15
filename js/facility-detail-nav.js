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
 * 組合施設ナビ：閉じる時もスライドアニメーションしてから閉じる
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
 * 600px以下の真下タブ：少し下にスクロールしたら表示
 */
(function() {
    const mq = window.matchMedia('(max-width: 600px)');
    // この量スクロールしたらタブを出す
    const SHOW_AFTER_PX = 10;

    function updateBottomTabsVisibility() {
        if (!mq.matches) {
            document.body.classList.remove('bottom-tabs-visible');
            return;
        }
        const show = window.scrollY > SHOW_AFTER_PX;
        document.body.classList.toggle('bottom-tabs-visible', show);
    }

    window.addEventListener('scroll', updateBottomTabsVisibility, { passive: true });
    window.addEventListener('resize', updateBottomTabsVisibility);
    updateBottomTabsVisibility();
})();

/**
 * 年間行事：画面上部50%に入ったら .cards-open を付与（カードが扇状に開く）
 * 実機でアニメが見えるよう、初回描画後に observe 開始（閉じた状態を描画してから transition）
 */
(function() {
    var eventsSection = document.querySelector('#events');
    if (!eventsSection) return;

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

    // 閉じた状態を描画してから observe 開始（実機で扇状に開く transition が表示されるように）
    setTimeout(function() {
        eventsObserver.observe(eventsSection);
    }, 350);
})();