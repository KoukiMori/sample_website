// スライダー関連の変数
let items;
let next;
let prev;
let progressBar;
let wheelechair;
let active = 0;

// スワイプ機能関連の変数
let isDragging = false;
let startX = 0;
let currentX = 0;
let isSwipeActive = false; // スワイプ中かどうかのフラグ

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

    // スワイプ機能の初期化
    initSwipe();
}

/**
 * スライダーの表示を更新する関数
 * スワイプ中は呼ばれない（isSwipeActiveがtrueの場合は処理をスキップ）
 */
function loadShow() {
    if (!items || items.length === 0) return;

    // スワイプ中は処理をスキップ
    if (isSwipeActive) return;

    let len = items.length;

    // 一旦すべてのアイテムを非表示にリセット
    items.forEach((item) => {
        // 中央配置を維持（translateX(-50%)を基準に）
        item.style.transform = "translateX(-50%) scale(0)";
        item.style.zIndex = -10;
        item.style.filter = "blur(5px)";
        item.style.opacity = 0;
    });

    // アクティブなアイテム（中央）のスタイル（サイズを大きく表示）
    // 中央配置を維持（translateX(-50%)を基準に）
    items[active].style.transform = "translateX(-50%) scale(1.2)";
    items[active].style.zIndex = 1;
    items[active].style.filter = "none";
    items[active].style.opacity = 1;

    // 右側にぼかしで表示（ループ対応）
    for (let stt = 1; stt <= 2; stt++) {
        let index = (active + stt) % len;
        // アクティブなitemの幅を取得してレスポンシブに対応
        const activeItemWidth = items[active].offsetWidth || 700;
        const offset = (activeItemWidth / 2 + 50) * stt; // itemの幅の半分 + 余白
        // 両サイドのアイテムを表示（中央を基準に右側に配置）
        // translateX(-50%)で中央配置を維持し、その後に右側に移動
        items[index].style.transform = `translateX(calc(-60% + ${offset}px)) scale(${1.1 - 0.1 * stt}) rotateY(-10deg)`;
        items[index].style.zIndex = -stt;
        items[index].style.filter = "blur(3px)";
        items[index].style.opacity = 0.9;
    }

    // 左側にぼかしで表示（ループ対応）
    for (let stt = 1; stt <= 2; stt++) {
        let index = (active - stt + len) % len;
        // アクティブなitemの幅を取得してレスポンシブに対応
        const activeItemWidth = items[active].offsetWidth || 700;
        const offset = (activeItemWidth / 2 + 50) * stt; // itemの幅の半分 + 余白
        // 両サイドのアイテムを表示（中央を基準に左側に配置）
        // translateX(-50%)で中央配置を維持し、その後に左側に移動
        items[index].style.transform = `translateX(calc(-40% - ${offset}px)) scale(${1.1 - 0.1 * stt}) rotateY(10deg)`;
        items[index].style.zIndex = -stt;
        items[index].style.filter = "blur(3px)";
        items[index].style.opacity = 0.9;
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

/**
 * スワイプ機能を初期化する関数
 */
function initSwipe() {
    const slider = document.querySelector('.slider');
    if (!slider) return;

    // タッチイベント（モバイル）
    slider.addEventListener('touchstart', handleTouchStart, { passive: false });
    slider.addEventListener('touchmove', handleTouchMove, { passive: false });
    slider.addEventListener('touchend', handleTouchEnd, { passive: false });

    // マウスイベント（PCでのテスト用）
    slider.addEventListener('mousedown', handleMouseDown);
    slider.addEventListener('mousemove', handleMouseMove);
    slider.addEventListener('mouseup', handleMouseUp);
    slider.addEventListener('mouseleave', handleMouseUp);
}

/**
 * タッチ開始時の処理
 */
function handleTouchStart(event) {
    if (!items || items.length === 0) return;

    isDragging = true;
    isSwipeActive = true;
    startX = event.touches[0].clientX;
    currentX = startX;

    // 自動スライドを一時停止
    if (progressBar) {
        progressBar.style.animationPlayState = 'paused';
    }
}

/**
 * タッチ移動時の処理
 */
function handleTouchMove(event) {
    if (!isDragging || !items || items.length === 0) return;

    event.preventDefault(); // スクロールを防ぐ

    currentX = event.touches[0].clientX;
    const diff = currentX - startX;

    // スワイプ中の視覚効果（アクティブなアイテムを移動）
    if (items[active]) {
        const moveAmount = diff * 0.5; // 移動量を抑えて自然に
        items[active].style.transform = `translateX(calc(-50% + ${moveAmount}px)) scale(1.2)`;
        items[active].style.transition = 'none'; // スムーズなドラッグのためにトランジションを無効化
    }
}

/**
 * タッチ終了時の処理
 */
function handleTouchEnd(event) {
    if (!isDragging || !items || items.length === 0) {
        isDragging = false;
        isSwipeActive = false;
        return;
    }

    isDragging = false;

    const diff = startX - currentX;
    const swipeThreshold = 50; // スワイプ判定の閾値（px）

    // スワイプ終了：状態を先にリセット（nextSlide/prevSlide内のloadShowが正常に動作するように）
    isSwipeActive = false;

    // スワイプ判定
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // 左スワイプ：次のスライドへ
            nextSlide();
        } else {
            // 右スワイプ：前のスライドへ
            prevSlide();
        }
        resetProgressBar();
    } else {
        // スワイプ判定に満たなかった場合：元の位置に戻す
        // トランジションを復元
        if (items[active]) {
            items[active].style.transition = '0.5s';
        }
        // 表示を更新（元の位置に戻す）
        loadShow();
    }

    // トランジションを復元（スワイプ判定があった場合も復元）
    if (items[active]) {
        items[active].style.transition = '0.5s';
    }

    // 自動スライドを再開
    if (progressBar) {
        progressBar.style.animationPlayState = 'running';
    }
}

/**
 * マウスダウン時の処理
 */
function handleMouseDown(event) {
    if (!items || items.length === 0) return;

    isDragging = true;
    isSwipeActive = true;
    startX = event.clientX;
    currentX = startX;

    // 自動スライドを一時停止
    if (progressBar) {
        progressBar.style.animationPlayState = 'paused';
    }
}

/**
 * マウス移動時の処理
 */
function handleMouseMove(event) {
    if (!isDragging || !items || items.length === 0) return;

    currentX = event.clientX;
    const diff = currentX - startX;

    // スワイプ中の視覚効果
    if (items[active]) {
        const moveAmount = diff * 0.5;
        items[active].style.transform = `translateX(calc(-50% + ${moveAmount}px)) scale(1.2)`;
        items[active].style.transition = 'none';
    }
}

/**
 * マウスアップ時の処理
 */
function handleMouseUp(event) {
    if (!isDragging || !items || items.length === 0) {
        isDragging = false;
        isSwipeActive = false;
        return;
    }

    isDragging = false;

    const diff = startX - currentX;
    const swipeThreshold = 50;

    // スワイプ終了：状態を先にリセット（nextSlide/prevSlide内のloadShowが正常に動作するように）
    isSwipeActive = false;

    // スワイプ判定
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // 左スワイプ：次のスライドへ
            nextSlide();
        } else {
            // 右スワイプ：前のスライドへ
            prevSlide();
        }
        resetProgressBar();
    } else {
        // スワイプ判定に満たなかった場合：元の位置に戻す
        // トランジションを復元
        if (items[active]) {
            items[active].style.transition = '0.5s';
        }
        // 表示を更新（元の位置に戻す）
        loadShow();
    }

    // トランジションを復元（スワイプ判定があった場合も復元）
    if (items[active]) {
        items[active].style.transition = '0.5s';
    }

    // 自動スライドを再開
    if (progressBar) {
        progressBar.style.animationPlayState = 'running';
    }
}