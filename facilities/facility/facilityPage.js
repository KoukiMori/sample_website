(function() {
    'use strict';

    const list = document.querySelector('.carousel .list');
    const carousel = document.querySelector('.carousel');
    const progressBar = document.querySelector('.facility-progress');

    if (!list) return;

    /** 表示中の .content 内の title / name / des / btn / arrows のアニメーションを再実行 */
    function restartContentAnimation() {
        const firstItem = list.querySelector('.item');
        if (!firstItem) return;
        const content = firstItem.querySelector('.content');
        if (!content) return;
        const animated = content.querySelectorAll('.title, .name, .des, .btn button, .arrows');
        animated.forEach(function(el) {
            el.style.animation = 'none';
            el.offsetHeight;
            el.style.animation = '';
        });
    }

    /** プログレスバーをリセット（次へ/前へクリック時） */
    function resetProgressBar() {
        if (!progressBar) return;
        progressBar.style.animation = 'none';
        progressBar.offsetHeight;
        progressBar.style.animation = 'facilityProgressAnimation 10s linear infinite';
    }

    /** 新しい1枚目をゆっくりフェードイン。終了後に content を表示 */
    function applyFadeInAndCleanup() {
        var first = list.querySelector('.item');
        if (!first) return;
        first.classList.remove('item--fade-in');
        first.offsetHeight;
        first.classList.add('item--fade-in');
        first.addEventListener('animationend', function onEnd(e) {
            if (e.animationName !== 'itemFadeIn') return;
            first.removeEventListener('animationend', onEnd);
            first.classList.remove('item--fade-in');
            /* 画面の切り替えが終わってから content を表示 */
            restartContentAnimation();
        }, { once: true });
    }

    /** その他施設ナビ：表示中のスライドに該当する施設をリストから非表示（施設詳細ページと同じ仕様） */
    function syncOtherFacilityNav() {
        var first = list.querySelector('.item');
        var navList = document.querySelector('.other-facility-nav-list');
        if (!first || !navList) return;
        var current = first.getAttribute('data-facility');
        navList.querySelectorAll('li').forEach(function(li) {
            li.classList.toggle('is-current', li.getAttribute('data-facility') === current);
        });
    }

    /** 次のスライドへ（DOMを回し、新しい1枚目を一斉フェードイン） */
    function goNext() {
        var first = list.querySelector('.item');
        if (first) {
            list.appendChild(first);
            applyFadeInAndCleanup();
            syncOtherFacilityNav();
        }
        resetProgressBar();
    }

    /** 前のスライドへ */
    function goPrev() {
        var items = list.querySelectorAll('.item');
        var last = items[items.length - 1];
        if (last) {
            last.style.transition = 'none';
            list.insertBefore(last, list.firstChild);
            last.offsetHeight;
            last.style.transition = '';
            applyFadeInAndCleanup();
            syncOtherFacilityNav();
        }
        resetProgressBar();
    }

    // プログレスバーが1サイクル終わるたびに次のスライドへ
    if (progressBar) {
        progressBar.addEventListener('animationiteration', function() {
            goNext();
        });
    }

    // 矢印クリック
    if (carousel) {
        carousel.addEventListener('click', function(e) {
            var arrowTarget = e.target.closest('.arrows .prev, .arrows .next');
            if (arrowTarget) {
                if (arrowTarget.classList.contains('next')) goNext();
                else if (arrowTarget.classList.contains('prev')) goPrev();
            }
        });
    }

    // 初回表示時：1枚目の content のアニメーション実行＋その他施設ナビの現在表示を同期
    requestAnimationFrame(function() {
        restartContentAnimation();
        syncOtherFacilityNav();
    });
})();
