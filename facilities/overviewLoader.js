/**
 * 施設ページの概要表を overview.json から描画する
 * 改行は表の中で折り返し、mapUrl がある行はGoogleマップボタンを付ける
 */
(function() {
    var section = document.getElementById('overview');
    if (!section) return;
    var jsonPath = section.getAttribute('data-json');
    var box = document.getElementById('overviewTable');
    if (!jsonPath || !box) return;

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // 入力の改行を <br> にして表に出す
    function valueHtml(str) {
        return escapeHtml(str).replace(/\n/g, '<br>');
    }

    // http/https 以外はリンクにしない
    function safeUrl(url) {
        return /^https?:\/\//i.test(url || '') ? url : '';
    }

    function renderRow(row) {
        var label = escapeHtml(row.label);
        var value = valueHtml(row.value);
        var mapUrl = safeUrl(row.mapUrl);
        if (mapUrl) {
            return '<tr><th>' + label + '</th><td class="overview-address-cell">' +
                '<span class="overview-address-text">' + value + '</span>' +
                '<a class="overview-map-link" href="' + escapeHtml(mapUrl) + '" target="_blank" rel="noopener">Googleマップを開く</a>' +
                '</td></tr>';
        }
        return '<tr><th>' + label + '</th><td>' + value + '</td></tr>';
    }

    fetch(jsonPath, { cache: 'no-store' })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var rows = data.rows || [];
            if (!rows.length) {
                box.innerHTML = '<p class="events-hint">概要情報の準備中です。</p>';
                return;
            }
            box.innerHTML = '<table class="overview-table">' + rows.map(renderRow).join('') + '</table>';
        })
        .catch(function(err) {
            console.error('概要の読み込みに失敗しました:', err);
            box.innerHTML = '<p class="events-hint">概要情報を表示できませんでした。</p>';
        });
})();
