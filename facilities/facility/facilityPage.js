(function() {
    'use strict';

    const list = document.querySelector('.carousel .list');
    const carousel = document.querySelector('.carousel');
    const progressBar = document.querySelector('.facility-progress');

    if (!list) return;

    /** プログレスバーをリセット（次へ/前へクリック時） */
    function resetProgressBar() {
        if (!progressBar) return;
        progressBar.style.animation = 'none';
        progressBar.offsetHeight;
        progressBar.style.animation = 'facilityProgressAnimation 10s linear infinite';
    }

    /** その他施設ナビ：表示中のスライドに該当する施設をリストから非表示 */
    function syncOtherFacilityNav() {
        var first = list.querySelector('.item');
        var navList = document.querySelector('.other-facility-nav-list');
        if (!first || !navList) return;
        var current = first.getAttribute('data-facility');
        navList.querySelectorAll('li').forEach(function(li) {
            li.classList.toggle('is-current', li.getAttribute('data-facility') === current);
        });
    }

    /** 次のスライドへ（先頭を末尾へ回す） */
    function goNext() {
        var first = list.querySelector('.item');
        if (first) {
            list.appendChild(first);
            syncOtherFacilityNav();
        }
        resetProgressBar();
    }

    /** 前のスライドへ（末尾を先頭へ回す） */
    function goPrev() {
        var items = list.querySelectorAll('.item');
        var last = items[items.length - 1];
        if (last) {
            list.insertBefore(last, list.firstChild);
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

    // 初回表示時：その他施設ナビの現在表示を同期
    requestAnimationFrame(syncOtherFacilityNav);
})();
