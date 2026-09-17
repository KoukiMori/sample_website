/**
 * 重要事項説明書：更新日時を出し、▲で開いてファイルを表示する
 */
(function() {
    var card = document.querySelector('[data-important-notes-card]');
    if (!card) return;
    var jsonPath = card.getAttribute('data-json');
    var facilityName = card.getAttribute('data-facility-name') || '';
    var box = card.querySelector('[data-notes-link]');
    if (!jsonPath || !box) return;

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // JSON と同じフォルダのファイルへ、日本語ファイル名も開けるようにする
    function fileHref(jsonPath, fileName, updated) {
        var dir = jsonPath.replace(/\/[^/]+$/, '/');
        var name = String(fileName || '').replace(/\\/g, '/');
        if (name.normalize) name = name.normalize('NFC');
        var encoded;
        try { encoded = encodeURIComponent(decodeURIComponent(name)); }
        catch (e) { encoded = encodeURIComponent(name); }
        var href = dir + encoded;
        if (updated) href += '?v=' + encodeURIComponent(updated);
        return href;
    }

    function filePreview(href, title) {
        var ext = String(href).split('?')[0].split('.').pop().toLowerCase();
        var src = escapeHtml(href);
        var name = escapeHtml(title);
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].indexOf(ext) !== -1) {
            return '<img class="notes-file-image" src="' + src + '" alt="' + name + '">';
        }
        return '<iframe class="notes-file-pdf" src="' + src + '" title="' + name + '"></iframe>';
    }

    fetch(jsonPath, { cache: 'no-store' })
        .then(function(res) { return res.ok ? res.json() : {}; })
        .then(function(data) {
            var updated = (data && data.updated) ? String(data.updated) : '';
            var fileName = (data && data.fileName) ? String(data.fileName) : '';
            var title = facilityName + '重要事項説明書';
            var dateHtml = updated
                ? '<p class="notes-updated">更新日時　' + escapeHtml(updated) + '</p>'
                : '';
            if (!fileName) {
                box.innerHTML = dateHtml + '<p class="notes-file-empty">' + escapeHtml(title) + 'はまだ登録されていません。</p>';
                return;
            }
            /* 最初から展開してファイルを見せる */
            box.innerHTML = dateHtml +
                '<details class="notes-file-details" open>' +
                    '<summary class="notes-file-toggle">' + escapeHtml(title) +
                        ' <span class="notes-file-mark" aria-hidden="true">▲</span></summary>' +
                    '<div class="notes-file-body">' +
                        filePreview(fileHref(jsonPath, fileName, updated), title) +
                    '</div>' +
                '</details>';
        })
        .catch(function() {
            box.innerHTML = '<p class="notes-file-empty">' + escapeHtml(facilityName + '重要事項説明書') + 'を表示できませんでした。</p>';
        });
})();
