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

    function fileExt(href) {
        return String(href || '').split('?')[0].split('.').pop().toLowerCase();
    }

    // 画像は img、PDF はページ内に埋め込む（リンクで飛ばさない）
    function filePreview(href, label) {
        var ext = fileExt(href);
        var src = escapeHtml(href);
        var name = escapeHtml(label || '募集資料');
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].indexOf(ext) !== -1) {
            return '<img class="recruitment-file-image" src="' + src + '" alt="' + name + '">';
        }
        if (ext === 'pdf') {
            return '<iframe class="recruitment-file-pdf" src="' + src + '" title="' + name + '"></iframe>';
        }
        return '';
    }

    // 正規職員・会計年度任用とも、置いたファイルを同じ見た目で出す
    function cardPreviews(card) {
        var html = '';
        var seen = {};
        function add(href, label) {
            href = (href || '').trim();
            if (!href || href === '#' || seen[href]) return;
            seen[href] = true;
            html += filePreview(href, (label || '').trim());
        }
        (card.files || []).forEach(function(file) {
            add(file.href, file.label);
        });
        (card.groups || []).forEach(function(group) {
            (group.links || []).forEach(function(link) {
                add(link.href, link.label);
            });
        });
        return html;
    }

    // ファイルが無いときは、その募集をしていない旨を出す
    function noRecruitMessage(card) {
        var title = card.title || '';
        if (title.indexOf('会計年度') !== -1) return '会計年度任用職員の募集はいたしておりません';
        if (title.indexOf('正規') !== -1) return '正規職員の募集はいたしておりません';
        return '正規・会計年度任用職員の募集はいたしておりません';
    }

    fetch(dataPath, { cache: 'no-store' })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var cards = data.cards || [];
            var html = '';
            cards.forEach(function(card) {
                var previews = cardPreviews(card);
                var body = previews
                    ? previews
                    : '<p class="recruitment-file-empty">' + escapeHtml(noRecruitMessage(card)) + '</p>';
                html += '<div class="recruitment-card">';
                html += '<div class="recruitment-card-icon"><i class="fa-solid ' + escapeHtml(card.icon || 'fa-user') + '"></i></div>';
                html += '<h2 class="recruitment-card-title">' + escapeHtml(card.title) + '</h2>';
                /* リード文が空なら出さない（改行はそのまま表示） */
                if (card.description) {
                    html += '<p class="recruitment-card-description">' +
                        escapeHtml(card.description)
                            .replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '<br>') +
                        '</p>';
                }
                // 最初から開いておく。ファイルが無ければ募集なしの文を出す
                html += '<details class="recruitment-card-details" open>';
                html += '<summary class="recruitment-card-toggle">詳細を見る <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>';
                html += '<div class="recruitment-card-files">' + body + '</div>';
                html += '</details>';
                html += '</div>';
            });
            container.innerHTML = html;
        })
        .catch(function(err) {
            console.error('求人データの読み込みに失敗しました:', err);
            container.innerHTML = '<p>データを読み込めませんでした。</p>';
        });
})();
