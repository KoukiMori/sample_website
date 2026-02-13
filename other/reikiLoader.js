/**
 * 例規集データ（data/reiki.json）を読み込み、一覧を描画する
 * 施設取組・入札情報と同様に JSON でセクション・編・章・項目を管理
 */
(function() {
    var container = document.getElementById("reikiListContainer");
    if (!container) return;

    var dataPath = "data/reiki.json";
    if (window.location.pathname.indexOf("/other/") !== -1) {
        dataPath = "../data/reiki.json";
    }

    fetch(dataPath)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var sections = data.sections || [];
            var html = "";
            for (var s = 0; s < sections.length; s++) {
                var sec = sections[s];
                var headerId = "reiki-header-" + (s + 1);
                var bodyId = "reiki-body-" + (s + 1);
                html += '<section class="reiki-section reiki-expandable">';
                html += '<button type="button" class="reiki-expand-header" aria-expanded="false" aria-controls="' + escapeAttr(bodyId) + '" id="' + escapeAttr(headerId) + '">';
                html += '<span class="reiki-expand-title">' + escapeHtml(sec.title) + '</span>';
                html += '<i class="reiki-expand-icon fa-solid fa-chevron-down" aria-hidden="true"></i></button>';
                html += '<div class="reiki-expand-body" id="' + escapeAttr(bodyId) + '" role="region" aria-labelledby="' + escapeAttr(headerId) + '">';

                if (sec.hens) {
                    if (sec.subtitle) html += '<p class="reiki-subtitle">' + escapeHtml(sec.subtitle) + '</p>';
                    html += '<div class="reiki-hen-list">';
                    for (var h = 0; h < sec.hens.length; h++) {
                        var hen = sec.hens[h];
                        var henHeaderId = "reiki-hen-header-" + (h + 1);
                        var henBodyId = "reiki-hen-body-" + (h + 1);
                        html += '<section class="reiki-section reiki-expandable reiki-hen">';
                        html += '<button type="button" class="reiki-expand-header reiki-hen-header" aria-expanded="false" aria-controls="' + escapeAttr(henBodyId) + '" id="' + escapeAttr(henHeaderId) + '">';
                        html += '<span class="reiki-expand-title">' + escapeHtml(hen.title) + '</span>';
                        html += '<i class="reiki-expand-icon fa-solid fa-chevron-down" aria-hidden="true"></i></button>';
                        html += '<div class="reiki-expand-body reiki-hen-body" id="' + escapeAttr(henBodyId) + '" role="region" aria-labelledby="' + escapeAttr(henHeaderId) + '">';
                        var chapters = hen.chapters || [];
                        for (var c = 0; c < chapters.length; c++) {
                            var ch = chapters[c];
                            if (ch.title) html += '<p class="reiki-chapter">' + escapeHtml(ch.title) + '</p>';
                            html += '<ul class="reiki-sublinks">';
                            var items = ch.items || [];
                            for (var i = 0; i < items.length; i++) {
                                html += '<li><a href="#" class="reiki-link">' + escapeHtml(items[i]) + '</a></li>';
                            }
                            html += '</ul>';
                        }
                        html += '</div></section>';
                    }
                    html += '</div>';
                } else {
                    if (sec.subtitle) html += '<p class="reiki-subtitle">' + escapeHtml(sec.subtitle) + '</p>';
                    if (sec.note) html += '<p class="reiki-expand-note">' + escapeHtml(sec.note) + '</p>';
                    if (sec.links && sec.links.length) {
                        html += '<ul class="reiki-sublinks">';
                        for (var L = 0; L < sec.links.length; L++) {
                            var lnk = sec.links[L];
                            var href = lnk.href ? escapeAttr(lnk.href) : "#";
                            var target = lnk.href ? ' target="_blank" rel="noopener"' : "";
                            html += '<li><a href="' + href + '" class="reiki-link"' + target + '>' + escapeHtml(lnk.label) + '</a></li>';
                        }
                        html += '</ul>';
                    }
                }
                html += '</div></section>';
            }
            container.innerHTML = html;
            initReikiExpand();
        })
        .catch(function(err) {
            console.error("例規集データの読み込みに失敗しました:", err);
            container.innerHTML = "<p class=\"reiki-error\">データを読み込めませんでした。</p>";
        });

    function escapeHtml(str) {
        if (!str) return "";
        var div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function escapeAttr(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    /** 展開ボタン（１階層目・２階層目）のクリックで開閉 */
    function initReikiExpand() {
        var list = document.querySelector(".reiki-list");
        if (!list) return;
        list.addEventListener("click", function(e) {
            var btn = e.target.closest(".reiki-expand-header");
            if (!btn) return;
            e.preventDefault();
            var section = btn.closest(".reiki-expandable");
            if (!section) return;
            var isOpen = section.classList.toggle("is-open");
            btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });
    }
})();