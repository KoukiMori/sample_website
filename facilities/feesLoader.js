/**
 * 施設ページの使用料金を fees.json から描画する
 */
(function() {
    var section = document.getElementById('fees');
    if (!section) return;
    var jsonPath = section.getAttribute('data-json');
    var box = document.getElementById('feeTables');
    if (!jsonPath || !box) return;

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderKv(block) {
        var html = '';
        if (block.caption) html += '<p class="fee-caption">' + escapeHtml(block.caption) + '</p>';
        // 項目と内容の表も wrap して、狭い画面でも青い表のまま表示する
        html += '<div class="fee-table-wrap"><table class="overview-table fee-table fee-kv-table">';
        (block.rows || []).forEach(function(row) {
            html += '<tr><th>' + escapeHtml(row.label) + '</th><td>' + escapeHtml(row.value) + '</td></tr>';
        });
        html += '</table></div>';
        return html;
    }

    function renderGrid(block) {
        var html = '';
        if (block.caption) html += '<p class="fee-caption">' + escapeHtml(block.caption) + '</p>';
        html += '<div class="fee-table-wrap"><table class="overview-table fee-table fee-grid-table"><tr>';
        (block.headers || []).forEach(function(h) {
            html += '<th>' + escapeHtml(h) + '</th>';
        });
        html += '</tr>';
        (block.rows || []).forEach(function(row) {
            html += '<tr>';
            (row || []).forEach(function(cell, i) {
                var tag = (block.rowHeader && i === 0) ? 'th' : 'td';
                html += '<' + tag + '>' + escapeHtml(cell) + '</' + tag + '>';
            });
            html += '</tr>';
        });
        html += '</table></div>';
        return html;
    }

    fetch(jsonPath, { cache: 'no-store' })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var html = '';
            if (data.note) html += '<p class="events-hint">' + escapeHtml(data.note) + '</p>';
            (data.blocks || []).forEach(function(block) {
                html += block.type === 'grid' ? renderGrid(block) : renderKv(block);
            });
            if (data.footer) html += '<p class="fee-note">' + escapeHtml(data.footer) + '</p>';
            if (data.pdfUrl) {
                html += '<p class="fee-note"><a href="' + escapeHtml(data.pdfUrl) + '" target="_blank" rel="noopener">' +
                    escapeHtml(data.pdfLabel || 'パンフレット（PDF）') + '</a></p>';
            }
            box.innerHTML = html || '<p class="events-hint">料金情報の準備中です。</p>';
        })
        .catch(function(err) {
            console.error('使用料金の読み込みに失敗しました:', err);
            box.innerHTML = '<p class="events-hint">料金情報を表示できませんでした。</p>';
        });
})();
