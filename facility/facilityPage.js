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

    /** クロスディゾルブ：前スライドを背面でフェードアウト、新しいスライドをフェードイン */
    function triggerExpandAnimation(prevBackground) {
        const items = list.querySelectorAll('.item');
        items.forEach(function(el) {
            el.classList.remove('item--expand', 'item--as-background');
            const content = el.querySelector('.content');
            if (content) content.classList.remove('content--expanding');
        });
        if (prevBackground) prevBackground.classList.add('item--as-background');
        const first = list.querySelector('.item');
        if (!first) return;
        const firstContent = first.querySelector('.content');
        if (firstContent) firstContent.classList.add('content--expanding');
        first.offsetHeight; // 再フロー
        first.classList.add('item--expand');
        first.addEventListener('animationend', function onDissolveEnd(e) {
            if (e.animationName !== 'crossDissolveIn') return;
            first.removeEventListener('animationend', onDissolveEnd);
            if (firstContent) firstContent.classList.remove('content--expanding');
            if (prevBackground) {
                prevBackground.style.animation = 'none';
                prevBackground.style.transition = 'none';
                prevBackground.classList.remove('item--as-background');
                prevBackground.offsetHeight;
                prevBackground.style.animation = '';
                prevBackground.style.transition = '';
            }
        });
    }

    /** 次のスライドへ（1枚目を末尾に移動） */
    function goNext() {
        const first = list.querySelector('.item');
        if (first) {
            list.appendChild(first);
            triggerExpandAnimation(first);
        } else {
            triggerExpandAnimation();
        }
        restartContentAnimation();
        hideTimeRunningThenReset();
    }

    /** 前のスライドへ（末尾を先頭に移動） */
    function goPrev() {
        const items = list.querySelectorAll('.item');
        const last = items[items.length - 1];
        if (last) {
            list.insertBefore(last, list.firstChild);
            const prevFirst = list.querySelector('.item:nth-child(2)');
            triggerExpandAnimation(prevFirst);
        } else {
            triggerExpandAnimation();
        }
        restartContentAnimation();
        hideTimeRunningThenReset();
    }

    /** サムネイル移動中は進捗リングを隠し、移動完了後に表示・再開（青い丸が残って見えないように） */
    function hideTimeRunningThenReset() {
        if (timeRunningTimeout) clearTimeout(timeRunningTimeout);
        timeRunningTimeout = null;
        if (timeRunningEl) timeRunningEl.classList.add('timeRunning--hidden');
        const fill = document.querySelector('.carousel .timeRunning .timeRunning-fill');
        if (fill) {
            fill.style.animation = 'none';
            fill.style.strokeDashoffset = '741';
        }
        setTimeout(function() {
            if (timeRunningEl) timeRunningEl.classList.remove('timeRunning--hidden');
            resetTimeRunning();
        }, THUMB_TRANSITION_MS);
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