/**
 * 施設ページの概要表を overview.json から描画する
 * 改行は表の中で折り返し、mapUrl がある行はGoogleマップボタンを付ける
 * 職員構成（staff）がある施設は概要表の下に出す（福祉センターは無し）
 */
(function() {
    var section = document.getElementById('overview');
    if (!section) return;
    var jsonPath = section.getAttribute('data-json');
    var box = document.getElementById('overviewTable');
    var staffBox = document.getElementById('staffTable');
    if (!jsonPath || !box) return;

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // 入力の改行を <br> にして表に出す（Windows の改行も含む）
    function valueHtml(str) {
        return escapeHtml(str)
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n/g, '<br>');
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

    /* 役職が上・人数が下の1行表（役職名が空の列は出さない） */
    function renderStaff(staff) {
        if (!staffBox) return;
        var roles = ((staff && staff.roles) || []).filter(function(r) {
            return r && String(r.label || '').trim();
        });
        if (!roles.length) {
            staffBox.innerHTML = '';
            return;
        }
        var title = escapeHtml((staff && staff.title) || '職員構成');
        var head = roles.map(function(r) {
            return '<th>' + escapeHtml(r.label || '') + '</th>';
        }).join('');
        var counts = roles.map(function(r) {
            var n = (r.count == null || r.count === '') ? '－' : String(r.count);
            return '<td>' + escapeHtml(n) + '</td>';
        }).join('');
        var note = (staff && staff.note) ? String(staff.note).trim() : '';
        // 先頭の＊は付け直す（二重にしない）
        var noteBody = note.replace(/^[＊*]\s*/, '');
        var noteHtml = noteBody
            ? '<p class="staff-note">＊' + escapeHtml(noteBody)
                .replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '<br>') + '</p>'
            : '';
        staffBox.innerHTML =
            '<h3 class="staff-heading">' + title + '</h3>' +
            '<div class="staff-table-wrap">' +
                '<table class="staff-table">' +
                    '<thead><tr>' + head + '</tr></thead>' +
                    '<tbody><tr>' + counts + '</tr></tbody>' +
                '</table>' +
            '</div>' +
            noteHtml;
    }

    fetch(jsonPath, { cache: 'no-store' })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var rows = data.rows || [];
            if (!rows.length) {
                box.innerHTML = '<p class="events-hint">概要情報の準備中です。</p>';
            } else {
                box.innerHTML = '<table class="overview-table">' + rows.map(renderRow).join('') + '</table>';
            }
            // 福祉センター等、staff が無い施設は出さない
            if (data.staff && staffBox) renderStaff(data.staff);
            else if (staffBox) staffBox.innerHTML = '';
        })
        .catch(function(err) {
            console.error('概要の読み込みに失敗しました:', err);
            box.innerHTML = '<p class="events-hint">概要情報を表示できませんでした。</p>';
            if (staffBox) staffBox.innerHTML = '';
        });
})();
