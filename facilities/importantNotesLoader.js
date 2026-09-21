/**
 * 重要事項説明書：更新日時を出し、▲で開いてファイルを表示する
 * JSON は { updated, items:[{ title, fileName }] }（旧形式 fileName のみにも対応）
 */
(function() {
    /* スマホ実機：戻るリンクを、今見えているヘッダーの下へずらす */
    function placeBackLink() {
        var content = document.querySelector('.page-content');
        var header = document.querySelector('header');
        if (!content || !header) return;
        if (!window.matchMedia('(max-width: 768px)').matches) {
            content.style.paddingTop = '';
            return;
        }
        var bottom = header.getBoundingClientRect().bottom;
        content.style.paddingTop = Math.ceil(bottom + 16) + 'px';
    }
    placeBackLink();
    window.addEventListener('resize', placeBackLink);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', placeBackLink);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeBackLink);

    var card = document.querySelector('[data-important-notes-card]');
    if (!card) return;
    var jsonPath = card.getAttribute('data-json');
    var facilityName = card.getAttribute('data-facility-name') || '';
    var box = card.querySelector('[data-notes-link]');
    if (!jsonPath || !box) return;

    var PDFJS_BASE = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174';
    var pdfJsLoading = null;

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

    function isImage(href) {
        var ext = String(href).split('?')[0].split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp'].indexOf(ext) !== -1;
    }

    /* PDF.js を1回だけ読み込む */
    function loadPdfJs() {
        if (window.pdfjsLib) return Promise.resolve();
        if (pdfJsLoading) return pdfJsLoading;
        pdfJsLoading = new Promise(function(resolve, reject) {
            var script = document.createElement('script');
            script.src = PDFJS_BASE + '/build/pdf.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        return pdfJsLoading;
    }

    /* Chrome の PDF 埋め込みは黒くなることがあるので、ページ画像として描く */
    function renderPdf(container, href) {
        container.innerHTML = '<p class="notes-file-empty">PDFを読み込み中…</p>';
        loadPdfJs().then(function() {
            pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + '/build/pdf.worker.min.js';
            // 日本語の埋め込みフォントは @font-face だと文字化けしやすいので
            // グリフをパス描画する（disableFontFace）。CMap も併用する。
            return pdfjsLib.getDocument({
                url: href,
                cMapUrl: PDFJS_BASE + '/cmaps/',
                cMapPacked: true,
                standardFontDataUrl: PDFJS_BASE + '/standard_fonts/',
                disableFontFace: true,
                useSystemFonts: true
            }).promise;
        }).then(function(pdf) {
            container.innerHTML = '';
            function drawPage(pageNum) {
                if (pageNum > pdf.numPages) return;
                return pdf.getPage(pageNum).then(function(page) {
                    var canvas = document.createElement('canvas');
                    var base = page.getViewport({ scale: 1 });
                    var cssWidth = container.clientWidth || 800;
                    var scale = (cssWidth / base.width) * (window.devicePixelRatio || 1);
                    var viewport = page.getViewport({ scale: scale });
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    canvas.className = 'notes-file-page';
                    container.appendChild(canvas);
                    return page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise.then(function() {
                        return drawPage(pageNum + 1);
                    });
                });
            }
            return drawPage(1);
        }).catch(function() {
            container.innerHTML = '<p class="notes-file-empty">PDFを表示できませんでした。<a href="' +
                escapeHtml(href) + '" target="_blank" rel="noopener">PDFを開く</a></p>';
        });
    }

    /* 旧形式・新形式どちらも { title, fileName } の配列に揃える */
    function normalizeItems(data, facilityName) {
        if (data && Array.isArray(data.items) && data.items.length) {
            return data.items.filter(function(it) { return it && it.fileName; }).map(function(it) {
                return {
                    title: it.title || (facilityName + '重要事項説明書'),
                    fileName: it.fileName
                };
            });
        }
        if (data && data.fileName) {
            return [{ title: facilityName + '重要事項説明書', fileName: data.fileName }];
        }
        return [];
    }

    function renderItem(title, href, open) {
        var details = document.createElement('details');
        details.className = 'notes-file-details';
        if (open) details.open = true;
        details.innerHTML =
            '<summary class="notes-file-toggle">' + escapeHtml(title) +
                ' <span class="notes-file-mark" aria-hidden="true">▲</span></summary>' +
            '<div class="notes-file-body" data-pdf-href="' + escapeHtml(href) + '"></div>' +
            '<p class="notes-file-open"><a href="' + escapeHtml(href) + '" target="_blank" rel="noopener">PDFを開く</a></p>';
        var body = details.querySelector('.notes-file-body');

        function ensureRendered() {
            if (!details.open || body.getAttribute('data-rendered') === '1') return;
            body.setAttribute('data-rendered', '1');
            if (isImage(href)) {
                body.innerHTML = '<img class="notes-file-image" src="' + escapeHtml(href) + '" alt="' + escapeHtml(title) + '">';
            } else {
                renderPdf(body, href);
            }
        }

        // 開いたときだけ描画（閉じたPDFまで全部描かない）
        details.addEventListener('toggle', ensureRendered);
        if (open) ensureRendered();
        return details;
    }

    fetch(jsonPath, { cache: 'no-store' })
        .then(function(res) { return res.ok ? res.json() : {}; })
        .then(function(data) {
            var updated = (data && data.updated) ? String(data.updated) : '';
            var items = normalizeItems(data, facilityName);
            var dateHtml = updated
                ? '<p class="notes-updated">更新日時　' + escapeHtml(updated) + '</p>'
                : '';
            if (!items.length) {
                box.innerHTML = dateHtml + '<p class="notes-file-empty">' +
                    escapeHtml(facilityName + '重要事項説明書') + 'はまだ登録されていません。</p>';
                return;
            }
            box.innerHTML = dateHtml;
            // ページ表示時はすべて閉じた状態（クリックで展開）
            items.forEach(function(it) {
                var href = fileHref(jsonPath, it.fileName, updated);
                box.appendChild(renderItem(it.title, href, false));
            });
        })
        .catch(function() {
            box.innerHTML = '<p class="notes-file-empty">' + escapeHtml(facilityName + '重要事項説明書') + 'を表示できませんでした。</p>';
        });
})();
