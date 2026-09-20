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

    /* 改行は <br>。CMSの <strong> だけ太字として戻す（他のタグは出さない） */
    function formatDescription(str) {
        return escapeHtml(str)
            .replace(/&lt;(\/?)(strong|b)&gt;/gi, '<$1$2>')
            .replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '<br>');
    }

    function fileExt(href) {
        return String(href || '').split('?')[0].split('.').pop().toLowerCase();
    }

    // 画像は img。PDF は iframe だと黒枠が出るので、あとからページ画像として描く
    function filePreview(href, label) {
        var ext = fileExt(href);
        var src = escapeHtml(href);
        var name = escapeHtml(label || '募集資料');
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].indexOf(ext) !== -1) {
            return '<img class="recruitment-file-image" src="' + src + '" alt="' + name + '">';
        }
        if (ext === 'pdf') {
            return '<div class="recruitment-file-pdf" data-pdf="' + src + '"></div>';
        }
        return '';
    }

    function loadPdfJs(done) {
        if (window.pdfjsLib) {
            done();
            return;
        }
        var script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = done;
        script.onerror = function() {
            document.querySelectorAll('.recruitment-file-pdf').forEach(function(el) {
                el.innerHTML = '<p class="recruitment-file-empty">PDFを表示できませんでした。</p>';
            });
        };
        document.head.appendChild(script);
    }

    // Chrome の PDF 埋め込みは黒枠になるので、重要事項説明書と同じく canvas に描く
    function renderPdfInto(container, href) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        pdfjsLib.getDocument(href).promise.then(function(pdf) {
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
                    container.appendChild(canvas);
                    return page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise.then(function() {
                        return drawPage(pageNum + 1);
                    });
                });
            }
            return drawPage(1);
        }).catch(function() {
            container.innerHTML = '<p class="recruitment-file-empty">PDFを表示できませんでした。</p>';
        });
    }

    function renderRecruitmentPdfs(root) {
        var boxes = root.querySelectorAll('.recruitment-file-pdf[data-pdf]');
        if (!boxes.length) return;
        loadPdfJs(function() {
            boxes.forEach(function(box) {
                var href = box.getAttribute('data-pdf');
                if (href) renderPdfInto(box, href);
            });
        });
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

    function isKaikeiCard(card) {
        return (card.title || '').indexOf('会計年度') !== -1;
    }

    // ファイルが無いときは、その募集をしていない旨を出す
    function noRecruitMessage(card) {
        var title = card.title || '';
        if (isKaikeiCard(card)) return '会計年度任用職員の募集はいたしておりません';
        if (title.indexOf('正規') !== -1) return '正規職員の募集はいたしておりません';
        return '正規・会計年度任用職員の募集はいたしておりません';
    }

    // 会計年度：募集中ならリード文、なければ募集なし。正規は JSON のリード文
    function cardLeadText(card, recruiting) {
        if (isKaikeiCard(card)) {
            return recruiting
                ? (card.description || '介護職員（夜勤専従パートタイム）、施設管理人（パートタイム）を募集しております。')
                : noRecruitMessage(card);
        }
        return card.description || '';
    }

    fetch(dataPath, { cache: 'no-store' })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var cards = data.cards || [];
            var html = '';
            cards.forEach(function(card) {
                var kaikei = isKaikeiCard(card);
                var recruiting = kaikei ? !card.noRecruit : false;
                var previews = kaikei ? '' : cardPreviews(card);
                var lead = cardLeadText(card, recruiting || !!previews);
                var body = previews
                    ? previews
                    : '<p class="recruitment-file-empty">' + escapeHtml(noRecruitMessage(card)) + '</p>';
                html += '<div class="recruitment-card">';
                html += '<div class="recruitment-card-icon"><i class="fa-solid ' + escapeHtml(card.icon || 'fa-user') + '"></i></div>';
                html += '<h2 class="recruitment-card-title">' + escapeHtml(card.title) + '</h2>';
                /* 会計年度の募集中は、リード文を詳細ページへのリンクにする */
                if (lead) {
                    if (kaikei && recruiting) {
                        html += '<p class="recruitment-card-description"><a class="recruitment-card-lead-link" href="kaikei.html">' +
                            formatDescription(lead) + '</a></p>';
                    } else {
                        html += '<p class="recruitment-card-description">' +
                            formatDescription(lead) +
                            '</p>';
                    }
                }
                // 会計年度は詳細ページへ渡す。正規はカード内にファイルを出す
                if (!kaikei) {
                    html += '<details class="recruitment-card-details" open>';
                    html += '<summary class="recruitment-card-toggle">詳細を見る <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>';
                    html += '<div class="recruitment-card-files">' + body + '</div>';
                    html += '</details>';
                }
                html += '</div>';
            });
            container.innerHTML = html;
            renderRecruitmentPdfs(container);
        })
        .catch(function(err) {
            console.error('求人データの読み込みに失敗しました:', err);
            container.innerHTML = '<p>データを読み込めませんでした。</p>';
        });
})();
