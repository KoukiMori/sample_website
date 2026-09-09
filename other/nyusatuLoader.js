/**
 * 入札情報を nyusatu.json から描画する
 */
(function() {
    var container = document.getElementById('nyusatuList');
    if (!container) return;

    var dataPath = window.location.pathname.indexOf('/other/') !== -1
        ? '../data/nyusatu.json'
        : 'data/nyusatu.json';

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
            var base = (data.basePath || 'assets/nyusatu').replace(/\/$/, '');
            if (window.location.pathname.indexOf('/other/') !== -1) {
                base = '../' + base;
            }
            var years = data.years || [];
            var html = '';
            years.forEach(function(year, i) {
                var n = i + 1;
                html += '<section class="nyusatu-year">';
                html += '<button type="button" class="nyusatu-year-header" aria-expanded="false" aria-controls="nyusatu-body-' + n + '" id="nyusatu-header-' + n + '">';
                html += '<span class="nyusatu-year-title">' + escapeHtml(year.label) + '</span>';
                html += '<i class="nyusatu-year-icon fa-solid fa-chevron-down" aria-hidden="true"></i></button>';
                html += '<div class="nyusatu-year-body" id="nyusatu-body-' + n + '" role="region" aria-labelledby="nyusatu-header-' + n + '">';
                html += '<p class="nyusatu-result-title">' + escapeHtml(year.label) + '入札結果</p>';
                html += '<ul class="nyusatu-result-list">';
                (year.results || []).forEach(function(row) {
                    var excelHref = row.excel ? base + '/' + year.yearId + '/excel/' + row.excel : '#';
                    var pdfHref = row.pdf ? base + '/' + year.yearId + '/pdf/' + row.pdf : '#';
                    html += '<li class="nyusatu-result-item">';
                    html += '<span class="nyusatu-result-date">' + escapeHtml(row.dateLabel) + '</span>';
                    html += '<span class="nyusatu-file-links">';
                    html += '<a href="' + escapeHtml(excelHref) + '" target="_blank" rel="noopener" class="nyusatu-file-link">Excelファイル</a>';
                    html += '<a href="' + escapeHtml(pdfHref) + '" target="_blank" rel="noopener" class="nyusatu-file-link">PDFファイル</a>';
                    html += '</span></li>';
                });
                html += '</ul></div></section>';
            });
            container.innerHTML = html;
            container.addEventListener('click', function(e) {
                var btn = e.target.closest('.nyusatu-year-header');
                if (!btn) return;
                var section = btn.closest('.nyusatu-year');
                if (!section) return;
                var isOpen = section.classList.toggle('is-open');
                btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            });
        })
        .catch(function(err) {
            console.error('入札情報の読み込みに失敗しました:', err);
            container.innerHTML = '<p>データを読み込めませんでした。</p>';
        });
})();
