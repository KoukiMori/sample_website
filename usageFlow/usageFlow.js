/**
 * 面会カード：タイトル・本文・アイコンの高さを揃える
 * - タイトルは2行分の高さで中央
 * - 本文は一番長い文章の高さで中央
 * - アイコンは同じ位置に揃う
 */
(function() {
    var grid = document.querySelector('.visitation-cards');
    if (!grid) return;

    // br を含むタイトルでも中央寄せできるよう、中身を span で包む
    function wrapInner(el, className) {
        if (!el || el.querySelector('.' + className)) return;
        var inner = document.createElement('span');
        inner.className = className;
        while (el.firstChild) inner.appendChild(el.firstChild);
        el.appendChild(inner);
    }

    function equalize() {
        var cards = [].slice.call(grid.querySelectorAll('.visitation-card'));
        if (!cards.length) return;

        var titles = cards.map(function(c) {
            return c.querySelector('.visitation-card__title');
        });
        var numbers = cards.map(function(c) {
            return c.querySelector('.visitation-card__number');
        });

        titles.forEach(function(el) {
            wrapInner(el, 'visitation-card__title-inner');
        });

        // いったん高さを戻してから、一番高いものに合わせる
        titles.forEach(function(el) { if (el) el.style.height = ''; });
        numbers.forEach(function(el) { if (el) el.style.height = ''; });
        cards.forEach(function(c) { c.style.height = ''; });

        var maxTitle = 0;
        var maxNum = 0;
        titles.forEach(function(el) {
            if (el) maxTitle = Math.max(maxTitle, el.offsetHeight);
        });
        numbers.forEach(function(el) {
            if (el) maxNum = Math.max(maxNum, el.offsetHeight);
        });

        titles.forEach(function(el) {
            if (el && maxTitle) el.style.height = Math.round(maxTitle) + 'px';
        });
        numbers.forEach(function(el) {
            if (el && maxNum) el.style.height = Math.round(maxNum) + 'px';
        });
    }

    window.addEventListener('resize', equalize);
    window.addEventListener('load', equalize);
    equalize();
})();
