// スライダー関連の変数
let items;
let next;
let prev;
let progressBar;
let wheelechair;
let active = 0;

/** サイトルートへの相対パス（サブディレクトリのページから動画を正しく読むため） */
var __assetsBase = (function() {
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

/** 現在の月から季節を判定し、カルーセル装飾画像の src を設定する。seasonOverride 指定時はその季節で表示（確認用スイッチ用） */
function setSeasonalDeco(seasonOverride) {
    let season = "spring";
    if (seasonOverride && ["spring", "summer", "autumn", "winter"].includes(seasonOverride)) {
        season = seasonOverride;
    } else {
        // 確認用で選んだ季節が sessionStorage にあればそちらを優先
        const stored = sessionStorage.getItem('selectedSeason');
        const storedMonth = sessionStorage.getItem('selectedSeasonMonth');
        const currentMonth = String(new Date().getMonth());
        if (stored && ['spring', 'summer', 'autumn', 'winter'].includes(stored) && storedMonth === currentMonth) {
            season = stored;
        } else {
            const month = new Date().getMonth(); // 0-11
            const seasonMap = {
                winter: [0, 1, 11], // 12月・1月・2月
                spring: [2, 3, 4], // 3-5月
                summer: [5, 6, 7], // 6-8月
                autumn: [8, 9, 10] // 9-11月
            };
            for (const [name, months] of Object.entries(seasonMap)) {
                if (months.includes(month)) {
                    season = name;
                    break;
                }
            }
        }
    }
    const base = "assets/season/";
    const fallbackTop = base + "spring2.png";
    const fallbackBottom = base + "spring1.png";

    const topRight = document.querySelector(".slider-deco--topRight");
    const bottomLeft = document.querySelector(".slider-deco--bottomLeft");
    if (!topRight || !bottomLeft) return;

    topRight.src = base + season + "2.png";
    bottomLeft.src = base + season + "1.png";
    // 画像が存在しない場合は春にフォールバック
    topRight.onerror = function() {
        this.onerror = null;
        this.src = fallbackTop;
    };
    bottomLeft.onerror = function() {
        this.onerror = null;
        this.src = fallbackBottom;
    };
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
        for (let stt = 1; stt <= 2; stt++) {
            let index = (active + stt) % len;
            const activeItemWidth = items[active].offsetWidth || 600;
            const offsetMultiplier = stt === 2 ? 1.45 : stt;
            const offset = (activeItemWidth / 2 + 50) * offsetMultiplier;
            const openDeg = 18 + 12 * stt;
            const translateZ = -30 * stt;
            items[index].style.transform = `translateX(calc(-60% + ${offset}px)) translateZ(${translateZ}px) scale(${1.1 - 0.1 * stt}) rotateY(-${openDeg}deg)`;
            items[index].style.zIndex = -stt;
            items[index].style.filter = "blur(3px)";
            items[index].style.opacity = 0.9;
        }
        for (let stt = 1; stt <= 2; stt++) {
            let index = (active - stt + len) % len;
            const activeItemWidth = items[active].offsetWidth || 600;
            const offsetMultiplier = stt === 2 ? 1.45 : stt;
            const offset = (activeItemWidth / 2 + 50) * offsetMultiplier;
            const openDeg = 18 + 12 * stt;
            const translateZ = -30 * stt;
            items[index].style.transform = `translateX(calc(-40% - ${offset}px)) translateZ(${translateZ}px) scale(${1.1 - 0.1 * stt}) rotateY(${openDeg}deg)`;
            items[index].style.zIndex = -stt;
            items[index].style.filter = "blur(3px)";
            items[index].style.opacity = 0.9;
        }
    } else {
        // 1100px以下：従来レイアウト（固定角度・translateZなし）
        for (let stt = 1; stt <= 2; stt++) {
            let index = (active + stt) % len;
            const activeItemWidth = items[active].offsetWidth || 600;
            const offsetMultiplier = stt === 2 ? 1.45 : stt;
            const offset = (activeItemWidth / 2 + 50) * offsetMultiplier;
            items[index].style.transform = `translateX(calc(-60% + ${offset}px)) scale(${1.1 - 0.1 * stt}) rotateY(-10deg)`;
            items[index].style.zIndex = -stt;
            items[index].style.filter = "blur(3px)";
            items[index].style.opacity = 0.9;
        }
        for (let stt = 1; stt <= 2; stt++) {
            let index = (active - stt + len) % len;
            const activeItemWidth = items[active].offsetWidth || 600;
            const offsetMultiplier = stt === 2 ? 1.45 : stt;
            const offset = (activeItemWidth / 2 + 50) * offsetMultiplier;
            items[index].style.transform = `translateX(calc(-40% - ${offset}px)) scale(${1.1 - 0.1 * stt}) rotateY(10deg)`;
            items[index].style.zIndex = -stt;
            items[index].style.filter = "blur(3px)";
            items[index].style.opacity = 0.9;
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
    if (!slider) return;

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
    // 左右ボタン上でのマウスダウンはスワイプ扱いしない（ボタンのクリックを確実に発火させる）
    if (event.target.closest('#next') || event.target.closest('#prev')) return;

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

function initFooterScrollAnimation() {
    const footerSection = document.querySelector('.footer_section');
    if (!footerSection) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.intersectionRatio > 0) footerSection.classList.add('partially-visible');
                if (entry.intersectionRatio >= 0.2) footerSection.classList.add('visible');
                else footerSection.classList.remove('visible');
            } else {
                footerSection.classList.remove('visible');
                footerSection.classList.remove('partially-visible');
            }
        });
    }, { threshold: [0, 0.2], rootMargin: '0px' });
    observer.observe(footerSection);
}

/** ヒーロー動画：季節に応じて動画を切り替え、緑クロマキー透過 */
function initHeroVideo() {
    const video = document.getElementById('heroVideoBg');
    const canvas = document.getElementById('heroVideoCanvas');
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    let useChroma = true;

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
        spring: toAbsolute("spring.mp4"),
        summer: toAbsolute("summer.mp4"),
        autumn: toAbsolute("autumn.mp4"),
        winter: toAbsolute("winter.mp4")
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
        const useStored = stored && ['spring', 'summer', 'autumn', 'winter'].includes(stored) && storedMonth === currentMonth;
        season = useStored ? stored : getSeason();
    }
    /* 秋は白透過、冬はグレー透過、夏は青透過、春は緑透過 */
    window.__heroVideoChroma = (season === 'summer') ? 'blue' : (season === 'autumn') ? 'white' : (season === 'winter') ? 'gray' : 'green';
    /* winter.mp4 のみイラストが小さいので描画時に拡大（1.5倍） */
    window.__heroVideoScale = (season === 'winter') ? 1.5 : 1;
    const initialSrc = seasonVideo[season] || seasonVideo.spring;
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

    function resize() {
        const w = window.innerWidth,
            h = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, (w * dpr) | 0);
        canvas.height = Math.max(1, (h * dpr) | 0);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
    }

    function draw() {
        if (!useChroma) return;
        if (video.readyState < 2) {
            ctx.clearRect(0, 0, canvas.width, canvas.height); /* 読み込み中は前フレームを表示しない */
            requestAnimationFrame(draw);
            return;
        }
        const w = video.videoWidth,
            h = video.videoHeight;
        if (!w || !h) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            requestAnimationFrame(draw);
            return;
        }
        const cw = canvas.width,
            ch = canvas.height;
        const baseScale = Math.max(cw / w, ch / h);
        const zoom = window.__heroVideoScale || 1; /* winter のみ 1.5 で拡大 */
        /* 全季節で画面いっぱい（cover）・上から見切れないように scale は 1 */
        const scale = baseScale * zoom;
        const dw = w * scale,
            dh = h * scale;
        const dx = (cw - dw) / 2,
            dy = (ch - dh) / 2;
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(video, 0, 0, w, h, dx, dy, dw, dh);
        try {
            const img = ctx.getImageData(0, 0, cw, ch),
                d = img.data;
            const chroma = window.__heroVideoChroma || 'green';
            const greenThresh = 20;
            const blueThresh = 50; /* 夏：青空を透過して背後のグラデーションを見せる */
            for (let i = 0; i < d.length; i += 4) {
                const r = d[i],
                    g = d[i + 1],
                    b = d[i + 2];
                const avg = (r + g + b) / 3;
                const isBrightWhite = avg >= 220; /* 春・夏：雲など明るい白は透過しない */
                if (chroma === 'white') {
                    if (avg >= 200 && r >= 180 && g >= 180 && b >= 180) d[i + 3] = 0; /* 秋：白を透過 */
                } else if (chroma === 'gray') {
                    const max = Math.max(r, g, b),
                        min = Math.min(r, g, b);
                    if (max - min < 60 && avg > 15 && avg < 200) d[i + 3] = 0; /* 冬：グレーのみ透過 */
                } else if (chroma === 'blue') {
                    if (!isBrightWhite && b > blueThresh && b > r && b > g) d[i + 3] = 0; /* 夏：青を透過 */
                } else {
                    if (!isBrightWhite && g > greenThresh && g > r && g > b) d[i + 3] = 0; /* 春：緑を透過 */
                }
            }
            ctx.putImageData(img, 0, 0);
        } catch (err) {
            useChroma = false;
            canvas.style.display = 'none';
            video.style.visibility = 'visible';
            return;
        }
        requestAnimationFrame(draw);
    }

    const playbackRate = 0.4;
    video.muted = true;
    video.playbackRate = playbackRate;
    video.addEventListener('loadeddata', () => { video.playbackRate = playbackRate; });
    video.addEventListener('loadedmetadata', () => {
        resize();
        draw(); /* ループ開始（readyState < 2 の間は draw 内で requestAnimationFrame のみ） */
    });
    /* 実機で loadedmetadata が遅れる場合に備え、ループを早めに開始 */
    resize();
    requestAnimationFrame(draw);
    /* canplay で再生しない場合はフォールバックで再生試行 */
    setTimeout(function() {
        if (video.paused && video.readyState >= 2) video.play().catch(() => {});
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
    if (video.readyState >= 2) {
        resize();
        draw();
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
        spring: toAbs("spring.mp4"),
        summer: toAbs("summer.mp4"),
        autumn: toAbs("autumn.mp4"),
        winter: toAbs("winter.mp4")
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
    })(initialSeason);
    sessionStorage.setItem('selectedSeason', initialSeason);
    sessionStorage.setItem('selectedSeasonMonth', String(new Date().getMonth()));
    sel.addEventListener('change', function() {
        const value = this.value;
        sessionStorage.setItem('selectedSeason', value);
        sessionStorage.setItem('selectedSeasonMonth', String(new Date().getMonth()));
        const root = document.documentElement;
        root.classList.remove('season-spring', 'season-summer', 'season-autumn', 'season-winter');
        if (value !== 'spring') root.classList.add('season-' + value);
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

// index 用：トピック・スクロールアニメ・季節スイッチを初期化（動画は initHeroVideo で共通）
function initIndexPage() {
    if (typeof loadTopics === 'function') loadTopics('topicList', 3);
    initTopicScrollAnimation();
    initFooterScrollAnimation();
    initSeasonSwitch();
}

document.addEventListener('DOMContentLoaded', function() {
    /* 動画要素があるページ（index・お知らせ・その他）で背景動画を初期化 */
    if (document.getElementById('heroVideoBg') && document.getElementById('heroVideoCanvas')) {
        initHeroVideo();
    }
    /* トップページのみ：スライダー・確認用スイッチ等 */
    if (document.getElementById('seasonSelect')) {
        initIndexPage();
    }
});

/* 他ページから戻ったとき（bfcache 復元含む）：動画を再再生 */
window.addEventListener('pageshow', function(ev) {
    if (!ev.persisted) return; /* 通常表示では何もしない */
    var video = document.getElementById('heroVideoBg');
    if (!video) return;
    if (video.paused && video.readyState >= 2) {
        video.play().catch(function() {});
    }
});