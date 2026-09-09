/**
 * 施設ページの年間行事を pict.json から描画する
 * 季節カードの見た目は既存 HTML と同じにする
 */
(function() {
    var box = document.getElementById('annualEvents');
    if (!box) return;

    var pictPage = box.getAttribute('data-pict') || 'pict.html';
    var jsonPath = box.getAttribute('data-json') || 'pict.json';
    var seasons = [
        { id: 'spring', fallback: '春' },
        { id: 'summer', fallback: '夏' },
        { id: 'autumn', fallback: '秋' },
        { id: 'winter', fallback: '冬' }
    ];

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    fetch(jsonPath, { cache: 'no-store' })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var html = '';
            seasons.forEach(function(s) {
                var block = data[s.id] || {};
                var label = block.label || s.fallback;
                var items = block.items || [];
                html += '<a href="' + pictPage + '?season=' + s.id + '" class="season-card-stack-link">';
                html += '<div class="season-card-stack">';
                html += '<div class="season-card-back" aria-hidden="true"></div>';
                html += '<div class="season-card-back" aria-hidden="true"></div>';
                html += '<div class="season-card-back" aria-hidden="true"></div>';
                html += '<div class="season-card-back" aria-hidden="true"></div>';
                html += '<div class="season-card ' + s.id + '">';
                html += '<h3>' + escapeHtml(label) + '</h3><ul>';
                items.forEach(function(item) {
                    html += '<li>' + escapeHtml(item) + '</li>';
                });
                html += '</ul></div></div></a>';
            });
            box.innerHTML = html;
        })
        .catch(function(err) {
            console.error('年間行事の読み込みに失敗しました:', err);
        });
})();
