/**
 * 施設取組データ（data/shisetu_torikumi.json）を読み込み、一覧を描画する
 * 入札情報ページの nyusatu と同様に、JSONでセクション・項目を管理
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
                    html += '<p class="shisetu-section-note">' + escapeHtml(sec.note) + '</p>';
                }
                html += '<ul class="shisetu-links">';
                var items = sec.items || [];
                for (var j = 0; j < items.length; j++) {
                var item = items[j];
                var label = typeof item === 'string' ? item : (item.label || '');
                var href = typeof item === 'string' ? '#' : (item.href || '#');
                html += '<li><a href="' + escapeHtml(href) + '" class="shisetu-link-label">' + escapeHtml(label) + '</a></li>';
                }
                html += "</ul>";
                html += "</section>";
            }
            container.innerHTML = html;
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
})();