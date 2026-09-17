/**
 * 重要事項説明書：更新日時を出し、▲で開いてファイルを表示する
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

    /* Chrome の PDF 埋め込みは黒くなることがあるので、ページ画像として描く */
    function renderPdf(container, href) {
        function draw() {
            if (!window.pdfjsLib) {
                container.innerHTML = '<p class="notes-file-empty">PDFを表示できませんでした。</p>';
                return;
            }
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            pdfjsLib.getDocument(href).promise.then(function(pdf) {
                /* 1ページ目から順に描く */
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
                container.innerHTML = '<p class="notes-file-empty">PDFを表示できませんでした。</p>';
            });
        }
        if (window.pdfjsLib) {
            draw();
            return;
        }
        var script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = draw;
        script.onerror = function() {
            container.innerHTML = '<p class="notes-file-empty">PDFを表示できませんでした。</p>';
        };
        document.head.appendChild(script);
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
            var href = fileHref(jsonPath, fileName, updated);
            /* 最初から展開してファイルを見せる */
            box.innerHTML = dateHtml +
                '<details class="notes-file-details" open>' +
                    '<summary class="notes-file-toggle">' + escapeHtml(title) +
                        ' <span class="notes-file-mark" aria-hidden="true">▲</span></summary>' +
                    '<div class="notes-file-body"></div>' +
                '</details>';
            var body = box.querySelector('.notes-file-body');
            if (isImage(href)) {
                body.innerHTML = '<img class="notes-file-image" src="' + escapeHtml(href) + '" alt="' + escapeHtml(title) + '">';
                return;
            }
            renderPdf(body, href);
        })
        .catch(function() {
            box.innerHTML = '<p class="notes-file-empty">' + escapeHtml(facilityName + '重要事項説明書') + 'を表示できませんでした。</p>';
        });
})();
