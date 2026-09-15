/**
 * 施設案内の写真5枚を guidance.json から描画する
 */
(function() {
    var section = document.getElementById('guidance');
    if (!section) return;
    var jsonPath = section.getAttribute('data-json');
    var box = section.querySelector('.guidance-content');
    if (!jsonPath || !box) return;

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function imageSrc(url) {
        if (!url) return '';
        if (/^https?:/i.test(url) || url.charAt(0) === '/' || url.indexOf('../') === 0) return url;
        if (url.indexOf('assets/') === 0) return '../../' + url;
        return url;
    }

    fetch(jsonPath, { cache: 'no-store' })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var items = (data.items || []).slice(0, 5);
            var html = '';
            items.forEach(function(item) {
                if (!item) return;
                var src = imageSrc(item.imageUrl);
                var title = escapeHtml(item.title || '');
                var desc = escapeHtml(item.description || '');
                // 写真・タイトル・説明がすべて空の枠は出さない
                if (!src && !title && !desc) return;
                html += '<div class="guide-item">';
                html += '<div class="guide-text"><p>' + title + '</p><p>' + desc + '</p></div>';
                if (src) html += '<img src="' + escapeHtml(src) + '" alt="' + title + '">';
                html += '</div>';
            });
            box.innerHTML = html;
        })
        .catch(function(err) {
            console.error('施設案内の読み込みに失敗しました:', err);
        });
})();
