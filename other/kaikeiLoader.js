/**
 * 会計年度任用職員の詳細（公式 sub8 と同じ構成）を描画する
 */
(function() {
    var container = document.getElementById('kaikeiContent');
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

    /* 改行は <br>。<strong> だけ太字として戻す */
    function formatText(str) {
        return escapeHtml(str)
            .replace(/&lt;(\/?)(strong|b)&gt;/gi, '<$1$2>')
            .replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '<br>');
    }

    function findKaikeiCard(cards) {
        for (var i = 0; i < cards.length; i++) {
            if ((cards[i].title || '').indexOf('会計年度') !== -1) return cards[i];
        }
        return null;
    }

    fetch(dataPath, { cache: 'no-store' })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var card = findKaikeiCard(data.cards || []);
            if (!card || card.noRecruit) {
                container.innerHTML = '<p class="kaikei-empty">会計年度任用職員の募集はいたしておりません</p>';
                return;
            }
            var html = '';
            if (card.intro) {
                html += '<p class="kaikei-intro">' + formatText(card.intro) + '</p>';
            }
            (card.sections || []).forEach(function(sec) {
                var title = (sec.title || '').trim();
                var body = (sec.body || '').trim();
                var items = (sec.items || []).filter(function(it) {
                    return (it.label || '').trim();
                });
                if (!title && !body && !items.length) return;
                html += '<section class="kaikei-section">';
                if (title) html += '<h2 class="kaikei-section-title">' + escapeHtml(title) + '</h2>';
                if (body) html += '<p class="kaikei-section-body">' + formatText(body) + '</p>';
                if (items.length) {
                    html += '<ul class="kaikei-links">';
                    items.forEach(function(it) {
                        var label = escapeHtml((it.label || '').trim());
                        var href = (it.href || '').trim();
                        if (href && href !== '#') {
                            html += '<li><a class="kaikei-link" href="' + escapeHtml(href) + '" target="_blank" rel="noopener">' + label + '</a></li>';
                        } else {
                            html += '<li><span class="kaikei-link-text">' + label + '</span></li>';
                        }
                    });
                    html += '</ul>';
                }
                html += '</section>';
            });
            container.innerHTML = html || '<p class="kaikei-empty">会計年度任用職員の募集はいたしておりません</p>';
        })
        .catch(function(err) {
            console.error('会計年度任用データの読み込みに失敗しました:', err);
            container.innerHTML = '<p class="kaikei-empty">データを読み込めませんでした。</p>';
        });
})();
