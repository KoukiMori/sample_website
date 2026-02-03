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