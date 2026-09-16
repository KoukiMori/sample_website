/**
 * 面会カード：同じ段の中で高さとアイコン位置を揃える
 * - タイトルは2行分の高さで中央
 * - 本文枠は「その段で一番長い文章」の高さ（上段を下段に伸ばさない）
 * - 短い文は下段と同じ行間のまま上に置くので、アイコンが揃う
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

    function getColumnCount() {
        var cols = window.getComputedStyle(grid).gridTemplateColumns;
        if (!cols || cols === 'none') return 1;
        return cols.split(/\s+/).filter(Boolean).length;
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
        var values = cards.map(function(c) {
            return c.querySelector('.visitation-card__value');
        });

        titles.forEach(function(el) {
            wrapInner(el, 'visitation-card__title-inner');
        });

        titles.forEach(function(el) { if (el) el.style.height = ''; });
        numbers.forEach(function(el) { if (el) el.style.height = ''; });
        values.forEach(function(el) { if (el) el.style.lineHeight = ''; });
        cards.forEach(function(c) { c.style.height = ''; });

        var cols = getColumnCount();
        for (var start = 0; start < cards.length; start += cols) {
            var rowTitles = titles.slice(start, start + cols);
            var rowNums = numbers.slice(start, start + cols);
            var maxTitle = 0;
            var maxNum = 0;
            rowTitles.forEach(function(el) {
                if (el) maxTitle = Math.max(maxTitle, el.offsetHeight);
            });
            rowNums.forEach(function(el) {
                if (el) maxNum = Math.max(maxNum, el.offsetHeight);
            });
            rowTitles.forEach(function(el) {
                if (el && maxTitle) el.style.height = Math.round(maxTitle) + 'px';
            });
            rowNums.forEach(function(el) {
                if (el && maxNum) el.style.height = Math.round(maxNum) + 'px';
            });
        }
    }

    window.addEventListener('resize', equalize);
    window.addEventListener('load', equalize);
    equalize();
})();
