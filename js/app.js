// 現在の月から季節を判定（3-5月:春 / 6-8月:夏 / 9-11月:秋 / 12-2月:冬）
function getSeason() {
    const month = new Date().getMonth();
    if ([0, 1, 11].includes(month)) return "winter";   /* 12月・1月・2月 */
    if ([2, 3, 4].includes(month)) return "spring";
    if ([5, 6, 7].includes(month)) return "summer";
    if ([8, 9, 10].includes(month)) return "autumn";
    return "spring";
}

// ページ読み込み時に html に季節クラスを付与（背景グラデーションを季節で切り替え）
// USE_SEASON_GRADIENT は js/siteConfig.js で切替（未読込時は true）
(function setSeasonClass() {
    const useGradient = typeof USE_SEASON_GRADIENT === "undefined" ? true : USE_SEASON_GRADIENT;
    /* 写真ページは URL ?season= で既に html に季節クラスが付いているので上書きしない */
    if (document.body.classList.contains('kokushi-pict-page')) {
        var params = new URLSearchParams(location.search);
        var pictSeason = params.get('season') || 'spring';
        if (['spring', 'summer', 'autumn', 'winter'].indexOf(pictSeason) < 0) pictSeason = 'spring';
        updateStatusBarThemeColor(pictSeason);
        return;
    }
    if (!useGradient) {
        updateStatusBarThemeColor(getSeason());
        return;
    }
    /* 確認用で選んだ季節を優先。ただし指定期間（月）が変わったら日付ベースの季節に自動切り替え */
    const stored = sessionStorage.getItem("selectedSeason");
    const storedMonth = sessionStorage.getItem("selectedSeasonMonth");
    const currentMonth = String(new Date().getMonth());
    const valid = ["spring", "summer", "autumn", "winter"];
    const useStored = typeof useDevSeasonOverride === "function" && useDevSeasonOverride() &&
        stored && valid.includes(stored) && storedMonth === currentMonth;
    const season = useStored ? stored : getSeason();
    const html = document.documentElement;
    html.classList.remove("season-spring", "season-summer", "season-autumn", "season-winter");
    html.classList.add("season-" + season);
    /* トップは季節グラデーション上端色、それ以外はクリーム背景に theme-color を合わせる */
    updateStatusBarThemeColor(season);
})();

/** ステータスバー／ブラウザUI色をページ背景に合わせる（iOS は meta を作り直すと反映されやすい） */
function updateStatusBarThemeColor(season) {
    const seasonColors = {
        spring: "#00b3ff",
        summer: "#008bc1",
        autumn: "#dc9913",
        winter: "#686868"
    };
    const isSeasonPage = document.documentElement.classList.contains("top-page") ||
        document.documentElement.classList.contains("kokushi-pict-page");
    const color = isSeasonPage ? (seasonColors[season] || seasonColors.spring) : "#fdf5de";
    const old = document.querySelectorAll('meta[name="theme-color"]');
    const mediaList = [];
    old.forEach(function(meta) {
        mediaList.push(meta.getAttribute("media") || "");
        meta.parentNode.removeChild(meta);
    });
    (mediaList.length ? mediaList : [""]).forEach(function(m) {
        const el = document.createElement("meta");
        el.setAttribute("name", "theme-color");
        if (m) el.setAttribute("media", m);
        el.setAttribute("content", color);
        document.head.appendChild(el);
    });
}

// トグルボタンを取得（ヘッダー枠外・右端に配置されたボタン）
function getToggleButton() {
    return document.querySelector(".header-toggle_btn");
}

const header = document.querySelector("header");
const headerOverlay = document.querySelector(".header-overlay");

// トグルボタンのクリックイベントを設定
function setupToggleButton() {
    const toggleBTN = getToggleButton();
    if (!toggleBTN) return;

    const toggleBTNIcon = toggleBTN.querySelector("i");

    toggleBTN.onclick = function(event) {
        // イベントの伝播を止める（documentのクリックイベントが発火しないように）
        event.stopPropagation();

        // headerにexpandedクラスを追加/削除して広がる動作を実現
        header.classList.toggle("expanded");

        const isExpanded = header.classList.contains("expanded");

        // アイコンを変更（<i>があるページのみ。spanの場合はCSSのmaskで切替）
        if (toggleBTNIcon) {
            toggleBTNIcon.classList = isExpanded ? "fa-solid fa-xmark" : "fa-solid fa-bars";
        }

        // 背景オーバーレイの表示/非表示
        if (isExpanded) {
            if (headerOverlay) {
                headerOverlay.classList.add("active");
            }
            // スクロールを無効化
            document.body.style.overflow = "hidden";
        } else {
            if (headerOverlay) {
                headerOverlay.classList.remove("active");
            }
            // スクロールを有効化
            document.body.style.overflow = "";
        }
    };
}

// 初期設定
setupToggleButton();

// ウィンドウサイズ変更時にトグルボタンを再設定
window.addEventListener("resize", function() {
    setupToggleButton();
    // 1100px以上に広がったら展開状態を解除（nav-list表示に切り替わるため）
    if (window.innerWidth >= 1100 && header.classList.contains("expanded")) {
        header.classList.remove("expanded");
        if (headerOverlay) headerOverlay.classList.remove("active");
        document.body.style.overflow = "";
        const toggleBTN = getToggleButton();
        if (toggleBTN) {
            const icon = toggleBTN.querySelector("i");
            if (icon) icon.classList = "fa-solid fa-bars";
        }
    }
});

// 背景オーバーレイをクリックしたらメニューを閉じる
if (headerOverlay) {
    headerOverlay.addEventListener("click", function(event) {
        const toggleBTN = getToggleButton();
        if (!toggleBTN) return;

        const toggleBTNIcon = toggleBTN.querySelector("i");

        // headerのexpandedクラスを削除
        header.classList.remove("expanded");
        headerOverlay.classList.remove("active");
        if (toggleBTNIcon) toggleBTNIcon.classList = "fa-solid fa-bars";

        // スクロールを有効化
        document.body.style.overflow = "";
    });
}

// メニュー外をクリックしたらメニューを閉じる（header内のクリックは除外）
document.addEventListener("click", function(event) {
    const toggleBTN = getToggleButton();
    if (!toggleBTN) return;

    const toggleBTNIcon = toggleBTN.querySelector("i");

    // クリックがheader内・オーバーレイ・トグルボタンのいずれかなら閉じない
    const isClickInsideHeader = header.contains(event.target);
    const isClickOnOverlay = headerOverlay && headerOverlay.contains(event.target);
    const isClickOnToggle = toggleBTN && toggleBTN.contains(event.target);

    if (!isClickInsideHeader && !isClickOnOverlay && !isClickOnToggle && header.classList.contains("expanded")) {
        header.classList.remove("expanded");
        if (headerOverlay) {
            headerOverlay.classList.remove("active");
        }
        if (toggleBTNIcon) toggleBTNIcon.classList = "fa-solid fa-bars";

        // スクロールを有効化
        document.body.style.overflow = "";
    }
});