/**
 * 求人募集を recruitment.json から描画する
 */
(function() {
    var container = document.getElementById('recruitmentCards');
    if (!container) return;

    var dataPath = window.location.pathname.indexOf('/other/') !== -1
        ? '../data/recruitment.json'
        : 'data/recruitment.json';

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    fetch(dataPath, { cache: 'no-store' })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var cards = data.cards || [];
            var html = '';
            cards.forEach(function(card) {
                html += '<div class="recruitment-card">';
                html += '<div class="recruitment-card-icon"><i class="fa-solid ' + escapeHtml(card.icon || 'fa-user') + '"></i></div>';
                html += '<h2 class="recruitment-card-title">' + escapeHtml(card.title) + '</h2>';
                html += '<p class="recruitment-card-description">' + (card.description || '') + '</p>';
                html += '<details class="recruitment-card-details">';
                html += '<summary class="recruitment-card-toggle">詳細を見る <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>';
                html += '<div class="recruitment-card-detail">';
                (card.notes || []).forEach(function(note) {
                    html += '<p class="recruitment-card-detail-note">' + escapeHtml(note) + '</p>';
                });
                (card.groups || []).forEach(function(group) {
                    html += '<p class="recruitment-card-detail-label">' + escapeHtml(group.label) + '</p>';
                    html += '<ul class="recruitment-card-detail-list">';
                    (group.links || []).forEach(function(link) {
                        var href = link.href || '#';
                        html += '<li><a href="' + escapeHtml(href) + '" target="_blank" rel="noopener">' + escapeHtml(link.label) + '</a></li>';
                    });
                    html += '</ul>';
                });
                if (card.extraLink && card.extraLink.label) {
                    html += '<p class="recruitment-card-detail-link"><a href="' + escapeHtml(card.extraLink.href || '#') + '">' + escapeHtml(card.extraLink.label) + '</a></p>';
                }
                html += '</div></details></div>';
            });
            container.innerHTML = html;
        })
        .catch(function(err) {
            console.error('求人データの読み込みに失敗しました:', err);
            container.innerHTML = '<p>データを読み込めませんでした。</p>';
        });
})();
