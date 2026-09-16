/**
 * 重要事項説明書カード：更新日とPDFリンクを JSON から表示する
 */
(function() {
    var card = document.querySelector('[data-important-notes-card]');
    if (!card) return;
    var jsonPath = card.getAttribute('data-json');
    var facilityName = card.getAttribute('data-facility-name') || '';
    var link = card.querySelector('[data-notes-link]');
    if (!jsonPath || !link) return;

    // JSON と同じフォルダの PDF へ、日本語ファイル名も開けるようにする
    function pdfHref(jsonPath, fileName, updated) {
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

    fetch(jsonPath, { cache: 'no-store' })
        .then(function(res) { return res.ok ? res.json() : {}; })
        .then(function(data) {
            var updated = (data && data.updated) ? String(data.updated) : '';
            var fileName = (data && data.fileName) ? String(data.fileName) : '';
            var label = (updated ? updated + '更新　' : '') + facilityName + '重要事項説明書';
            link.textContent = label;
            if (fileName) {
                link.href = pdfHref(jsonPath, fileName, updated);
                link.target = '_blank';
                link.rel = 'noopener';
            } else {
                link.removeAttribute('href');
                link.setAttribute('aria-disabled', 'true');
            }
        })
        .catch(function() {
            link.textContent = facilityName + '重要事項説明書';
            link.removeAttribute('href');
        });
})();
