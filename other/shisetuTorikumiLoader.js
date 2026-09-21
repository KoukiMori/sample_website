/**
 * 施設取組データ（data/shisetu_torikumi.json）を読み込み、一覧を描画する
 * 表示名クリックでテキスト・PDFを展開（例規集と同様の開閉）
 */
(function() {
    var container = document.getElementById("shisetuTorikumiList");
    if (!container) return;

    var dataPath = "data/shisetu_torikumi.json";
    // other/ から参照する場合は ../data/
    if (window.location.pathname.indexOf("/other/") !== -1) {
        dataPath = "../data/shisetu_torikumi.json";
    }

    fetch(dataPath)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var sections = data.sections || [];
            var html = "";
            for (var i = 0; i < sections.length; i++) {
                var sec = sections[i];
                html += '<section class="shisetu-section">';
                html += '<h2 class="shisetu-section-title">' + escapeHtml(sec.title) + '</h2>';
                if (sec.note) {
                    // 管理画面の改行を表示に反映
                    html += '<p class="shisetu-section-note">' + escapeHtml(sec.note)
                        .replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '<br>') + '</p>';
                }
                html += '<ul class="shisetu-links">';
                var items = sec.items || [];
                for (var j = 0; j < items.length; j++) {
                    var item = items[j];
                    var label = typeof item === 'string' ? item : (item.label || '');
                    var href = typeof item === 'string' ? '' : (item.href || '');
                    var text = typeof item === 'string' ? '' : (item.text || '');
                    var hasHref = href && href !== '#';
                    var hasBody = !!(text || hasHref);

                    if (hasBody) {
                        // 表示名クリックでテキスト・PDFを開閉
                        html += '<li class="shisetu-item shisetu-item-expandable">';
                        html += '<button type="button" class="shisetu-item-toggle" aria-expanded="false">';
                        html += '<span class="shisetu-link-label">' + escapeHtml(label) + '</span>';
                        html += '<i class="fa-solid fa-chevron-down shisetu-item-icon" aria-hidden="true"></i>';
                        html += '</button>';
                        html += '<div class="shisetu-item-body">';
                        if (text) {
                            html += '<p class="shisetu-item-text">' + escapeHtml(text)
                                .replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '<br>') + '</p>';
                        }
                        if (hasHref) {
                            html += '<p class="shisetu-item-file"><a href="' + escapeHtml(href) + '" target="_blank" rel="noopener">PDFファイル</a></p>';
                        }
                        html += '</div></li>';
                    } else {
                        // 中身がない項目は展開なしで表示名のみ
                        html += '<li class="shisetu-item"><span class="shisetu-link-label">' + escapeHtml(label) + '</span></li>';
                    }
                }
                html += "</ul>";
                html += "</section>";
            }
            container.innerHTML = html;
            initShisetuExpand();
        })
        .catch(function(err) {
            console.error("施設取組データの読み込みに失敗しました:", err);
            container.innerHTML = "<p class=\"shisetu-error\">データを読み込めませんでした。</p>";
        });

    function escapeHtml(str) {
        if (!str) return "";
        var div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    /* 表示名ボタンで項目を開閉する */
    function initShisetuExpand() {
        container.addEventListener("click", function(e) {
            var btn = e.target.closest(".shisetu-item-toggle");
            if (!btn || !container.contains(btn)) return;
            var item = btn.closest(".shisetu-item-expandable");
            if (!item) return;
            var isOpen = item.classList.toggle("is-open");
            btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });
    }
})();
