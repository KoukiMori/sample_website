(function() {
    'use strict';

    const TIME_RUNNING_MS = 7000; // 7秒で次のスライドへ（進捗リングの一周時間）

    const THUMB_TRANSITION_MS = 800; // 丸サムネイルの移動時間（.item の transition と合わせる）

    const list = document.querySelector('.carousel .list');
    const carousel = document.querySelector('.carousel');
    const timeRunningEl = document.querySelector('.carousel .timeRunning');
    const timeRunningFill = document.querySelector('.carousel .timeRunning .timeRunning-fill');

    let timeRunningTimeout = null;

    if (!list) return;

    /** 表示中の .content 内の title / name / des / btn / arrows のアニメーションを再実行 */
    function restartContentAnimation() {
        const firstItem = list.querySelector('.item');
        if (!firstItem) return;
        const content = firstItem.querySelector('.content');
        if (!content) return;
        const animated = content.querySelectorAll('.title, .name, .des, .btn button, .arrows');
        animated.forEach(function(el) {
            el.style.animation = 'none';
            el.offsetHeight; // 再フローでアニメーションをリセット
            el.style.animation = '';
        });
    }

    /** クロスディゾルブ：前スライドを背面に残し、新しいスライドをフェードイン */
    function triggerExpandAnimation(prevBackground) {
        const items = list.querySelectorAll('.item');
        items.forEach(function(el) {
            el.classList.remove('item--expand', 'item--as-background');
            var c = el.querySelector('.content');
            if (c) c.classList.remove('content--expanding');
        });
        if (prevBackground) prevBackground.classList.add('item--as-background');
        var first = list.querySelector('.item');
        if (!first) return;
        var firstContent = first.querySelector('.content');
        /* content--expanding で非表示にし、さらに子要素のアニメを止める（先走り防止） */
        if (firstContent) {
            firstContent.classList.add('content--expanding');
            var animated = firstContent.querySelectorAll('.title, .name, .des, .btn button, .arrows');
            animated.forEach(function(el) { el.style.animation = 'none'; });
        }
        first.offsetHeight; // 再フロー
        first.classList.add('item--expand');
        first.addEventListener('animationend', function onDissolveEnd(e) {
            if (e.animationName !== 'crossDissolveIn') return;
            first.removeEventListener('animationend', onDissolveEnd);
            /* 全画面表示完了 → content のアニメをリセットしてから non-expanding に戻すとアニメが発火する */
            if (firstContent) {
                var animated = firstContent.querySelectorAll('.title, .name, .des, .btn button, .arrows');
                /* アニメをリセット（content--expanding で非表示のまま） */
                animated.forEach(function(el) {
                    el.style.animation = 'none';
                    el.offsetHeight;
                    el.style.animation = '';
                });
                /* 次フレームで content--expanding を外す → アニメが 0% から再生される */
                requestAnimationFrame(function() {
                    firstContent.classList.remove('content--expanding');
                });
            }
            if (prevBackground) {
                /* 丸（左 or 右）になる要素をゆっくりフェードイン。完了後にインジケーター作動 */
                prevBackground.classList.add('item--thumb-fade-in');
                prevBackground.addEventListener('animationend', function onThumbFadeEnd(e) {
                    if (e.animationName !== 'thumbFadeIn') return;
                    prevBackground.removeEventListener('animationend', onThumbFadeEnd);
                    prevBackground.classList.remove('item--thumb-fade-in');
                    showTimeRunningAndReset();
                });
                prevBackground.style.animation = 'none';
                prevBackground.style.transition = 'none';
                prevBackground.classList.remove('item--as-background');
                prevBackground.offsetHeight;
                prevBackground.style.animation = '';
                prevBackground.style.transition = '';
            }
        });
    }

    /** 現在の content をフェードアウトさせてからコールバックを実行 */
    function fadeOutCurrentContent(callback) {
        var currentFirst = list.querySelector('.item');
        if (!currentFirst) { callback(); return; }
        var currentContent = currentFirst.querySelector('.content');
        if (!currentContent) { callback(); return; }
        /* フェードアウトクラスを付与（CSS で contentFadeOut が 0.5s で再生される） */
        currentContent.classList.add('content--expanding');
        /* フェードアウト完了後にスライドを切り替える */
        setTimeout(callback, 500);
    }

    /** 次のスライドへ（1枚目を末尾に移動） */
    function goNext() {
        fadeOutCurrentContent(function() {
            var first = list.querySelector('.item');
            if (first) {
                list.appendChild(first);
                triggerExpandAnimation(first);
            } else {
                triggerExpandAnimation();
            }
            hideTimeRunningThenReset();
        });
    }

    /** 前のスライドへ（末尾を先頭に移動） */
    function goPrev() {
        fadeOutCurrentContent(function() {
            var items = list.querySelectorAll('.item');
            var last = items[items.length - 1];
            if (last) {
                /* 移動前に transition を止めてサムネイル位置からのスライドを防ぐ */
                last.style.transition = 'none';
                list.insertBefore(last, list.firstChild);
                /* 再フローで nth-child(1) のスタイル（全画面）を即座に確定 */
                last.offsetHeight;
                last.style.transition = '';
                var prevBackground = list.querySelector('.item:nth-child(2)');
                triggerExpandAnimation(prevBackground);
            } else {
                triggerExpandAnimation();
            }
            hideTimeRunningThenReset();
        });
    }

    /** サムネイル移動中は進捗リングを隠す。表示・作動は丸のフェードイン完了後に showTimeRunningAndReset で行う */
    function hideTimeRunningThenReset() {
        if (timeRunningTimeout) clearTimeout(timeRunningTimeout);
        timeRunningTimeout = null;
        if (timeRunningEl) timeRunningEl.classList.add('timeRunning--hidden');
        const fill = document.querySelector('.carousel .timeRunning .timeRunning-fill');
        if (fill) {
            fill.style.animation = 'none';
            fill.style.strokeDashoffset = '741';
        }
    }

    /** 丸のフェードインが終わってからインジケーターを表示し、7秒タイマーを開始 */
    function showTimeRunningAndReset() {
        if (timeRunningEl) timeRunningEl.classList.remove('timeRunning--hidden');
        resetTimeRunning();
    }

    /** 進捗リングを0から再スタート。7秒後に goNext を呼ぶ（都度 .timeRunning-fill を取得して確実に再開） */
    function resetTimeRunning() {
        if (timeRunningTimeout) clearTimeout(timeRunningTimeout);
        timeRunningTimeout = null;
        const fill = document.querySelector('.carousel .timeRunning .timeRunning-fill');
        if (!fill) return;
        fill.style.animation = 'none';
        fill.style.strokeDashoffset = '741';
        fill.offsetHeight;
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                fill.style.strokeDashoffset = '';
                fill.style.animation = 'timeRunning-fill 7s linear forwards';
            });
        });
        timeRunningTimeout = setTimeout(function() {
            timeRunningTimeout = null;
            goNext();
        }, TIME_RUNNING_MS);
    }

    // 矢印クリック（表示中のスライドが変わるので委譲で常に効くようにする）
    if (carousel) {
        carousel.addEventListener('click', function(e) {
            const target = e.target.closest('.arrows .prev, .arrows .next');
            if (!target) return;
            if (target.classList.contains('next')) goNext();
            else if (target.classList.contains('prev')) goPrev();
        });
    }

    // 初回は非表示にせずそのまま進捗開始
    resetTimeRunning();

    // 初回表示時：拡大アニメーションと .content のアニメーションを実行
    requestAnimationFrame(function() {
        triggerExpandAnimation();
        restartContentAnimation();
    });
})();