// スライダー関連の変数
let items;
let next;
let prev;
let progressBar;
let wheelechair;
let active = 0;

/** サイトルートへのパス（動画・assets を正しく読むため）。toppage.js の位置からプロジェクトルートを算出（ver3/ 等サブパスでも正しく動く） */
var __assetsBase = (function() {
    var script = document.currentScript;
    if (script && script.src) {
        var dir = script.src.replace(/\/[^/]*$/, '/');
        return dir + '../';
    }
    var path = (window.location.pathname || '').replace(/^\//, '');
    var parts = path.split('/').filter(Boolean);
    if (parts.length <= 1) return '';
    return Array(parts.length - 1).fill('..').join('/') + '/';
})();

// スワイプ機能関連の変数
let isDragging = false;
let startX = 0;
let currentX = 0;
let isSwipeActive = false; // スワイプ中かどうかのフラグ
let skipSlideClick = false; // スワイプ直後の click ではページ遷移しない
let tapDiff = 0; // タップかスワイプかの距離（click 判定用）
let tapStartTarget = null; // 押し始めた要素（mouseup の target がズレても遷移できるようにする）
let swipeBound = false; // スワイプ監視は1回だけ付ける

/** カルーセル装飾を指定季節（または html の季節クラス）に合わせる。無い画像を春に戻さない */
function setSeasonalDeco(seasonOverride) {
    let season = seasonOverride;
    if (!season || ["spring", "summer", "autumn", "winter"].indexOf(season) < 0) {
        const html = document.documentElement;
        if (html.classList.contains("season-autumn")) season = "autumn";
        else if (html.classList.contains("season-summer")) season = "summer";
        else if (html.classList.contains("season-winter")) season = "winter";
        else if (html.classList.contains("season-spring")) season = "spring";
        else if (typeof getSeason === "function") season = getSeason();
        else season = "spring";
    }
    if (typeof applySeasonDecoImages === "function") applySeasonDecoImages(season);
}

/**
 * スライダーを初期化する関数
 * sliderLoader.jsからデータ読み込み後に呼び出される
 */
function initSlider() {
    // 季節に応じてカルーセル装飾画像を切り替え
    setSeasonalDeco();

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

    // 1100px前後でリサイズしたときに表示を切り替え
    window.addEventListener("resize", loadShow);
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
    const isWide = window.innerWidth > 1100; // 1100px超のみ観音開き
    // 中央＋左右1枚ずつ、合計3つを表示する
    const sideCount = 1;

    // 一旦すべてのアイテムを非表示にリセット
    items.forEach((item) => {
        item.style.transform = "translateX(-50%) scale(0)";
        item.style.zIndex = -10;
        item.style.filter = "blur(5px)";
        item.style.opacity = 0;
        item.style.boxShadow = "none";
    });

    // アクティブなアイテム（中央）
    if (isWide) {
        items[active].style.transform = "translateX(-50%) translateZ(150px) scale(1.2)";
    } else {
        items[active].style.transform = "translateX(-50%) scale(1.2)";
    }
    items[active].style.zIndex = 10;
    items[active].style.filter = "none";
    items[active].style.opacity = 1;
    items[active].style.boxShadow = "0 8px 16px -4px rgba(0, 0, 0, 0.25)";

    if (isWide) {
        // 1100px超：観音開き（右の扉）
        for (let stt = 1; stt <= sideCount; stt++) {
            let index = (active + stt) % len;
            const activeItemWidth = items[active].offsetWidth || 600;
            const offset = (activeItemWidth / 2 + 50) * stt;
            const openDeg = 18 + 12 * stt;
            const translateZ = -30 * stt;
            items[index].style.transform = `translateX(calc(-60% + ${offset}px)) translateZ(${translateZ}px) scale(${1.1 - 0.1 * stt}) rotateY(-${openDeg}deg)`;
            items[index].style.zIndex = -stt;
            items[index].style.filter = "none";
            items[index].style.opacity = 0.95;
        }
        for (let stt = 1; stt <= sideCount; stt++) {
            let index = (active - stt + len) % len;
            const activeItemWidth = items[active].offsetWidth || 600;
            const offset = (activeItemWidth / 2 + 50) * stt;
            const openDeg = 18 + 12 * stt;
            const translateZ = -30 * stt;
            items[index].style.transform = `translateX(calc(-40% - ${offset}px)) translateZ(${translateZ}px) scale(${1.1 - 0.1 * stt}) rotateY(${openDeg}deg)`;
            items[index].style.zIndex = -stt;
            items[index].style.filter = "none";
            items[index].style.opacity = 0.95;
        }
    } else {
        // 1100px以下：従来レイアウト（固定角度・translateZなし）
        for (let stt = 1; stt <= sideCount; stt++) {
            let index = (active + stt) % len;
            const activeItemWidth = items[active].offsetWidth || 600;
            const offset = (activeItemWidth / 2 + 50) * stt;
            items[index].style.transform = `translateX(calc(-60% + ${offset}px)) scale(${1.1 - 0.1 * stt}) rotateY(-10deg)`;
            items[index].style.zIndex = -stt;
            items[index].style.filter = "none";
            items[index].style.opacity = 0.95;
        }
        for (let stt = 1; stt <= sideCount; stt++) {
            let index = (active - stt + len) % len;
            const activeItemWidth = items[active].offsetWidth || 600;
            const offset = (activeItemWidth / 2 + 50) * stt;
            items[index].style.transform = `translateX(calc(-40% - ${offset}px)) scale(${1.1 - 0.1 * stt}) rotateY(10deg)`;
            items[index].style.zIndex = -stt;
            items[index].style.filter = "none";
            items[index].style.opacity = 0.95;
        }
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
    if (!slider || swipeBound) return;
    swipeBound = true;

    // タッチイベント（モバイル）。touchend/touchcancel は document にも登録し、指がスライダー外に出ても終了を検知
    slider.addEventListener('touchstart', handleTouchStart, { passive: false });
    slider.addEventListener('touchmove', handleTouchMove, { passive: false });
    slider.addEventListener('touchend', handleTouchEnd, { passive: false });
    slider.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    // マウスイベント（PCでのテスト用）
    slider.addEventListener('mousedown', handleMouseDown);
    slider.addEventListener('mousemove', handleMouseMove);
    slider.addEventListener('mouseup', handleMouseUp);
    slider.addEventListener('mouseleave', handleMouseUp);

    // 画像の上でも確実に遷移する（3D スライドのクリックは img が受ける）
    slider.addEventListener('click', handleSlideClick);
}

/**
 * タッチ開始時の処理
 */
function handleTouchStart(event) {
    if (!items || items.length === 0) return;
    // 左右ボタン上でのタッチはスワイプ扱いしない（ボタンのクリックを確実に発火させる）
    if (event.target.closest('#next') || event.target.closest('#prev')) return;

    isDragging = true;
    isSwipeActive = true;
    skipSlideClick = false;
    tapStartTarget = event.target;
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
        const moveAmount = diff * 0.5;
        const isWide = window.innerWidth > 1100;
        items[active].style.transform = isWide ?
            `translateX(calc(-50% + ${moveAmount}px)) translateZ(150px) scale(1.2)` :
            `translateX(calc(-50% + ${moveAmount}px)) scale(1.2)`;
        items[active].style.transition = 'none';
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
        skipSlideClick = true;
    } else {
        // スワイプ判定に満たなかった場合：元の位置に戻す
        if (items[active]) {
            items[active].style.transition = '0.5s';
        }
        loadShow();
        // 動かないタップは、手前のスライドに行き先があればそこへ進む
        tapDiff = diff;
        openActiveSlide(event, diff);
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

/** タップ／クリック位置（touchend は changedTouches を使う） */
function eventPoint(event) {
    if (!event) return null;
    if (event.changedTouches && event.changedTouches[0]) {
        return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
    }
    if (event.touches && event.touches[0]) {
        return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    if (typeof event.clientX === 'number') {
        return { x: event.clientX, y: event.clientY };
    }
    return null;
}

/**
 * 画像の中心から、幅・高さの 70% の内側かどうか
 * 端（各 15%）は隣のスライドや送りボタンと重なるので遷移しない
 */
function isTapInImageCenter(event, item) {
    var point = eventPoint(event);
    if (!point || !item) return false;
    var img = item.querySelector('img') || item;
    var rect = img.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    var dx = Math.abs(point.x - (rect.left + rect.width / 2));
    var dy = Math.abs(point.y - (rect.top + rect.height / 2));
    return dx <= rect.width * 0.35 && dy <= rect.height * 0.35;
}

/**
 * 手前のスライドをタップしたときだけ、行き先へ進む
 * 左右の送りボタンや、見えていないスライドは対象にしない
 */
function openActiveSlide(event, diff) {
    if (Math.abs(diff) > 50) return;
    const item = items[active];
    if (!item) return;
    const href = item.getAttribute('data-href');
    if (!href) return;
    if (event && event.target && event.target.closest) {
        if (event.target.closest('#next') || event.target.closest('#prev')) return;
        // 押し始めた要素か、今の target が手前スライド内なら遷移する
        var startedOnItem = tapStartTarget && item.contains(tapStartTarget);
        if (!item.contains(event.target) && !startedOnItem) return;
    }
    // 画像の中心 70% だけ詳細へ進む
    if (!isTapInImageCenter(event, item)) return;
    window.location.href = href;
}

// 画像クリックでも遷移する（mouseup の target がズレても拾う）
function handleSlideClick(event) {
    if (skipSlideClick) {
        skipSlideClick = false;
        return;
    }
    if (event.target.closest('#next') || event.target.closest('#prev')) return;
    openActiveSlide(event, tapDiff || 0);
}

/**
 * マウスダウン時の処理
 */
function handleMouseDown(event) {
    if (!items || items.length === 0) return;
    // 左右ボタン上でのマウスダウンはスワイプ扱いしない（ボタンのクリックを確実に発火させる）
    if (event.target.closest('#next') || event.target.closest('#prev')) return;

    isDragging = true;
    isSwipeActive = true;
    skipSlideClick = false;
    tapStartTarget = event.target;
    startX = event.clientX;
    currentX = startX;
    // 画像のネイティブドラッグを止めて、クリック遷移を残す
    event.preventDefault();

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
        const isWide = window.innerWidth > 1100;
        items[active].style.transform = isWide ?
            `translateX(calc(-50% + ${moveAmount}px)) translateZ(150px) scale(1.2)` :
            `translateX(calc(-50% + ${moveAmount}px)) scale(1.2)`;
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
        skipSlideClick = true;
    } else {
        // スワイプ判定に満たなかった場合：元の位置に戻す
        if (items[active]) {
            items[active].style.transition = '0.5s';
        }
        loadShow();
        tapDiff = diff;
        // マウスは click で遷移する（画像ドラッグを止めたあとの click を使う）
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

/* ========== index.html から移した処理（DOMContentLoaded で実行） ========== */
function initTopicScrollAnimation() {
    const topicSection = document.querySelector('.topic');
    if (!topicSection) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.intersectionRatio > 0) topicSection.classList.add('partially-visible');
                if (entry.intersectionRatio >= 0.2) topicSection.classList.add('visible');
                else topicSection.classList.remove('visible');
            } else {
                topicSection.classList.remove('visible');
                topicSection.classList.remove('partially-visible');
            }
        });
    }, { threshold: [0, 0.2], rootMargin: '0px 0px -20% 0px' });
    observer.observe(topicSection);
}

/** ヒーロー動画：季節に応じて動画を切り替え、緑クロマキー透過 */
function initHeroVideo() {
    const video = document.getElementById('heroVideoBg');
    const canvas = document.getElementById('heroVideoCanvas');
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    let useChroma = true;
    /* loadstart の時点ではまだ中身を空にしておき、下で抜き色のリセット処理を入れる */
    let onVideoLoadStart = function() {};
    video.addEventListener('loadstart', function() { onVideoLoadStart(); });
    /* 画面外・非表示でこちらが止めたときだけ、戻ったら再生を再開する */
    let pausedBecauseHidden = false;
    /* この canvas は画面固定なので、スクロールしても見えたまま。本当に枠が外れたときだけ false */
    let onScreen = true;
    /* 動画の元サイズで抜いてから拡大する（Pages / 高DPI で雲の縁が欠けるのを防ぐ） */
    const workCanvas = document.createElement('canvas');
    const workCtx = workCanvas.getContext('2d', { willReadFrequently: true, alpha: true });

    function getSeason() {
        const month = new Date().getMonth();
        if ([0, 1, 11].indexOf(month) >= 0) return "winter"; /* 12月・1月・2月 */
        if ([2, 3, 4].indexOf(month) >= 0) return "spring";
        if ([5, 6, 7].indexOf(month) >= 0) return "summer";
        if ([8, 9, 10].indexOf(month) >= 0) return "autumn";
        return "spring";
    }
    /* 動画パス：現在のページから相対で解決し、絶対URLにする（どの環境・ブラウザでも読み込めるように） */
    const videoBase = (__assetsBase || '') + 'assets/video/';
    const toAbsolute = function(filename) {
        return new URL(videoBase + filename, location.href).href;
    };
    const seasonVideo = {
        spring: toAbsolute("spring_web.mp4"),
        summer: toAbsolute("summer_web.mp4"),
        autumn: toAbsolute("autumn_web.mp4"),
        winter: toAbsolute("winter_web.mp4")
    };
    /* 写真ページ（kokushi-pict 等）では URL ?season= で動画を切り替え。それ以外は月または sessionStorage */
    let season;
    if (document.body.classList.contains('kokushi-pict-page')) {
        var urlParams = new URLSearchParams(location.search);
        season = urlParams.get('season') || 'spring';
        if (!['spring', 'summer', 'autumn', 'winter'].includes(season)) season = 'spring';
    } else {
        const stored = sessionStorage.getItem('selectedSeason');
        const storedMonth = sessionStorage.getItem('selectedSeasonMonth');
        const currentMonth = String(new Date().getMonth());
        const useStored = typeof useDevSeasonOverride === 'function' && useDevSeasonOverride() &&
            stored && ['spring', 'summer', 'autumn', 'winter'].includes(stored) && storedMonth === currentMonth;
        season = useStored ? stored : getSeason();
    }
    /* 秋は白透過、冬はグレー透過、夏は青透過、春は緑透過 */
    window.__heroVideoChroma = (season === 'summer') ? 'blue' : (season === 'autumn') ? 'white' : (season === 'winter') ? 'gray' : 'green';
    /* winter.mp4 のみイラストが小さいので描画時に拡大（1.5倍） */
    window.__heroVideoScale = (season === 'winter') ? 1.5 : 1;
    const initialSrc = seasonVideo[season] || seasonVideo.spring;
    video.setAttribute('preload', 'metadata'); /* メタデータのみ先読みで初期ロード軽量化、再生に必要な部分は順次バッファ */
    video.src = (season === 'winter') ? initialSrc + '?v=' + Date.now() : initialSrc;
    video.load(); /* 初回も明示的に load して winter 等を確実に適用 */
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.onerror = function() {
        video.onerror = null;
        video.src = seasonVideo.spring;
        video.load();
        video.play().catch(() => {});
    };
    /* 読み込み完了後に再生。Safari/iOS ではユーザー操作なしだと play() がブロックされるため、__heroVideoPlayWhenReady が立っていれば再生 */
    video.addEventListener('canplay', function onCanPlayInit() {
        video.removeEventListener('canplay', onCanPlayInit);
        video.playbackRate = playbackRate;
        /* 読み込み完了が非表示中なら、見えたときに resume 側で再生する */
        if (document.hidden || !onScreen) {
            pausedBecauseHidden = true;
            return;
        }
        if (window.__heroVideoPlayWhenReady) {
            window.__heroVideoPlayWhenReady = false;
            video.play().catch(() => {});
        } else {
            video.play().catch(() => {});
        }
    }, { once: true });
    /* 初回が winter で再生されない場合のフォールバック */
    if (season === 'winter') {
        setTimeout(function() {
            if (video.paused && video.readyState < 2) {
                window.__heroVideoChroma = 'green';
                window.__heroVideoScale = 1;
                video.src = seasonVideo.spring;
                video.load();
                video.addEventListener('canplay', function() {
                    video.playbackRate = playbackRate;
                    video.play().catch(() => {});
                }, { once: true });
            }
        }, 2500);
    }

    /* 直近で抜き色したコマ。同じ番号のあいだは画素を触らない */
    let lastPresented = -1;
    let hasKeyedFrame = false;
    let loopOn = false;
    let rafId = 0;
    let vfcId = 0;

    function resize() {
        const w = window.innerWidth,
            h = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, (w * dpr) | 0);
        canvas.height = Math.max(1, (h * dpr) | 0);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        /* サイズ変更で表示用 canvas は消えるので、抜き色済みの絵だけ貼り直す */
        if (hasKeyedFrame) blit();
    }

    /* ページを表示中で、canvas が画面内のときだけ処理する */
    function shouldRun() {
        return useChroma && !document.hidden && onScreen;
    }

    function cancelLoop() {
        loopOn = false;
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }
        if (vfcId && typeof video.cancelVideoFrameCallback === 'function') {
            video.cancelVideoFrameCallback(vfcId);
            vfcId = 0;
        }
    }

    /* 見えていないあいだは再生も抜き色も止める。最後の絵は canvas に残す */
    function stopBecauseHidden() {
        cancelLoop();
        if (!video.paused) {
            video.pause();
            pausedBecauseHidden = true;
        }
    }

    function playIfVisible() {
        if (!shouldRun() || !video.paused) return;
        video.play().catch(function() {});
    }

    function resumeIfVisible() {
        if (!shouldRun()) return;
        if (pausedBecauseHidden) {
            pausedBecauseHidden = false;
            playIfVisible();
        }
        schedule();
    }

    /* 抜き色済みの絵を画面サイズに合わせて描く（画素の再計算はしない） */
    function blit() {
        const w = video.videoWidth,
            h = video.videoHeight;
        if (!w || !h || !workCanvas.width) return;
        const cw = canvas.width,
            ch = canvas.height;
        const baseScale = Math.max(cw / w, ch / h);
        const zoom = window.__heroVideoScale || 1; /* winter のみ 1.5 で拡大 */
        const scale = baseScale * zoom;
        const dw = w * scale,
            dh = h * scale;
        const dx = (cw - dw) / 2,
            dy = (ch - dh) / 2;
        ctx.clearRect(0, 0, cw, ch);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(workCanvas, dx, dy, dw, dh);
    }

    /* 1コマ分を CPU で透過してから画面へ出す */
    function render() {
        if (!useChroma) return;
        const w = video.videoWidth,
            h = video.videoHeight;
        if (video.readyState < 2 || !w || !h) {
            if (!hasKeyedFrame) ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }
        if (workCanvas.width !== w || workCanvas.height !== h) {
            workCanvas.width = w;
            workCanvas.height = h;
        }
        workCtx.drawImage(video, 0, 0, w, h);
        try {
            const img = workCtx.getImageData(0, 0, w, h),
                d = img.data;
            const chroma = window.__heroVideoChroma || 'green';
            const greenThresh = 20;
            const blueThresh = 50; /* 夏：青空を透過して背後のグラデーションを見せる */
            for (let i = 0; i < d.length; i += 4) {
                const r = d[i],
                    g = d[i + 1],
                    b = d[i + 2];
                const avg = (r + g + b) / 3;
                const sat = Math.max(r, g, b) - Math.min(r, g, b);
                const isBrightWhite = avg >= 220; /* 春：花など明るい白は透過しない */
                if (chroma === 'white') {
                    if (avg >= 200 && r >= 180 && g >= 180 && b >= 180) d[i + 3] = 0; /* 秋：白を透過 */
                } else if (chroma === 'gray') {
                    const max = Math.max(r, g, b),
                        min = Math.min(r, g, b);
                    if (max - min < 60 && avg > 15 && avg < 200) d[i + 3] = 0; /* 冬：グレーのみ透過 */
                } else if (chroma === 'blue') {
                    /* 夏：白い雲だけ残す。空色と薄い青影は H.264 の色ずれでも透過 */
                    const isWhiteCloud = avg >= 205 && sat < 48;
                    if (!isWhiteCloud && b > blueThresh && b >= r && b >= g) d[i + 3] = 0;
                } else {
                    if (!isBrightWhite && g > greenThresh && g > r && g > b) d[i + 3] = 0; /* 春：緑を透過 */
                }
            }
            workCtx.putImageData(img, 0, 0);
        } catch (err) {
            useChroma = false;
            cancelLoop();
            canvas.style.display = 'none';
            video.style.visibility = 'visible';
            /* 透過に失敗したときは、元の動画をそのまま見せる */
            if (video.paused) video.play().catch(function() {});
            return;
        }
        hasKeyedFrame = true;
        blit();
    }

    /* 表示された動画コマの番号。増えていなければ同じ絵なので抜き色しない */
    function presentedCount() {
        if (typeof video.getVideoPlaybackQuality === 'function') {
            return video.getVideoPlaybackQuality().totalVideoFrames;
        }
        if (typeof video.webkitDecodedFrameCount === 'number') {
            return video.webkitDecodedFrameCount;
        }
        return null;
    }

    function rememberFrame(token) {
        if (token === null || token === undefined) return false;
        if (hasKeyedFrame && token === lastPresented) return true;
        lastPresented = token;
        return false;
    }

    /* コマが変わるたび、または未対応ブラウザでは表示コマ数が増えたときだけ抜き色する */
    function schedule() {
        if (!shouldRun()) return;
        /* 停止中でも最初の1枚は出しておく（自動再生がブロックされても背景が空白にならない） */
        if (!hasKeyedFrame && video.readyState >= 2 && video.videoWidth) render();
        if (!shouldRun() || loopOn) return;
        loopOn = true;
        if (video.readyState >= 2 && typeof video.requestVideoFrameCallback === 'function') {
            vfcId = video.requestVideoFrameCallback(function(_now, metadata) {
                vfcId = 0;
                loopOn = false;
                if (!shouldRun()) return;
                var token = metadata && typeof metadata.presentedFrames === 'number' ?
                    metadata.presentedFrames :
                    (metadata && metadata.mediaTime);
                if (!rememberFrame(token)) render();
                schedule();
            });
            return;
        }
        rafId = requestAnimationFrame(function() {
            rafId = 0;
            loopOn = false;
            if (!shouldRun()) return;
            if (video.readyState < 2 || !video.videoWidth) {
                if (!hasKeyedFrame) ctx.clearRect(0, 0, canvas.width, canvas.height);
                schedule();
                return;
            }
            /* 新しいコマのときだけ画素を処理する */
            if (!rememberFrame(presentedCount())) render();
            schedule();
        });
    }

    /* 季節を切り替えた直後は、前のコマ番号のままスキップしない */
    onVideoLoadStart = function() {
        lastPresented = -1;
        hasKeyedFrame = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const playbackRate = 0.4;
    video.muted = true;
    video.playbackRate = playbackRate;
    video.addEventListener('loadeddata', () => { video.playbackRate = playbackRate; });
    video.addEventListener('loadedmetadata', () => {
        resize();
        resumeIfVisible();
    });
    /* 実機で loadedmetadata が遅れる場合に備え、ループを早めに開始 */
    resize();
    resumeIfVisible();
    /* canplay で再生しない場合はフォールバックで再生試行 */
    setTimeout(function() {
        if (video.paused && video.readyState >= 2) playIfVisible();
    }, 1000);
    /* Safari/iOS で自動再生がブロックされるため：初回タップ/クリックで再生、未読み込みなら「再生可能になったら再生」フラグ */
    function tryPlayOnce() {
        if (video.readyState >= 2) {
            if (video.paused) video.play().catch(() => {});
        } else {
            window.__heroVideoPlayWhenReady = true;
        }
    }
    document.addEventListener('touchstart', tryPlayOnce, { once: true, passive: true });
    document.addEventListener('click', tryPlayOnce, { once: true });
    window.addEventListener('resize', resize);
    /* 別タブ・別アプリ・画面オフのときは止める。戻ったら続きから再生する */
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) stopBecauseHidden();
        else resumeIfVisible();
    });
    window.addEventListener('pagehide', stopBecauseHidden);
    /* canvas が画面内に無いときも止める（この背景は画面固定なので、通常のスクロールでは止まらない） */
    if (typeof IntersectionObserver === 'function') {
        var heroObserver = new IntersectionObserver(function(entries) {
            onScreen = false;
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) onScreen = true;
            }
            if (shouldRun()) resumeIfVisible();
            else stopBecauseHidden();
        });
        heroObserver.observe(canvas);
    }
    /* 他ページから戻ったときに描画ループを再開する用（pageshow で呼ぶ） */
    window.__heroVideoRestartDraw = function() {
        resumeIfVisible();
    };
    if (video.readyState >= 2) {
        resize();
        resumeIfVisible();
    }
}

/** 確認用スイッチ：季節でグラデーション・動画・スライダー装飾を一括切り替え */
function initSeasonSwitch() {
    const sel = document.getElementById('seasonSelect');
    const video = document.getElementById('heroVideoBg');
    if (!sel) return;
    const videoBase = (__assetsBase || '') + 'assets/video/';
    const toAbs = function(name) { return new URL(videoBase + name, location.href).href; };
    const seasonVideo = {
        spring: toAbs("spring_web.mp4"),
        summer: toAbs("summer_web.mp4"),
        autumn: toAbs("autumn_web.mp4"),
        winter: toAbs("winter_web.mp4")
    };

    function monthToSeason() {
        const m = new Date().getMonth();
        if ([0, 1, 11].indexOf(m) >= 0) return "winter"; /* 12月・1月・2月 */
        if ([2, 3, 4].indexOf(m) >= 0) return "spring";
        if ([5, 6, 7].indexOf(m) >= 0) return "summer";
        if ([8, 9, 10].indexOf(m) >= 0) return "autumn";
        return "spring";
    }
    /* 保存された選択を優先。ただし月が変わったら指定期間に応じて日付ベースの季節に切り替え */
    const initialSeason = (function() {
        const stored = sessionStorage.getItem('selectedSeason');
        const storedMonth = sessionStorage.getItem('selectedSeasonMonth');
        const currentMonth = String(new Date().getMonth());
        if (stored && ['spring', 'summer', 'autumn', 'winter'].includes(stored) && storedMonth === currentMonth) return stored;
        return monthToSeason();
    })();
    sel.value = initialSeason;
    /* 初期表示時もグラデーションを季節に合わせる（html に season-xxx を付与） */
    (function applySeasonToRoot(value) {
        const root = document.documentElement;
        root.classList.remove('season-spring', 'season-summer', 'season-autumn', 'season-winter');
        if (value !== 'spring') root.classList.add('season-' + value);
        /* ステータスバー色も季節上端色に合わせる */
        if (typeof updateStatusBarThemeColor === 'function') updateStatusBarThemeColor(value);
    })(initialSeason);
    sessionStorage.setItem('selectedSeason', initialSeason);
    sessionStorage.setItem('selectedSeasonMonth', String(new Date().getMonth()));
    /* 確認用の初期値でも、カルーセル装飾を背景と同じ季節にする */
    if (typeof setSeasonalDeco === 'function') setSeasonalDeco(initialSeason);
    sel.addEventListener('change', function() {
        const value = this.value;
        sessionStorage.setItem('selectedSeason', value);
        sessionStorage.setItem('selectedSeasonMonth', String(new Date().getMonth()));
        const root = document.documentElement;
        root.classList.remove('season-spring', 'season-summer', 'season-autumn', 'season-winter');
        if (value !== 'spring') root.classList.add('season-' + value);
        if (typeof updateStatusBarThemeColor === 'function') updateStatusBarThemeColor(value);
        /* 秋は白透過、冬はグレー透過、夏は青透過、春は緑透過 */
        window.__heroVideoChroma = (value === 'summer') ? 'blue' : (value === 'autumn') ? 'white' : (value === 'winter') ? 'gray' : 'green';
        /* winter.mp4 のみ描画時に拡大 */
        window.__heroVideoScale = (value === 'winter') ? 1.5 : 1;
        if (video) {
            const targetSrc = seasonVideo[value] || seasonVideo.spring;
            const tryPlay = function() {
                video.playbackRate = 0.4;
                video.play().catch(() => {});
            };
            const onCanPlay = function() {
                video.removeEventListener('canplay', onCanPlay);
                video.removeEventListener('loadeddata', onCanPlay);
                video.removeEventListener('error', onError);
                tryPlay();
            };
            const onError = function() {
                video.removeEventListener('canplay', onCanPlay);
                video.removeEventListener('loadeddata', onCanPlay);
                video.removeEventListener('error', onError);
                if (targetSrc !== seasonVideo.spring) {
                    video.src = seasonVideo.spring;
                    video.load();
                    video.addEventListener('canplay', function() {
                        video.playbackRate = 0.4;
                        video.play().catch(() => {});
                    }, { once: true });
                }
            };
            /* リスナーを先に付けてから src を変更（canplay を取りこぼさない） */
            video.addEventListener('canplay', onCanPlay, { once: true });
            video.addEventListener('loadeddata', onCanPlay, { once: true });
            video.addEventListener('error', onError, { once: true });
            video.src = (value === 'winter') ? targetSrc + '?v=' + Date.now() : targetSrc;
            video.load();
            /* canplay を取りこぼした場合のフォールバック */
            setTimeout(function() {
                if (video.paused && video.readyState >= 2) tryPlay();
            }, 300);
            setTimeout(function() {
                if (video.paused && video.readyState >= 2) tryPlay();
            }, 1000);
            /* winter が再生されない場合：2秒後に spring にフォールバックして表示を確保 */
            if (targetSrc === seasonVideo.winter) {
                setTimeout(function() {
                    if (video.paused || video.readyState < 2) {
                        window.__heroVideoChroma = 'green';
                        window.__heroVideoScale = 1;
                        if (sel) sel.value = 'spring';
                        video.src = seasonVideo.spring;
                        video.load();
                        video.addEventListener('canplay', function() {
                            video.playbackRate = 0.4;
                            video.play().catch(() => {});
                        }, { once: true });
                    }
                }, 2000);
            }
        }
        if (typeof setSeasonalDeco === 'function') setSeasonalDeco(value);
    });
}

// index 用：トピック・スクロールアニメ・季節スイッチを初期化（お知らせ件数は sliderLoader でスライダー item 数に合わせて表示）
function initIndexPage() {
    initTopicScrollAnimation();
    /* SHOW_SEASON_SWITCH=true のときだけ確認用セレクトを有効化 */
    if (typeof useDevSeasonOverride === 'function' && useDevSeasonOverride()) {
        initSeasonSwitch();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    /* 動画要素があるページ（index・お知らせ・その他）で背景動画を初期化 */
    /* ページ描画を優先し、ブラウザがアイドルになったタイミングで動画ロードを開始（重い動画で初期表示が重くなるのを軽減） */
    if (document.getElementById('heroVideoBg') && document.getElementById('heroVideoCanvas')) {
        var initVideo = function() { initHeroVideo(); };
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(initVideo, { timeout: 1500 });
        } else {
            setTimeout(initVideo, 100);
        }
    }
    /* トップページのみ：スライダー・確認用スイッチ等 */
    if (document.getElementById('seasonSelect')) {
        initIndexPage();
    }
});

/* 他ページから戻ったとき（bfcache 復元）：動画を再再生し、止まった描画ループを再開 */
window.addEventListener('pageshow', function(ev) {
    if (!ev.persisted) return; /* 通常の初回表示では何もしない */
    var video = document.getElementById('heroVideoBg');
    if (!video) return;
    if (video.paused && video.readyState >= 2) {
        video.play().catch(function() {});
    }
    if (window.__heroVideoRestartDraw) window.__heroVideoRestartDraw();
});