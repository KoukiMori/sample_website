/**
 * セクション内ナビ：sticky で固定されたとき .is-stuck を付与
 * ナビが2段になっても見出しが隠れないよう、ジャンプ余白を実際の高さに合わせる
 * 500px以下：施設名がヘッダーの上に隠れたらナビを閉じ、▽タップで開く
 */
(function() {
    const sectionNav = document.querySelector('.section-nav');
    if (!sectionNav) return;

    const stickyTop = 100;
    const pageName = document.querySelector('.facility-detail .page-name');
    const narrowQuery = window.matchMedia('(max-width: 500px)');
    /* 施設名が隠れたあと、利用者が▽で開いたかどうか */
    let userOpened = false;

    /* 閉じたナビを開く▽。広い画面ではCSSで出さない */
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'section-nav-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'ナビゲーションを開く');
    sectionNav.insertBefore(toggle, sectionNav.firstChild);

    function applyScrollMargin() {
        const cs = getComputedStyle(sectionNav);
        const top = parseFloat(cs.top) || 0;
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const collapsed = sectionNav.classList.contains('is-name-hidden') && !sectionNav.classList.contains('is-nav-open');
        // 固定時は padding-bottom: 2rem。閉じている間はその余白を足さない
        const currentPadBottom = parseFloat(cs.paddingBottom) || 0;
        const stuckPadBottom = collapsed ? currentPadBottom : rem * 2;
        const extra = Math.max(0, stuckPadBottom - currentPadBottom);
        const offset = Math.ceil(top + sectionNav.offsetHeight + extra);
        document.documentElement.style.setProperty('--section-nav-offset', offset + 'px');
    }

    /* 施設名の下端がヘッダーより上に行ったら、上に隠れたとみなす */
    function isNameHidden() {
        if (!pageName || !narrowQuery.matches) return false;
        const header = document.querySelector('header');
        const limit = header ? header.getBoundingClientRect().bottom : 0;
        return pageName.getBoundingClientRect().bottom <= limit + 1;
    }

    /* 隠れたら閉じる。▽で開いている間だけリンクを出す */
    function syncNameNav() {
        const hidden = isNameHidden();
        if (!hidden) userOpened = false;
        sectionNav.classList.toggle('is-name-hidden', hidden);
        const open = hidden && userOpened;
        sectionNav.classList.toggle('is-nav-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'ナビゲーションを閉じる' : 'ナビゲーションを開く');
    }

    function checkStuck() {
        sectionNav.classList.toggle('is-stuck', sectionNav.getBoundingClientRect().top <= stickyTop);
        syncNameNav();
        applyScrollMargin();
    }

    toggle.addEventListener('click', function() {
        if (!sectionNav.classList.contains('is-name-hidden')) return;
        userOpened = !userOpened;
        checkStuck();
    });

    /* 項目を選んだら再び閉じて、見出しがナビに隠れないようにする */
    sectionNav.addEventListener('click', function(e) {
        if (!e.target.closest('a')) return;
        if (!sectionNav.classList.contains('is-name-hidden')) return;
        userOpened = false;
        checkStuck();
    });

    window.addEventListener('scroll', checkStuck, { passive: true });
    window.addEventListener('resize', checkStuck);
    if (narrowQuery.addEventListener) {
        narrowQuery.addEventListener('change', checkStuck);
    }
    applyScrollMargin();
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