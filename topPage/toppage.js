// スライダー関連の変数
let items;
let next;
let prev;
let progressBar;
let wheelechair;
let active = 0;

/**
 * スライダーを初期化する関数
 * sliderLoader.jsからデータ読み込み後に呼び出される
 */
function initSlider() {
    // スライダーのアイテムとボタンを取得
    items = document.querySelectorAll(".slider .item");
    next = document.getElementById("next");
    prev = document.getElementById("prev");
    progressBar = document.querySelector(".progress");
    wheelechair = document.querySelector(".wheelechair");

    // アイテムがない場合は処理しない
    if (!items || items.length === 0) {
        console.warn('スライダーアイテムが見つかりません');
        return;
    }

    // 現在アクティブなアイテムのインデックス（中央に表示するアイテム）
    active = 0;

    // プログレスバーのアニメーションが1サイクル終わるたびにスライド
    if (progressBar) {
        progressBar.addEventListener("animationiteration", function() {
            nextSlide();
        });
    }

    // 次へボタンのクリックイベント
    if (next) {
        next.onclick = function() {
            nextSlide();
            resetProgressBar();
        };
    }

    // 前へボタンのクリックイベント
    if (prev) {
        prev.onclick = function() {
            prevSlide();
            resetProgressBar();
        };
    }

    // 初期表示
    loadShow();
}

/**
 * スライダーの表示を更新する関数
 */
function loadShow() {
    if (!items || items.length === 0) return;

    let len = items.length;

    // 一旦すべてのアイテムを非表示にリセット
    items.forEach((item) => {
        item.style.transform = "translateX(0) scale(0)";
        item.style.zIndex = -10;
        item.style.filter = "blur(5px)";
        item.style.opacity = 0;
    });

    // アクティブなアイテム（中央）のスタイル
    items[active].style.transform = "translateX(0) scale(1)";
    items[active].style.zIndex = 1;
    items[active].style.filter = "none";
    items[active].style.opacity = 1;

    // 右側にぼかしで表示（ループ対応）
    for (let stt = 1; stt <= 2; stt++) {
        let index = (active + stt) % len;
        items[index].style.transform = `translateX(${40 * stt}%) scale(${1 - 0.15 * stt}) rotateY(-10deg)`;
        items[index].style.zIndex = -stt;
        items[index].style.filter = "blur(5px)";
        items[index].style.opacity = 0.5;
    }

    // 左側にぼかしで表示（ループ対応）
    for (let stt = 1; stt <= 2; stt++) {
        let index = (active - stt + len) % len;
        items[index].style.transform = `translateX(${-40 * stt}%) scale(${1 - 0.15 * stt}) rotateY(10deg)`;
        items[index].style.zIndex = -stt;
        items[index].style.filter = "blur(5px)";
        items[index].style.opacity = 0.5;
    }
}

/**
 * 次のスライドへ移動する関数
 */
function nextSlide() {
    if (!items || items.length === 0) return;

    if (active < items.length - 1) {
        active++;
    } else {
        active = 0;
    }
    loadShow();
}

/**
 * 前のスライドへ移動する関数
 */
function prevSlide() {
    if (!items || items.length === 0) return;

    if (active > 0) {
        active--;
    } else {
        active = items.length - 1;
    }
    loadShow();
}

/**
 * プログレスバーと車椅子をリセットする関数
 */
function resetProgressBar() {
    if (progressBar) {
        progressBar.style.animation = "none";
        progressBar.offsetHeight;
        progressBar.style.animation = "progressAnimation 10s linear infinite";
    }

    if (wheelechair) {
        wheelechair.style.animation = "none";
        wheelechair.offsetHeight;
        wheelechair.style.animation = "wheelechairAnimation 10s linear infinite";
    }
}
