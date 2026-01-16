// スライダーのアイテムとボタンを取得
let items = document.querySelectorAll(".slider .item");
let next = document.getElementById("next");
let prev = document.getElementById("prev");
let progressBar = document.querySelector(".progress");
let wheelechair = document.querySelector(".wheelechair");

// 現在アクティブなアイテムのインデックス（中央に表示するアイテム）
let active = 0;

// スライダーの表示を更新する関数
function loadShow() {
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
        let index = (active + stt) % len; // 最後を超えたら最初に戻る
        items[index].style.transform = `translateX(${40 * stt}%) scale(${
      1 - 0.15 * stt
    }) rotateY(-10deg)`;
        items[index].style.zIndex = -stt;
        items[index].style.filter = "blur(5px)";
        items[index].style.opacity = 0.5;
    }

    // 左側にぼかしで表示（ループ対応）
    for (let stt = 1; stt <= 2; stt++) {
        let index = (active - stt + len) % len; // 最初を超えたら最後に戻る
        items[index].style.transform = `translateX(${-40 * stt}%) scale(${
      1 - 0.15 * stt
    }) rotateY(10deg)`;
        items[index].style.zIndex = -stt;
        items[index].style.filter = "blur(5px)";
        items[index].style.opacity = 0.5;
    }
}

// 次のスライドへ移動する関数
function nextSlide() {
    if (active < items.length - 1) {
        active++;
    } else {
        active = 0; // 最後まで行ったら最初に戻る
    }
    loadShow();
}

// 前のスライドへ移動する関数
function prevSlide() {
    if (active > 0) {
        active--;
    } else {
        active = items.length - 1; // 最初まで行ったら最後に戻る
    }
    loadShow();
}

// プログレスバーのアニメーションが1サイクル終わるたびにスライド
progressBar.addEventListener("animationiteration", function() {
    nextSlide();
});

// プログレスバーと車椅子をリセットする関数
function resetProgressBar() {
    // プログレスバーをリセット
    progressBar.style.animation = "none";
    progressBar.offsetHeight;
    progressBar.style.animation = "progressAnimation 10s linear infinite";

    // 車椅子をリセット
    wheelechair.style.animation = "none";
    wheelechair.offsetHeight;
    wheelechair.style.animation = "wheelechairAnimation 10s linear infinite";
}

// 次へボタンのクリックイベント
next.onclick = function() {
    nextSlide();
    resetProgressBar(); // ボタン操作後にプログレスバーリセット
};

// 前へボタンのクリックイベント
prev.onclick = function() {
    prevSlide();
    resetProgressBar(); // ボタン操作後にプログレスバーリセット
};

// 初期表示
loadShow();